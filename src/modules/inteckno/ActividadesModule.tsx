import React, { useState, useRef, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  User as UserIcon,
  AlertTriangle,
  Clock,
  Briefcase,
  CheckCircle2,
  Search,
  Settings,
  LayoutGrid,
  List,
  Sparkles,
  Mic,
  MicOff,
  Camera,
  ExternalLink,
  Send,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Share2,
  Video,
  Globe,
  Tag,
  Check,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { TodoItem, TodoStatus, TodoChecklistItem, TodoPhotoEvidence } from '../../types';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { MargaritaIcon } from '../../components/common/MargaritaIcon';
import {
  generateTechnicalChecklistWithLuciana,
  validatePhotoEvidenceWithLuciana,
  getSystemDate,
  TechnicalChecklistResult,
} from '../../core/services/lucianaService';
import {
  syncTodoToMicrosoftToDo,
  getMicrosoftToDoWebUrl,
  getTeamsTodoAlertUrl,
  getOutlookTodoAlertUrl,
} from '../../core/services/m365Sync';

// Semáforo de proximidad para fechas de vencimiento
function getDueDateStatus(dueDateStr?: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' {
  if (!dueDateStr) return 'upcoming';
  const sysDate = getSystemDate();
  const currentStr = sysDate.dateStr;
  const tomorrowStr = sysDate.tomorrowStr;

  if (dueDateStr < currentStr) return 'overdue';
  if (dueDateStr === currentStr) return 'today';
  if (dueDateStr === tomorrowStr) return 'tomorrow';
  return 'upcoming';
}

// Cálculo de progreso de subtareas técnicas
function getChecklistProgress(checklist?: TodoChecklistItem[]): {
  total: number;
  completed: number;
  percent: number;
} {
  if (!checklist || checklist.length === 0) {
    return { total: 0, completed: 0, percent: 0 };
  }
  const total = checklist.length;
  const completed = checklist.filter((c) => c.completed).length;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, percent };
}

