import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Square,
  Sparkles,
  Paperclip,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Volume2,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { ChatMessage } from '../../types';
import {
  transcribeAndExtractVoiceNote,
  analyzeInspectionImage,
  blobToBase64,
} from '../../core/services/geminiChatService';

export interface RecordChatterProps {
  recordId: string;
  recordType: 'project' | 'task' | 'equipment' | 'expense' | 'hseq';
  recordTitle: string;
  projectCode?: string;
  compact?: boolean;
  className?: string;
  onActionCreated?: (type: string, id: string) => void;
}

export const RecordChatter: React.FC<RecordChatterProps> = ({
  recordId,
  recordType,
  recordTitle,
  projectCode,
  compact = false,
  className = '',
}) => {
  const { chatMessages, addChatMessage, updateChatMessage, currentUser } = useErp();
  const channelId = `record-${recordType}-${recordId}`;

  const messages = chatMessages.filter((m) => m.channel === channelId);

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Record<string, boolean>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Iniciar grabación de nota de voz
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSec = recordDuration;

        setIsProcessingAudio(true);
        const base64Audio = await blobToBase64(audioBlob);

        // Crear mensaje con el audio primero para feedback inmediato
        const tempMsgId = `MSG-${Date.now()}`;
        addChatMessage(
          channelId,
          '🎤 Nota de voz de campo',
          undefined,
          {
            type: 'audio',
            url: audioUrl,
            name: `NotaVoz-${recordType.toUpperCase()}-${Date.now().toString().slice(-4)}.webm`,
            duration: durationSec,
            mimeType,
            base64Data: base64Audio,
          },
          {
            id: tempMsgId,
            linkedProjectId: projectCode,
            audioData: {
              base64: base64Audio,
              durationSeconds: durationSec,
              mimeType,
            },
            aiStatus: 'processing',
          }
        );

        // Procesar en segundo plano con Gemini Multimodal
        try {
          const { transcription, extraction } = await transcribeAndExtractVoiceNote(
            base64Audio,
            mimeType,
            `${recordType.toUpperCase()}: ${recordTitle}`
          );

          updateChatMessage(tempMsgId, {
            transcriptionText: transcription,
            aiExtraction: extraction,
            aiStatus: 'done',
          });
        } catch (err) {
          console.error('Error procesando audio con Gemini:', err);
          updateChatMessage(tempMsgId, { aiStatus: 'error' });
        } finally {
          setIsProcessingAudio(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('No se pudo acceder al micrófono:', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  // Enviar mensaje de texto
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    addChatMessage(
      channelId,
      inputText.trim(),
      undefined,
      undefined,
      { linkedProjectId: projectCode }
    );
    setInputText('');
  };

  // Adjuntar imagen y opcionalmente analizar con Gemini Vision
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

      addChatMessage(
        channelId,
        `📷 Fotografía adjunta de inspección: ${file.name}`,
        undefined,
        {
          type: 'image',
          url: dataUrl,
          name: file.name,
          size: `${sizeMB} MB`,
          mimeType: file.type || 'image/jpeg',
          base64Data: base64,
        },
        { linkedProjectId: projectCode }
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Analizar imagen de inspección con Gemini Vision
  const handleAnalyzeImage = async (msg: ChatMessage) => {
    if (!msg.attachment?.base64Data) return;
    setAnalyzingImageId(msg.id);

    try {
      const analysis = await analyzeInspectionImage(
        msg.attachment.base64Data,
        msg.attachment.mimeType || 'image/jpeg',
        msg.text
      );

      updateChatMessage(msg.id, {
        aiAnalysis: analysis,
        aiStatus: 'done',
      });
    } catch (err) {
      console.error('Error analizando imagen:', err);
      updateChatMessage(msg.id, { aiStatus: 'error' });
    } finally {
      setAnalyzingImageId(null);
    }
  };

  const toggleTranscription = (msgId: string) => {
    setExpandedTranscriptions((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      {/* Header del Chatter */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Bitácora & Chatter ({messages.length})
          </span>
        </div>
        <span className="text-[10px] text-gray-500 truncate max-w-[200px]">
          {recordTitle}
        </span>
      </div>

      {/* Lista de Mensajes */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${compact ? 'max-h-60' : 'max-h-96'}`}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs">
            <Volume2 size={24} className="mx-auto mb-1.5 opacity-40" />
            <p>No hay notas ni comentarios para este registro.</p>
            <p className="text-[10px] mt-0.5">Graba una nota de voz o escribe una actualización.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isAudio = msg.attachment?.type === 'audio' || Boolean(msg.audioData);
            const isImage = msg.attachment?.type === 'image';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-xs`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400">
                  <span className="font-bold text-gray-700">{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[90%] space-y-2 ${
                    isMe
                      ? 'bg-sky-50 text-gray-900 border border-sky-100'
                      : 'bg-slate-100 text-gray-900 border border-slate-200'
                  }`}
                >
                  {/* Texto principal */}
                  <p className="leading-relaxed">{msg.text}</p>

                  {/* Audio Player para Notas de Voz */}
                  {isAudio && (
                    <div className="space-y-1.5 pt-1">
                      <audio
                        controls
                        src={msg.attachment?.url}
                        className="w-full h-8 rounded-lg"
                      />

                      {/* Transcripción AI de Gemini */}
                      {msg.transcriptionText ? (
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-200 space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleTranscription(msg.id)}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-[#00668F] cursor-pointer"
                          >
                            <span className="flex items-center gap-1">
                              <Sparkles size={11} className="text-amber-500" />
                              <span>Transcripción Gemini</span>
                            </span>
                            {expandedTranscriptions[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {expandedTranscriptions[msg.id] && (
                            <p className="text-[11px] text-gray-700 italic border-t border-slate-100 pt-1">
                              "{msg.transcriptionText}"
                            </p>
                          )}

                          {/* Metadatos extraídos de la nota */}
                          {msg.aiExtraction && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#00668F] font-bold text-[9px]">
                                {msg.aiExtraction.equipmentComponent}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-gray-700 text-[9px]">
                                {msg.aiExtraction.locationTower}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                                  msg.aiExtraction.severity === 'critico'
                                    ? 'bg-rose-100 text-rose-700'
                                    : msg.aiExtraction.severity === 'advertencia'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {msg.aiExtraction.severity?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : msg.aiStatus === 'processing' ? (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 p-1 rounded">
                          <Loader2 size={10} className="animate-spin" />
                          <span>Transcribiendo con Gemini AI...</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Imagen y Diagnóstico Gemini Vision */}
                  {isImage && msg.attachment?.url && (
                    <div className="space-y-1.5 pt-1">
                      <img
                        src={msg.attachment.url}
                        alt="Inspección"
                        className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                      />

                      {!msg.aiAnalysis && (
                        <button
                          type="button"
                          onClick={() => handleAnalyzeImage(msg)}
                          disabled={analyzingImageId === msg.id}
                          className="px-2.5 py-1 bg-[#00668F] hover:bg-[#005073] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {analyzingImageId === msg.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Sparkles size={11} className="text-amber-300" />
                          )}
                          <span>{analyzingImageId === msg.id ? 'Diagnosticando...' : 'Diagnosticar con Gemini'}</span>
                        </button>
                      )}

                      {/* Tarjeta de Diagnóstico Gemini Vision */}
                      {msg.aiAnalysis && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[10px] space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1 text-[#00668F]">
                              <Cpu size={12} />
                              <span>Diagnóstico Técnico STC</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] ${
                                msg.aiAnalysis.severity === 'critico'
                                ? 'bg-rose-100 text-rose-700'
                                : msg.aiAnalysis.severity === 'advertencia'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {msg.aiAnalysis.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-800 font-semibold">{msg.aiAnalysis.diagnosis}</p>
                          <div className="text-gray-600 space-y-0.5">
                            <div>
                              <strong>Causas:</strong> {msg.aiAnalysis.rootCauses.join(', ')}
                            </div>
                            <div>
                              <strong>Acción:</strong> {msg.aiAnalysis.recommendations.join(', ')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Entrada y Grabación de Voz */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200">
        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-2 rounded-xl text-rose-700 animate-pulse text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="font-bold">Grabando nota de campo ({recordDuration}s)...</span>
            </div>
            <button
              type="button"
              onClick={handleStopRecording}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
            >
              <Square size={12} />
              <span>Enviar Nota</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar foto de inspección"
              className="p-2 text-gray-500 hover:text-[#00668F] hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              <Paperclip size={15} />
            </button>

            <button
              type="button"
              onClick={handleStartRecording}
              title="Grabar nota de voz en campo"
              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Mic size={15} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un comentario técnico..."
              className="flex-1 bg-white text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 bg-[#00668F] hover:bg-[#005073] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
