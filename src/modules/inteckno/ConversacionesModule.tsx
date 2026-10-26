import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Hash,
  Search,
  Users,
  UserPlus,
  Paperclip,
  Camera,
  Image as ImageIcon,
  Radio,
  Reply,
  X,
  CornerDownRight,
  CheckCheck,
  Plus,
  FileText,
  Download,
  Info,
  Check,
  MessageSquare,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AtSign,
  User,
  Video,
  RefreshCw,
  Mic,
  Square,
  Sparkles,
  Cpu,
  CheckSquare,
  AlertTriangle,
  Layers,
  ShieldAlert,
  Wrench,
  ShoppingCart,
  Loader2,
  Volume2,
  Play,
  Pause,
  Flame,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  CheckCircle2,
  Key,
  Pin,
  PinOff,
  Star,
  Edit2,
  Share2,
  MoreVertical,
  MoreHorizontal,
  Bookmark,
} from 'lucide-react';
import { useErp, normalizeChannelId } from '../../core/storage/erpStore';
import { ChatMessage, ChatGroup } from '../../types';
import {
  transcribeAndExtractVoiceNote,
  analyzeInspectionImage,
  summarizeConversationThread,
  analyzeMessageForOperationalAction,
  blobToBase64,
  getGeminiApiKey,
  saveGeminiApiKey,
  testGeminiApiKey,
} from '../../core/services/geminiChatService';

// =========================================================================
// REPRODUCTOR DE NOTAS DE VOZ ESTILO WHATSAPP (SIN FONDO NEGRO NI CONTROLES BRUSCOS)
// =========================================================================
interface WhatsAppAudioPlayerProps {
  audioUrl?: string;
  base64Audio?: string;
  mimeType?: string;
  duration?: number;
  isMe: boolean;
}