export const ActividadesModule: React.FC = () => {
  const {
    todos,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    users,
    currentUser,
    projects,
    createCalendarEvent,
  } = useErp();

  // Catálogos dinámicos editables
  const catalogCategories = useModuleCatalog('actividades', 'categories');

  // Modo de visualización: Lista Detallada vs. Tablero Kanban Operativo
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Estados del formulario de nueva actividad
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoItem['priority']>('alta');
  const [category, setCategory] = useState<string>('Operativa de Campo');
  const [dueDate, setDueDate] = useState<string>(() => getSystemDate().dateStr);
  const [assignedToUserId, setAssignedToUserId] = useState<string>(currentUser.id);
  const [projectCode, setProjectCode] = useState<string>('PRJ-2026-MED-K');
  const [notes, setNotes] = useState('');
  const [initialChecklist, setInitialChecklist] = useState<string[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Widget de Foco de Hoy por LUC-IA-NA
  const [isFocusWidgetOpen, setIsFocusWidgetOpen] = useState(true);

  // Filtros rápidos
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'mine' | 'pending' | 'in_progress' | 'in_review' | 'completed' | 'high'
  >('all');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Detalle / Edición / Checklist de Tarea
  const [selectedTodoForModal, setSelectedTodoForModal] = useState<TodoItem | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [m365SyncFeedback, setM365SyncFeedback] = useState<{ todoId: string; msg: string; success: boolean } | null>(null);

  // Modal del Asistente LUC-IA-NA para Desglose Técnico
  const [isLucianaModalOpen, setIsLucianaModalOpen] = useState(false);
  const [lucianaPrompt, setLucianaPrompt] = useState('');
  const [isProcessingLuciana, setIsProcessingLuciana] = useState(false);
  const [lucianaDraft, setLucianaDraft] = useState<TechnicalChecklistResult | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Semáforo y Foco de Hoy: las 3 tareas de mayor impacto operativo/financiero
  const focusTasks = useMemo(() => {
    return todos
      .filter((t) => !t.completed && t.status !== 'completada')
      .sort((a, b) => {
        // Prioridad alta primero
        const pOrder: Record<string, number> = { alta: 3, media: 2, baja: 1 };
        const pDiff = (pOrder[b.priority] || 1) - (pOrder[a.priority] || 1);
        if (pDiff !== 0) return pDiff;

        // Vencidas y de hoy primero
        const aStatus = getDueDateStatus(a.dueDate);
        const bStatus = getDueDateStatus(b.dueDate);
        const sOrder: Record<string, number> = { overdue: 4, today: 3, tomorrow: 2, upcoming: 1 };
        return (sOrder[bStatus] || 0) - (sOrder[aStatus] || 0);
      })
      .slice(0, 3);
  }, [todos]);

  // Filtrado reactivo de tareas
  const filteredTodos = useMemo(() => {
    return todos
      .filter((t) => {
        if (activeFilter === 'mine') {
          return t.assignedToUserId === currentUser.id || t.userId === currentUser.id;
        }
        if (activeFilter === 'pending') {
          return !t.completed && (t.status === 'pendiente' || !t.status);
        }
        if (activeFilter === 'in_progress') {
          return t.status === 'en_curso';
        }
        if (activeFilter === 'in_review') {
          return t.status === 'en_revision';
        }
        if (activeFilter === 'completed') {
          return t.completed || t.status === 'completada';
        }
        if (activeFilter === 'high') {
          return t.priority === 'alta' && !t.completed && t.status !== 'completada';
        }
        return true;
      })
      .filter((t) => {
        if (selectedProjectFilter === 'all') return true;
        return t.projectCode === selectedProjectFilter;
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(q)) ||
          (t.projectCode && t.projectCode.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q)) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        );
      });
  }, [todos, activeFilter, selectedProjectFilter, searchQuery, currentUser.id]);

  // Contadores para KPIs
  const totalPending = todos.filter((t) => !t.completed && (!t.status || t.status === 'pendiente')).length;
  const totalInProgress = todos.filter((t) => t.status === 'en_curso').length;
  const totalInReview = todos.filter((t) => t.status === 'en_revision').length;
  const totalCompleted = todos.filter((t) => t.completed || t.status === 'completada').length;
  const totalHigh = todos.filter((t) => t.priority === 'alta' && !t.completed && t.status !== 'completada').length;

  // Manejo de creación manual de tarea
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedUser = users.find((u) => u.id === assignedToUserId) || currentUser;

    const checklistItems: TodoChecklistItem[] = initialChecklist.map((text, idx) => ({
      id: `chk-${Date.now()}-${idx}`,
      text,
      completed: false,
    }));

    addTodo(
      title.trim(),
      priority,
      dueDate,
      assignedUser.id,
      assignedUser.name,
      projectCode,
      notes.trim() || undefined,
      {
        category,
        checklist: checklistItems.length > 0 ? checklistItems : undefined,
        status: 'pendiente',
        generatedByLuciana: false,
      }
    );

    // Resetear formulario
    setTitle('');
    setNotes('');
    setInitialChecklist([]);
    setNewChecklistInput('');
    setIsFormExpanded(false);
  };

  // Cambio de estado rápido en Kanban
  const handleMoveStatus = (todoId: string, newStatus: TodoStatus) => {
    const isCompleted = newStatus === 'completada';
    updateTodo(todoId, {
      status: newStatus,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      completedBy: isCompleted ? currentUser.name : undefined,
    });
  };

  // Sincronización individual con Microsoft To Do
  const handleSyncToMicrosoftToDo = async (todo: TodoItem) => {
    setM365SyncFeedback({ todoId: todo.id, msg: 'Sincronizando con Microsoft To Do...', success: true });
    try {
      const result = await syncTodoToMicrosoftToDo(todo);
      if (result.success) {
        updateTodo(todo.id, {
          m365TaskId: result.m365TaskId,
          m365Synced: true,
        });
        setM365SyncFeedback({ todoId: todo.id, msg: result.message, success: true });
      } else {
        setM365SyncFeedback({ todoId: todo.id, msg: result.message, success: false });
      }
    } catch (err: any) {
      setM365SyncFeedback({
        todoId: todo.id,
        msg: err.message || 'No fue posible sincronizar con Microsoft To Do',
        success: false,
      });
    }
  };

  // Proyectar tarea como evento de parada o hito en el Calendario de Operaciones
  const handleProjectInCalendar = (todo: TodoItem) => {
    const project = projects.find((p) => p.code === todo.projectCode) || projects[0];
    const eventTitle = `[COMPROMISO STC] ${todo.title}`;

    createCalendarEvent({
      title: eventTitle,
      date: todo.dueDate,
      time: '08:00 AM - 12:00 PM',
      startTime: '08:00 AM',
      endTime: '12:00 PM',
      type: 'parada_tecnica',
      location: todo.projectCode ? `Pilona / Estación ${todo.projectCode}` : 'Sede de Operaciones',
      projectCode: todo.projectCode || 'PRJ-2026-MED-K',
      projectName: project?.name || 'Operación Inteckno STC',
      creatorId: currentUser.id,
      attendeeIds: [todo.assignedToUserId || currentUser.id],
      attendees: [todo.assignedToName || currentUser.name],
      meetingMethod: 'presencial',
      description: `Actividad técnica proyectada desde Actividades Operativas. Tarea: ${todo.title}. Notas: ${todo.notes || 'Sin observaciones adicionales.'}`,
      reminderMinutes: 30,
      syncStatus: 'local_only',
      lastSyncedAt: new Date().toISOString(),
    });

    updateTodo(todo.id, { calendarEventId: `EVT-${Date.now()}` });
    alert(`¡La actividad "${todo.title}" ha sido proyectada en el Calendario de Operaciones para el ${todo.dueDate}!`);
  };

  // Subir foto de evidencia técnica
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTodoForModal) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const newEvidence: TodoPhotoEvidence = {
        id: `evd-${Date.now()}`,
        url: base64Data,
        uploadedAt: new Date().toLocaleString([], {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        description: 'Evidencia fotográfica tomada en campo',
      };

      const updatedPhotos = [...(selectedTodoForModal.photoEvidences || []), newEvidence];
      updateTodo(selectedTodoForModal.id, { photoEvidences: updatedPhotos });
      setSelectedTodoForModal((prev) => (prev ? { ...prev, photoEvidences: updatedPhotos } : null));

      // Validación con IA en segundo plano
      setIsAnalyzingPhoto(true);
      try {
        const aiCheck = await validatePhotoEvidenceWithLuciana(
          base64Data,
          file.type || 'image/jpeg',
          selectedTodoForModal.title
        );
        newEvidence.aiValidation = aiCheck.feedback;
        const reUpdated = updatedPhotos.map((p) => (p.id === newEvidence.id ? newEvidence : p));
        updateTodo(selectedTodoForModal.id, { photoEvidences: reUpdated });
        setSelectedTodoForModal((prev) => (prev ? { ...prev, photoEvidences: reUpdated } : null));
      } catch (err) {
        console.warn('Error validando foto con LUC-IA-NA:', err);
      } finally {
        setIsAnalyzingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Dictado por voz para el asistente LUC-IA-NA
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz no está soportado en este navegador. Puedes escribir la solicitud.');
      return;
    }

    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListeningVoice(true);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.onerror = () => setIsListeningVoice(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLucianaPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (err) {
      console.warn('Error iniciando micrófono:', err);
      setIsListeningVoice(false);
    }
  };

  // Procesar requerimiento técnico con LUC-IA-NA
  const handleProcessLucianaChecklist = async (promptOverride?: string) => {
    const queryToRun = (promptOverride || lucianaPrompt).trim();
    if (!queryToRun) return;

    setIsProcessingLuciana(true);
    try {
      const sysDate = getSystemDate();
      const result = await generateTechnicalChecklistWithLuciana(queryToRun, {
        currentUser,
        users,
        projects,
        currentDate: sysDate.dateStr,
      });
      setLucianaDraft(result);
    } catch (err) {
      console.warn('Error procesando con LUC-IA-NA:', err);
    } finally {
      setIsProcessingLuciana(false);
    }
  };

  // Confirmar y crear la tarea técnica generada por LUC-IA-NA
  const handleConfirmLucianaDraft = () => {
    if (!lucianaDraft) return;

    addTodo(
      lucianaDraft.title,
      lucianaDraft.priority,
      lucianaDraft.dueDate,
      lucianaDraft.assignedToUserId,
      lucianaDraft.assignedToName,
      lucianaDraft.projectCode,
      lucianaDraft.notes,
      {
        category: lucianaDraft.category,
        checklist: lucianaDraft.checklist,
        status: 'pendiente',
        generatedByLuciana: true,
        lucianaSourceContext: `Asistente LUC-IA-NA: ${lucianaPrompt || lucianaDraft.title}`,
      }
    );

    setIsLucianaModalOpen(false);
    setLucianaDraft(null);
    setLucianaPrompt('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE VISTAS Y ASISTENTE */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-[22px] shadow-xs">
        {/* Selector de Vistas: Kanban vs. Lista */}
        <div className="grid grid-cols-2 sm:flex sm:items-center w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-[#00668F] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Tablero Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-[#00668F] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <List size={14} />
            <span>Lista Detallada</span>
          </button>
        </div>

        {/* Acciones principales: Asistente LUC-IA-NA y Configuración */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsLucianaModalOpen(true)}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            title="Desglosar checklist técnico con LUC-IA-NA"
          >
            <MargaritaIcon size={16} petalColor="#FFFFFF" centerColor="#FEF08A" />
            <span>Asistente LUC-IA-NA</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Configurar categorías de actividades"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET COLAPSABLE: "EL FOCO DE HOY POR LUC-IA-NA" */}
      {/* ========================================================================= */}
      <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-[22px] p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full shrink-0 aspect-square bg-amber-500 text-white flex items-center justify-center shadow-2xs">
              <MargaritaIcon size={16} petalColor="#FFFFFF" centerColor="#FEF08A" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-950 dark:text-amber-200 block">
                El Foco de Hoy por LUC-IA-NA (Priorización Inteligente)
              </span>
              <span className="text-[10.5px] text-gray-600 dark:text-gray-400">
                Compromisos críticos según vencimiento e hitos contractuales de 48h de Inteckno
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFocusWidgetOpen(!isFocusWidgetOpen)}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 p-1 cursor-pointer"
          >
            {isFocusWidgetOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isFocusWidgetOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {focusTasks.length > 0 ? (
              focusTasks.map((task, idx) => {
                const status = getDueDateStatus(task.dueDate);
                const progress = getChecklistProgress(task.checklist);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTodoForModal(task)}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-amber-400 transition-all cursor-pointer shadow-2xs space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <span>Foco #{idx + 1}</span>
                        {task.priority === 'alta' && (
                          <span className="text-rose-600 font-extrabold uppercase text-[9px] px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                            Urgente
                          </span>
                        )}
                      </span>

                      <span
                        className={`font-bold px-1.5 py-0.5 rounded-md ${
                          status === 'overdue'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : status === 'today'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {status === 'overdue' ? 'VENCIDA' : status === 'today' ? 'VENCE HOY' : task.dueDate}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#00668F] transition-colors">
                      {task.title}
                    </h4>

                    {progress.total > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9.5px] text-gray-500">
                          <span>Checklist: {progress.completed}/{progress.total}</span>
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                      <span className="truncate max-w-[120px] font-medium">{task.assignedToName || 'Inteckno'}</span>
                      <span className="font-bold text-[#00668F] group-hover:underline flex items-center gap-0.5">
                        <span>Ver</span>
                        <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sm:col-span-3 p-4 text-center text-xs text-gray-500 bg-white/70 dark:bg-slate-800/70 rounded-2xl">
                🌼 ¡Felicitaciones! No tienes tareas de alta prioridad atrasadas ni venciendo en la jornada de hoy.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TARJETAS RESUMEN DE ACTIVIDADES (KPIs) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[22px] shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-400 block">Total Actividades</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{todos.length}</span>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Compromisos registrados</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-[22px] shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-400 block">Por Iniciar</span>
          <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1 block">{totalPending}</span>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Listas para arranque</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-[22px] shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-400 block">En Curso / Campo</span>
          <span className="text-2xl font-black text-[#00668F] dark:text-sky-400 mt-1 block">{totalInProgress}</span>
          <span className="text-[10px] text-[#00668F] font-semibold mt-0.5 block">Técnicos ejecutando</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-[22px] shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-400 block">Alta Prioridad</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">{totalHigh}</span>
          <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">Atención urgente</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-[22px] shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-gray-400 block">Completadas</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {totalCompleted}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Cierres conformes</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORMULARIO RÁPIDO PARA AÑADIR ACTIVIDAD */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full shrink-0 aspect-square bg-sky-100 text-[#00668F] flex items-center justify-center font-bold shadow-2xs">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Añadir Nueva Tarea o Compromiso</h3>
              <p className="text-xs text-gray-400">
                Se notificará al responsable asignado y estará lista para sincronizar con Microsoft To Do
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="text-xs font-bold text-[#00668F] hover:underline cursor-pointer"
          >
            {isFormExpanded ? 'Modo Rápido' : '+ Desplegar Checklists y Opciones'}
          </button>
        </div>

        <form onSubmit={handleAddTodo} className="space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Calibrar torquímetro para pernos de balancines en Pilona 4 Línea K..."
              className="flex-1 text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#00668F]/30"
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 font-bold focus:bg-white cursor-pointer"
            >
              <option value="alta">Prioridad Alta</option>
              <option value="media">Prioridad Media</option>
              <option value="baja">Prioridad Baja</option>
            </select>

            <button
              type="submit"
              className="px-6 py-3 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={14} />
              <span>Añadir Actividad</span>
            </button>
          </div>

          {/* Opciones Avanzadas Desplegables */}
          {(isFormExpanded || title.length > 0) && (
            <div className="space-y-3 pt-2 text-xs animate-in fade-in duration-150 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Selector de Responsable */}
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1">
                    <UserIcon size={12} className="text-[#00668F]" />
                    <span>Responsable:</span>
                  </label>
                  <select
                    value={assignedToUserId}
                    onChange={(e) => setAssignedToUserId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-medium focus:bg-white shadow-2xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.roleLabel})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha Límite */}
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-[#00668F]" />
                    <span>Fecha Límite:</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-medium focus:bg-white shadow-2xs"
                  />
                </div>

                {/* Categoría de Actividad */}
                <div>
                  <CreatableSelect
                    label="Categoría Operativa"
                    value={category}
                    onChange={(val) => setCategory(val)}
                    options={catalogCategories}
                    moduleId="actividades"
                    catalogKey="categories"
                    placeholder="Categoría..."
                    onOpenConfig={() => setIsConfigModalOpen(true)}
                  />
                </div>

                {/* Proyecto Vinculado */}
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1 flex items-center gap-1">
                    <Briefcase size={12} className="text-[#00668F]" />
                    <span>Proyecto STC:</span>
                  </label>
                  <select
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-medium focus:bg-white shadow-2xs"
                  >
                    <option value="">(Transversal)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtareas Iniciales del Checklist */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-gray-700 dark:text-gray-300 block text-[11px]">
                  Checklist de verificación técnica inicial (opcional):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newChecklistInput.trim()) {
                          setInitialChecklist([...initialChecklist, newChecklistInput.trim()]);
                          setNewChecklistInput('');
                        }
                      }
                    }}
                    placeholder="Escribe un paso técnico y presiona Enter..."
                    className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-800 text-xs text-gray-800 dark:text-gray-200 border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistInput.trim()) {
                        setInitialChecklist([...initialChecklist, newChecklistInput.trim()]);
                        setNewChecklistInput('');
                      }
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Agregar Paso
                  </button>
                </div>

                {initialChecklist.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {initialChecklist.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 text-[10.5px] font-medium flex items-center gap-1.5"
                      >
                        <span>{idx + 1}. {item}</span>
                        <button
                          type="button"
                          onClick={() => setInitialChecklist(initialChecklist.filter((_, i) => i !== idx))}
                          className="text-sky-700 hover:text-rose-600 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas Adicionales */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones u observaciones técnicas adicionales para la cuadrilla..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs placeholder-gray-400 focus:bg-white shadow-2xs"
                />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS RÁPIDOS Y BÚSQUEDA */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Píldoras de Filtro */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Todas ({todos.length})
            </button>
            <button
              onClick={() => setActiveFilter('mine')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                activeFilter === 'mine'
                  ? 'bg-[#00668F] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Mis Actividades
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                activeFilter === 'in_progress'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              En Curso ({totalInProgress})
            </button>
            <button
              onClick={() => setActiveFilter('high')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                activeFilter === 'high'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Alta Prioridad ({totalHigh})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                activeFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Completadas ({totalCompleted})
            </button>
          </div>

          {/* Filtro por Proyecto y Buscador */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="text-xs p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 font-bold focus:bg-white"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tarea o persona..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:bg-white shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Feedback temporal de sincronización M365 */}
        {m365SyncFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
              m365SyncFeedback.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <span>{m365SyncFeedback.msg}</span>
            <button
              type="button"
              onClick={() => setM365SyncFeedback(null)}
              className="font-bold text-xs hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODO 1: TABLERO KANBAN OPERATIVO (4 COLUMNAS) */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* COLUMNA 1: POR INICIAR */}
          <div className="bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl p-3.5 space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Por Iniciar
                </h4>
              </div>
              <span className="min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                {filteredTodos.filter((t) => !t.status || t.status === 'pendiente').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredTodos
                .filter((t) => !t.status || t.status === 'pendiente')
                .map((todo) => (
                  <KanbanTaskCard
                    key={todo.id}
                    todo={todo}
                    onOpenModal={() => setSelectedTodoForModal(todo)}
                    onMoveRight={() => handleMoveStatus(todo.id, 'en_curso')}
                    onSyncM365={() => handleSyncToMicrosoftToDo(todo)}
                    onProjectCalendar={() => handleProjectInCalendar(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
            </div>
          </div>

          {/* COLUMNA 2: EN CURSO / EN CAMPO */}
          <div className="bg-sky-50/70 dark:bg-sky-950/20 rounded-2xl p-3.5 space-y-3 min-h-[500px] border border-sky-100/80 dark:border-sky-900/40">
            <div className="flex items-center justify-between pb-1 border-b border-sky-200/60 dark:border-sky-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                <h4 className="text-xs font-black text-sky-900 dark:text-sky-200 uppercase tracking-wider">
                  En Campo / Ejecución
                </h4>
              </div>
              <span className="min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-white dark:bg-slate-700 text-sky-800 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-2xs">
                {filteredTodos.filter((t) => t.status === 'en_curso').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredTodos
                .filter((t) => t.status === 'en_curso')
                .map((todo) => (
                  <KanbanTaskCard
                    key={todo.id}
                    todo={todo}
                    onOpenModal={() => setSelectedTodoForModal(todo)}
                    onMoveLeft={() => handleMoveStatus(todo.id, 'pendiente')}
                    onMoveRight={() => handleMoveStatus(todo.id, 'en_revision')}
                    onSyncM365={() => handleSyncToMicrosoftToDo(todo)}
                    onProjectCalendar={() => handleProjectInCalendar(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
            </div>
          </div>

          {/* COLUMNA 3: EN VALIDACIÓN TÉCNICA */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl p-3.5 space-y-3 min-h-[500px] border border-amber-100/80 dark:border-amber-900/40">
            <div className="flex items-center justify-between pb-1 border-b border-amber-200/60 dark:border-amber-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Validación Técnica
                </h4>
              </div>
              <span className="min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                {filteredTodos.filter((t) => t.status === 'en_revision').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredTodos
                .filter((t) => t.status === 'en_revision')
                .map((todo) => (
                  <KanbanTaskCard
                    key={todo.id}
                    todo={todo}
                    onOpenModal={() => setSelectedTodoForModal(todo)}
                    onMoveLeft={() => handleMoveStatus(todo.id, 'en_curso')}
                    onMoveRight={() => handleMoveStatus(todo.id, 'completada')}
                    onSyncM365={() => handleSyncToMicrosoftToDo(todo)}
                    onProjectCalendar={() => handleProjectInCalendar(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
            </div>
          </div>

          {/* COLUMNA 4: COMPLETADA */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl p-3.5 space-y-3 min-h-[500px] border border-emerald-100/80 dark:border-emerald-900/40">
            <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60 dark:border-emerald-800/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                  Completadas
                </h4>
              </div>
              <span className="min-w-[22px] h-[20px] px-1.5 text-[10px] font-bold rounded-full bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs">
                {filteredTodos.filter((t) => t.status === 'completada' || t.completed).length}
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredTodos
                .filter((t) => t.status === 'completada' || t.completed)
                .map((todo) => (
                  <KanbanTaskCard
                    key={todo.id}
                    todo={todo}
                    onOpenModal={() => setSelectedTodoForModal(todo)}
                    onMoveLeft={() => handleMoveStatus(todo.id, 'en_revision')}
                    onSyncM365={() => handleSyncToMicrosoftToDo(todo)}
                    onProjectCalendar={() => handleProjectInCalendar(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODO 2: VISTA LISTA DETALLADA CON CHECKLIST DESPLEGABLE */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm p-4 sm:p-5 space-y-3">
          {filteredTodos.length > 0 ? (
            filteredTodos.map((todo) => {
              const status = getDueDateStatus(todo.dueDate);
              const progress = getChecklistProgress(todo.checklist);
              const assignedUser = users.find((u) => u.id === todo.assignedToUserId);

              return (
                <div
                  key={todo.id}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all shadow-2xs border ${
                    todo.completed || todo.status === 'completada'
                      ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-[#00668F]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Botón de Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleTodo(todo.id)}
                        className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          todo.completed || todo.status === 'completada'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 shadow-2xs text-gray-400 hover:text-[#00668F]'
                        }`}
                      >
                        {todo.completed || todo.status === 'completada' ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => setSelectedTodoForModal(todo)}
                            className={`text-xs font-bold leading-snug cursor-pointer hover:text-[#00668F] transition-colors ${
                              todo.completed || todo.status === 'completada'
                                ? 'line-through text-gray-400 dark:text-gray-500'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {todo.title}
                          </span>

                          {/* Badge de Prioridad */}
                          <span
                            className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                              todo.priority === 'alta'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : todo.priority === 'media'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {todo.priority}
                          </span>

                          {/* Proyecto Vinculado */}
                          {todo.projectCode && (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              {todo.projectCode}
                            </span>
                          )}

                          {/* Etiqueta de Origen LUC-IA-NA */}
                          {todo.generatedByLuciana && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 flex items-center gap-1">
                              <MargaritaIcon size={11} petalColor="currentColor" centerColor="#F59E0B" />
                              <span>Generado por LUC-IA-NA</span>
                            </span>
                          )}

                          {/* Badge de sincronización Microsoft To Do */}
                          {todo.m365Synced && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 flex items-center gap-1">
                              <Check size={10} />
                              <span>Microsoft To Do</span>
                            </span>
                          )}
                        </div>

                        {/* Metadatos (Responsable, Fecha con semáforo, Categoría) */}
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-300 font-semibold">
                            <UserIcon size={12} className="text-[#00668F]" />
                            <span>{todo.assignedToName || assignedUser?.name || 'Equipo Inteckno'}</span>
                          </span>

                          <span>•</span>

                          <span
                            className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md ${
                              status === 'overdue'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                                : status === 'today'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Clock size={11} />
                            <span>
                              {status === 'overdue'
                                ? `Vencida (${todo.dueDate})`
                                : status === 'today'
                                ? 'Vence Hoy'
                                : status === 'tomorrow'
                                ? 'Vence Mañana'
                                : `Vence: ${todo.dueDate}`}
                            </span>
                          </span>

                          {todo.category && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Tag size={11} />
                                <span>{todo.category}</span>
                              </span>
                            </>
                          )}

                          {/* Barra de progreso de checklist inline */}
                          {progress.total > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                                <CheckSquare size={11} />
                                <span>{progress.completed}/{progress.total} pasos ({progress.percent}%)</span>
                              </span>
                            </>
                          )}

                          {/* Evidencias fotográficas */}
                          {todo.photoEvidences && todo.photoEvidences.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-bold">
                                <Camera size={11} />
                                <span>{todo.photoEvidences.length} fotos</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Checklist interactivo inline si hay subtareas */}
                        {todo.checklist && todo.checklist.length > 0 && (
                          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {todo.checklist.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  const updated = todo.checklist?.map((c) =>
                                    c.id === item.id ? { ...c, completed: !c.completed } : c
                                  );
                                  updateTodo(todo.id, { checklist: updated });
                                }}
                                className="flex items-center gap-2 p-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-[11px] cursor-pointer"
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                    item.completed
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {item.completed && <Check size={10} />}
                                </span>
                                <span
                                  className={`truncate ${
                                    item.completed
                                      ? 'line-through text-gray-400 dark:text-gray-500'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {item.text}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones Rápidas Limpias */}
                    <div className="flex items-center gap-1 shrink-0">
                      {todo.m365Synced && (
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 mr-1"
                          title="Sincronizado con Microsoft 365"
                        />
                      )}

                      {/* Ver Detalle y Gestión */}
                      <button
                        type="button"
                        onClick={() => setSelectedTodoForModal(todo)}
                        title="Ver detalle de la actividad"
                        className="p-1.5 rounded-xl text-slate-500 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Settings size={15} />
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => deleteTodo(todo.id)}
                        title="Eliminar actividad"
                        className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400">
              <CheckSquare size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                No hay compromisos pendientes para este filtro
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Puedes registrar una nueva tarea arriba o pedirle a LUC-IA-NA que la desglose por voz.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ASISTENTE LUC-IA-NA (CREACIÓN Y DESGLOSE TÉCNICO EN LOTE) */}
      {/* ========================================================================= */}
      {isLucianaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shrink-0 aspect-square bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <MargaritaIcon size={22} petalColor="#FFFFFF" centerColor="#FEF08A" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span>Desglose Técnico con LUC-IA-NA</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      IA STC
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Dicta o escribe tu requerimiento. Desglosamos automáticamente las subtareas técnicas de verificación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLucianaModalOpen(false);
                  setLucianaDraft(null);
                }}
                className="w-8 h-8 rounded-full shrink-0 aspect-square bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuadro de Dictado o Texto */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  value={lucianaPrompt}
                  onChange={(e) => setLucianaPrompt(e.target.value)}
                  placeholder="Ej: LUC-IA-NA, genera el checklist de actividades para la inspección de mordazas en la Pilona 4 de Línea K asignado a Carlos Restrepo para el jueves..."
                  className="w-full p-3.5 pr-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-medium resize-none shadow-2xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                />

                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  title={isListeningVoice ? 'Detener dictado' : 'Hablar por voz'}
                  className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isListeningVoice
                      ? 'bg-rose-500 text-white animate-pulse shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-slate-100'
                  }`}
                >
                  {isListeningVoice ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              {isListeningVoice && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>Escuchando tu voz... Habla con naturalidad sobre la tarea y cuadrilla a asignar.</span>
                </div>
              )}

              {/* Plantillas operativas frecuentes */}
              {!lucianaDraft && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 block">
                    Plantillas técnicas frecuentes STC:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const t = 'Inspección de mordazas en Pilona 4 Línea K asignado a Carlos Restrepo para el jueves con ensayo END y torque';
                        setLucianaPrompt(t);
                        handleProcessLucianaChecklist(t);
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 text-left font-medium transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                    >
                      🚠 <strong>Inspección Mordazas Línea K</strong>
                      <span className="block text-[10px] text-gray-500">Pilona 4 con Carlos Restrepo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const t = 'Parada técnica de mantenimiento en TransMiCable para revisión de balancines y cable tractor con cuadrilla de electromecánica';
                        setLucianaPrompt(t);
                        handleProcessLucianaChecklist(t);
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 text-left font-medium transition-colors cursor-pointer border border-transparent hover:border-sky-200"
                    >
                      🔍 <strong>Mantenimiento TransMiCable</strong>
                      <span className="block text-[10px] text-gray-500">Balancines y cable tractor</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Botón de Interpretar con LUC-IA-NA */}
              {!lucianaDraft && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isProcessingLuciana || !lucianaPrompt.trim()}
                    onClick={() => handleProcessLucianaChecklist()}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isProcessingLuciana ? (
                      <>
                        <MargaritaIcon size={16} petalColor="#FFFFFF" centerColor="#FEF08A" className="animate-spin" />
                        <span>Desglosando con LUC-IA-NA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Interpretar y Desglosar Checklist</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Vista previa del Borrador Técnico generado por LUC-IA-NA */}
              {lucianaDraft && (
                <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-600" />
                      <span>Propuesta Técnica de LUC-IA-NA</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setLucianaDraft(null)}
                      className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                    >
                      Reescribir
                    </button>
                  </div>

                  <p className="text-xs text-amber-950 dark:text-amber-200 font-medium">
                    {lucianaDraft.reasoning}
                  </p>

                  {/* Campos interpretados */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white dark:bg-slate-800 p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Título:</span>
                      <input
                        type="text"
                        value={lucianaDraft.title}
                        onChange={(e) => setLucianaDraft({ ...lucianaDraft, title: e.target.value })}
                        className="font-bold text-gray-900 dark:text-white w-full bg-transparent border-b border-slate-200 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Responsable:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{lucianaDraft.assignedToName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Proyecto:</span>
                      <span className="font-bold text-[#00668F]">{lucianaDraft.projectCode}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Fecha Límite:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{lucianaDraft.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Prioridad:</span>
                      <span className="font-bold uppercase text-rose-600">{lucianaDraft.priority}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Categoría:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{lucianaDraft.category}</span>
                    </div>
                  </div>

                  {/* Subtareas Desglosadas */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block">
                      Pasos de Verificación Técnica en Campo ({lucianaDraft.checklist.length}):
                    </span>
                    <div className="space-y-1">
                      {lucianaDraft.checklist.map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 text-xs shadow-2xs"
                        >
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {idx + 1}. {step.text}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setLucianaDraft({
                                ...lucianaDraft,
                                checklist: lucianaDraft.checklist.filter((_, i) => i !== idx),
                              })
                            }
                            className="text-gray-300 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botón de Confirmación en Lote */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setLucianaDraft(null)}
                      className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-white rounded-xl cursor-pointer"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLucianaDraft}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 size={15} />
                      <span>Confirmar y Crear en Lote</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETALLE, CHECKLIST Y EVIDENCIAS FOTOGRÁFICAS DE TAREA */}
      {/* ========================================================================= */}
      {selectedTodoForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Input oculto de foto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapturePhoto}
              className="hidden"
            />

            {/* Cabecera del Detalle */}
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                      selectedTodoForModal.priority === 'alta'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedTodoForModal.priority === 'media'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedTodoForModal.priority}
                  </span>

                  {selectedTodoForModal.projectCode && (
                    <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                      {selectedTodoForModal.projectCode}
                    </span>
                  )}

                  {selectedTodoForModal.category && (
                    <span className="text-[9.5px] font-medium text-gray-500">
                      {selectedTodoForModal.category}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                  {selectedTodoForModal.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTodoForModal(null)}
                className="w-8 h-8 rounded-full shrink-0 aspect-square bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            {/* Estado de Ejecución y Asignación */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
              <div>
                <span className="text-[10px] text-gray-400 block">Estado Actual:</span>
                <select
                  value={selectedTodoForModal.status || 'pendiente'}
                  onChange={(e) => {
                    const st = e.target.value as TodoStatus;
                    handleMoveStatus(selectedTodoForModal.id, st);
                    setSelectedTodoForModal({
                      ...selectedTodoForModal,
                      status: st,
                      completed: st === 'completada',
                    });
                  }}
                  className="font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-700 p-1 rounded-lg mt-0.5 border border-slate-200 dark:border-slate-600"
                >
                  <option value="pendiente">Por Iniciar</option>
                  <option value="en_curso">En Campo</option>
                  <option value="en_revision">Validación Técnica</option>
                  <option value="completada">Completada</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block">Responsable:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 mt-1 block">
                  {selectedTodoForModal.assignedToName || 'Equipo Inteckno'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block">Fecha Límite:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 mt-1 block">
                  {selectedTodoForModal.dueDate}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-gray-400 block">Microsoft 365:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 mt-1 block">
                  {selectedTodoForModal.m365Synced ? 'Sincronizada en To Do' : 'Pendiente de sincronizar'}
                </span>
              </div>
            </div>

            {/* Checklist de Verificación Técnica */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <CheckSquare size={14} className="text-[#00668F]" />
                  <span>Checklist de Verificación Técnica en Campo:</span>
                </span>
                {selectedTodoForModal.checklist && (
                  <span className="text-[11px] font-bold text-emerald-600">
                    {getChecklistProgress(selectedTodoForModal.checklist).completed} de{' '}
                    {getChecklistProgress(selectedTodoForModal.checklist).total} completadas
                  </span>
                )}
              </div>

              {/* Agregar Subtarea */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newSubtaskText.trim()) {
                        const newSub: TodoChecklistItem = {
                          id: `chk-${Date.now()}`,
                          text: newSubtaskText.trim(),
                          completed: false,
                        };
                        const updated = [...(selectedTodoForModal.checklist || []), newSub];
                        updateTodo(selectedTodoForModal.id, { checklist: updated });
                        setSelectedTodoForModal({ ...selectedTodoForModal, checklist: updated });
                        setNewSubtaskText('');
                      }
                    }
                  }}
                  placeholder="Añadir paso de verificación técnica..."
                  className="flex-1 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSubtaskText.trim()) {
                      const newSub: TodoChecklistItem = {
                        id: `chk-${Date.now()}`,
                        text: newSubtaskText.trim(),
                        completed: false,
                      };
                      const updated = [...(selectedTodoForModal.checklist || []), newSub];
                      updateTodo(selectedTodoForModal.id, { checklist: updated });
                      setSelectedTodoForModal({ ...selectedTodoForModal, checklist: updated });
                      setNewSubtaskText('');
                    }
                  }}
                  className="px-3 py-2 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  + Agregar
                </button>
              </div>

              {/* Lista de Subtareas */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedTodoForModal.checklist && selectedTodoForModal.checklist.length > 0 ? (
                  selectedTodoForModal.checklist.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedTodoForModal.checklist?.map((c) =>
                            c.id === sub.id ? { ...c, completed: !c.completed } : c
                          );
                          updateTodo(selectedTodoForModal.id, { checklist: updated });
                          setSelectedTodoForModal({ ...selectedTodoForModal, checklist: updated });
                        }}
                        className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                            sub.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        >
                          {sub.completed && <Check size={11} />}
                        </span>
                        <span
                          className={`${
                            sub.completed
                              ? 'line-through text-gray-400 dark:text-gray-500'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {idx + 1}. {sub.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedTodoForModal.checklist?.filter((c) => c.id !== sub.id);
                          updateTodo(selectedTodoForModal.id, { checklist: updated });
                          setSelectedTodoForModal({ ...selectedTodoForModal, checklist: updated });
                        }}
                        className="text-gray-300 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-gray-400 italic block py-1">
                    No hay subtareas registradas para esta actividad.
                  </span>
                )}
              </div>
            </div>

            {/* Evidencias Fotográficas de Campo */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Camera size={14} className="text-[#00668F]" />
                  <span>Evidencia Fotográfica de Campo:</span>
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzingPhoto}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera size={13} />
                  <span>Tomar / Subir Foto</span>
                </button>
              </div>

              {isAnalyzingPhoto && (
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <MargaritaIcon size={16} petalColor="#D97706" centerColor="#F59E0B" className="animate-spin" />
                  <span>LUC-IA-NA está evaluando la evidencia técnica de la fotografía...</span>
                </div>
              )}

              {selectedTodoForModal.photoEvidences && selectedTodoForModal.photoEvidences.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedTodoForModal.photoEvidences.map((photo) => (
                    <div
                      key={photo.id}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-2"
                    >
                      <img
                        src={photo.url}
                        alt="Evidencia técnica"
                        className="w-full h-36 object-cover rounded-xl shadow-2xs"
                      />
                      <div className="text-[10.5px] text-gray-500 space-y-1">
                        <span className="block text-[10px]">Capturada: {photo.uploadedAt}</span>
                        {photo.aiValidation && (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-950 dark:text-emerald-200 text-[10px]">
                            <strong>Validación LUC-IA-NA:</strong> {photo.aiValidation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[11px] text-gray-400 italic block py-1">
                  Aún no se han adjuntado fotos de evidencia técnica.
                </span>
              )}
            </div>

            {/* Acciones de Integración: Microsoft 365, Teams, Calendario */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sincronizar To Do */}
                <button
                  type="button"
                  onClick={() => handleSyncToMicrosoftToDo(selectedTodoForModal)}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Share2 size={13} />
                  <span>Sincronizar Microsoft To Do</span>
                </button>

                {/* Notificar por Teams */}
                <a
                  href={getTeamsTodoAlertUrl(
                    selectedTodoForModal,
                    users.find((u) => u.id === selectedTodoForModal.assignedToUserId)?.email
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-[#5059C9] hover:bg-[#4349A8] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Video size={13} />
                  <span>Notificar por Teams</span>
                </a>

                {/* Proyectar en Calendario */}
                <button
                  type="button"
                  onClick={() => handleProjectInCalendar(selectedTodoForModal)}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Calendar size={13} />
                  <span>Proyectar en Calendario</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTodoForModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración Universal */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="actividades"
        moduleTitle="Actividades y Tareas Operativas"
      />
    </div>
  );
};

// =============================================================================
// COMPONENTE AUXILIAR: TARJETA KANBAN OPERATIVA
// =============================================================================
interface KanbanTaskCardProps {
  todo: TodoItem;
  onOpenModal: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onSyncM365: () => void;
  onProjectCalendar: () => void;
  onDelete: () => void;
}

const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  todo,
  onOpenModal,
  onMoveLeft,
  onMoveRight,
  onSyncM365,
  onProjectCalendar,
  onDelete,
}) => {
  const status = getDueDateStatus(todo.dueDate);
  const progress = getChecklistProgress(todo.checklist);

  return (
    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#00668F]/40 transition-all shadow-2xs space-y-2.5 group">
      {/* Cabecera de la tarjeta: Prioridad, Proyecto y Semáforo */}
      <div className="flex items-center justify-between gap-1 text-[9.5px]">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`font-black uppercase px-2 py-0.5 rounded-full ${
              todo.priority === 'alta'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : todo.priority === 'media'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {todo.priority}
          </span>

          {todo.projectCode && (
            <span className="font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
              {todo.projectCode}
            </span>
          )}
        </div>

        <span
          className={`font-bold px-1.5 py-0.5 rounded-md ${
            status === 'overdue'
              ? 'bg-rose-100 text-rose-800 animate-pulse'
              : status === 'today'
              ? 'bg-amber-100 text-amber-800'
              : 'text-gray-500'
          }`}
        >
          {status === 'overdue' ? 'VENCIDA' : status === 'today' ? 'HOY' : todo.dueDate}
        </span>
      </div>

      {/* Título de la tarea */}
      <h4
        onClick={onOpenModal}
        className="text-xs font-bold text-gray-900 dark:text-white leading-snug cursor-pointer hover:text-[#00668F] transition-colors line-clamp-2"
      >
        {todo.title}
      </h4>

      {/* Badge de LUC-IA-NA */}
      {todo.generatedByLuciana && (
        <div className="flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full w-fit">
          <MargaritaIcon size={10} petalColor="currentColor" centerColor="#F59E0B" />
          <span>Generado por LUC-IA-NA</span>
        </div>
      )}

      {/* Checklist Progress Bar */}
      {progress.total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9.5px] text-gray-500">
            <span>Checklist: {progress.completed}/{progress.total}</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Evidencias fotográficas / iconos */}
      {todo.photoEvidences && todo.photoEvidences.length > 0 && (
        <div className="flex items-center gap-1 text-[9.5px] font-bold text-indigo-700 dark:text-indigo-400">
          <Camera size={11} />
          <span>{todo.photoEvidences.length} foto(s) de evidencia</span>
        </div>
      )}

      {/* Pie de la tarjeta: Responsable y Controles de avance */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-gray-500">
        <span className="truncate max-w-[110px] font-semibold text-gray-700 dark:text-gray-300">
          {todo.assignedToName || 'Inteckno'}
        </span>

        <div className="flex items-center gap-1">
          {onMoveLeft && (
            <button
              type="button"
              onClick={onMoveLeft}
              title="Mover al estado anterior"
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-800 cursor-pointer"
            >
              <ArrowLeft size={12} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenModal}
            title="Ver detalle"
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 hover:text-[#00668F] cursor-pointer"
          >
            <Settings size={12} />
          </button>

          {onMoveRight && (
            <button
              type="button"
              onClick={onMoveRight}
              title="Avanzar al siguiente estado"
              className="p-1 rounded-md bg-[#00668F]/10 hover:bg-[#00668F]/20 text-[#00668F] font-bold cursor-pointer"
            >
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
