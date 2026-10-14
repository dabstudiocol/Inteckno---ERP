import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Minimize2,
  ChevronDown,
  Info,
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Trash2,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Calendar,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Video,
  Globe,
  Download,
} from 'lucide-react';
import { MargaritaIcon } from '../common/MargaritaIcon';
import {
  downloadIcsFile,
  getOutlookWebComposeUrl,
  openMicrosoftAuthPopup,
  syncEventToMicrosoftGraph,
  getM365Config,
  isM365TokenExpired,
} from '../../core/services/m365Sync';
import {
  askLuciana,
  cleanSpecialChars,
  getSystemDate,
  LucianaMessage,
  LucianaAttachment,
  LucianaAudio,
  LucianaContext,
  LucianaStoreHandlers,
} from '../../core/services/lucianaService';
import { useErp } from '../../core/storage/erpStore';

interface LucianaFloatingWidgetProps {
  activeModuleTitle?: string;
  activeModuleId?: string;
}

const getModuleFriendlyLabel = (modId: string): string => {
  const map: Record<string, string> = {
    calendario: 'Calendario',
    documentos: 'Documentos',
    actividades: 'Actividades',
    articulos: 'Artículos',
    crm: 'CRM',
    contactos: 'Contactos',
    proyectos: 'Proyectos',
    'registro-horas': 'Registro de Horas',
    inventario: 'Inventario',
    compras: 'Compras',
    gastos: 'Gastos',
    contabilidad: 'Contabilidad',
    tableros: 'Tableros',
    conversaciones: 'Chat',
  };
  return map[modId] || modId;
};

// Reproductor de audio compacto para las notas de voz en el chat
const ChatAudioPlayer: React.FC<{ url: string; duration?: number }> = ({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-white/20 dark:bg-black/20 text-xs">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-7 h-7 rounded-full bg-white text-[#00668F] flex items-center justify-center cursor-pointer shadow-xs hover:scale-105 transition-transform shrink-0"
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
          <div
            className={`h-full bg-white rounded-full ${
              isPlaying ? 'w-full transition-all duration-3000' : 'w-1/3'
            }`}
          />
        </div>
      </div>
      <span className="text-[10px] opacity-80 font-mono shrink-0">
        {duration
          ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
          : 'Nota de voz'}
      </span>
    </div>
  );
};