const WhatsAppAudioPlayer: React.FC<WhatsAppAudioPlayerProps> = ({
  audioUrl,
  base64Audio,
  mimeType,
  duration: initialDuration,
  isMe,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playableSrc, setPlayableSrc] = useState<string>('');

  // Reconstrucción garantizada de Blob a partir de base64 para que el audio NUNCA expire tras recargar
  useEffect(() => {
    let objectUrlToRevoke = '';

    const rawBase64 = base64Audio || (audioUrl?.startsWith('data:') ? audioUrl.split(',')[1] : null);
    if (rawBase64) {
      try {
        const cleanBase64 = rawBase64.replace(/\s/g, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const cleanMime = mimeType || 'audio/webm';
        const blob = new Blob([byteArray], { type: cleanMime });
        const url = URL.createObjectURL(blob);
        objectUrlToRevoke = url;
        setPlayableSrc(url);
        return;
      } catch (e) {
        console.warn('Error decodificando audio base64 en player:', e);
      }
    }

    if (audioUrl) {
      setPlayableSrc(audioUrl);
    }

    return () => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [audioUrl, base64Audio, mimeType]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playableSrc]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !playableSrc) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio play error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const seekTime = Number(e.target.value);
    setCurrentTime(seekTime);
    if (audio) {
      audio.currentTime = seekTime;
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audio) {
      audio.playbackRate = nextRate;
    }
  };

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`p-2.5 rounded-2xl flex items-center gap-2.5 w-full max-w-[320px] transition-all select-none ${
        isMe
          ? 'bg-white/15 text-white'
          : 'bg-slate-100 text-slate-800 border border-slate-200/80 shadow-2xs'
      }`}
    >
      {playableSrc && (
        <audio
          ref={audioRef}
          src={playableSrc}
          preload="metadata"
          className="hidden"
        />
      )}

      {/* Botón Circular Play / Pause WhatsApp */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer outline-none focus:outline-none ${
          isMe
            ? 'bg-white text-[#00668F] hover:bg-sky-50'
            : 'bg-[#00668F] text-white hover:bg-[#004f70]'
        }`}
        title={isPlaying ? 'Pausar nota de voz' : 'Reproducir nota de voz'}
      >
        {isPlaying ? (
          <Pause size={15} className="fill-current" />
        ) : (
          <Play size={15} className="fill-current ml-0.5" />
        )}
      </button>

      {/* Barra de progreso y tiempos */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none focus:outline-none accent-[#00668F]"
            style={{
              background: isMe
                ? `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%)`
                : `linear-gradient(to right, #00668F ${progressPercent}%, #cbd5e1 ${progressPercent}%)`,
            }}
          />
        </div>

        <div
          className={`flex items-center justify-between text-[10px] mt-1 font-mono font-medium ${
            isMe ? 'text-sky-100' : 'text-slate-500'
          }`}
        >
          <span>{formatSecs(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Mic size={10} className="opacity-70" />
            {formatSecs(duration)}
          </span>
        </div>
      </div>

      {/* Selector de velocidad (1x, 1.5x, 2x) */}
      <button
        type="button"
        onClick={cyclePlaybackRate}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono transition-colors cursor-pointer shrink-0 outline-none focus:outline-none ${
          isMe
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
        }`}
        title="Velocidad de reproducción"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

export const ConversacionesModule: React.FC = () => {
  const {
    chatMessages,
    chatGroups,
    activeChatChannelId,
    setActiveChatChannel,
    markChatAsRead,
    markAllChatsAsRead,
    addChatMessage,
    updateChatMessage,
    deleteChatMessage,
    deleteChatMessageForMe,
    createChatGroup,
    addMembersToChatGroup,
    getOrCreateDirectChat,
    users,
    currentUser,
    projects,
    addTodo,
    addWbsTask,
    submitDDR,
    updateProject,
    createRequisition,
    notify,
  } = useErp();

  // Solo visible para usuarios con acceso a TODOS los módulos (Administración TI y Gerencia General / Administrativa)
  const canManageGeminiKey = Boolean(
    currentUser?.role === 'admin_sistemas' ||
    currentUser?.role === 'gerente_general' ||
    currentUser?.role === 'gerente_administrativa'
  );

  // Canal o grupo activo sincronizado con el Store global
  const [activeGroupId, setActiveGroupId] = useState<string>(activeChatChannelId || 'general');
  // En móvil: alternar entre vista de lista de canales y vista de chat activo
  const [mobileChatView, setMobileChatView] = useState<'list' | 'chat'>('list');

  // Sincronizar si cambia desde afuera (ej: clic en pop-up de notificación)
  useEffect(() => {
    if (activeChatChannelId && activeChatChannelId !== activeGroupId) {
      setActiveGroupId(activeChatChannelId);
      setMobileChatView('chat');
    }
  }, [activeChatChannelId]);

  // Marcar automáticamente como leídos los mensajes del chat en visualización
  useEffect(() => {
    if (activeGroupId && currentUser?.id) {
      markChatAsRead(activeGroupId, currentUser.id);
    }
  }, [activeGroupId, chatMessages.length, currentUser?.id, markChatAsRead]);

  const [chatTab, setChatTab] = useState<'todos' | 'proyectos' | 'grupos' | 'directos'>('todos');
  const [chatInput, setChatInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Estados de Grabación de Notas de Voz de Campo
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<any>(null);

  // Estados de Diagnóstico Gemini Vision para Inspecciones
  const [analyzingImageId, setAnalyzingImageId] = useState<string | null>(null);

  // Estados del Resumidor Ejecutivo de Hilos y Canales (Gemini IA con soporte de períodos y multimedia)
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState<'hoy' | '24h' | '3dias' | '7dias' | 'todo' | 'personalizado'>('hoy');
  const [summaryCustomDate, setSummaryCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [threadSummary, setThreadSummary] = useState<{
    statusSummary: string;
    commitments: Array<{ task: string; responsible: string; priority: string }>;
    blockers: string[];
    totalAnalyzed?: number;
    hasMediaIncluded?: boolean;
  } | null>(null);

  // Estados para Convertir Mensaje en Acción Operativa con Asistencia Inteligente LUC-IA-NA
  const [actionModalMessage, setActionModalMessage] = useState<ChatMessage | null>(null);
  const [actionType, setActionType] = useState<'tarea' | 'hseq' | 'compra'>('tarea');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionPriority, setActionPriority] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [actionProjectCode, setActionProjectCode] = useState('PRJ-01');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isAnalyzingAction, setIsAnalyzingAction] = useState(false);
  const [actionLucianaBadge, setActionLucianaBadge] = useState<string | null>(null);

  // Campos específicos enriquecidos por LUC-IA-NA para cada módulo
  const [wbsEstimatedHours, setWbsEstimatedHours] = useState<number>(4);
  const [wbsAssignedRole, setWbsAssignedRole] = useState<string>('Técnico Especialista STC');
  const [hseqIncidentType, setHseqIncidentType] = useState<string>('Condición Insegura');
  const [hseqImmediateAction, setHseqImmediateAction] = useState<string>('');
  const [hseqLocation, setHseqLocation] = useState<string>('Pilona 4');
  const [reqProductName, setReqProductName] = useState<string>('');
  const [reqProductQty, setReqProductQty] = useState<number>(1);
  const [reqProductUnit, setReqProductUnit] = useState<string>('unidades');
  const [reqProductSku, setReqProductSku] = useState<string>('REP-OEM-STC');

  // Colapsables de transcripciones de audio
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Record<string, boolean>>({});

  // Menciones con @
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);

  // Estados de adjuntos (fotos / documentos / audio)
  const [attachedFile, setAttachedFile] = useState<{
    type: 'image' | 'file' | 'audio';
    url: string;
    name: string;
    size: string;
    base64Data?: string;
    mimeType?: string;
    duration?: number;
  } | null>(null);

  // Modales
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isNewDirectModalOpen, setIsNewDirectModalOpen] = useState(false);
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; model?: string } | null>(null);

  useEffect(() => {
    if (isApiKeyModalOpen) {
      setGeminiKeyInput(getGeminiApiKey());
      setTestResult(null);
    }
  }, [isApiKeyModalOpen]);
  const [groupInfoTab, setGroupInfoTab] = useState<'miembros' | 'fotos' | 'documentos' | 'enlaces' | 'destacados'>('miembros');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Estados para Acciones sobre Mensajes (Editar, Eliminar, Reenviar, Fijar, Favoritos)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [forwardModalMsg, setForwardModalMsg] = useState<ChatMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState<ChatMessage | null>(null);
  const [deleteForMeConfirmMsg, setDeleteForMeConfirmMsg] = useState<ChatMessage | null>(null);
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage; x: number; y: number } | null>(null);

  // Cerrar menús al hacer clic fuera o presionar Esc
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownMsgId(null);
      setContextMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownMsgId(null);
        setContextMenu(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Cámara y Video en Pantalla Completa
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'foto' | 'video'>('foto');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Formulario nuevo grupo
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Añadir participante al grupo actual
  const [memberToAddId, setMemberToAddId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Grupo o chat activo actual
  const currentGroup: ChatGroup =
    chatGroups.find((g) => g.id === activeGroupId) ||
    chatGroups[0] || {
      id: 'general',
      name: 'General INTECKNO',
      description: 'Comunicaciones directas de toda la empresa',
      createdBy: 'USR-07',
      createdAt: '2026-01-01',
      members: ['USR-07'],
      isCustom: false,
    };

  // Obtener información del interlocutor para chats directos 1 a 1 (siempre el otro participante)
  const otherParticipantId = currentGroup.members.find((m) => m !== currentUser.id) || currentGroup.directPartnerId;
  const directPartner = currentGroup.isDirect
    ? users.find((u) => u.id === otherParticipantId)
    : null;

  // Mensajes visibles para el colaborador activo (excluye aquellos que eliminó 'para mí')
  const visibleChatMessages = useMemo(() => {
    let localDeletedSet = new Set<string>();
    try {
      const raw = localStorage.getItem(`ITK_DELETED_FOR_ME_${currentUser.id}`);
      if (raw) {
        localDeletedSet = new Set(JSON.parse(raw));
      }
    } catch {}

    return chatMessages.filter((m) => {
      if (m.deletedForUserIds && m.deletedForUserIds.includes(currentUser.id)) return false;
      if (localDeletedSet.has(m.id)) return false;
      return true;
    });
  }, [chatMessages, currentUser.id]);

  // Conteo de mensajes no leídos por pestañas (solo canales a los que el usuario pertenece)
  const totalUnreadGrupos = useMemo(() => {
    return visibleChatMessages.filter((m) => {
      const g = chatGroups.find((grp) => grp.id === m.channel);
      if (!g || g.isDirect) return false;
      // Solo contar si el usuario es miembro del grupo
      if (g.members && g.members.length > 0 && !g.members.includes(currentUser.id)) return false;
      // No contar si el usuario ya tiene este chat abierto actualmente
      if (activeGroupId === g.id) return false;
      return m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id));
    }).length;
  }, [visibleChatMessages, chatGroups, currentUser.id, activeGroupId]);

  const totalUnreadProyectos = useMemo(() => {
    return visibleChatMessages.filter((m) => {
      const g = chatGroups.find((grp) => grp.id === m.channel);
      if (!g || (!g.linkedProjectId && g.category !== 'proyecto')) return false;
      if (activeGroupId === g.id) return false;
      return m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id));
    }).length;
  }, [visibleChatMessages, chatGroups, currentUser.id, activeGroupId]);

  const totalUnreadDirectos = useMemo(() => {
    return visibleChatMessages.filter((m) => {
      const normChannel = normalizeChannelId(m.channel);
      const g = chatGroups.find((grp) => grp.id === normChannel || grp.id === m.channel);
      const isDirect = (g && g.isDirect) || normChannel.startsWith('dm-');
      if (!isDirect) return false;

      // El usuario activo DEBE ser uno de los participantes del chat directo
      if (g && g.members && !g.members.includes(currentUser.id)) return false;
      if (normChannel.startsWith('dm-') && !normChannel.includes(currentUser.id)) return false;

      // No contar si el usuario ya está viendo este chat directo
      if (activeGroupId === normChannel || (g && activeGroupId === g.id)) return false;

      return m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id));
    }).length;
  }, [visibleChatMessages, chatGroups, currentUser.id, activeGroupId]);

  const totalUnreadTodos = totalUnreadGrupos + totalUnreadProyectos + totalUnreadDirectos;

  // Filtrado de grupos según la pestaña activa (los chats directos solo se muestran a sus miembros)
  const displayedGroups = chatGroups.filter((g) => {
    if (g.isDirect && !g.members.includes(currentUser.id)) return false;
    if (chatTab === 'proyectos') return Boolean(g.linkedProjectId || g.category === 'proyecto');
    if (chatTab === 'grupos') return !g.isDirect && !g.linkedProjectId && g.category !== 'proyecto';
    if (chatTab === 'directos') return g.isDirect;
    return true;
  });

  // BÚSQUEDA GLOBAL: Grupos, personas y mensajes en toda la empresa
  const searchQuery = searchFilter.trim().toLowerCase();
  const searchMatchingGroups = searchQuery
    ? chatGroups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery) ||
          g.description.toLowerCase().includes(searchQuery)
      )
    : [];

  const searchMatchingUsers = searchQuery
    ? users.filter(
        (u) =>
          u.id !== currentUser.id &&
          (u.name.toLowerCase().includes(searchQuery) ||
            u.roleLabel.toLowerCase().includes(searchQuery) ||
            u.department.toLowerCase().includes(searchQuery))
      )
    : [];

  const searchMatchingMessages = searchQuery
    ? visibleChatMessages.filter(
        (m) =>
          m.text.toLowerCase().includes(searchQuery) ||
          m.senderName.toLowerCase().includes(searchQuery)
      )
    : [];

  // Mensajes del chat activo
  const activeChatMessages = visibleChatMessages.filter((m) => m.channel === currentGroup.id);
  // Mensajes fijados en este canal
  const pinnedMessages = activeChatMessages.filter((m) => m.isPinned);
  // Mensajes destacados / favoritos del usuario actual en este canal
  const starredMessages = activeChatMessages.filter((m) => m.starredBy && m.starredBy.includes(currentUser.id));

  // Miembros actuales del chat
  const currentGroupMembers = users.filter((u) => currentGroup.members.includes(u.id));
  const nonGroupMembers = users.filter((u) => !currentGroup.members.includes(u.id));

  // Detector de archivos de video (excluyendo notas de voz o audios de campo)
  const isVideoAttachment = (att?: { type: string; name?: string; url?: string } | null) => {
    if (!att) return false;
    if (att.type === 'audio') return false;
    const name = (att.name || '').toLowerCase();
    if (
      name.startsWith('notavoz') ||
      name.startsWith('audio') ||
      name.includes('nota_voz') ||
      name.includes('audio-') ||
      name.includes('audio_')
    ) {
      return false;
    }
    return (
      att.type === 'video' ||
      (name.endsWith('.webm') && (name.includes('video') || att.type === 'video')) ||
      name.endsWith('.mp4') ||
      name.endsWith('.mov') ||
      (Boolean(att.url?.startsWith('blob:')) && name.includes('video'))
    );
  };

  // Archivos multimedia y documentos del grupo actual (Estilo WhatsApp)
  const groupMediaAttachments = activeChatMessages.filter(
    (m) => m.attachment && (m.attachment.type === 'image' || isVideoAttachment(m.attachment))
  );
  const groupDocAttachments = activeChatMessages.filter(
    (m) => m.attachment && m.attachment.type === 'file' && !isVideoAttachment(m.attachment)
  );
  const groupLinks = activeChatMessages
    .filter((m) => m.text && (m.text.includes('http://') || m.text.includes('https://') || m.text.includes('sharepoint.com')))
    .map((m) => {
      const match = m.text.match(/(https?:\/\/[^\s]+)/g);
      return {
        url: match ? match[0] : '',
        sender: m.senderName,
        timestamp: m.timestamp,
        text: m.text,
      };
    })
    .filter((l) => Boolean(l.url));

  // Auto-scroll al recibir o enviar un nuevo mensaje o completar diagnóstico
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages.length, activeGroupId, attachedFile, analyzingImageId]);

  // =========================================================================
  // REGLA DE LOS 15 MINUTOS Y ACCIONES SOBRE MENSAJES (EDITAR, ELIMINAR, ETC.)
  // =========================================================================
  const getMessageAgeMs = (msg: ChatMessage): number => {
    if (typeof msg.createdAt === 'number') {
      return Math.max(0, Date.now() - msg.createdAt);
    }
    if (typeof msg.createdAt === 'string') {
      const parsed = new Date(msg.createdAt).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(0, Date.now() - parsed);
      }
    }
    // Fallback: extraer timestamp del id MSG-<timestamp>-...
    const parts = msg.id.split('-');
    if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
      const ts = Number(parts[1]);
      if (ts > 1600000000000) {
        return Math.max(0, Date.now() - ts);
      }
    }
    return 0;
  };

  const isWithin15Minutes = (msg: ChatMessage): boolean => {
    return getMessageAgeMs(msg) <= 15 * 60 * 1000;
  };

  const getRemainingMinutes = (msg: ChatMessage): number => {
    const ageMs = getMessageAgeMs(msg);
    const remainingMs = Math.max(0, 15 * 60 * 1000 - ageMs);
    return Math.ceil(remainingMs / 60000);
  };

  const handleToggleStar = (msg: ChatMessage) => {
    const currentStarred = msg.starredBy || [];
    const isStarred = currentStarred.includes(currentUser.id);
    const newStarred = isStarred
      ? currentStarred.filter((id) => id !== currentUser.id)
      : [...currentStarred, currentUser.id];

    updateChatMessage(msg.id, { starredBy: newStarred });
    notify(
      'info',
      isStarred ? 'Eliminado de Destacados' : 'Añadido a Destacados',
      isStarred ? 'El mensaje ya no está en tus favoritos.' : 'El mensaje se guardó en tus mensajes destacados.'
    );
  };

  const handleTogglePin = (msg: ChatMessage) => {
    const willPin = !msg.isPinned;
    updateChatMessage(msg.id, {
      isPinned: willPin,
      pinnedAt: willPin ? new Date().toISOString() : undefined,
      pinnedBy: willPin ? currentUser.name : undefined,
    });
    notify(
      'info',
      willPin ? 'Mensaje Fijado' : 'Mensaje Desfijado',
      willPin ? 'El mensaje ha sido fijado en la cabecera del canal.' : 'El mensaje fue retirado de los fijados.'
    );
  };

  const handleStartEdit = (msg: ChatMessage) => {
    if (!isWithin15Minutes(msg)) {
      notify('urgent', 'Edición no permitida', 'Solo puedes editar mensajes durante los primeros 15 minutos.');
      return;
    }
    setEditingMessage(msg);
    setChatInput(msg.text || '');
    setReplyingTo(null);
    setAttachedFile(null);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setChatInput('');
  };

  const handleStartForward = (msg: ChatMessage) => {
    setForwardModalMsg(msg);
    setForwardSearch('');
  };

  const handleConfirmForward = (targetChannelId: string) => {
    if (!forwardModalMsg) return;

    const extraMeta: Partial<ChatMessage> = {
      isForwarded: true,
      attachment: forwardModalMsg.attachment,
      audioData: forwardModalMsg.audioData,
      transcriptionText: forwardModalMsg.transcriptionText,
      aiExtraction: forwardModalMsg.aiExtraction,
      aiAnalysis: forwardModalMsg.aiAnalysis,
    };

    addChatMessage(
      targetChannelId,
      forwardModalMsg.text || (forwardModalMsg.attachment ? `[Archivo: ${forwardModalMsg.attachment.name}]` : ''),
      undefined,
      forwardModalMsg.attachment,
      extraMeta
    );

    const targetGroup = chatGroups.find((g) => g.id === targetChannelId);
    notify('success', 'Mensaje Reenviado', `Mensaje reenviado exitosamente a ${targetGroup?.name || 'chat'}.`);
    setForwardModalMsg(null);
  };

  const handleStartDelete = (msg: ChatMessage) => {
    if (!isWithin15Minutes(msg)) {
      notify('urgent', 'Eliminación no permitida', 'Solo puedes eliminar mensajes durante los primeros 15 minutos.');
      return;
    }
    setDeleteConfirmMsg(msg);
  };

  const confirmDeleteMessage = () => {
    if (!deleteConfirmMsg) return;
    if (!isWithin15Minutes(deleteConfirmMsg)) {
      notify('urgent', 'Tiempo expirado', 'Han pasado más de 15 minutos. No es posible eliminar el mensaje.');
      setDeleteConfirmMsg(null);
      return;
    }
    deleteChatMessage(deleteConfirmMsg.id);
    setDeleteConfirmMsg(null);
  };

  const confirmDeleteMessageForMe = () => {
    if (!deleteForMeConfirmMsg) return;
    deleteChatMessageForMe(deleteForMeConfirmMsg.id);
    setDeleteForMeConfirmMsg(null);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-100/40', 'rounded-2xl', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-100/40');
      }, 2500);
    }
  };

  // Clampear posición del menú contextual para evitar que se desborde de la pantalla
  const contextMenuPos = useMemo(() => {
    if (!contextMenu) return { x: 0, y: 0 };
    const menuWidth = 230;
    const menuHeight = 310;
    const maxX = (typeof window !== 'undefined' ? window.innerWidth : 1200) - menuWidth - 12;
    const maxY = (typeof window !== 'undefined' ? window.innerHeight : 800) - menuHeight - 12;
    return {
      x: Math.max(10, Math.min(contextMenu.x, maxX)),
      y: Math.max(10, Math.min(contextMenu.y, maxY)),
    };
  }, [contextMenu]);

  // Renderizar opciones del menú (compartido entre 3 puntos y clic derecho)
  const renderMessageMenuItems = (msg: ChatMessage, onClose: () => void) => {
    const isStarred = msg.starredBy?.includes(currentUser.id);
    const isPinned = Boolean(msg.isPinned);
    const within15m = isWithin15Minutes(msg);
    const remainingMins = getRemainingMinutes(msg);
    const isAuthor = msg.senderId === currentUser.id;
    const isSystemAdmin = currentUser.role === 'admin_sistemas';
    const isTextMessage = Boolean(
      msg.text &&
      msg.text.trim() &&
      !msg.attachment &&
      !msg.audioData &&
      !msg.text.startsWith('🎤')
    );
    const canEdit = isAuthor && isTextMessage;
    const canDelete = isAuthor || isSystemAdmin;

    return (
      <div className="py-1">
        {/* Responder */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStartReply(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-sky-50 hover:text-[#00668F] flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <Reply size={14} className="text-[#00668F]" />
          <span className="font-semibold">Responder</span>
        </button>

        {/* Destacar / Favorito */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStar(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-amber-50 hover:text-amber-800 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Star
              size={14}
              className={isStarred ? 'text-amber-500 fill-amber-500' : 'text-amber-500'}
            />
            <span className="font-semibold">{isStarred ? 'Quitar de favoritos' : 'Añadir a favoritos'}</span>
          </div>
          {isStarred && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">Activo</span>}
        </button>

        {/* Fijar en canal */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-amber-50 hover:text-amber-800 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Pin
              size={14}
              className={isPinned ? 'text-amber-600 fill-amber-600' : 'text-slate-500'}
            />
            <span className="font-semibold">{isPinned ? 'Desfijar de este canal' : 'Fijar mensaje en canal'}</span>
          </div>
          {isPinned && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">Fijado</span>}
        </button>

        {/* Reenviar mensaje */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStartForward(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-sky-50 hover:text-[#00668F] flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <Share2 size={14} className="text-slate-600" />
          <span className="font-semibold">Reenviar a otro chat</span>
        </button>

        {/* Convertir en Tarea / HSEQ */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenActionConverter(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-sky-50 hover:text-[#00668F] flex items-center gap-2.5 transition-colors cursor-pointer"
        >
          <CheckSquare size={14} className="text-[#00668F]" />
          <span className="font-semibold">Crear Tarea / HSEQ</span>
        </button>

        {/* Copiar texto */}
        {msg.text && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(msg.text);
              notify('info', 'Texto Copiado', 'Mensaje copiado al portapapeles.');
              onClose();
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer text-slate-700"
          >
            <Copy size={14} className="text-slate-500" />
            <span>Copiar texto</span>
          </button>
        )}

        {/* Opciones con restricción estricta de 15 minutos */}
        {(canEdit || canDelete) && <div className="border-t border-slate-100 my-1" />}

        {/* Editar (Solo autor y <= 15 min) */}
        {canEdit && (
          within15m ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(msg);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-sky-50 text-[#00668F] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold">
                <Edit2 size={14} className="text-[#00668F]" />
                <span>Editar mensaje</span>
              </div>
              <span className="text-[9.5px] bg-sky-100 text-[#00668F] px-1.5 py-0.2 rounded-full font-bold">
                {remainingMins} min
              </span>
            </button>
          ) : (
            <div
              className="w-full px-3 py-2 text-left text-slate-400 flex items-center justify-between cursor-not-allowed select-none opacity-60"
              title="Han transcurrido más de 15 minutos desde el envío. No se puede editar."
            >
              <div className="flex items-center gap-2.5">
                <Edit2 size={14} />
                <span>Editar mensaje</span>
              </div>
              <span className="text-[8.5px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full">
                Expiró (&gt;15 min)
              </span>
            </div>
          )
        )}

        <div className="border-t border-slate-100 my-1" />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteForMeConfirmMsg(msg);
            onClose();
          }}
          className="w-full px-3 py-2 text-left hover:bg-slate-100 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 font-bold">
            <Trash2 size={14} className="text-slate-500" />
            <span>Eliminar para mí</span>
          </div>
          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
            Siempre
          </span>
        </button>

        {canDelete && (
          within15m ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartDelete(msg);
                onClose();
              }}
              className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 font-bold">
                <Trash2 size={14} className="text-rose-600" />
                <span>Eliminar para todos</span>
              </div>
              <span className="text-[9.5px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
                {remainingMins} min
              </span>
            </button>
          ) : (
            <div
              className="w-full px-3 py-2 text-left text-slate-400 flex items-center justify-between cursor-not-allowed select-none opacity-60"
              title="Han transcurrido más de 15 minutos desde el envío. No se puede eliminar para todos."
            >
              <div className="flex items-center gap-2.5">
                <Trash2 size={14} />
                <span>Eliminar para todos</span>
              </div>
              <span className="text-[8.5px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full">
                Expiró (&gt;15 min)
              </span>
            </div>
          )
        )}
      </div>
    );
  };

  // Manejador de menciones con @ al escribir
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtSign = textBeforeCursor.lastIndexOf('@');

    if (lastAtSign !== -1) {
      const query = textBeforeCursor.slice(lastAtSign + 1);
      // Solo si no hay espacios después del @
      if (!query.includes(' ')) {
        setMentionQuery(query.toLowerCase());
        setMentionIndex(lastAtSign);
        return;
      }
    }
    setMentionQuery(null);
    setMentionIndex(-1);
  };

  const handleSelectMention = (userName: string) => {
    if (mentionIndex === -1) return;
    const before = chatInput.slice(0, mentionIndex);
    const after = chatInput.slice(mentionIndex + (mentionQuery?.length || 0) + 1);
    const updated = `${before}@${userName} ${after}`;
    setChatInput(updated);
    setMentionQuery(null);
    setMentionIndex(-1);
    inputRef.current?.focus();
  };

  const matchingMentionUsers = mentionQuery !== null
    ? currentGroupMembers.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery) ||
        m.roleLabel.toLowerCase().includes(mentionQuery)
      )
    : [];

  const handleStartReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Manejo de carga de archivos (imágenes / fotos / documentos)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        setAttachedFile({
          type: 'image',
          url: dataUrl,
          name: file.name,
          size: sizeStr,
          base64Data,
          mimeType: file.type || 'image/jpeg',
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile({
        type: 'file',
        url: URL.createObjectURL(file),
        name: file.name,
        size: sizeStr,
      });
    }

    e.target.value = '';
    inputRef.current?.focus();
  };

  // CONTROL DE CÁMARA Y VIDEO (Pantalla Completa, Zoom, Frontal/Trasera, Grabación)
  useEffect(() => {
    if (isCameraModalOpen && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((err) => console.warn('Error al reproducir stream de cámara:', err));
    }
  }, [isCameraModalOpen, cameraStream]);

  const startCamera = async (targetFacing = facingMode) => {
    setIsCameraModalOpen(true);
    setCameraError(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setZoomLevel(1);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no está disponible en este dispositivo o navegador.');
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: targetFacing,
          },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: targetFacing,
          },
          audio: false,
        });
      }
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('No se pudo acceder a la cámara en vivo:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
    }
  };

  const stopCamera = () => {
    if (isRecording) {
      stopRecording();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setCameraStream(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const srcStream = videoRef.current.srcObject as MediaStream;
      srcStream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsCameraModalOpen(false);
  };

  // Limpieza estricta de cámara cuando el modal se cierra o desmonta
  useEffect(() => {
    if (!isCameraModalOpen) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        setCameraStream(null);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const srcStream = videoRef.current.srcObject as MediaStream;
        srcStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraModalOpen, cameraStream]);

  const toggleFacingMode = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    await startCamera(nextFacing);
  };

  const handleSetZoom = (level: number) => {
    setZoomLevel(level);
    if (cameraStream) {
      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          try {
            (track as any).applyConstraints({
              advanced: [{ zoom: Math.min(Math.max(level, capabilities.zoom.min), capabilities.zoom.max) }],
            });
          } catch {
            // Transformación CSS actúa como respaldo
          }
        }
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (zoomLevel > 1) {
        const sw = vw / zoomLevel;
        const sh = vh / zoomLevel;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, vw, vh);
      } else {
        ctx.drawImage(video, 0, 0, vw, vh);
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const photoName = `Foto-Campo-${Date.now().toString().slice(-4)}.jpg`;
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setAttachedFile({
        type: 'image',
        url: dataUrl,
        name: photoName,
        size: '1.2 MB',
        base64Data,
        mimeType: 'image/jpeg',
      });
      stopCamera();
      inputRef.current?.focus();
    }
  };

  const startRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(cameraStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
        const videoName = `Video-Campo-${Date.now().toString().slice(-4)}.webm`;
        setAttachedFile({
          type: 'file',
          url: videoUrl,
          name: videoName,
          size: `${sizeMB === '0.0' ? '1.4' : sizeMB} MB`,
        });
        stopCamera();
        inputRef.current?.focus();
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error al iniciar grabación de video:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedFile) return;

    // Si estamos en modo edición (con validación de 15 minutos)
    if (editingMessage) {
      if (!chatInput.trim()) return;

      if (!isWithin15Minutes(editingMessage)) {
        notify('urgent', 'Tiempo Expirado', 'Han transcurrido más de 15 minutos desde el envío. No es posible editar este mensaje.');
        setEditingMessage(null);
        setChatInput('');
        return;
      }

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = Number(hours) >= 12 ? 'PM' : 'AM';
      const timeStr = `${hours}:${mins} ${ampm}`;

      updateChatMessage(editingMessage.id, {
        text: chatInput.trim(),
        isEdited: true,
        editedAt: timeStr,
      });

      notify('success', 'Mensaje Editado', 'Tu mensaje ha sido actualizado correctamente.');
      setEditingMessage(null);
      setChatInput('');
      return;
    }

    const replyPayload = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text,
        }
      : undefined;

    const extraMeta: Partial<ChatMessage> = {
      linkedProjectId: currentGroup.linkedProjectId,
      isEmergency: currentGroup.isEmergency,
    };

    addChatMessage(
      currentGroup.id,
      chatInput.trim(),
      replyPayload,
      attachedFile || undefined,
      extraMeta
    );

    setChatInput('');
    setAttachedFile(null);
    setReplyingTo(null);
    setMentionQuery(null);
  };

  // =========================================================================
  // GRABACIÓN DE NOTAS DE VOZ EN CAMPO CON EXTRACCIÓN INTELIGENTE GEMINI
  // =========================================================================
  const handleStartVoiceRecord = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        notify('urgent', 'Error de Micrófono', 'La API de audio no está disponible en este navegador o dispositivo.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(voiceChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSec = voiceDuration;

        setIsProcessingVoice(true);
        const base64Audio = await blobToBase64(audioBlob);

        const tempMsgId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const replyPayload = replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              text: replyingTo.text.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text,
            }
          : undefined;

        // Registrar nota de voz de inmediato en la conversación
        addChatMessage(
          currentGroup.id,
          '🎤 Nota de voz técnica de campo',
          replyPayload,
          {
            type: 'audio',
            url: audioUrl,
            name: `NotaVoz-${Date.now().toString().slice(-4)}.webm`,
            duration: durationSec,
            mimeType,
            base64Data: base64Audio,
          },
          {
            id: tempMsgId,
            audioData: {
              base64: base64Audio,
              durationSeconds: durationSec,
              mimeType,
            },
            aiStatus: 'processing',
            linkedProjectId: currentGroup.linkedProjectId,
            isEmergency: currentGroup.isEmergency,
          }
        );

        setReplyingTo(null);

        // Procesamiento en segundo plano con Google Gemini Multimodal
        try {
          const res = await transcribeAndExtractVoiceNote(
            base64Audio,
            mimeType,
            currentGroup.name
          );

          updateChatMessage(tempMsgId, {
            transcriptionText: res.transcription,
            aiExtraction: res.extraction,
            aiStatus: 'done',
          });

          if (res.extraction && res.extraction.severity === 'critico') {
            notify(
              'urgent',
              '🚨 ALERTA CRÍTICA EXTRAÍDA POR GEMINI',
              `${res.extraction.equipmentComponent || 'Componente'} (${res.extraction.locationTower || 'STC'}): ${res.extraction.summary}`
            );
          }
        } catch (err) {
          console.error('Error procesando audio con Gemini:', err);
          updateChatMessage(tempMsgId, { aiStatus: 'error' });
        } finally {
          setIsProcessingVoice(false);
        }
      };

      voiceRecorderRef.current = recorder;
      recorder.start(100);
      setIsVoiceRecording(true);
      setIsVoicePaused(false);
      setVoiceDuration(0);
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accediendo al micrófono:', err);
      notify('urgent', 'Error de Micrófono', err.message || 'No se pudo acceder al micrófono.');
    }
  };

  const handlePauseVoiceRecord = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state === 'recording') {
      try {
        voiceRecorderRef.current.pause();
        setIsVoicePaused(true);
        if (voiceTimerRef.current) {
          clearInterval(voiceTimerRef.current);
          voiceTimerRef.current = null;
        }
      } catch (err) {
        console.warn('Error pausando grabación de voz:', err);
      }
    }
  };

  const handleResumeVoiceRecord = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state === 'paused') {
      try {
        voiceRecorderRef.current.resume();
        setIsVoicePaused(false);
        voiceTimerRef.current = setInterval(() => {
          setVoiceDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.warn('Error reanudando grabación de voz:', err);
      }
    }
  };

  const handleStopVoiceRecord = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
      voiceRecorderRef.current.stop();
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setIsVoiceRecording(false);
    setIsVoicePaused(false);
  };

  const handleCancelVoiceRecord = () => {
    if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
      voiceRecorderRef.current.ondataavailable = null;
      voiceRecorderRef.current.onstop = null;
      voiceRecorderRef.current.stop();
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    setIsVoiceRecording(false);
    setIsVoicePaused(false);
    setVoiceDuration(0);
    voiceChunksRef.current = [];
  };

  // Pegar imágenes directamente desde el portapapeles (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          setAttachedFile({
            type: 'image',
            url: dataUrl,
            name: `Captura-${Date.now().toString().slice(-4)}.png`,
            size: `${Number(sizeMB) < 0.1 ? '< 0.1' : sizeMB} MB`,
            base64Data,
            mimeType: file.type || 'image/png',
          });
          notify('info', 'Imagen Pegada', 'Se adjuntó la captura de imagen desde el portapapeles.');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // =========================================================================
  // DIAGNÓSTICO ASISTIDO DE FOTOS DE INSPECCIÓN (GEMINI VISION)
  // =========================================================================
  const handleAnalyzeImage = async (msg: ChatMessage) => {
    let base64 = msg.attachment?.base64Data;
    const mimeType = msg.attachment?.mimeType || 'image/jpeg';

    if (!base64 && msg.attachment?.url) {
      try {
        const resp = await fetch(msg.attachment.url);
        const blob = await resp.blob();
        base64 = await blobToBase64(blob);
      } catch (e) {
        console.warn('Error convirtiendo imagen a base64:', e);
      }
    }

    if (!base64) {
      notify('urgent', 'Error de Imagen', 'No se pudieron extraer los datos de la fotografía para Gemini Vision.');
      return;
    }

    setAnalyzingImageId(msg.id);

    try {
      const analysis = await analyzeInspectionImage(base64, mimeType, msg.text);
      updateChatMessage(msg.id, {
        aiAnalysis: analysis,
        aiStatus: 'done',
      });

      if (analysis.severity === 'critico') {
        notify(
          'urgent',
          '🚨 NOVEDAD CRÍTICA EN INSPECCIÓN FOTOGRÁFICA',
          `Gemini Vision detectó: ${analysis.diagnosis}`
        );
      }
    } catch (err: any) {
      console.error('Error analizando imagen:', err);
      updateChatMessage(msg.id, { aiStatus: 'error' });
      notify('warning', 'Aviso de IA', 'No se pudo completar el análisis fotográfico.');
    } finally {
      setAnalyzingImageId(null);
    }
  };

  // =========================================================================
  // REINTENTAR / EJECUTAR TRANSCRIPCIÓN DE AUDIO CON GOOGLE GEMINI
  // =========================================================================
  const handleTranscribeMessage = async (msg: ChatMessage) => {
    const base64 = msg.audioData?.base64 || msg.attachment?.base64Data;
    const mimeType = msg.audioData?.mimeType || msg.attachment?.mimeType || 'audio/webm';

    if (!base64) {
      notify('warning', 'Audio no disponible', 'No se encontró la carga de audio para procesar la transcripción.');
      return;
    }

    updateChatMessage(msg.id, { aiStatus: 'processing' });
    try {
      const res = await transcribeAndExtractVoiceNote(
        base64,
        mimeType,
        currentGroup.name
      );

      updateChatMessage(msg.id, {
        transcriptionText: res.transcription,
        aiExtraction: res.extraction,
        aiStatus: 'done',
      });

      setExpandedTranscriptions((prev) => ({ ...prev, [msg.id]: true }));
      notify('success', 'Transcripción Guardada', 'El audio fue transcrito y almacenado permanentemente.');

      if (res.extraction && res.extraction.severity === 'critico') {
        notify(
          'urgent',
          '🚨 ALERTA CRÍTICA EXTRAÍDA POR GEMINI',
          `${res.extraction.equipmentComponent || 'Componente'} (${res.extraction.locationTower || 'STC'}): ${res.extraction.summary}`
        );
      }
    } catch (err: any) {
      console.error('Error reintentando transcripción de audio:', err);
      updateChatMessage(msg.id, { aiStatus: 'error' });
      notify('warning', 'Error en Transcripción', 'No se pudo completar la transcripción con Gemini. Puedes intentar de nuevo.');
    }
  };

  // =========================================================================
  // FILTRO TEMPORAL Y RESUMEN EJECUTIVO DE CANAL CON GEMINI IA
  // =========================================================================
  const getFilteredMessagesForSummary = (
    messages: ChatMessage[],
    period: 'hoy' | '24h' | '3dias' | '7dias' | 'todo' | 'personalizado',
    customDateStr: string
  ) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    return messages.filter((m) => {
      let msgDateStr = '';
      let msgTimeMs = 0;

      if (m.timestamp) {
        const parsed = Date.parse(m.timestamp);
        if (!isNaN(parsed)) {
          msgTimeMs = parsed;
          msgDateStr = new Date(parsed).toISOString().split('T')[0];
        }
      }

      if (!msgTimeMs && m.id) {
        const match = m.id.match(/msg-(\d+)/) || m.id.match(/^(\d{13})/);
        if (match && match[1]) {
          const parsedId = parseInt(match[1], 10);
          if (parsedId > 1500000000000) {
            msgTimeMs = parsedId;
            msgDateStr = new Date(parsedId).toISOString().split('T')[0];
          }
        }
      }

      if (!msgDateStr) {
        msgDateStr = todayStr;
        msgTimeMs = now;
      }

      switch (period) {
        case 'hoy':
          return msgDateStr === todayStr;
        case '24h':
          return now - msgTimeMs <= 24 * 60 * 60 * 1000;
        case '3dias':
          return now - msgTimeMs <= 3 * 24 * 60 * 60 * 1000;
        case '7dias':
          return now - msgTimeMs <= 7 * 24 * 60 * 60 * 1000;
        case 'personalizado':
          return msgDateStr === customDateStr;
        case 'todo':
        default:
          return true;
      }
    });
  };

  const handleOpenSummarize = async (
    periodToUse: 'hoy' | '24h' | '3dias' | '7dias' | 'todo' | 'personalizado' = summaryPeriod,
    customDateToUse: string = summaryCustomDate
  ) => {
    setIsSummarizeModalOpen(true);
    setIsSummarizing(true);
    setThreadSummary(null);

    try {
      const filtered = getFilteredMessagesForSummary(activeChatMessages, periodToUse, customDateToUse);
      const periodLabels: Record<string, string> = {
        hoy: 'de Hoy',
        '24h': 'de las Últimas 24 Horas',
        '3dias': 'de los Últimos 3 Días',
        '7dias': 'de la Última Semana (7 Días)',
        todo: 'Histórico Completo del Canal',
        personalizado: `del día ${customDateToUse}`,
      };
      const periodLabel = periodLabels[periodToUse] || 'del período seleccionado';

      const summary = await summarizeConversationThread(filtered, currentGroup.name, periodLabel);
      setThreadSummary({
        ...summary,
        totalAnalyzed: filtered.length,
        hasMediaIncluded: filtered.some(
          (m) => m.attachment?.type === 'image' || m.attachment?.type === 'audio' || Boolean(m.audioData)
        ),
      });
    } catch (err) {
      console.error('Error generando resumen:', err);
      notify('warning', 'Resumen no disponible', 'No se pudo generar el resumen inteligente.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // =========================================================================
  // CONVERTIR MENSAJE EN ACCIÓN OPERATIVA (ASISTIDA POR LUC-IA-NA)
  // =========================================================================
  const handleOpenActionConverter = async (msg: ChatMessage) => {
    setActionModalMessage(msg);
    setIsAnalyzingAction(true);
    setActionLucianaBadge(null);

    // Fallbacks iniciales inmediatos
    const defaultTitle =
      msg.aiExtraction?.equipmentComponent && msg.aiExtraction?.locationTower
        ? `Intervención en ${msg.aiExtraction.equipmentComponent} - ${msg.aiExtraction.locationTower}`
        : msg.aiAnalysis?.diagnosis
        ? `Inspección: ${msg.aiAnalysis.diagnosis.slice(0, 60)}`
        : msg.transcriptionText
        ? `Seguimiento: ${msg.transcriptionText.slice(0, 50)}...`
        : `Novedad: ${msg.text.slice(0, 50)}...`;

    setActionTitle(defaultTitle);
    setActionDescription(
      [
        msg.transcriptionText ? `Transcripción de Audio:\n"${msg.transcriptionText}"` : null,
        msg.aiAnalysis
          ? `Diagnóstico Gemini Vision:\n${msg.aiAnalysis.diagnosis}\n\nRecomendaciones:\n${msg.aiAnalysis.recommendations.join('\n')}`
          : null,
        `Reportado por: ${msg.senderName} (${msg.senderRole})`,
        `Canal: ${currentGroup.name}`,
        `Fecha: ${msg.timestamp}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    );

    const severity = msg.aiExtraction?.severity || msg.aiAnalysis?.severity;
    setActionPriority(severity === 'critico' ? 'Alta' : severity === 'advertencia' ? 'Media' : 'Baja');
    setActionProjectCode(currentGroup.linkedProjectId || (projects[0]?.code ?? 'PRJ-01'));
    setActionType('tarea');

    // Análisis cognitivo en tiempo real con LUC-IA-NA
    try {
      const analysis = await analyzeMessageForOperationalAction(
        msg,
        currentGroup.linkedProjectId,
        currentGroup.name,
        projects
      );

      if (analysis) {
        setActionType(analysis.recommendedActionType);
        setActionTitle(analysis.title);
        setActionPriority(analysis.priority);
        if (analysis.projectCode) {
          setActionProjectCode(analysis.projectCode);
        }
        setActionDescription(analysis.justification);
        if (analysis.lucianaRationale) {
          setActionLucianaBadge(analysis.lucianaRationale);
        }

        if (analysis.wbsDetails) {
          setWbsEstimatedHours(analysis.wbsDetails.plannedHours || 4);
          setWbsAssignedRole(analysis.wbsDetails.assignedRole || 'Técnico Especialista STC');
        }
        if (analysis.hseqDetails) {
          setHseqIncidentType(analysis.hseqDetails.incidentType || 'Condición Insegura');
          setHseqImmediateAction(analysis.hseqDetails.immediateAction || '');
          setHseqLocation(msg.aiExtraction?.locationTower || 'Torre / Estación');
        }
        if (analysis.requisitionDetails) {
          setReqProductName(analysis.requisitionDetails.productName || msg.aiExtraction?.equipmentComponent || '');
          setReqProductQty(analysis.requisitionDetails.quantity || 1);
          setReqProductUnit(analysis.requisitionDetails.unit || 'unidades');
          setReqProductSku(analysis.requisitionDetails.productSku || 'REP-OEM-STC');
        }
      }
    } catch (e) {
      console.warn('Error analizando mensaje con LUC-IA-NA:', e);
    } finally {
      setIsAnalyzingAction(false);
    }
  };

  const handleReanalyzeWithLuciana = async () => {
    if (!actionModalMessage) return;
    setIsAnalyzingAction(true);
    try {
      const analysis = await analyzeMessageForOperationalAction(
        actionModalMessage,
        actionProjectCode,
        currentGroup.name,
        projects
      );
      if (analysis) {
        setActionType(analysis.recommendedActionType);
        setActionTitle(analysis.title);
        setActionPriority(analysis.priority);
        setActionDescription(analysis.justification);
        if (analysis.lucianaRationale) {
          setActionLucianaBadge(analysis.lucianaRationale);
        }

        if (analysis.wbsDetails) {
          setWbsEstimatedHours(analysis.wbsDetails.plannedHours || 4);
          setWbsAssignedRole(analysis.wbsDetails.assignedRole || 'Técnico Especialista STC');
        }
        if (analysis.hseqDetails) {
          setHseqIncidentType(analysis.hseqDetails.incidentType || 'Condición Insegura');
          setHseqImmediateAction(analysis.hseqDetails.immediateAction || '');
          setHseqLocation(actionModalMessage.aiExtraction?.locationTower || 'Torre / Estación');
        }
        if (analysis.requisitionDetails) {
          setReqProductName(analysis.requisitionDetails.productName || '');
          setReqProductQty(analysis.requisitionDetails.quantity || 1);
          setReqProductUnit(analysis.requisitionDetails.unit || 'unidades');
          setReqProductSku(analysis.requisitionDetails.productSku || 'REP-OEM-STC');
        }
        notify('success', 'LUC-IA-NA Actualizó la Acción', 'Campos optimizados según la inteligencia del mensaje.');
      }
    } catch (e: any) {
      notify('warning', 'LUC-IA-NA', 'No se pudo reanalizar la acción.');
    } finally {
      setIsAnalyzingAction(false);
    }
  };

  const handleExecuteAction = () => {
    if (!actionModalMessage) return;
    setIsSavingAction(true);

    try {
      const targetPrj = projects.find((p) => p.code === actionProjectCode) || projects[0];
      const targetPrjId = targetPrj?.id || 'PRJ-01';

      if (actionType === 'tarea') {
        const prio = (actionPriority.toLowerCase() as 'alta' | 'media' | 'baja') || 'media';
        const dueDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

        // 1. Crear Tarea General / ToDo para trazabilidad de usuario
        addTodo(
          actionTitle,
          prio,
          dueDate,
          currentUser.id,
          currentUser.name,
          actionProjectCode,
          `${actionDescription}\n\n[Horas Estimadas: ${wbsEstimatedHours}h | Rol Asignado: ${wbsAssignedRole}]`
        );

        // 2. Vincular directamente a la estructura WBS del proyecto
        if (addWbsTask) {
          addWbsTask({
            projectId: targetPrjId,
            code: `3.${Date.now().toString().slice(-3)}`,
            name: actionTitle,
            plannedHours: Number(wbsEstimatedHours) || 4,
            progressPct: 0,
            isCriticalPath: actionPriority === 'Alta',
            predecessors: [],
            status: 'pending',
            assignedToName: wbsAssignedRole,
          });
        }

        notify(
          'success',
          'Tarea WBS y Operativa Creada',
          `Tarea "${actionTitle}" programada en WBS de ${actionProjectCode} (${wbsEstimatedHours}h).`
        );
      } else if (actionType === 'hseq') {
        const todayIso = new Date().toISOString().split('T')[0];

        // 1. Registrar Alerta / Hallazgo en Diario Digital de Registro (DDR) del proyecto
        submitDDR({
          projectId: targetPrjId,
          projectCode: actionProjectCode,
          projectName: targetPrj?.name || actionTitle,
          date: todayIso,
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          weather: 'nublado',
          workHeightsAuthorized: actionPriority !== 'Alta',
          activitiesDone: `Inspección y reporte de seguridad vía canal ${currentGroup.name}: ${actionTitle}`,
          progressDeltaPct: 0,
          teamPresent: [currentUser.name],
          equipmentUsed: [hseqLocation || 'Línea STC'],
          incidentsReported: true,
          incidentNotes: `[Alerta HSEQ: ${hseqIncidentType}] ${actionTitle}.\nUbicación: ${hseqLocation}\nAcción Inmediata: ${hseqImmediateAction}\n\nDetalles:\n${actionDescription}`,
        });

        // 2. Asignar ToDo Urgente al equipo HSEQ / SST
        addTodo(
          `🚨 HSEQ: ${actionTitle}`,
          'alta',
          todayIso,
          currentUser.id,
          'Kelly Rojas (Líder HSEQ / SST)',
          actionProjectCode,
          `Tipo: ${hseqIncidentType}\nUbicación: ${hseqLocation}\nMedida Inmediata: ${hseqImmediateAction}\n\nContexto:\n${actionDescription}`
        );

        notify(
          'urgent',
          '🚨 Alerta HSEQ Registrada',
          `Registrado incidente "${hseqIncidentType}" en DDR de ${actionProjectCode} y asignado a SST.`
        );
      } else if (actionType === 'compra') {
        const finalItemName = reqProductName.trim() || actionTitle;
        createRequisition({
          requesterId: currentUser.id,
          requesterName: currentUser.name,
          department: 'Operaciones & Mantenimiento STC',
          projectId: targetPrjId,
          projectCode: actionProjectCode,
          projectName: targetPrj?.name || actionTitle,
          neededDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          priority: actionPriority === 'Alta' ? 'urgente' : 'normal',
          notes: `${actionDescription}\n\n[SKU / Referencia: ${reqProductSku} | Solicitado vía Canal ${currentGroup.name}]`,
          items: [
            {
              productId: `PROD-${Date.now().toString().slice(-4)}`,
              productSku: reqProductSku || 'REP-OEM-STC',
              productName: `${finalItemName} (${reqProductQty} ${reqProductUnit || 'unidades'})`,
              qtyRequested: Number(reqProductQty) || 1,
              inStock: false,
              availableStock: 0,
            },
          ],
        });

        notify(
          'success',
          'Requisición de Compra Generada',
          `Requisición de ${reqProductQty} ${reqProductUnit} de "${finalItemName}" enviada a Compras.`
        );
      }

      setActionModalMessage(null);
    } catch (err: any) {
      notify('urgent', 'Error', err.message || 'No se pudo crear la acción.');
    } finally {
      setIsSavingAction(false);
    }
  };

  // =========================================================================
  // CANALES OFICIALES VINCULADOS A PROYECTOS STC
  // =========================================================================
  const handleSelectOrCreateProjectChannel = (projectCode: string, projectName: string) => {
    const existing = chatGroups.find((g) => g.linkedProjectId === projectCode);
    if (existing) {
      setActiveGroupId(existing.id);
      setMobileChatView('chat');
    } else {
      const newGid = createChatGroup(
        `🚠 ${projectName}`,
        `Canal oficial del proyecto ${projectCode} para bitácora técnica, inspecciones y cuadrillas.`,
        users.map((u) => u.id)
      );
      const g = chatGroups.find((x) => x.id === newGid);
      if (g) {
        g.linkedProjectId = projectCode;
        g.category = 'proyecto';
      }
      setActiveGroupId(newGid);
      setMobileChatView('chat');
      notify('success', 'Canal de Proyecto Vinculado', `Canal creado para ${projectName}.`);
    }
  };

  const toggleTranscription = (msgId: string) => {
    setExpandedTranscriptions((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Crear nuevo grupo
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroupId = createChatGroup(
      newGroupName.trim(),
      newGroupDesc.trim() || 'Grupo de trabajo y coordinación técnica STC',
      selectedMemberIds
    );

    setActiveGroupId(newGroupId);
    setIsNewGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setSelectedMemberIds([]);
  };

  // Iniciar chat directo con persona
  const handleStartDirectChat = (userId: string) => {
    const dmGroupId = getOrCreateDirectChat(userId);
    setActiveGroupId(dmGroupId);
    setIsNewDirectModalOpen(false);
    setSearchFilter('');
  };

  // Añadir participante al grupo actual
  const handleAddMemberToCurrentGroup = () => {
    if (!memberToAddId) return;
    addMembersToChatGroup(currentGroup.id, [memberToAddId]);
    setMemberToAddId('');
  };

  // Formateador de texto con menciones en negrilla completa (sin cajas ni fondos)
  const renderMessageContent = (text: string) => {
    if (!text) return null;
    // Nombres completos de usuarios ordenados por longitud descendente para evitar cortes parciales
    const userNames = users
      .map((u) => u.name.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const escapedNames = userNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern =
      escapedNames.length > 0
        ? new RegExp(`(@(?:${escapedNames.join('|')})|@[A-Za-zÁ-ÿ0-9_]+)`, 'g')
        : /(@[A-Za-zÁ-ÿ0-9_]+)/g;

    const parts = text.split(pattern);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <strong key={i} className="font-extrabold">
            {part}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 max-h-full flex flex-col overflow-hidden">
      {/* Inputs ocultos para carga de archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.dwg,.dxf,.xlsx,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Contenedor Principal tipo WhatsApp Web STC */}
      <div className="flex-1 w-full bg-white rounded-xl overflow-hidden flex flex-col md:flex-row min-h-0 h-full max-h-full">
        
        {/* PANEL IZQUIERDO: Chats, Grupos, Personas y Búsqueda Global */}
        <div className={`w-full md:w-[340px] lg:w-[360px] bg-slate-50 flex flex-col justify-between shrink-0 p-3 sm:p-3.5 min-h-0 h-full overflow-hidden ${
          mobileChatView === 'chat' ? 'hidden md:flex' : 'flex h-full'
        }`}>
          <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
            
            {/* Header del Panel: Botones de Acción Rápida con Espaciado Armónico y Reactivo */}
            <div className="flex items-center justify-between gap-1.5 pb-0.5">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <MessageSquare size={15} className="text-[#00668F]" />
                <span>Chats</span>
              </span>

              <div className="flex items-center gap-1 shrink-0 ml-auto">
                {totalUnreadTodos > 0 && (
                  <button
                    onClick={() => markAllChatsAsRead(currentUser.id)}
                    title="Marcar todos los mensajes como leídos"
                    className="p-1.5 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}

                <button
                  onClick={() => setIsNewDirectModalOpen(true)}
                  title="Nuevo chat directo con un colaborador"
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-gray-700 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <UserPlus size={13} className="text-[#00668F]" />
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => setIsNewGroupModalOpen(true)}
                  title="Crear un nuevo grupo"
                  className="px-2.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Plus size={13} />
                  <span>Grupo</span>
                </button>
              </div>
            </div>

            {/* BUSCADOR POTENTE ESTILO WHATSAPP: Busca grupos, personas y mensajes */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar chats, personas o mensajes..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-hidden shadow-2xs transition-all"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Pestañas de Filtro (Todos / Proyectos / Grupos / Directos) */}
            {!searchFilter && (
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-[10px] sm:text-[10.5px] font-bold">
                <button
                  onClick={() => setChatTab('todos')}
                  className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    chatTab === 'todos' ? 'bg-white text-[#00668F] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Todos</span>
                  {totalUnreadTodos > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-500 text-white">
                      {totalUnreadTodos}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setChatTab('proyectos')}
                  className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    chatTab === 'proyectos' ? 'bg-white text-[#00668F] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Proyectos</span>
                  {totalUnreadProyectos > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-500 text-white">
                      {totalUnreadProyectos}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setChatTab('grupos')}
                  className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    chatTab === 'grupos' ? 'bg-white text-[#00668F] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Grupos</span>
                  {totalUnreadGrupos > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-500 text-white">
                      {totalUnreadGrupos}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setChatTab('directos')}
                  className={`flex-1 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    chatTab === 'directos' ? 'bg-white text-[#00668F] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Directos</span>
                  {totalUnreadDirectos > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-500 text-white">
                      {totalUnreadDirectos}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* RESULTADOS DE BÚSQUEDA O LISTA DE CHATS */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1 scrollbar-thin">
              {searchFilter ? (
                // MODO RESULTADOS DE BÚSQUEDA GLOBAL
                <div className="space-y-3">
                  {/* Personas encontradas */}
                  {searchMatchingUsers.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 block mb-1">
                        Personas ({searchMatchingUsers.length}):
                      </span>
                      <div className="space-y-1">
                        {searchMatchingUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleStartDirectChat(u.id)}
                            className="p-2 rounded-xl bg-white shadow-2xs hover:bg-sky-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                                style={{ backgroundColor: u.avatarColor || '#00668F' }}
                              >
                                {u.avatar}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-gray-900 truncate">{u.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{u.roleLabel}</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md">
                              Chatear
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grupos encontrados */}
                  {searchMatchingGroups.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 block mb-1">
                        Grupos ({searchMatchingGroups.length}):
                      </span>
                      <div className="space-y-1">
                        {searchMatchingGroups.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => {
                              setActiveGroupId(g.id);
                              setSearchFilter('');
                              setMobileChatView('chat');
                            }}
                            className="p-2 rounded-xl bg-white hover:bg-sky-50 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-gray-900">{g.name}</div>
                            <div className="text-[10px] text-gray-500 line-clamp-1">{g.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensajes globales encontrados */}
                  {searchMatchingMessages.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1 block mb-1">
                        Mensajes Encontrados ({searchMatchingMessages.length}):
                      </span>
                      <div className="space-y-1">
                        {searchMatchingMessages.map((msg) => {
                          const grp = chatGroups.find((g) => g.id === msg.channel);
                          return (
                            <div
                              key={msg.id}
                              onClick={() => {
                                setActiveGroupId(msg.channel);
                                setSearchFilter('');
                                setMobileChatView('chat');
                              }}
                              className="p-2.5 rounded-xl bg-white hover:bg-sky-50/50 cursor-pointer transition-all"
                            >
                              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                <span className="font-bold text-[#00668F]">{grp?.name || 'Chat'}</span>
                                <span>{msg.timestamp}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-gray-900">{msg.senderName}:</div>
                              <p className="text-[11px] text-gray-600 line-clamp-2 italic">"{msg.text}"</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {searchMatchingUsers.length === 0 &&
                    searchMatchingGroups.length === 0 &&
                    searchMatchingMessages.length === 0 && (
                      <div className="p-6 text-center text-gray-400">
                        <Search size={28} className="mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs font-bold text-gray-600">No se encontraron resultados</p>
                        <p className="text-[10px] mt-0.5">Prueba con otra palabra clave o nombre.</p>
                      </div>
                    )}
                </div>
              ) : (
                // LISTADO DE CHATS NORMAL
                <>
                  {displayedGroups.map((group) => {
                    const isActive = activeGroupId === group.id;
                    const isEmergencyChannel = group.id === 'canal-emergencias-stc' || group.isEmergency;
                    const groupMessages = visibleChatMessages.filter(
                      (m) => m.channel === group.id || normalizeChannelId(m.channel) === normalizeChannelId(group.id)
                    );
                    const lastMsg = groupMessages[groupMessages.length - 1];

                    // Conteo de mensajes no leídos para el usuario activo (0 si ya está abierto en pantalla)
                    const unreadCount = isActive
                      ? 0
                      : groupMessages.filter(
                          (m) => m.senderId !== currentUser.id && (!m.readBy || !m.readBy.includes(currentUser.id))
                        ).length;

                    // Si es 1 a 1, obtener datos del interlocutor
                    const partnerUserId = group.members.find((m) => m !== currentUser.id) || group.directPartnerId;
                    const partner = group.isDirect ? users.find((u) => u.id === partnerUserId) : null;

                    const displayName = group.isDirect && partner ? partner.name : group.name;
                    const displayAvatar = group.isDirect && partner ? partner.avatar : null;
                    const displayColor = group.isDirect && partner ? partner.avatarColor : '#00668F';

                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          setActiveGroupId(group.id);
                          setActiveChatChannel(group.id);
                          markChatAsRead(group.id, currentUser.id);
                          setReplyingTo(null);
                          setAttachedFile(null);
                          setMobileChatView('chat');
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 ${
                          isActive
                            ? isEmergencyChannel
                              ? 'bg-rose-700 text-white shadow-md border-l-4 border-amber-300'
                              : 'bg-[#00668F] text-white shadow-xs'
                            : isEmergencyChannel
                            ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-950 border border-rose-200'
                            : 'bg-white hover:bg-slate-200/70 text-gray-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {group.isDirect ? (
                              <div
                                className="w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ backgroundColor: displayColor }}
                              >
                                {displayAvatar}
                              </div>
                            ) : isEmergencyChannel ? (
                              <span className="w-5 h-5 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 text-[10px] animate-pulse">
                                🚨
                              </span>
                            ) : (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isActive ? 'bg-sky-200' : 'bg-[#00668F]'
                                }`}
                              />
                            )}
                            <span className={`text-xs font-bold truncate ${
                              isActive ? 'text-white' : isEmergencyChannel ? 'text-rose-900' : 'text-gray-900'
                            }`}>
                              {displayName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {group.linkedProjectId && (
                              <span className={`text-[8.5px] px-1 py-0.2 rounded-md font-black ${
                                isActive ? 'bg-white/20 text-white' : 'bg-sky-100 text-[#00668F]'
                              }`}>
                                {group.linkedProjectId}
                              </span>
                            )}
                            {unreadCount > 0 ? (
                              <span className="min-w-[19px] h-[19px] px-1 rounded-full font-bold text-[9px] shrink-0 aspect-square bg-emerald-600 text-white shadow-2xs flex items-center justify-center animate-in zoom-in-75 leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-medium shrink-0 ${
                                  isActive ? 'text-sky-100' : 'text-gray-400'
                                }`}
                              >
                                {lastMsg ? lastMsg.timestamp.replace('Hoy ', '') : `${groupMessages.length} msgs`}
                              </span>
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-[10px] line-clamp-1 pl-4 ${
                            isActive
                              ? 'text-white/80'
                              : isEmergencyChannel
                              ? 'text-rose-700/80 font-medium'
                              : 'text-gray-400'
                          }`}
                        >
                          {lastMsg ? `${lastMsg.senderName.split(' ')[0]}: ${lastMsg.text}` : group.description}
                        </p>
                      </button>
                    );
                  })}

                  {/* VINCULACIÓN DIRECTA DE PROYECTOS STC */}
                  {chatTab === 'proyectos' && projects && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 px-1 flex items-center justify-between">
                        <span>Proyectos STC Registrados</span>
                        <span className="text-[9px] text-[#00668F]">1-Clic Crear</span>
                      </div>
                      <div className="space-y-1">
                        {projects
                          .filter((p) => !chatGroups.some((g) => g.linkedProjectId === p.code))
                          .map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectOrCreateProjectChannel(p.code, p.name)}
                              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/70 cursor-pointer transition-all flex items-center justify-between shadow-2xs"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-gray-800 truncate">{p.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{p.code} • {p.clientName}</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOrCreateProjectChannel(p.code, p.name);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-[#00668F] hover:bg-[#005273] text-white text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                              >
                                + Canal
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: Área de Conversación Exclusiva */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 h-full max-h-full overflow-hidden bg-[#EBF1F6] ${
          mobileChatView === 'list' ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Header del Chat Fijado */}
          <div className="p-2.5 sm:p-3.5 bg-white flex items-center justify-between shrink-0 z-10 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Botón Volver a la Lista en Móvil */}
              <button
                type="button"
                onClick={() => setMobileChatView('list')}
                className="md:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-0.5 text-xs font-bold shrink-0 cursor-pointer active:scale-95"
                title="Volver a lista de chats"
              >
                <ChevronLeft size={16} />
                <span>Chats</span>
              </button>

              <div
                onClick={() => setIsGroupInfoModalOpen(true)}
                className="cursor-pointer group flex items-center gap-2.5 min-w-0 flex-1"
                title="Ver detalles, participantes, fotos y documentos"
              >
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: directPartner?.avatarColor || '#00668F' }}
                >
                  {directPartner ? directPartner.avatar : <Users size={16} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-gray-900 text-xs sm:text-sm tracking-tight group-hover:text-[#00668F] transition-colors truncate">
                      {directPartner ? directPartner.name : currentGroup.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                      <Radio size={10} className="animate-pulse text-emerald-600" />
                      En Línea
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                    {directPartner
                      ? `${directPartner.roleLabel} • ${directPartner.department}`
                      : `${currentGroupMembers.length} participantes • Toca para ver info`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-1">
              {/* Botón Gemini Key: Solo visible para Sistemas y roles con acceso total a módulos */}
              {canManageGeminiKey && (
                <button
                  type="button"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-200"
                  title="Configuración de Clave API Google Gemini (Solo TI / Gerencia)"
                >
                  <Key size={14} className="text-amber-600" />
                  <span className="hidden md:inline">Gemini Key</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenSummarize()}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#00668F] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-sky-200"
                title="Generar resumen inteligente del canal con Google Gemini"
              >
                <Sparkles size={14} className="text-[#00668F]" />
                <span className="hidden sm:inline">Resumir Canal IA</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGroupInfoModalOpen(true)}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Info size={14} className="text-[#00668F]" />
                <span className="hidden sm:inline">Info</span>
              </button>
            </div>
          </div>

          {/* BANNER DE CANAL CRÍTICO DE PARADAS DE EMERGENCIA */}
          {Boolean(currentGroup.id === 'canal-emergencias-stc' || currentGroup.isEmergency) && (
            <div className="bg-rose-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs border-b border-rose-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-300 animate-pulse shrink-0" />
                <span className="tracking-wide">🚨 CANAL CRÍTICO: PARADAS DE EMERGENCIA & SEGURIDAD STC</span>
              </div>
              <span className="text-[9.5px] bg-black/25 text-white/90 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                Prioridad Alta
              </span>
            </div>
          )}

          {/* BANNER DE MENSAJES FIJADOS (PINNED MESSAGES) */}
          {pinnedMessages.length > 0 && (
            <div className="bg-amber-50/95 border-b border-amber-200/90 px-3.5 py-2 flex items-center justify-between text-xs backdrop-blur-xs transition-all z-10 shrink-0 shadow-2xs">
              <div
                onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                title="Hacer clic para ir al mensaje fijado"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Pin size={13} className="fill-amber-600 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                    <span>Mensaje Fijado</span>
                    {pinnedMessages.length > 1 && (
                      <span className="text-[9.5px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-full font-black">
                        +{pinnedMessages.length - 1} más
                      </span>
                    )}
                    <span className="text-[10px] text-amber-700/80 font-normal">
                      • por {pinnedMessages[pinnedMessages.length - 1].pinnedBy || 'Colaborador'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900/90 truncate font-medium group-hover:text-amber-950">
                    {pinnedMessages[pinnedMessages.length - 1].text || (pinnedMessages[pinnedMessages.length - 1].attachment ? `[Archivo: ${pinnedMessages[pinnedMessages.length - 1].attachment?.name}]` : 'Mensaje fijado')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-300 text-amber-950 text-[10.5px] font-bold transition-colors cursor-pointer"
                  title="Ir al mensaje fijado en la conversación"
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1])}
                  className="p-1 rounded-lg text-amber-700 hover:bg-amber-200/60 transition-colors cursor-pointer"
                  title="Desfijar mensaje"
                >
                  <PinOff size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Área de Mensajes con Scroll Aislado y Alto Contraste */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5 space-y-3 min-h-0 h-full scrollbar-thin">
            {activeChatMessages.length > 0 ? (
              activeChatMessages.map((msg) => {
                const isMe =
                  msg.senderId === currentUser.id ||
                  msg.senderName.toLowerCase().includes(currentUser.name.split(' ')[0].toLowerCase());

                const timeOnly = msg.timestamp.replace(/^Hoy\s+/, '');

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ msg, x: e.clientX, y: e.clientY });
                      setActiveDropdownMsgId(null);
                    }}
                    className={`flex items-end gap-2 group relative ${
                      isMe ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
                    }`}
                  >
                    {/* Avatar del emisor */}
                    <div
                      className="w-8 h-8 rounded-full shrink-0 aspect-square text-white text-xs font-bold flex items-center justify-center shadow-2xs mb-0.5"
                      style={{ backgroundColor: msg.avatarColor || (isMe ? currentUser.avatarColor : '#64748B') }}
                      title={`${msg.senderName} (${msg.senderRole})`}
                    >
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Globo del Mensaje WhatsApp (Hora y chulitos juntos abajo a la derecha) */}
                    <div
                      className={`max-w-[85%] sm:max-w-lg p-3 transition-all shadow-sm relative ${
                        isMe
                          ? 'bg-[#00668F] text-white rounded-[20px] rounded-br-xs'
                          : 'bg-white text-gray-900 shadow-2xs rounded-[20px] rounded-bl-xs'
                      }`}
                    >
                      {/* Distintivo de Reenviado */}
                      {msg.isForwarded && (
                        <div className={`flex items-center gap-1 text-[10px] mb-1 italic font-medium ${
                          isMe ? 'text-sky-200' : 'text-slate-500'
                        }`}>
                          <Share2 size={11} className="shrink-0" />
                          <span>Reenviado</span>
                        </div>
                      )}

                      {/* Distintivo de Mensaje Fijado */}
                      {msg.isPinned && (
                        <div className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 mb-1.5 shadow-2xs border border-amber-200/60">
                          <Pin size={10} className="fill-amber-600 text-amber-600" />
                          <span>Fijado en canal</span>
                        </div>
                      )}

                      {/* Remitente (Solo en mensajes de otros miembros en chats de grupo) */}
                      {!isMe && !currentGroup.isDirect && (
                        <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] text-[#00668F]">
                          <span>{msg.senderName}</span>
                          <span className="text-gray-400 font-normal text-[10px]">({msg.senderRole})</span>
                        </div>
                      )}

                      {/* Preview de Cita (Respuesta) */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-xl text-[11px] border-l-4 leading-snug ${
                            isMe
                              ? 'bg-black/20 border-sky-300 text-sky-100'
                              : 'bg-slate-100 border-[#00668F] text-gray-700'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1 text-[10px]">
                            <CornerDownRight size={11} className={isMe ? 'text-sky-300' : 'text-[#00668F]'} />
                            <span>{msg.replyTo.senderName}</span>
                          </div>
                          <p className="line-clamp-2 italic text-[11px] mt-0.5 opacity-90">
                            {msg.replyTo.text}
                          </p>
                        </div>
                      )}

                      {/* Adjunto: Video (Reproductor de video integrado) */}
                      {msg.attachment && isVideoAttachment(msg.attachment) && (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black shadow-2xs">
                          <video
                            src={msg.attachment.url}
                            controls
                            playsInline
                            className="max-h-64 w-full object-contain bg-black rounded-xl"
                          />
                          <div className="p-1.5 text-[10px] bg-black/60 text-white flex items-center justify-between">
                            <span className="truncate">{msg.attachment.name}</span>
                            <span>{msg.attachment.size}</span>
                          </div>
                        </div>
                      )}

                      {/* Adjunto: Audio / Nota de Voz de Campo con WhatsApp Player y Gemini IA */}
                      {(msg.attachment?.type === 'audio' || msg.audioData) && (
                        <div className="mb-2 space-y-2">
                          <WhatsAppAudioPlayer
                            audioUrl={msg.attachment?.url}
                            base64Audio={msg.audioData?.base64 || msg.attachment?.base64Data}
                            mimeType={msg.audioData?.mimeType || msg.attachment?.mimeType || 'audio/webm'}
                            duration={msg.attachment?.duration || msg.audioData?.durationSeconds}
                            isMe={isMe}
                          />

                          {/* Estado de Transcripción Gemini */}
                          {msg.aiStatus === 'processing' && (
                            <div className={`flex items-center justify-between gap-2 text-[10.5px] font-semibold p-2 rounded-xl ${
                              isMe ? 'bg-white/15 text-sky-200' : 'bg-sky-50 text-[#00668F] border border-sky-200'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Sparkles size={13} className="animate-spin text-cyan-400 shrink-0" />
                                <span>Gemini transcribiendo audio...</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTranscribeMessage(msg)}
                                className="px-2 py-0.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                                title="Forzar o reintentar transcripción inmediata con Gemini"
                              >
                                Reintentar
                              </button>
                            </div>
                          )}

                          {/* Botón para solicitar o reintentar transcripción si aún no existe o falló */}
                          {!msg.transcriptionText && msg.aiStatus !== 'processing' && (
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => handleTranscribeMessage(msg)}
                                className={`w-full p-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                                  isMe
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-sky-50 hover:bg-sky-100 text-[#00668F] border border-sky-200'
                                }`}
                              >
                                <Sparkles size={13} className="shrink-0 text-cyan-400" />
                                <span>Transcribir y Analizar Audio con Gemini IA</span>
                              </button>
                            </div>
                          )}

                          {/* Tarjeta de Transcripción Desplegable */}
                          {msg.transcriptionText && (
                            <div className={`rounded-xl overflow-hidden border text-xs ${
                              isMe ? 'bg-black/20 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-gray-800'
                            }`}>
                              <button
                                type="button"
                                onClick={() => toggleTranscription(msg.id)}
                                className={`w-full p-2 flex items-center justify-between text-[11px] font-bold cursor-pointer transition-colors ${
                                  isMe ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Sparkles size={12} className={isMe ? 'text-sky-300' : 'text-[#00668F]'} />
                                  <span className="truncate">Transcripción de Audio (IA)</span>
                                  {msg.aiExtraction?.severity && (
                                    <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-black uppercase shrink-0 ${
                                      msg.aiExtraction.severity === 'critico'
                                        ? 'bg-rose-600 text-white'
                                        : msg.aiExtraction.severity === 'advertencia'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-emerald-600 text-white'
                                    }`}>
                                      {msg.aiExtraction.severity}
                                    </span>
                                  )}
                                </div>
                                {expandedTranscriptions[msg.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>

                              {expandedTranscriptions[msg.id] && (
                                <div className="p-2.5 pt-0 space-y-2 text-[11px]">
                                  <p className="italic leading-relaxed opacity-90">
                                    "{msg.transcriptionText}"
                                  </p>

                                  {/* Solo se muestran detalles técnicos si el audio contenía componentes, ubicación o acciones */}
                                  {msg.aiExtraction && Boolean(msg.aiExtraction.equipmentComponent || msg.aiExtraction.locationTower || msg.aiExtraction.actionSuggested) && (
                                    <div className={`p-2 rounded-lg space-y-1 text-[10.5px] ${
                                      isMe ? 'bg-white/10' : 'bg-white border border-slate-200 shadow-2xs'
                                    }`}>
                                      {msg.aiExtraction.equipmentComponent && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-bold opacity-75">Equipo / Componente:</span>
                                          <span>{msg.aiExtraction.equipmentComponent}</span>
                                        </div>
                                      )}
                                      {msg.aiExtraction.locationTower && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-bold opacity-75">Torre / Estación:</span>
                                          <span>{msg.aiExtraction.locationTower}</span>
                                        </div>
                                      )}
                                      {msg.aiExtraction.actionSuggested && (
                                        <div className="flex items-start gap-1">
                                          <span className="font-bold opacity-75 shrink-0">Acción Sugerida:</span>
                                          <span>{msg.aiExtraction.actionSuggested}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Adjunto: Foto / Imagen */}
                      {msg.attachment && msg.attachment.type === 'image' && !isVideoAttachment(msg.attachment) && (
                        <div className="mb-2 space-y-2">
                          <div className="overflow-hidden rounded-xl shadow-2xs">
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.name}
                              onClick={() => setPreviewImageModal(msg.attachment?.url || null)}
                              className="max-h-52 sm:max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            />
                            <div className="p-1.5 text-[10px] bg-black/40 text-white flex items-center justify-between">
                              <span className="truncate">{msg.attachment.name}</span>
                              <span>{msg.attachment.size}</span>
                            </div>
                          </div>

                          {/* Botón de Diagnóstico Gemini Vision */}
                          <div className="flex items-center justify-between">
                            {!msg.aiAnalysis || msg.aiAnalysis.diagnosis.includes('No fue posible') ? (
                              <button
                                type="button"
                                onClick={() => handleAnalyzeImage(msg)}
                                disabled={analyzingImageId === msg.id}
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isMe
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-sky-50 hover:bg-sky-100 text-[#00668F] border border-sky-200 shadow-2xs'
                                }`}
                              >
                                <Sparkles size={12} className={analyzingImageId === msg.id ? 'animate-spin' : 'text-[#00668F]'} />
                                <span>{analyzingImageId === msg.id ? 'Gemini Analizando...' : msg.aiAnalysis ? 'Reintentar Diagnóstico' : 'Diagnosticar con Gemini Vision'}</span>
                              </button>
                            ) : (
                              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                msg.aiAnalysis.severity === 'critico'
                                  ? 'text-rose-400 font-black'
                                  : msg.aiAnalysis.severity === 'advertencia'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}>
                                <CheckCircle2 size={12} />
                                <span>Diagnóstico STC Listo ({msg.aiAnalysis.severity})</span>
                              </span>
                            )}
                          </div>

                          {/* Panel de Diagnóstico IA */}
                          {msg.aiAnalysis && (
                            <div className={`p-2.5 rounded-xl border text-[11px] space-y-1.5 ${
                              isMe
                                ? 'bg-black/30 border-white/20 text-white'
                                : 'bg-slate-50 border-slate-200 text-gray-800'
                            }`}>
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1">
                                  <Sparkles size={12} className={isMe ? 'text-sky-300' : 'text-[#00668F]'} />
                                  Diagnóstico END / STC
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                  msg.aiAnalysis.severity === 'critico'
                                    ? 'bg-rose-600 text-white'
                                    : msg.aiAnalysis.severity === 'advertencia'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}>
                                  {msg.aiAnalysis.severity}
                                </span>
                              </div>

                              <p className="leading-snug">
                                <strong>Hallazgo:</strong> {msg.aiAnalysis.diagnosis}
                              </p>

                              {msg.aiAnalysis.rootCauses && msg.aiAnalysis.rootCauses.length > 0 && (
                                <div>
                                  <span className="font-bold opacity-80 text-[10px] block uppercase">Causas Raíz:</span>
                                  <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90 text-[10.5px]">
                                    {msg.aiAnalysis.rootCauses.map((c, idx) => (
                                      <li key={idx}>{c}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {msg.aiAnalysis.recommendations && msg.aiAnalysis.recommendations.length > 0 && (
                                <div>
                                  <span className="font-bold opacity-80 text-[10px] block uppercase">Recomendaciones Técnicas y de Seguridad:</span>
                                  <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90 text-[10.5px]">
                                    {msg.aiAnalysis.recommendations.map((r, idx) => (
                                      <li key={idx}>{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {canManageGeminiKey && (msg.aiAnalysis.diagnosis.includes('No fue posible') || msg.aiAnalysis.rootCauses?.some((c) => c.includes('aistudio') || c.includes('API'))) && (
                                <button
                                  type="button"
                                  onClick={() => setIsApiKeyModalOpen(true)}
                                  className="w-full mt-2 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                  <Key size={12} />
                                  <span>Configurar Clave API de Gemini</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}


                      {/* Adjunto: Documento / Plano CAD */}
                      {msg.attachment && msg.attachment.type === 'file' && !isVideoAttachment(msg.attachment) && (
                        <div
                          className={`mb-2 p-2.5 rounded-xl flex items-center justify-between gap-3 ${
                            isMe
                              ? 'bg-white/10 text-white'
                              : 'bg-slate-100 text-gray-800 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#00668F] text-white flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{msg.attachment.name}</div>
                              <div className="text-[10px] opacity-75">{msg.attachment.size}</div>
                            </div>
                          </div>
                          <a
                            href={msg.attachment.url}
                            download={msg.attachment.name}
                            className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-white shrink-0"
                            title="Descargar archivo"
                          >
                            <Download size={13} />
                          </a>
                        </div>
                      )}

                      {/* Texto del Mensaje con Menciones @ en negrilla completa */}
                      {msg.text && (
                        <p className={`text-xs leading-relaxed font-normal whitespace-pre-wrap ${isMe ? 'text-white' : 'text-gray-800'}`}>
                          {renderMessageContent(msg.text)}
                        </p>
                      )}

                      {/* Pie: Hora, editado, favorito y chulitos alineados juntos abajo a la derecha */}
                      <div
                        className={`flex items-center gap-1.5 justify-end text-[10px] mt-1 select-none ${
                          isMe ? 'text-sky-200' : 'text-gray-400'
                        }`}
                      >
                        {/* Indicador de Favorito */}
                        {msg.starredBy?.includes(currentUser.id) && (
                          <span title="Mensaje destacado">
                            <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                          </span>
                        )}

                        {/* Indicador de Editado */}
                        {msg.isEdited && (
                          <span
                            className={`text-[9.5px] italic ${isMe ? 'text-sky-200/80' : 'text-gray-400'}`}
                            title={msg.editedAt ? `Editado a las ${msg.editedAt}` : 'Mensaje editado'}
                          >
                            (editado)
                          </span>
                        )}

                        <span className="font-medium">{timeOnly}</span>
                        {isMe && (
                          <CheckCheck size={14} className="text-sky-300 shrink-0 ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Botones flotantes de Acción Rápida (Responder + Convertir + Favorito + 3 Puntos) */}
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-white p-1 rounded-xl shadow-md mb-1 z-10 shrink-0 gap-0.5 relative ${
                        isMe ? 'mr-1' : 'ml-1'
                      }`}
                    >
                      {/* Favorito rápido */}
                      <button
                        type="button"
                        onClick={() => handleToggleStar(msg)}
                        title={msg.starredBy?.includes(currentUser.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        className="p-1.5 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Star
                          size={13}
                          className={msg.starredBy?.includes(currentUser.id) ? 'text-amber-500 fill-amber-500' : ''}
                        />
                      </button>

                      {/* Convertir en Tarea / HSEQ */}
                      <button
                        type="button"
                        onClick={() => handleOpenActionConverter(msg)}
                        title="Convertir mensaje en Tarea WBS, Alerta HSEQ o Requisición de Compra"
                        className="p-1.5 text-gray-500 hover:text-[#00668F] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <CheckSquare size={13} />
                      </button>

                      {/* Responder */}
                      <button
                        type="button"
                        onClick={() => handleStartReply(msg)}
                        title="Responder a este mensaje"
                        className="p-1.5 text-gray-500 hover:text-[#00668F] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Reply size={13} />
                      </button>

                      {/* Botón de 3 Puntos (...) para más opciones */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownMsgId(activeDropdownMsgId === msg.id ? null : msg.id);
                            setContextMenu(null);
                          }}
                          title="Más opciones de mensaje (Editar, Reenviar, Fijar, Eliminar)"
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {/* Menú Dropdown al hacer clic en los 3 puntos (Despliegue elegante hacia ARRIBA) */}
                        {activeDropdownMsgId === msg.id && (
                          <div
                            className={`absolute z-30 bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-56 text-xs text-gray-800 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-100 bottom-full mb-2 origin-bottom ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderMessageMenuItems(msg, () => setActiveDropdownMsgId(null))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <Hash size={36} className="text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-600">No hay mensajes en este chat todavía</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Inicia la conversación técnica, etiqueta compañeros con @ o toma fotos.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Menú Flotante de Menciones con @ */}
          {mentionQuery !== null && matchingMentionUsers.length > 0 && (
            <div className="mx-4 mb-1 p-2 bg-white rounded-2xl shadow-xl max-h-48 overflow-y-auto z-20 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block mb-1">
                Etiquetar a un compañero:
              </span>
              <div className="space-y-1">
                {matchingMentionUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectMention(u.name)}
                    className="w-full text-left p-2 rounded-xl hover:bg-sky-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-6 h-6 rounded-lg text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: u.avatarColor || '#00668F' }}
                    >
                      {u.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900">{u.name}</div>
                      <div className="text-[10px] text-gray-400">{u.roleLabel}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Banner de Preview de Archivo Adjunto */}
          {attachedFile && (
            <div className="px-4 py-2.5 bg-slate-100 shadow-2xs flex items-center justify-between text-xs animate-fadeIn shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {attachedFile.type === 'image' ? (
                  <img
                    src={attachedFile.url}
                    alt={attachedFile.name}
                    className="w-12 h-12 rounded-xl object-cover shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#00668F] text-white flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {attachedFile.name}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {attachedFile.type === 'image' ? 'Imagen adjunta' : 'Documento adjunto'} • {attachedFile.size}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAttachedFile(null)}
                title="Quitar archivo adjunto"
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Banner de "Respondiendo a..." */}
          {replyingTo && (
            <div className="px-4 py-2 bg-slate-100 shadow-2xs flex items-center justify-between text-xs animate-fadeIn shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1 h-7 bg-[#00668F] rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#00668F] flex items-center gap-1">
                    <Reply size={12} />
                    <span>Respondiendo a {replyingTo.senderName}</span>
                  </div>
                  <p className="text-gray-600 truncate text-[11px]">
                    {replyingTo.text}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelReply}
                title="Cancelar respuesta"
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-2 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Banner de "Editando mensaje..." */}
          {editingMessage && (
            <div className="px-4 py-2.5 bg-sky-50 border-t border-sky-200 shadow-2xs flex items-center justify-between text-xs animate-fadeIn shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#00668F] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Edit2 size={15} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#00668F] flex items-center gap-1.5">
                    <span>Editando tu mensaje</span>
                    <span className="text-[10px] bg-sky-200/90 text-[#00668F] px-1.5 py-0.2 rounded-full font-bold">
                      Quedan {getRemainingMinutes(editingMessage)} min para editar
                    </span>
                  </div>
                  <p className="text-gray-600 truncate text-[11px] italic">
                    "{editingMessage.text}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                title="Cancelar edición"
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer ml-2 shrink-0 flex items-center gap-1"
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
            </div>
          )}

          {/* BARRA DE ENTRADA: Grabación de Voz / Adjuntos / Texto */}
          <div className="p-2 sm:p-3 pr-20 sm:pr-24 md:pr-28 bg-white shrink-0 border-t border-slate-200/60">
            {isVoiceRecording ? (
              <div className="flex items-center gap-2 w-full p-2 bg-slate-50 border border-slate-200/90 rounded-2xl animate-fadeIn shadow-2xs">
                {/* Indicador de Tiempo y Estado ERP */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 text-white rounded-xl text-xs font-bold font-mono shrink-0 transition-colors shadow-2xs ${
                    isVoicePaused ? 'bg-amber-500' : 'bg-[#00668F]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isVoicePaused ? 'bg-white' : 'bg-rose-400 animate-ping'
                    }`}
                  />
                  <span>
                    {isVoicePaused ? 'PAUSA' : 'REC'}{' '}
                    {Math.floor(voiceDuration / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(voiceDuration % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Visualizador de Ondas / Mensaje de Estado */}
                <div className="flex-1 flex items-center justify-center gap-1.5 h-8">
                  {isVoicePaused ? (
                    <span className="text-xs font-semibold text-amber-700">
                      Grabación en pausa. Pulsa 'Continuar' para reanudar.
                    </span>
                  ) : (
                    <>
                      <div className="w-1 h-3 bg-[#00668F]/60 rounded-full animate-bounce" />
                      <div className="w-1 h-5 bg-[#00668F]/80 rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-1 h-7 bg-[#00668F] rounded-full animate-bounce [animation-delay:300ms]" />
                      <div className="w-1 h-4 bg-[#00668F]/80 rounded-full animate-bounce [animation-delay:450ms]" />
                      <div className="w-1 h-6 bg-[#00668F] rounded-full animate-bounce [animation-delay:200ms]" />
                      <span className="text-xs font-medium text-slate-600 ml-2 hidden sm:inline">
                        Grabando audio con transcripción Gemini...
                      </span>
                    </>
                  )}
                </div>

                {/* Acciones: Pausar / Continuar, Cancelar, Enviar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botón Pausar / Continuar */}
                  {isVoicePaused ? (
                    <button
                      type="button"
                      onClick={handleResumeVoiceRecord}
                      className="px-2.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Continuar grabación"
                    >
                      <Play size={13} className="fill-current" />
                      <span className="hidden sm:inline">Continuar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePauseVoiceRecord}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Pausar grabación"
                    >
                      <Pause size={13} className="fill-current" />
                      <span className="hidden sm:inline">Pausar</span>
                    </button>
                  )}

                  {/* Cancelar / Descartar */}
                  <button
                    type="button"
                    onClick={handleCancelVoiceRecord}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Descartar grabación"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Enviar */}
                  <button
                    type="button"
                    onClick={handleStopVoiceRecord}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Enviar nota de voz"
                  >
                    <Send size={13} />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} onPaste={handlePaste} className="flex items-center gap-1 sm:gap-2">
                {/* Adjuntar Documento */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar documento o plano (PDF, DWG, XLSX)"
                  className="p-1.5 sm:p-2.5 rounded-lg text-slate-500 hover:text-[#00668F] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 outline-none focus:outline-none"
                >
                  <Paperclip size={17} />
                </button>

                {/* Adjuntar Imagen de Galería */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  title="Adjuntar foto o imagen de la galería"
                  className="p-1.5 sm:p-2.5 rounded-lg text-slate-500 hover:text-[#00668F] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 outline-none focus:outline-none"
                >
                  <ImageIcon size={17} />
                </button>

                {/* TOMAR FOTO CON CÁMARA EN VIVO */}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  title="Tomar foto con la cámara"
                  className="p-1.5 sm:p-2.5 rounded-lg text-slate-500 hover:text-[#00668F] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 outline-none focus:outline-none"
                >
                  <Camera size={17} />
                </button>

                {/* GRABAR NOTA DE VOZ DE CAMPO */}
                <button
                  type="button"
                  onClick={handleStartVoiceRecord}
                  title="Grabar nota de voz con transcripción Gemini"
                  className="p-1.5 sm:p-2.5 rounded-lg text-slate-500 hover:text-[#00668F] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 outline-none focus:outline-none"
                >
                  <Mic size={17} />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  placeholder={
                    editingMessage
                      ? 'Edita tu mensaje...'
                      : attachedFile
                      ? `Comentario sobre ${attachedFile.name}...`
                      : replyingTo
                      ? `Responde a ${replyingTo.senderName}...`
                      : `Mensaje en ${directPartner ? directPartner.name : currentGroup.name} (o pega una imagen)...`
                  }
                  className="flex-1 min-w-0 h-10 sm:h-11 text-xs px-3.5 py-0 rounded-xl bg-slate-100 text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00668F]/30 border-0 leading-normal transition-all"
                />

                <button
                  type="submit"
                  disabled={!chatInput.trim() && !attachedFile}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 bg-[#00668F] hover:bg-[#005273] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 outline-none focus:outline-none shadow-2xs"
                >
                  <span>{editingMessage ? 'Guardar' : 'Enviar'}</span>
                  {editingMessage ? <Check size={14} strokeWidth={2.5} /> : <Send size={13} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE CÁMARA Y VIDEO EN PANTALLA COMPLETA ESTILO WHATSAPP/MÓVIL */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
          {/* BARRA SUPERIOR OVERLAY */}
          <div className="relative z-20 bg-black/90 p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                {cameraMode === 'foto' ? <Camera size={20} className="text-cyan-400" /> : <Video size={20} className="text-red-400" />}
              </div>
              <div>
                <div className="text-xs font-black tracking-wider uppercase flex items-center gap-2">
                  <span>{cameraMode === 'foto' ? 'Captura de Foto' : 'Grabación de Video'}</span>
                  {facingMode === 'user' ? (
                    <span className="text-[10px] bg-white/20 text-white font-medium px-2 py-0.5 rounded-full">Frontal</span>
                  ) : (
                    <span className="text-[10px] bg-white/20 text-white font-medium px-2 py-0.5 rounded-full">Trasera / Campo</span>
                  )}
                </div>
                <div className="text-[11px] text-white/70">
                  Cámara de Inspección Técnica INTECKNO
                </div>
              </div>
            </div>

            {/* Contador de tiempo de grabación */}
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-full font-mono text-xs font-bold animate-pulse shadow-lg border border-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
              </div>
            )}

            {/* Botones de acción superior */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Cambiar entre cámara frontal y trasera"
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw size={18} />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                title="Cerrar cámara"
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* VISOR DE VIDEO EN PANTALLA COMPLETA */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
            {cameraError ? (
              <div className="p-8 text-center text-rose-400 text-xs space-y-3 max-w-md mx-auto bg-slate-900/90 rounded-2xl border border-slate-800 p-6 z-20">
                <Camera size={40} className="mx-auto mb-1 opacity-70" />
                <p className="font-bold text-sm text-white">{cameraError}</p>
                <p className="text-gray-400 text-xs">
                  Puedes seleccionar una foto o video directamente desde tus archivos del dispositivo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    imageInputRef.current?.click();
                  }}
                  className="px-5 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow-lg"
                >
                  <ImageIcon size={15} />
                  <span>Subir Foto de Archivo</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel})` }}
                />

                {/* BOTONES FLOTANTES DE ZOOM (1x / 2x) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 z-20 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleSetZoom(1)}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      zoomLevel === 1 ? 'bg-white text-black shadow-xs' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetZoom(2)}
                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      zoomLevel === 2 ? 'bg-white text-black shadow-xs' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    2x
                  </button>
                </div>
              </>
            )}
          </div>

          {/* BARRA INFERIOR DE CONTROLES OVERLAY */}
          <div className="relative z-20 bg-black/90 p-6 pt-3 flex flex-col items-center gap-4">
            {/* SELECTOR DE MODO: FOTO O VIDEO */}
            {!isRecording && (
              <div className="flex items-center gap-1 bg-white/15 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCameraMode('foto')}
                  className={`px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                    cameraMode === 'foto' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  FOTO
                </button>
                <button
                  type="button"
                  onClick={() => setCameraMode('video')}
                  className={`px-5 py-1.5 rounded-full transition-all cursor-pointer ${
                    cameraMode === 'video' ? 'bg-white text-black shadow-md' : 'text-white/70 hover:text-white'
                  }`}
                >
                  VIDEO
                </button>
              </div>
            )}

            {/* CONTROLES PRINCIPALES DE DISPARO */}
            <div className="w-full flex items-center justify-around max-w-sm">
              {/* Botón Galería */}
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  imageInputRef.current?.click();
                }}
                title="Seleccionar foto de la galería"
                className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              >
                <ImageIcon size={22} />
              </button>

              {/* Botón Disparador Principal (Foto / Video) */}
              {cameraMode === 'foto' ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  title="Capturar Foto"
                  className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center p-1.5 active:scale-90 cursor-pointer shadow-2xl"
                >
                  <div className="w-full h-full rounded-full bg-white" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? 'Detener Grabación' : 'Iniciar Grabación de Video'}
                  className="w-20 h-20 rounded-full border-4 border-red-500 bg-red-500/20 hover:bg-red-500/30 transition-all flex items-center justify-center p-1.5 active:scale-90 cursor-pointer shadow-2xl"
                >
                  {isRecording ? (
                    <div className="w-7 h-7 rounded-md bg-red-600 animate-pulse" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-red-600" />
                  )}
                </button>
              )}

              {/* Botón Alternar Cámara */}
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Cambiar a cámara frontal/trasera"
                className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95"
              >
                <RefreshCw size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CHAT DIRECTO */}
      {isNewDirectModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-1">
              <div>
                <h3 className="text-base font-black text-gray-900">Iniciar Chat Directo</h3>
                <p className="text-xs text-gray-400">
                  Selecciona a un colaborador para iniciar una conversación privada
                </p>
              </div>
              <button
                onClick={() => setIsNewDirectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {users
                .filter((u) => u.id !== currentUser.id)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDirectChat(u.id)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-100 hover:bg-sky-50 shadow-2xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 aspect-square text-white text-xs font-bold flex items-center justify-center shadow-2xs"
                        style={{ backgroundColor: u.avatarColor || '#00668F' }}
                      >
                        {u.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{u.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{u.roleLabel} • {u.department}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO GRUPO */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-1">
              <div>
                <h3 className="text-base font-black text-gray-900">Crear Nuevo Grupo de Chat STC</h3>
                <p className="text-xs text-gray-400">
                  Agrupa personal de cuadrillas, comités de obra o licitaciones
                </p>
              </div>
              <button
                onClick={() => setIsNewGroupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nombre del Grupo</label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej: Cuadrilla Montaje Pilonas Línea K"
                  className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden shadow-2xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Propósito o Descripción</label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Ej: Reportes diarios de empalmes, fotos de campo y seguridad en pilonas"
                  className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden shadow-2xs"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1.5 flex items-center justify-between">
                  <span>Seleccionar Participantes Iniciales:</span>
                  <span className="text-[10px] text-sky-700 font-semibold">
                    {selectedMemberIds.length} seleccionados
                  </span>
                </label>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-100 rounded-2xl scrollbar-thin">
                  {users.map((u) => {
                    const isSelected = selectedMemberIds.includes(u.id);

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMemberIds(selectedMemberIds.filter((id) => id !== u.id));
                          } else {
                            setSelectedMemberIds([...selectedMemberIds, u.id]);
                          }
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-sky-50/80 border-[#00668F] text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded-full shrink-0 aspect-square text-white text-[11px] font-bold flex items-center justify-center shadow-2xs"
                            style={{ backgroundColor: u.avatarColor || '#00668F' }}
                          >
                            {u.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-gray-900 truncate">{u.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{u.roleLabel} • {u.department}</div>
                          </div>
                        </div>

                        {/* Casilla de Selección fija a la DERECHA */}
                        <div className="shrink-0 ml-2">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#00668F] border-[#00668F] text-white shadow-2xs'
                                : 'border-slate-300 bg-white hover:border-slate-400'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] disabled:opacity-40 text-white font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  Crear Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DEL GRUPO, MULTIMEDIA Y AÑADIR PARTICIPANTES (ESTILO WHATSAPP) */}
      {isGroupInfoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Cabecera del Grupo */}
            <div className="flex items-start justify-between pb-1">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full shrink-0 aspect-square text-white flex items-center justify-center font-bold text-sm shadow-xs"
                  style={{ backgroundColor: directPartner?.avatarColor || '#00668F' }}
                >
                  {directPartner ? directPartner.avatar : <Users size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {directPartner ? directPartner.name : currentGroup.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {directPartner ? `${directPartner.roleLabel} • ${directPartner.department}` : currentGroup.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGroupInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Pestañas estilo WhatsApp: Miembros, Fotos, Documentos, Enlaces */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setGroupInfoTab('miembros')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  groupInfoTab === 'miembros' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users size={13} />
                <span>{directPartner ? 'Contacto' : `Miembros (${currentGroupMembers.length})`}</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupInfoTab('fotos')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  groupInfoTab === 'fotos' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ImageIcon size={13} />
                <span>Fotos ({groupMediaAttachments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupInfoTab('documentos')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  groupInfoTab === 'documentos' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText size={13} />
                <span>Docs ({groupDocAttachments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupInfoTab('enlaces')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  groupInfoTab === 'enlaces' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LinkIcon size={13} />
                <span>Links ({groupLinks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setGroupInfoTab('destacados')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  groupInfoTab === 'destacados' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Star size={13} className="text-amber-500 fill-amber-500" />
                <span>Favoritos ({starredMessages.length})</span>
              </button>
            </div>

            {/* TAB 1: MIEMBROS Y FORMULARIO DE AÑADIR (CON DISEÑO ARMONIOSO Y REACTIVO) */}
            {groupInfoTab === 'miembros' && (
              <div className="space-y-4">
                {/* Formulario Añadir Miembro (Diseño Reactivo y Armónico) */}
                {!currentGroup.isDirect && (
                  <div className="p-4 bg-sky-50/70 rounded-2xl space-y-2.5">
                    <label className="text-xs font-bold text-sky-950 flex items-center gap-2">
                      <UserPlus size={15} className="text-[#00668F]" />
                      <span>Añadir Miembro a este Grupo</span>
                    </label>

                    {nonGroupMembers.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                          value={memberToAddId}
                          onChange={(e) => setMemberToAddId(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-xl bg-white text-gray-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#00668F]/30 shadow-2xs"
                        >
                          <option value="">Selecciona un colaborador de INTECKNO...</option>
                          {nonGroupMembers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} — {u.roleLabel} ({u.department})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMemberToCurrentGroup}
                          disabled={!memberToAddId}
                          className="h-10 px-5 bg-[#00668F] hover:bg-[#005273] disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0 shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <UserPlus size={14} />
                          <span>Añadir</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">
                        Todos los colaboradores de la empresa ya forman parte de este grupo.
                      </p>
                    )}
                  </div>
                )}

                {/* Lista de Miembros */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-700 block">
                    Participantes ({currentGroupMembers.length}):
                  </span>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {currentGroupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="p-2.5 rounded-xl bg-slate-100 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full shrink-0 aspect-square text-white text-xs font-bold flex items-center justify-center shadow-2xs"
                            style={{ backgroundColor: member.avatarColor || '#00668F' }}
                          >
                            {member.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{member.name}</div>
                            <div className="text-[10px] text-gray-500 truncate">{member.roleLabel} • {member.department}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full shrink-0">
                          Activo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ARCHIVOS / FOTOS (ESTILO WHATSAPP MEDIA) */}
            {groupInfoTab === 'fotos' && (
              <div className="space-y-3">
                {groupMediaAttachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                    {groupMediaAttachments.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => setPreviewImageModal(msg.attachment?.url || null)}
                        className="relative group rounded-xl overflow-hidden aspect-square cursor-pointer hover:opacity-90 transition-opacity bg-black shadow-2xs"
                      >
                        {isVideoAttachment(msg.attachment) ? (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <video src={msg.attachment?.url} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                              <Video size={20} className="text-white drop-shadow-md" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={msg.attachment?.url}
                            alt={msg.attachment?.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                          <span className="text-[9px] text-white truncate font-medium">{msg.attachment?.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <ImageIcon size={32} className="mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs font-bold text-gray-600">No hay fotos compartidas</p>
                    <p className="text-[10px] mt-0.5">Toma o adjunta fotos en la conversación para verlas aquí.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DOCUMENTOS (PDF, DWG, EXCEL) */}
            {groupInfoTab === 'documentos' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {groupDocAttachments.length > 0 ? (
                  groupDocAttachments.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2.5 rounded-xl bg-slate-100 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#00668F] text-white flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">{msg.attachment?.name}</div>
                          <div className="text-[10px] text-gray-400">{msg.attachment?.size} • Por {msg.senderName}</div>
                        </div>
                      </div>

                      <a
                        href={msg.attachment?.url}
                        download={msg.attachment?.name}
                        className="px-3 py-1.5 rounded-lg bg-[#00668F] hover:bg-[#005273] text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download size={12} />
                        <span>Bajar</span>
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <FileText size={32} className="mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs font-bold text-gray-600">No hay documentos compartidos</p>
                    <p className="text-[10px] mt-0.5">Los archivos PDF y planos DWG compartidos aparecerán aquí.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ENLACES DETECTADOS EN EL CHAT */}
            {groupInfoTab === 'enlaces' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {groupLinks.length > 0 ? (
                  groupLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-100 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#00668F] flex items-center justify-center shrink-0">
                          <LinkIcon size={16} />
                        </div>
                        <div className="min-w-0">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-[#00668F] hover:underline truncate block"
                          >
                            {link.url}
                          </a>
                          <div className="text-[10px] text-gray-400 truncate">Enviado por {link.sender} ({link.timestamp})</div>
                        </div>
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-gray-700 shrink-0"
                        title="Abrir enlace"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <LinkIcon size={32} className="mx-auto mb-1.5 opacity-40" />
                    <p className="text-xs font-bold text-gray-600">No hay enlaces compartidos</p>
                    <p className="text-[10px] mt-0.5">Los links de SharePoint o sitios web compartidos aparecerán aquí.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: MENSAJES DESTACADOS / FAVORITOS */}
            {groupInfoTab === 'destacados' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {starredMessages.length > 0 ? (
                  starredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setIsGroupInfoModalOpen(false);
                        scrollToMessage(msg.id);
                      }}
                      className="p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/60 flex items-start justify-between gap-3 cursor-pointer transition-colors shadow-2xs group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-amber-950">{msg.senderName}</span>
                          <span className="text-[10px] text-amber-700/80">{msg.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-800 line-clamp-2 italic">
                          "{msg.text || (msg.attachment ? `[Archivo: ${msg.attachment.name}]` : 'Mensaje adjunto')}"
                        </p>
                      </div>
                      <span className="text-[10.5px] font-bold text-amber-800 bg-amber-200/80 group-hover:bg-amber-300 px-2 py-1 rounded-lg shrink-0 transition-colors">
                        Ir al chat
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <Star size={32} className="mx-auto mb-1.5 opacity-40 text-amber-500" />
                    <p className="text-xs font-bold text-gray-600">No tienes mensajes favoritos en este chat</p>
                    <p className="text-[10px] mt-0.5">Usa la opción "Añadir a favoritos" en cualquier mensaje para guardarlo aquí.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGroupInfoModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-black"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX / ZOOM DE IMAGEN */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImageModal}
              alt="Vista previa ampliada"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black cursor-pointer shrink-0 aspect-square"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: RESUMEN EJECUTIVO CON GOOGLE GEMINI (CON FILTRO POR PERÍODO Y MULTIMODAL) */}
      {isSummarizeModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl flex flex-col max-h-[88vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center font-bold">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Resumen Inteligente del Canal</h3>
                  <p className="text-[11px] text-gray-500">Google Gemini Flash • {currentGroup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSummarizeModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* BARRA SELECTORA DE PERÍODO / DÍAS */}
            <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">
                  Período a Resumir:
                </span>
                {threadSummary && (
                  <span className="text-[10px] font-bold text-[#00668F] bg-sky-100/70 px-2 py-0.5 rounded-full">
                    {threadSummary.totalAnalyzed ?? activeChatMessages.length} mensajes analizados
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1 text-[11px] font-bold">
                {[
                  { id: 'hoy', label: 'Hoy' },
                  { id: '24h', label: '24 Horas' },
                  { id: '3dias', label: '3 Días' },
                  { id: '7dias', label: '7 Días' },
                  { id: 'todo', label: 'Todo el Canal' },
                  { id: 'personalizado', label: 'Fecha' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      const newP = tab.id as any;
                      setSummaryPeriod(newP);
                      handleOpenSummarize(newP, summaryCustomDate);
                    }}
                    disabled={isSummarizing}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      summaryPeriod === tab.id
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-slate-200 border border-slate-200/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {summaryPeriod === 'personalizado' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10.5px] font-medium text-gray-600">Seleccionar fecha:</span>
                  <input
                    type="date"
                    value={summaryCustomDate}
                    onChange={(e) => {
                      setSummaryCustomDate(e.target.value);
                      handleOpenSummarize('personalizado', e.target.value);
                    }}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              )}

              {threadSummary?.hasMediaIncluded && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  <Sparkles size={11} className="text-emerald-600" />
                  <span className="font-semibold">Incluye diagnósticos visuales de fotos y transcripciones de notas de voz.</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {isSummarizing ? (
                <div className="p-8 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin mx-auto text-[#00668F]" />
                  <p className="font-bold text-gray-700">Analizando conversación con Google Gemini...</p>
                  <p className="text-gray-400 text-[11px]">Sintetizando estado operativo, compromisos con menciones, audios y diagnósticos visuales.</p>
                </div>
              ) : threadSummary ? (
                <div className="space-y-3.5">
                  {/* Estado Operativo */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#00668F] tracking-wider block">
                      Estado Operativo Actual
                    </span>
                    <p className="text-gray-800 leading-relaxed font-medium">
                      {threadSummary.statusSummary}
                    </p>
                  </div>

                  {/* Tareas y Compromisos */}
                  {threadSummary.commitments && threadSummary.commitments.length > 0 && (
                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                        Compromisos y Tareas Pendientes ({threadSummary.commitments.length})
                      </span>
                      <ul className="space-y-1.5">
                        {threadSummary.commitments.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-emerald-950">
                            <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div className="leading-snug">
                              <span className="font-bold">{c.responsible}:</span> {c.task}{' '}
                              <span className="text-[8.5px] px-1.5 py-0.2 rounded-full font-bold uppercase bg-emerald-200 text-emerald-800 ml-1">
                                {c.priority}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Bloqueos o Alertas */}
                  {threadSummary.blockers && threadSummary.blockers.length > 0 && (
                    <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80 space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">
                        Bloqueos o Novedades Críticas ({threadSummary.blockers.length})
                      </span>
                      <ul className="space-y-1">
                        {threadSummary.blockers.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-rose-950 font-medium">
                            <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p>No se pudo generar el resumen inteligente.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {threadSummary && (
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `Resumen Canal ${currentGroup.name} (Gemini)\n\nEstado:\n${threadSummary.statusSummary}\n\nCompromisos:\n${threadSummary.commitments.map(c => `• [${c.priority}] ${c.responsible}: ${c.task}`).join('\n')}\n\nBloqueos:\n${threadSummary.blockers.map(b => `• ${b}`).join('\n')}`;
                    navigator.clipboard.writeText(fullText);
                    notify('success', 'Copiado al Portapapeles', 'Resumen copiado exitosamente.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copiar Resumen</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => handleOpenSummarize(summaryPeriod, summaryCustomDate)}
                  disabled={isSummarizing}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#00668F] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isSummarizing ? 'animate-spin' : ''} />
                  <span>Regenerar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSummarizeModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONVERTIR MENSAJE EN ACCIÓN OPERATIVA (ASISTIDA POR LUC-IA-NA) */}
      {actionModalMessage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl flex flex-col max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00668F] text-white flex items-center justify-center font-bold">
                  <CheckSquare size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Convertir a Acción Operativa</h3>
                  <p className="text-[11px] text-gray-500">De mensaje en: {currentGroup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setActionModalMessage(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto pr-1 max-h-[68vh] scrollbar-thin">
              {/* ASISTENCIA COGNITIVA LUC-IA-NA */}
              {isAnalyzingAction ? (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[#00668F] flex items-center gap-2.5 animate-pulse">
                  <Sparkles size={16} className="animate-spin text-cyan-600 shrink-0" />
                  <span className="font-bold text-[11.5px]">LUC-IA-NA revisando mensaje, audios y contexto técnico...</span>
                </div>
              ) : actionLucianaBadge ? (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-[#00668F] flex items-start justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <Sparkles size={15} className="shrink-0 text-cyan-600 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block">
                        Revisión Asistida por LUC-IA-NA
                      </span>
                      <p className="text-[11px] font-medium text-slate-800 leading-snug">
                        {actionLucianaBadge}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleReanalyzeWithLuciana}
                    className="px-2 py-1 rounded-lg bg-white border border-sky-300 text-[#00668F] text-[10px] font-bold shrink-0 hover:bg-sky-100 transition-colors cursor-pointer"
                    title="Reanalizar con Inteligencia Artificial"
                  >
                    Reanalizar
                  </button>
                </div>
              ) : null}

              {/* Selector de Tipo de Acción */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl font-bold text-[11px]">
                <button
                  type="button"
                  onClick={() => setActionType('tarea')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    actionType === 'tarea' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Wrench size={13} />
                  <span>Tarea WBS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('hseq')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    actionType === 'hseq' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ShieldAlert size={13} />
                  <span>Alerta HSEQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('compra')}
                  className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    actionType === 'compra' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ShoppingCart size={13} />
                  <span>Requisición</span>
                </button>
              </div>

              {/* Título de la acción */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Título / Asunto</label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#00668F] focus:outline-none"
                  placeholder="Ej: Intervención de mordaza en Torre 4..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Proyecto vinculado */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Proyecto Vinculado</label>
                  <select
                    value={actionProjectCode}
                    onChange={(e) => setActionProjectCode(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#00668F] focus:outline-none bg-white"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prioridad */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Prioridad</label>
                  <select
                    value={actionPriority}
                    onChange={(e) => setActionPriority(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#00668F] focus:outline-none bg-white font-bold"
                  >
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta / Urgente</option>
                  </select>
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS SEGÚN EL TIPO DE ACCIÓN */}
              {actionType === 'tarea' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-sky-50/60 rounded-xl border border-sky-100">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-gray-700">Horas Planificadas WBS</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={wbsEstimatedHours}
                      onChange={(e) => setWbsEstimatedHours(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-gray-700">Rol Responsable</label>
                    <select
                      value={wbsAssignedRole}
                      onChange={(e) => setWbsAssignedRole(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="Técnico Especialista STC">Técnico Especialista STC</option>
                      <option value="Ingeniero Residente">Ingeniero Residente</option>
                      <option value="Técnico Mecánico de Alturas">Técnico Mecánico de Alturas</option>
                      <option value="Inspector Eléctrico STC">Inspector Eléctrico STC</option>
                      <option value="Líder HSEQ / SST">Líder HSEQ / SST</option>
                    </select>
                  </div>
                </div>
              )}

              {actionType === 'hseq' && (
                <div className="space-y-2.5 p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-gray-700">Tipo de Incidente SST</label>
                      <select
                        value={hseqIncidentType}
                        onChange={(e) => setHseqIncidentType(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-medium"
                      >
                        <option value="Condición Insegura en Alturas">Condición Insegura en Alturas</option>
                        <option value="Acto Inseguro">Acto Inseguro</option>
                        <option value="Incidente Operativo STC">Incidente Operativo STC</option>
                        <option value="Desgaste Crítico de Cable">Desgaste Crítico de Cable</option>
                        <option value="Falla de Polea / Balancín">Falla de Polea / Balancín</option>
                        <option value="Parada de Emergencia no Programada">Parada de Emergencia</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-gray-700">Ubicación / Pilona</label>
                      <input
                        type="text"
                        value={hseqLocation}
                        onChange={(e) => setHseqLocation(e.target.value)}
                        placeholder="Ej: Torre 4 / Balancín 2"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-gray-700">Acción Inmediata Requerida</label>
                    <input
                      type="text"
                      value={hseqImmediateAction}
                      onChange={(e) => setHseqImmediateAction(e.target.value)}
                      placeholder="Ej: Bloqueo de línea y revisión de apriete..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}

              {actionType === 'compra' && (
                <div className="space-y-2.5 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-gray-700">Repuesto / Insumo Solicitado</label>
                    <input
                      type="text"
                      value={reqProductName}
                      onChange={(e) => setReqProductName(e.target.value)}
                      placeholder="Ej: Mordaza de agarre doble DT-104"
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-gray-700">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={reqProductQty}
                        onChange={(e) => setReqProductQty(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-gray-700">Unidad</label>
                      <select
                        value={reqProductUnit}
                        onChange={(e) => setReqProductUnit(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="unidades">unidades</option>
                        <option value="juegos / kits">juegos / kits</option>
                        <option value="metros">metros</option>
                        <option value="galones">galones</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-gray-700">SKU / Referencia</label>
                      <input
                        type="text"
                        value={reqProductSku}
                        onChange={(e) => setReqProductSku(e.target.value)}
                        placeholder="REP-OEM-STC"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono text-[10.5px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Descripción con contexto del mensaje */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Justificación Técnica & Contexto</label>
                <textarea
                  rows={4}
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-[#00668F] focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModalMessage(null)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={isSavingAction || !actionTitle.trim()}
                className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingAction ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>
                  {actionType === 'tarea' ? 'Crear Tarea WBS' : actionType === 'hseq' ? 'Emitir Alerta HSEQ' : 'Generar Requisición'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN API KEY GOOGLE GEMINI */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base">Configurar Clave de Google Gemini</h3>
                  <p className="text-[11px] text-gray-500">IA para diagnóstico END, notas de voz y resúmenes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Explicación / Instrucciones paso a paso */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-900">
                <Sparkles size={14} className="text-[#00668F]" />
                <span>¿Cómo obtener tu clave gratuita en 1 minuto?</span>
              </div>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 text-[11px] leading-relaxed">
                <li>
                  Ingresa a{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#00668F] font-bold underline inline-flex items-center gap-0.5 hover:text-[#005273]"
                  >
                    Google AI Studio (aistudio.google.com)
                    <ExternalLink size={10} />
                  </a>.
                </li>
                <li>Inicia sesión con tu cuenta de Google.</li>
                <li>
                  Haz clic en <strong>"Create API key"</strong> y elige <strong>"Create API key in new project"</strong> (para evitar bloqueos de organización en Google Cloud).
                </li>
                <li>Copia la clave generada y pégala a continuación.</li>
              </ol>
            </div>

            {/* Input de la Clave */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Clave de API Gemini (API Key)</span>
                {geminiKeyInput && (
                  <span className="text-[10px] text-gray-400 font-normal">
                    {geminiKeyInput.length} caracteres
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={geminiKeyInput}
                  onChange={(e) => {
                    setGeminiKeyInput(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full text-xs font-mono p-3 pr-9 rounded-xl border border-slate-200 focus:border-[#00668F] focus:outline-hidden bg-slate-50/50 text-gray-900"
                />
                {geminiKeyInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiKeyInput('');
                      setTestResult(null);
                    }}
                    className="absolute right-2.5 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Resultado de la prueba */}
            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed">
                  <strong className="block">{testResult.ok ? '¡Conexión Exitosa!' : 'Error de Conexión'}</strong>
                  <span className="text-[11px]">{testResult.message}</span>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={async () => {
                  setTestingKey(true);
                  setTestResult(null);
                  try {
                    const res = await testGeminiApiKey(geminiKeyInput);
                    setTestResult(res);
                  } finally {
                    setTestingKey(false);
                  }
                }}
                disabled={testingKey || !geminiKeyInput.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {testingKey ? <Loader2 size={13} className="animate-spin text-[#00668F]" /> : <RefreshCw size={13} />}
                <span>Probar Conexión</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    saveGeminiApiKey('');
                    setGeminiKeyInput('');
                    setTestResult(null);
                    notify('info', 'Clave Restablecida', 'Se eliminó la clave personalizada.');
                  }}
                  className="px-3 py-2.5 rounded-xl text-gray-500 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Restablecer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveGeminiApiKey(geminiKeyInput);
                    notify('success', 'Clave Guardada', 'La API Key de Gemini ha sido guardada y está activa.');
                    setIsApiKeyModalOpen(false);
                  }}
                  disabled={!geminiKeyInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-40"
                >
                  <Check size={14} />
                  <span>Guardar Clave</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENÚ CONTEXTUAL DE CLIC DERECHO (ESTILO WHATSAPP/TELEGRAM PRO) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 w-56 text-xs text-gray-800 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderMessageMenuItems(contextMenu.msg, () => setContextMenu(null))}
        </div>
      )}

      {/* MODAL PARA REENVIAR MENSAJE A OTRO CHAT O COMPAÑERO */}
      {forwardModalMsg && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#00668F] flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Reenviar Mensaje</h3>
                  <p className="text-[11px] text-gray-500">Selecciona el canal o colaborador de destino</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardModalMsg(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Vista previa del mensaje a reenviar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Mensaje a reenviar:
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs text-gray-800 shadow-2xs">
                <div className="font-bold text-[11px] text-[#00668F] mb-0.5">
                  {forwardModalMsg.senderName}
                </div>
                {forwardModalMsg.text && (
                  <p className="line-clamp-2 text-slate-700 italic">"{forwardModalMsg.text}"</p>
                )}
                {forwardModalMsg.attachment && (
                  <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                    <Paperclip size={12} />
                    <span>{forwardModalMsg.attachment.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buscador de destinos */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Buscar canal, proyecto o compañero..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 text-xs text-gray-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de destinos */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-80 scrollbar-thin">
              {/* Canales y Grupos */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  Canales y Grupos
                </div>
                <div className="space-y-1">
                  {chatGroups
                    .filter((g) => !g.isDirect && (!forwardSearch || g.name.toLowerCase().includes(forwardSearch.toLowerCase())))
                    .map((group) => (
                      <div
                        key={group.id}
                        className="p-2.5 rounded-2xl hover:bg-sky-50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#00668F]/10 text-[#00668F] flex items-center justify-center font-bold text-xs shrink-0">
                            <Hash size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{group.name}</div>
                            <div className="text-[10.5px] text-gray-400 truncate">{group.description}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleConfirmForward(group.id);
                            setActiveGroupId(group.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                        >
                          Reenviar
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Compañeros de Equipo */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  Mensaje Directo
                </div>
                <div className="space-y-1">
                  {users
                    .filter((u) => u.id !== currentUser.id && (!forwardSearch || u.name.toLowerCase().includes(forwardSearch.toLowerCase()) || u.roleLabel.toLowerCase().includes(forwardSearch.toLowerCase())))
                    .map((user) => (
                      <div
                        key={user.id}
                        className="p-2.5 rounded-2xl hover:bg-sky-50 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0"
                            style={{ backgroundColor: user.avatarColor || '#00668F' }}
                          >
                            {user.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 truncate">{user.name}</div>
                            <div className="text-[10.5px] text-gray-400 truncate">{user.roleLabel}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const directId = getOrCreateDirectChat(user.id);
                            handleConfirmForward(directId);
                            setActiveGroupId(directId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                        >
                          Reenviar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmMsg && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <Trash2 size={26} />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">
              ¿Eliminar mensaje para todos?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Este mensaje se eliminará de forma permanente para <strong>toda la empresa</strong> en tiempo real. Esta acción no se puede deshacer.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-left text-xs text-gray-700 mb-4 max-h-24 overflow-y-auto italic">
              "{deleteConfirmMsg.text || deleteConfirmMsg.attachment?.name || 'Mensaje adjunto'}"
            </div>

            <div className="text-[10.5px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl py-1.5 px-3 mb-4">
              ⏱️ Quedan {getRemainingMinutes(deleteConfirmMsg)} minutos antes de que expire la opción de eliminar.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmMsg(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessage}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                Eliminar para todos
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteForMeConfirmMsg && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-5 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <Trash2 size={26} />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1">
              ¿Eliminar mensaje para ti?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Este mensaje se eliminará únicamente de tu vista. Los demás miembros del equipo aún podrán verlo en la conversación. Esta acción se puede realizar en cualquier momento y es permanente.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-left text-xs text-gray-700 mb-4 max-h-24 overflow-y-auto italic">
              "{deleteForMeConfirmMsg.text || deleteForMeConfirmMsg.attachment?.name || 'Mensaje adjunto'}"
            </div>

            <div className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl py-1.5 px-3 mb-4">
              🗑️ Oculto en tu chat para siempre
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteForMeConfirmMsg(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMessageForMe}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                Eliminar para mí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