const getInitialLucianaWelcome = (user?: any): LucianaMessage => ({
  id: `welcome-${user?.id || 'itk'}-${Date.now()}`,
  sender: 'luciana',
  text: cleanSpecialChars(
    `¡Hola ${user?.name ? user.name.split(' ')[0] : 'compañero'}! 🌼 Soy LUC-IA-NA, tu asistente y compañera de equipo en Inteckno.\n\nPuedes pedirme lo que necesites por texto, dictándome un audio o enviándome fotos y documentos: yo me encargo de ejecutar las acciones en el ERP por ti (agendar reuniones, crear tareas, registrar gastos o navegar entre módulos) según tus permisos.\n\n¿En qué te puedo dar una mano hoy?`
  ),
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

const loadUserLucianaHistory = (userId?: string, user?: any): LucianaMessage[] => {
  if (!userId) return [getInitialLucianaWelcome(user)];
  try {
    const key = `inteckno_luciana_history_${userId}`;
    const saved = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error cargando historial de LUC-IA-NA:', e);
  }
  return [getInitialLucianaWelcome(user)];
};

export const LucianaFloatingWidget: React.FC<LucianaFloatingWidgetProps> = ({
  activeModuleTitle,
  activeModuleId,
}) => {
  const {
    currentUser,
    users,
    projects,
    calendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    setActiveModule,
    addTodo,
    submitExpense,
    createRequisition,
    addChatMessage,
    products,
    inventoryAuditLogs,
  } = useErp();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false);
  const [isConnectingM365, setIsConnectingM365] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conectar con Microsoft 365 directamente desde el chat y sincronizar el evento en segundo plano
  const handleConnectAndSyncInChat = async (msg: LucianaMessage) => {
    if (!msg.actionExecuted?.data) return;
    setIsConnectingM365(true);
    try {
      await openMicrosoftAuthPopup();
      const result = await syncEventToMicrosoftGraph(msg.actionExecuted.data, users);
      if (result.success) {
        if (updateCalendarEvent) {
          updateCalendarEvent(msg.actionExecuted.data.id, {
            syncStatus: 'synced_m365',
            m365EventId: result.m365EventId,
            teamsMeetingUrl: result.teamsMeetingUrl || msg.actionExecuted.data.teamsMeetingUrl,
          });
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  actionExecuted: {
                    ...m.actionExecuted!,
                    m365Synced: true,
                    teamsMeetingUrl: result.teamsMeetingUrl || m.actionExecuted!.teamsMeetingUrl,
                    outlookWebLink: result.outlookWebLink,
                    description: `${m.actionExecuted!.description} ¡Sincronizado con éxito en Microsoft Teams y Outlook!`,
                  },
                }
              : m
          )
        );
        alert('¡Tu cuenta corporativa de Microsoft 365 quedó conectada y la reunión se sincronizó en Teams y Outlook!');
      } else {
        alert(result.message || 'Se conectó la cuenta, pero ocurrió un aviso al sincronizar.');
      }
    } catch (err: any) {
      console.warn('Error conectando M365 desde chat:', err);
      alert(err.message || 'No se pudo completar el inicio de sesión con Microsoft.');
    } finally {
      setIsConnectingM365(false);
    }
  };

  // Estado de adjunto pendiente (imagen o documento)
  const [pendingAttachment, setPendingAttachment] = useState<LucianaAttachment | null>(null);

  // Estados de grabación de audio (Notas de voz)
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Historial de mensajes aislado estrictamente por usuario
  const [messages, setMessages] = useState<LucianaMessage[]>(() =>
    loadUserLucianaHistory(currentUser?.id, currentUser)
  );

  const activeUserIdRef = useRef<string | undefined>(currentUser?.id);

  // Cuando cambie el usuario autenticado, cargar su propio historial sin mezclar con otros
  useEffect(() => {
    if (currentUser?.id && currentUser.id !== activeUserIdRef.current) {
      activeUserIdRef.current = currentUser.id;
      const userHistory = loadUserLucianaHistory(currentUser.id, currentUser);
      setMessages(userHistory);
    }
  }, [currentUser?.id, currentUser]);

  // Guardar en el almacenamiento exclusivo del usuario actual
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const key = `inteckno_luciana_history_${currentUser.id}`;
      localStorage.setItem(key, JSON.stringify(messages));
      sessionStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
      console.warn(e);
    }
  }, [messages, currentUser?.id]);

  // Limpiar la clave global compartida previa y cualquier coordenada residual para evitar anomalías
  useEffect(() => {
    try {
      sessionStorage.removeItem('inteckno_luciana_history');
      localStorage.removeItem('inteckno_luciana_history');
      localStorage.removeItem('inteckno_luciana_widget_pos');
      localStorage.removeItem('inteckno_luciana_widget_pos_v2');
    } catch (e) {}
  }, []);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setHasUnreadNotification(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Limpiar timers de grabación al desmontar
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Escuchar eventos globales para abrir LUC-IA-NA desde cualquier parte del ERP
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      if (e.detail?.prefilledQuestion) {
        handleSendTextMessage(e.detail.prefilledQuestion);
      }
    };
    window.addEventListener('inteckno:open-luciana', handleOpenEvent);
    return () => {
      window.removeEventListener('inteckno:open-luciana', handleOpenEvent);
    };
  }, []);

  // Convertir un File o Blob a Base64
  const fileToBase64 = (file: File | Blob): Promise<{ base64: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve({ base64, dataUrl });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Procesar archivo seleccionado o pegado
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, dataUrl } = await fileToBase64(file);
      const sizeMB = (file.size / 1048576).toFixed(2);
      setPendingAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: `${sizeMB} MB`,
        dataUrl,
        base64Data: base64,
      });
    } catch (err) {
      console.error('Error procesando archivo:', err);
    }
    e.target.value = '';
  };

  // Pegar imágenes directamente desde el portapapeles (Ctrl+V o Paste)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const { base64, dataUrl } = await fileToBase64(file);
            setPendingAttachment({
              name: `Captura-${Date.now()}.png`,
              type: file.type || 'image/png',
              size: `${(file.size / 1048576).toFixed(2)} MB`,
              dataUrl,
              base64Data: base64,
            });
          } catch (err) {
            console.error('Error pegando imagen:', err);
          }
          break;
        }
      }
    }
  };

  // GRABACIÓN DE AUDIO (Notas de voz con pausar / continuar / enviar)
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      alert('No fue posible acceder al micrófono. Por favor habilita los permisos de audio en tu navegador.');
    }
  };

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current.stop();
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(0);
  };

  const finishAndSendAudio = () => {
    if (!mediaRecorderRef.current) return;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const recorder = mediaRecorderRef.current;
    const duration = recordingSeconds;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      recorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      setRecordingSeconds(0);

      try {
        const { base64, dataUrl } = await fileToBase64(audioBlob);
        const audioObj: LucianaAudio = {
          url: dataUrl,
          blob: audioBlob,
          mimeType: recorder.mimeType || 'audio/webm',
          base64Data: base64,
          duration,
        };
        await handleSendAudioMessage(audioObj);
      } catch (err) {
        console.error('Error procesando audio grabado:', err);
      }
    };

    recorder.stop();
  };

  // Preparar contexto del ERP y Handlers de ejecución de acciones
  const buildContextAndHandlers = (): {
    context: LucianaContext;
    handlers: LucianaStoreHandlers;
  } => {
    const sysDate = getSystemDate();
    const context: LucianaContext = {
      currentUser,
      users,
      projects,
      calendarEvents,
      products,
      inventoryAuditLogs,
      activeModuleTitle,
      activeModuleId,
      currentDate: sysDate.dateStr,
    };

    const handlers: LucianaStoreHandlers = {
      createCalendarEvent,
      deleteCalendarEvent,
      updateCalendarEvent,
      setActiveModule,
      addTodo,
      submitExpense,
      createRequisition,
      addChatMessage,
    };

    return { context, handlers };
  };

  // Enviar mensaje con Audio
  const handleSendAudioMessage = async (audio: LucianaAudio) => {
    setIsLoading(true);

    const userMsg: LucianaMessage = {
      id: `user-audio-${Date.now()}`,
      sender: 'user',
      text: 'Nota de voz enviada',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      audio,
    };

    setMessages((prev) => [...prev, userMsg]);

    const { context, handlers } = buildContextAndHandlers();

    try {
      const res = await askLuciana('', messages, context, undefined, audio, handlers);

      const lucianaMsg: LucianaMessage = {
        id: `luciana-${Date.now()}`,
        sender: 'luciana',
        text: cleanSpecialChars(res.reply),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcription: res.transcription,
        actionExecuted: res.actionExecuted,
      };

      setMessages((prev) => [...prev, lucianaMsg]);
    } catch (err: any) {
      console.error('Error enviando audio a LUC-IA-NA:', err);
      const errorMsg: LucianaMessage = {
        id: `err-${Date.now()}`,
        sender: 'luciana',
        text: 'Tuve un inconveniente al escuchar tu nota de voz. Por favor intenta grabarla de nuevo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar mensaje de texto o con adjunto
  const handleSendTextMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if ((!text && !pendingAttachment) || isLoading) return;

    const attachmentToSend = pendingAttachment;
    setPendingAttachment(null);
    setInputMessage('');
    setIsLoading(true);

    const userMsg: LucianaMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text || (attachmentToSend ? `Archivo: ${attachmentToSend.name}` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: attachmentToSend || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);

    const { context, handlers } = buildContextAndHandlers();

    try {
      const res = await askLuciana(text, messages, context, attachmentToSend || undefined, undefined, handlers);

      const lucianaMsg: LucianaMessage = {
        id: `luciana-${Date.now()}`,
        sender: 'luciana',
        text: cleanSpecialChars(res.reply),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionExecuted: res.actionExecuted,
      };

      setMessages((prev) => [...prev, lucianaMsg]);
    } catch (err: any) {
      console.error('Error enviando mensaje a LUC-IA-NA:', err);
      const errorMsg: LucianaMessage = {
        id: `err-${Date.now()}`,
        sender: 'luciana',
        text: 'Tuve un pequeño tropiezo de conexión. Cuéntame de nuevo qué necesitas y con gusto te ayudo.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome = getInitialLucianaWelcome(currentUser);
    setMessages([welcome]);
    if (currentUser?.id) {
      try {
        const key = `inteckno_luciana_history_${currentUser.id}`;
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(cleanSpecialChars(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPills = [
    { label: '📅 Agendar reunión con Gustavo', question: 'Agenda una cita con Gustavo para mañana a las 8 am por teams' },
    { label: '🚠 Parada técnica Línea K', question: 'Programa una parada técnica nocturna en Pilona 4 de Línea K el martes de 10 PM a 3 AM' },
    { label: '📂 Ir a Documentos', question: 'Llévame al módulo de gestión documental' },
    { label: '📝 Crear tarea STC', question: 'Crea una tarea urgente para inspeccionar el cable tractor de TransMiCable' },
  ];

  return (
    <>
      {/* BOTÓN FLOTANTE CIRCULAR (Posicionado por encima de la barra inferior móvil en pantallas pequeñas) */}
      <div className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 md:bottom-6 md:right-6 z-40 touch-manipulation ${isOpen ? 'hidden md:block' : 'block'}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir asistente inteligente autónoma LUC-IA-NA"
          title="LUC-IA-NA 🌼 Tu compañera inteligente en Inteckno"
          className={`relative group w-12 h-12 sm:w-[50px] sm:h-[50px] rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer select-none active:scale-95 ${
            isOpen
              ? 'bg-slate-800 text-white rotate-90 scale-95 shadow-md'
              : 'bg-[#00668F] hover:bg-[#005073] hover:scale-105 active:scale-95 text-white ring-2 ring-white/60 dark:ring-slate-800/80 shadow-[#00668F]/30 hover:shadow-xl hover:shadow-[#00668F]/40'
          }`}
        >
          {isOpen ? (
            <X size={20} className="transition-transform duration-200" />
          ) : (
            <>
              {/* Margarita central estilizada */}
              <MargaritaIcon
                size={28}
                petalColor="#FFFFFF"
                centerColor="#F59E0B"
                className="group-hover:rotate-45 transition-transform duration-500 ease-out"
              />

              {/* Indicador de estado en línea */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-pulse" />

              {/* Tooltip flotante en hover para desktop */}
              <span className="absolute right-14 bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md backdrop-blur-xs hidden md:flex items-center gap-1.5">
                <span>LUC-IA-NA</span>
                <span className="text-[10px] text-emerald-400 font-normal">● Asistente Activa</span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* VENTANA DE CHAT FLOTANTE DE LUC-IA-NA */}
      {isOpen && (
        <div
          onPaste={handlePaste}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 left-3 sm:left-auto sm:right-6 md:bottom-24 z-50 w-auto sm:w-[410px] h-[550px] max-h-[calc(100vh-6.5rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        >
          {/* HEADER DEL CHAT */}
          <div className="p-3.5 bg-[#00668F] text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <MargaritaIcon size={22} petalColor="#FFFFFF" centerColor="#F59E0B" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm tracking-tight text-white truncate">LUC-IA-NA</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold shrink-0">
                    Control ERP
                  </span>
                </div>
                <p className="text-[10.5px] text-sky-100/90 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>{activeModuleTitle ? `En: ${activeModuleTitle}` : 'En línea para ayudarte'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Reiniciar conversación"
                className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimizar ventana"
                className="w-8 h-8 rounded-xl hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minimize2 size={15} />
              </button>
            </div>
          </div>

          {/* CUERPO DE MENSAJES CON SCROLL */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/70 dark:bg-slate-950/40 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-end gap-1.5 max-w-[88%]">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full aspect-square bg-[#00668F] text-white flex items-center justify-center shrink-0 mb-0.5 shadow-2xs">
                        <MargaritaIcon size={14} petalColor="#FFFFFF" centerColor="#F59E0B" />
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed space-y-2 relative group shadow-2xs ${
                        isUser
                          ? 'bg-[#00668F] text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/70 dark:border-slate-700/80 shadow-xs'
                      }`}
                    >
                      {/* Nota de voz si el mensaje contiene audio */}
                      {msg.audio && msg.audio.url && (
                        <div className="mb-1.5">
                          <ChatAudioPlayer url={msg.audio.url} duration={msg.audio.duration} />
                        </div>
                      )}

                      {/* Transcripción automática de audio */}
                      {msg.transcription && (
                        <div className="text-[10.5px] p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            <Mic size={10} /> Transcripción:
                          </span>
                          <p className="italic">"{msg.transcription}"</p>
                        </div>
                      )}

                      {/* Vista previa de archivo adjunto (imagen o documento) */}
                      {msg.attachment && (
                        <div className="mb-2 p-1.5 rounded-xl bg-white/20 dark:bg-black/20 space-y-1">
                          {msg.attachment.type.startsWith('image/') && msg.attachment.dataUrl ? (
                            <img
                              src={msg.attachment.dataUrl}
                              alt={msg.attachment.name}
                              className="w-full max-h-40 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-1.5">
                              <FileText size={18} className="text-amber-300 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-[11px] block truncate">
                                  {msg.attachment.name}
                                </span>
                                <span className="text-[9.5px] opacity-75">{msg.attachment.size}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Texto del mensaje */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap select-text">{cleanSpecialChars(msg.text)}</p>
                      )}

                      {/* TARJETA DE ACCIÓN EJECUTADA EN EL ERP */}
                      {msg.actionExecuted && (
                        <div
                          className={`mt-2 p-2.5 rounded-xl border text-[11px] space-y-1.5 animate-in fade-in duration-200 ${
                            msg.actionExecuted.success
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                              : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black flex items-center gap-1.5">
                              {msg.actionExecuted.success ? (
                                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ShieldAlert size={13} className="text-rose-600 dark:text-rose-400" />
                              )}
                              <span>
                                {msg.actionExecuted.success
                                  ? 'Acción Ejecutada en el ERP'
                                  : 'Permiso Requerido'}
                              </span>
                            </span>

                            {msg.actionExecuted.success && msg.actionExecuted.targetModule && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.actionExecuted?.targetModule) {
                                    setActiveModule(msg.actionExecuted.targetModule);
                                    setIsOpen(false);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                              >
                                <span>Ir a {getModuleFriendlyLabel(msg.actionExecuted.targetModule)}</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>

                          <p className="text-[10.5px] leading-tight">
                            {msg.actionExecuted.success
                              ? msg.actionExecuted.description
                              : msg.actionExecuted.errorReason || msg.actionExecuted.description}
                          </p>

                          {/* PANEL DE INTEGRACIÓN CON MICROSOFT 365, TEAMS Y OUTLOOK */}
                          {msg.actionExecuted.success &&
                            msg.actionExecuted.targetModule === 'calendario' &&
                            msg.actionExecuted.data && (
                              <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-[10.5px] space-y-2">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>Sincronizado automáticamente en ERP, Teams y Outlook</span>
                                  </div>

                                  {/* Acciones directas limpias: Unirse a Teams o Ver en Outlook */}
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {(msg.actionExecuted.teamsMeetingUrl || msg.actionExecuted.data.teamsMeetingUrl) && (
                                      <a
                                        href={
                                          msg.actionExecuted.teamsMeetingUrl ||
                                          msg.actionExecuted.data.teamsMeetingUrl ||
                                          'https://teams.microsoft.com'
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-1 px-2.5 rounded-lg bg-[#5059C9] hover:bg-[#4349A8] text-white font-bold text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Video size={11} />
                                        <span>Entrar a Teams</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    )}

                                    {msg.actionExecuted.outlookWebLink ? (
                                      <a
                                        href={msg.actionExecuted.outlookWebLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-1 px-2.5 rounded-lg bg-[#0078D4] hover:bg-[#006cbd] text-white font-bold text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Globe size={11} />
                                        <span>Ver en Outlook Web</span>
                                        <ExternalLink size={9} />
                                      </a>
                                    ) : (
                                      <a
                                        href={
                                          msg.actionExecuted.outlookWebComposeUrl ||
                                          getOutlookWebComposeUrl(msg.actionExecuted.data, users)
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="py-1 px-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        <Globe size={10} className="text-[#0078D4]" />
                                        <span>Abrir en Outlook</span>
                                        <ExternalLink size={8} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {/* Botón copiar en hover */}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="absolute -bottom-2 right-2 p-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-800 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
                          title="Copiar respuesta"
                        >
                          {copiedId === msg.id ? (
                            <Check size={11} className="text-emerald-600" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <span className="text-[9.5px] text-slate-400 dark:text-slate-500 px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-[#00668F] text-white flex items-center justify-center shrink-0 mb-0.5">
                  <MargaritaIcon size={14} petalColor="#FFFFFF" centerColor="#F59E0B" />
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-2 shadow-2xs">
                  <MargaritaIcon
                    size={15}
                    petalColor="#00668F"
                    centerColor="#F59E0B"
                    className="animate-spin"
                  />
                  <span>LUC-IA-NA está procesando y ejecutando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGERENCIAS RÁPIDAS (PILLS) */}
          <div className="p-2 bg-slate-100/70 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {quickPills.map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleSendTextMessage(pill.question)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-[10.5px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00668F] hover:text-[#00668F] transition-colors whitespace-nowrap cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* VISTA PREVIA DE ARCHIVO ADJUNTO PENDIENTE */}
          {pendingAttachment && (
            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200/80 dark:border-amber-800 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                {pendingAttachment.type.startsWith('image/') ? (
                  <ImageIcon size={15} className="text-amber-600 shrink-0" />
                ) : (
                  <FileText size={15} className="text-amber-600 shrink-0" />
                )}
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                  {pendingAttachment.name}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0">
                  ({pendingAttachment.size})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPendingAttachment(null)}
                className="w-5 h-5 rounded-full bg-amber-200/70 hover:bg-amber-300 text-amber-900 flex items-center justify-center cursor-pointer"
                title="Quitar archivo"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* INPUT DE ENVÍO / BARRA MULTIMODAL CON GRABACIÓN DE AUDIO */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
            {/* Input oculto para subir archivos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.txt"
              onChange={handleSelectFile}
              className="hidden"
            />

            {/* MODO 1: GRABACIÓN DE AUDIO ACTIVA */}
            {isRecording ? (
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 animate-in fade-in">
                <div className="flex items-center gap-2 pl-2">
                  <span className={`w-3 h-3 rounded-full bg-rose-600 ${isPaused ? '' : 'animate-ping'}`} />
                  <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300">
                    {Math.floor(recordingSeconds / 60)}:
                    {String(recordingSeconds % 60).padStart(2, '0')}
                  </span>
                  <span className="text-[10.5px] text-rose-600 dark:text-rose-400 font-medium hidden sm:inline">
                    {isPaused ? '(Pausado)' : 'Grabando audio...'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Pausar / Continuar */}
                  <button
                    type="button"
                    onClick={togglePauseRecording}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                    title={isPaused ? 'Continuar grabación' : 'Pausar grabación'}
                  >
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  </button>

                  {/* Cancelar */}
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                    title="Descartar audio"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Enviar Audio */}
                  <button
                    type="button"
                    onClick={finishAndSendAudio}
                    className="py-1 px-2.5 rounded-lg bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-transform active:scale-95"
                    title="Enviar nota de voz"
                  >
                    <Send size={12} />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            ) : (
              /* MODO 2: INPUT NORMAL DE TEXTO, ADJUNTAR Y MICRÓFONO */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTextMessage();
                }}
                className="flex items-center gap-1.5"
              >
                {/* Botón Adjuntar Archivo o Imagen */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar imagen, foto o documento PDF (También puedes pegar con Ctrl+V)"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Paperclip size={16} />
                </button>

                {/* Input de texto */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe o pide lo que sea a LUC-IA-NA..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-[#00668F] outline-none transition-all placeholder:text-slate-400"
                />

                {/* Botón Grabar Nota de Voz */}
                <button
                  type="button"
                  onClick={startRecordingAudio}
                  disabled={isLoading}
                  title="Grabar nota de voz"
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                >
                  <Mic size={16} />
                </button>

                {/* Botón Enviar Texto */}
                <button
                  type="submit"
                  disabled={(!inputMessage.trim() && !pendingAttachment) || isLoading}
                  className="w-9 h-9 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                  title="Enviar solicitud"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
