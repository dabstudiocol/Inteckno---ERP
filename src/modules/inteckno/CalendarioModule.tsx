import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  X,
  Trash2,
  Briefcase,
  Video,
  Paperclip,
  Download,
  Bell,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Building2,
  UserCheck,
  Globe,
  Mail,
  CheckCircle2,
  Settings,
  Settings2,
  Info,
  Send,
  Sparkles,
  Mic,
  MicOff,
  AlertTriangle,
  Moon,
  Sun,
  RefreshCw,
  Layers,
  CalendarRange,
  Key,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { CalendarEvent, CalendarAttachment, BillingMilestone, User } from '../../types';
import {
  getOutlookWebComposeUrl,
  downloadIcsFile,
  getM365Config,
  saveM365Config,
  syncEventToMicrosoftGraph,
  deleteEventFromMicrosoftGraph,
  pullOutlookCalendarEvents,
  openMicrosoftAuthPopup,
  isM365TokenExpired,
} from '../../core/services/m365Sync';
import { parseCalendarEventWithAi } from '../../core/services/aiCalendarService';
import { MargaritaIcon } from '../../components/common/MargaritaIcon';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import {
  getSystemDate,
  findScheduleConflicts,
  findNextAvailableSlot,
  parseTimeToMinutes,
} from '../../core/services/lucianaService';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const HOURS_LIST = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES_LIST = ['00', '15', '30', '45'];
const PERIOD_LIST = ['AM', 'PM'] as const;

// Píldoras con colores sólidos y vivos de alto contraste
const EVENT_TYPE_STYLES: Record<
  string,
  { label: string; bg: string; text: string; dot: string; border?: string }
> = {
  visita_campo: {
    label: 'Visita de Campo',
    bg: 'bg-[#00668F]',
    text: 'text-white',
    dot: 'bg-white',
  },
  inspeccion_stc: {
    label: 'Inspección STC',
    bg: 'bg-[#D97706]',
    text: 'text-white',
    dot: 'bg-white',
  },
  entrega_hito: {
    label: 'Entrega Hito (Cobro 48h)',
    bg: 'bg-[#059669]',
    text: 'text-white',
    dot: 'bg-white',
  },
  parada_tecnica: {
    label: 'Parada Programada',
    bg: 'bg-[#DC2626]',
    text: 'text-white',
    dot: 'bg-white',
  },
  comite_gerencial: {
    label: 'Comité Gerencial',
    bg: 'bg-[#7C3AED]',
    text: 'text-white',
    dot: 'bg-white',
  },
  auditoria_hseq: {
    label: 'Auditoría HSEQ',
    bg: 'bg-[#0284C7]',
    text: 'text-white',
    dot: 'bg-white',
  },
};

const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 720, label: '12 horas antes' },
  { value: 1440, label: '1 día antes' },
  { value: 10080, label: '1 semana antes' },
];

function generateTeamsLink() {
  const hash = Math.random().toString(36).substring(2, 10);
  return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${hash}%40thread.v2/0?context=%7b%22Tid%22%3a%22inteckno-corp%22%7d`;
}

// Calcula una hora de fin coherente (1 hora después del inicio)
function calculateAutoEndTime(h: string, p: 'AM' | 'PM'): { endH: string; endP: 'AM' | 'PM' } {
  let hourNum = parseInt(h, 10);
  let nextP = p;
  if (hourNum === 11) {
    hourNum = 12;
    nextP = p === 'AM' ? 'PM' : 'AM';
  } else if (hourNum === 12) {
    hourNum = 1;
  } else {
    hourNum += 1;
  }
  return {
    endH: String(hourNum).padStart(2, '0'),
    endP: nextP,
  };
}


function calculateDurationText(
  startH: string,
  startM: string,
  startP: string,
  endH: string,
  endM: string,
  endP: string,
  isOvernight: boolean
): string {
  const startMins = parseTimeToMinutes(`${startH}:${startM} ${startP}`);
  let endMins = parseTimeToMinutes(`${endH}:${endM} ${endP}`);
  if (isOvernight || endMins < startMins) {
    endMins += 24 * 60;
  }
  const diffMins = endMins - startMins;
  if (diffMins <= 0) return '0 min';
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h`;
  return `${minutes} min`;
}

interface ConflictItem {
  userId: string;
  userName: string;
  conflictingEventTitle: string;
  conflictingTime: string;
  conflictingDate: string;
}

export const CalendarioModule: React.FC = () => {
  const {
    calendarEvents,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    batchMergeCalendarEvents,
    projects,
    currentUser,
    users,
    milestones,
    triggerCalendarReminderToast,
  } = useErp();

  // Vista activa: Mensual o Agenda Semanal Operativa
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Fecha de referencia inicial (dinámica en tiempo real)
  const systemDate = useMemo(() => getSystemDate(), []);

  const [currentYear, setCurrentYear] = useState(systemDate.year);
  const [currentMonth, setCurrentMonth] = useState(systemDate.monthIndex); // Mes dinámico (9 = Octubre)
  const [filterType, setFilterType] = useState<string>('all');

  // Alcance de privacidad: 'personal' (solo donde participa) vs 'all' (toda la empresa)
  const [viewScope, setViewScope] = useState<'personal' | 'all'>('personal');

  // Semana seleccionada para vista semanal
  const [selectedWeekDate, setSelectedWeekDate] = useState<Date>(() => systemDate.now);

  // Modales
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [syncSuccessModalEvent, setSyncSuccessModalEvent] = useState<CalendarEvent | null>(null);
  const [isM365SettingsOpen, setIsM365SettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogEventTypes = useModuleCatalog('calendario', 'eventTypes');
  const catalogReminderTimes = useModuleCatalog('calendario', 'reminderTimes');

  // Estado M365 API
  const [m365Config, setM365ConfigState] = useState(getM365Config());
  const [m365SyncStatus, setM365SyncStatus] = useState<string | null>(null);
  const [isSyncingApi, setIsSyncingApi] = useState(false);

  // Formulario nuevo evento
  const [newEventDate, setNewEventDate] = useState(systemDate.dateStr);
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    type: 'visita_campo' as CalendarEvent['type'],
    projectCode: 'PRJ-2026-MED-K',
    location: '',
    meetingMethod: 'presencial' as 'presencial' | 'virtual',
    teamsMeetingUrl: '',
    description: '',
    reminderMinutes: 15,
    isOvernight: false,
  });

  // Selectores desplegables de hora
  const [startHour, setStartHour] = useState('08');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('AM');

  const [endHour, setEndHour] = useState('09');
  const [endMinute, setEndMinute] = useState('00');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('AM');

  // Participantes seleccionados
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([currentUser.id]);

  // Archivos adjuntos
  const [attachments, setAttachments] = useState<CalendarAttachment[]>([]);

  // Detección reactiva de conflictos de cuadrilla
  const [detectedConflicts, setDetectedConflicts] = useState<ConflictItem[]>([]);

  const todayStr = systemDate.dateStr;

  // Proyección automática de hitos de cobro contractuales
  const projectedMilestoneEvents = useMemo(() => {
    return (milestones || [])
      .filter((m: BillingMilestone) => !!m.dueDate)
      .map((m: BillingMilestone): CalendarEvent => ({
        id: `milestone-${m.id}`,
        title: `Hito: ${m.title} (${m.percentage}%)`,
        date: m.dueDate,
        time: '08:00 AM - 05:00 PM',
        startTime: '08:00 AM',
        endTime: '05:00 PM',
        type: 'entrega_hito',
        projectCode: m.projectCode,
        projectName: m.projectName,
        isContractualMilestone: true,
        linkedProjectId: m.projectId,
        location: `${m.clientName || 'Cliente'} - ${m.projectName}`,
        description: `Hito contractual del ${m.percentage}% por $${(m.amountCOP || 0).toLocaleString('es-CO')} COP. Al firmarse el acta de entrega rige la regla estricta de facturación en menos de 48 horas.`,
        creatorId: 'SISTEMA-HITOS',
        attendees: ['Equipo Comercial', 'Gerencia Operativa'],
        attendeeIds: [],
        meetingMethod: 'presencial',
        reminderMinutes: 1440,
        isCompanyWide: true,
      }));
  }, [milestones]);

  // Eventos unificados (calendario local + hitos proyectados sin duplicados)
  const combinedEvents = useMemo(() => {
    const existingIds = new Set(calendarEvents.map((e) => e.id));
    const uniqueMilestones = projectedMilestoneEvents.filter((m) => !existingIds.has(m.id));
    return [...calendarEvents, ...uniqueMilestones];
  }, [calendarEvents, projectedMilestoneEvents]);

  // Filtrado de eventos con respeto a la privacidad personal
  const isEventVisible = (evt: CalendarEvent) => {
    if (filterType !== 'all' && evt.type !== filterType) return false;

    if (viewScope === 'personal') {
      if (evt.isCompanyWide) return true;
      if (evt.creatorId === currentUser.id) return true;
      if (evt.attendeeIds && evt.attendeeIds.includes(currentUser.id)) return true;
      if (
        evt.attendees &&
        evt.attendees.some((att) => {
          const lowerAtt = att.toLowerCase();
          const lowerName = currentUser.name.toLowerCase();
          return lowerAtt.includes(lowerName) || lowerName.includes(lowerAtt);
        })
      ) {
        return true;
      }
      return false;
    }

    return true;
  };

  const visibleEvents = useMemo(() => {
    return combinedEvents.filter(isEventVisible);
  }, [combinedEvents, filterType, viewScope, currentUser]);

  const personalEventsCount = useMemo(() => {
    return combinedEvents.filter((evt) => {
      if (evt.isCompanyWide) return true;
      if (evt.creatorId === currentUser.id) return true;
      if (evt.attendeeIds && evt.attendeeIds.includes(currentUser.id)) return true;
      if (
        evt.attendees &&
        evt.attendees.some((att) => {
          const lowerAtt = att.toLowerCase();
          const lowerName = currentUser.name.toLowerCase();
          return lowerAtt.includes(lowerName) || lowerName.includes(lowerAtt);
        })
      ) {
        return true;
      }
      return false;
    }).length;
  }, [combinedEvents, currentUser]);

  // Función de detección de choques de cuadrilla / Memoria Colectiva
  const checkCrewConflicts = (
    date: string,
    startH: string,
    startM: string,
    startP: string,
    endH: string,
    endM: string,
    endP: string,
    isOvernight: boolean,
    attendeeIds: string[],
    excludeEventId?: string
  ): ConflictItem[] => {
    const conflicts = findScheduleConflicts(
      combinedEvents,
      users,
      date,
      `${startH}:${startM} ${startP}`,
      `${endH}:${endM} ${endP}`,
      attendeeIds,
      isOvernight,
      excludeEventId
    );

    return conflicts.map((c) => ({
      userId: c.userId,
      userName: c.userName,
      conflictingEventTitle: c.conflictingEventTitle,
      conflictingTime: c.conflictingTime,
      conflictingDate: c.conflictingDate,
    }));
  };

  const handleSuggestNextFreeSlot = () => {
    const nextSlot = findNextAvailableSlot(combinedEvents, newEventDate, selectedAttendeeIds);
    if (nextSlot) {
      const matchStart = nextSlot.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const matchEnd = nextSlot.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (matchStart && matchEnd) {
        setStartHour(matchStart[1].padStart(2, '0'));
        setStartMinute(matchStart[2].padStart(2, '0'));
        setStartPeriod(matchStart[3].toUpperCase() as 'AM' | 'PM');
        setEndHour(matchEnd[1].padStart(2, '0'));
        setEndMinute(matchEnd[2].padStart(2, '0'));
        setEndPeriod(matchEnd[3].toUpperCase() as 'AM' | 'PM');
      }
    } else {
      alert('No se encontraron horarios libres adicionales de 1 hora en esta fecha para los participantes seleccionados.');
    }
  };

  // Reevaluar conflictos reactivamente al modificar horario o asistentes en el formulario
  useEffect(() => {
    if (!isNewModalOpen) {
      setDetectedConflicts([]);
      return;
    }

    const conflicts = checkCrewConflicts(
      newEventDate,
      startHour,
      startMinute,
      startPeriod,
      endHour,
      endMinute,
      endPeriod,
      newEventForm.isOvernight,
      selectedAttendeeIds
    );
    setDetectedConflicts(conflicts);
  }, [
    isNewModalOpen,
    newEventDate,
    startHour,
    startMinute,
    startPeriod,
    endHour,
    endMinute,
    endPeriod,
    newEventForm.isOvernight,
    selectedAttendeeIds,
    combinedEvents,
  ]);

  // Navegación de mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const sys = getSystemDate();
    setCurrentYear(sys.year);
    setCurrentMonth(sys.monthIndex);
    setSelectedWeekDate(sys.now);
  };

  // Navegación de semana
  const handlePrevWeek = () => {
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedWeekDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // Días de la semana para la vista semanal (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const curr = new Date(selectedWeekDate);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr);
    monday.setDate(diffToMonday);

    const days: {
      date: Date;
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      monthName: string;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      days.push({
        date: d,
        dateStr,
        dayName: WEEKDAY_NAMES[i],
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        monthName: MONTH_NAMES[d.getMonth()],
      });
    }
    return days;
  }, [selectedWeekDate, todayStr]);

  // Cálculo de días de la cuadrícula mensual (Lunes a Domingo)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek === -1) startDayOfWeek = 6;

  // Días del mes anterior
  const prevMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    prevMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
  }

  // Días del mes actual
  const currentMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      d
    ).padStart(2, '0')}`;
    currentMonthDays.push({ day: d, dateStr, isCurrentMonth: true });
  }

  // Completar cuadrícula a 35 o 42 casillas
  const totalCells = prevMonthDays.length + currentMonthDays.length > 35 ? 42 : 35;
  const nextMonthDaysCount = totalCells - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    nextMonthDays.push({ day: d, dateStr, isCurrentMonth: false });
  }

  const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  const getEventsForDate = (dateStr: string) => {
    return visibleEvents.filter((evt) => evt.date === dateStr);
  };

  const handleOpenNewModal = (dateStr?: string) => {
    if (dateStr) {
      setNewEventDate(dateStr);
    }
    setSelectedAttendeeIds([currentUser.id]);
    setNewEventForm({
      title: '',
      type: 'visita_campo',
      projectCode: 'PRJ-2026-MED-K',
      location: '',
      meetingMethod: 'presencial',
      teamsMeetingUrl: '',
      description: '',
      reminderMinutes: 15,
      isOvernight: false,
    });
    setStartHour('09');
    setStartMinute('00');
    setStartPeriod('AM');
    setEndHour('10');
    setEndMinute('00');
    setEndPeriod('AM');
    setAttachments([]);
    setCopiedLink(false);
    setIsNewModalOpen(true);
  };

  const handleStartHourChange = (newH: string) => {
    setStartHour(newH);
    const { endH, endP } = calculateAutoEndTime(newH, startPeriod);
    setEndHour(endH);
    setEndPeriod(endP);
  };

  const handleStartPeriodChange = (newP: 'AM' | 'PM') => {
    setStartPeriod(newP);
    const { endH, endP } = calculateAutoEndTime(startHour, newP);
    setEndHour(endH);
    setEndPeriod(endP);
  };

  const handleMethodChange = (method: 'presencial' | 'virtual') => {
    let url = newEventForm.teamsMeetingUrl;
    if (method === 'virtual' && !url) {
      url = generateTeamsLink();
    }
    setNewEventForm({
      ...newEventForm,
      meetingMethod: method,
      teamsMeetingUrl: url,
    });
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAtts: CalendarAttachment[] = Array.from(files).map((f) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      type: f.type || 'document',
    }));

    setAttachments((prev) => [...prev, ...newAtts]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCopyTeamsLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventForm.title.trim()) return;

    // Validación estricta de cruce de agendas (Memoria Colectiva)
    const conflicts = checkCrewConflicts(
      newEventDate,
      startHour,
      startMinute,
      startPeriod,
      endHour,
      endMinute,
      endPeriod,
      newEventForm.isOvernight,
      selectedAttendeeIds
    );

    if (conflicts.length > 0) {
      const busyUsers = conflicts
        .map((c) => `${c.userName} ("${c.conflictingEventTitle}" a las ${c.conflictingTime})`)
        .join(', ');
      alert(`No es posible agendar: La Memoria Colectiva de Inteckno detectó cruce de horarios para:\n${busyUsers}.\n\nPor favor ajusta el horario o presiona "Auto-ajustar a próximo horario libre".`);
      return;
    }

    const prj = projects.find((p) => p.code === newEventForm.projectCode);
    const attendeeUsers = users.filter((u) => selectedAttendeeIds.includes(u.id));
    const attendeeNames = attendeeUsers.map((u) => u.name);

    const overnightSuffix = newEventForm.isOvernight ? ' (+1 día nocturno)' : '';
    const timeStr = `${startHour}:${startMinute} ${startPeriod} - ${endHour}:${endMinute} ${endPeriod}${overnightSuffix}`;

    const newEvt: Omit<CalendarEvent, 'id'> = {
      title: newEventForm.title,
      date: newEventDate,
      time: timeStr,
      startTime: `${startHour}:${startMinute} ${startPeriod}`,
      endTime: `${endHour}:${endMinute} ${endPeriod}`,
      isOvernight: newEventForm.isOvernight,
      type: newEventForm.type,
      location:
        newEventForm.meetingMethod === 'virtual'
          ? 'Microsoft Teams Corporativo (@inteckno.com)'
          : newEventForm.location || 'Sede Inteckno STC',
      projectCode: newEventForm.projectCode,
      projectName: prj ? prj.name : 'Proyecto STC',
      creatorId: currentUser.id,
      attendeeIds: selectedAttendeeIds,
      attendees: attendeeNames.length > 0 ? attendeeNames : [currentUser.name],
      meetingMethod: newEventForm.meetingMethod,
      teamsMeetingUrl:
        newEventForm.meetingMethod === 'virtual' ? newEventForm.teamsMeetingUrl : undefined,
      reminderMinutes: newEventForm.reminderMinutes,
      attachments: attachments.length > 0 ? attachments : undefined,
      description: newEventForm.description,
      syncStatus: 'local_only',
      lastSyncedAt: new Date().toISOString(),
    };

    createCalendarEvent(newEvt);
    setIsNewModalOpen(false);

    // Si tiene token de API configurado, sincronizar de fondo de inmediato con Microsoft Graph
    const fullEvt: CalendarEvent = { ...newEvt, id: `EVT-${Date.now()}` };
    if (m365Config.accessToken && m365Config.autoSyncEnabled) {
      setIsSyncingApi(true);
      const res = await syncEventToMicrosoftGraph(fullEvt, users);
      setIsSyncingApi(false);
      setM365SyncStatus(res.message);
    }

    // Abrir modal asistente para que el usuario guarde en Outlook Web en 1 clic
    setSyncSuccessModalEvent(fullEvt);
  };

  const handleDeleteEvent = async (evt: CalendarEvent) => {
    if (evt.isContractualMilestone) {
      alert('Este es un hito de facturación contractual proyectado. Para modificarlo gestiona los hitos del proyecto.');
      return;
    }

    if (evt.m365EventId) {
      try {
        await deleteEventFromMicrosoftGraph(evt.m365EventId);
      } catch (err) {
        console.warn('No se pudo cancelar en Microsoft Graph directamente:', err);
      }
    }

    deleteCalendarEvent(evt.id);
    setSelectedEvent(null);
  };

  const handleTestReminderAlert = (evt: CalendarEvent) => {
    triggerCalendarReminderToast({
      eventId: evt.id,
      title: evt.title,
      time: evt.time,
      date: evt.date,
      location: evt.location,
      meetingMethod: evt.meetingMethod,
      teamsMeetingUrl: evt.teamsMeetingUrl,
      attendees: evt.attendees || [],
    });
  };

  const handleOpenOutlookCompose = (evt: CalendarEvent) => {
    const url = getOutlookWebComposeUrl(evt, users);
    window.open(url, '_blank');
  };

  // Conectar cuenta de Microsoft 365 con Azure AD
  const handleConnectMicrosoftAccount = async () => {
    try {
      setIsSyncingApi(true);
      await openMicrosoftAuthPopup();
      const updated = getM365Config();
      setM365ConfigState(updated);
      setM365SyncStatus('Cuenta Microsoft 365 conectada exitosamente.');
      await handleSyncWithOutlook();
    } catch (err: any) {
      console.warn('Error al conectar M365:', err);
      alert(err.message || 'No se pudo conectar la cuenta de Microsoft 365.');
    } finally {
      setIsSyncingApi(false);
    }
  };

  // Sincronizar un evento individual con Microsoft Graph API
  const handleSyncSingleEventToGraph = async (evt: CalendarEvent) => {
    setIsSyncingApi(true);
    try {
      if (!m365Config.accessToken || isM365TokenExpired()) {
        await openMicrosoftAuthPopup();
        const updated = getM365Config();
        setM365ConfigState(updated);
      }
      const res = await syncEventToMicrosoftGraph(evt, users);
      if (res.success) {
        updateCalendarEvent(evt.id, {
          syncStatus: 'synced_m365',
          m365EventId: res.m365EventId,
          teamsMeetingUrl: res.teamsMeetingUrl || evt.teamsMeetingUrl,
        });
        alert('¡Evento sincronizado con éxito en Microsoft Teams y Outlook!');
        return res;
      } else {
        alert(res.message || 'No se pudo sincronizar con Microsoft Graph.');
      }
    } catch (err: any) {
      console.warn('Error al sincronizar evento con M365:', err);
      alert(err.message || 'Error de conexión con Microsoft.');
    } finally {
      setIsSyncingApi(false);
    }
    return null;
  };

  // Sincronización bidireccional con Microsoft 365 (sube locales y descarga de Graph API)
  const handleSyncWithOutlook = async () => {
    setIsSyncingApi(true);
    setM365SyncStatus('Sincronizando con Microsoft Teams y Outlook...');
    try {
      // 1. Subir automáticamente eventos locales pendientes
      const pendingEvents = calendarEvents.filter((e) => e.syncStatus !== 'synced_m365');
      for (const evt of pendingEvents) {
        try {
          const res = await syncEventToMicrosoftGraph(evt, users);
          if (res.success) {
            updateCalendarEvent(evt.id, {
              syncStatus: 'synced_m365',
              m365EventId: res.m365EventId,
              teamsMeetingUrl: res.teamsMeetingUrl || evt.teamsMeetingUrl,
            });
          }
        } catch (syncErr) {
          console.warn('Error subiendo evento a Graph:', syncErr);
        }
      }

      // 2. Descargar eventos de Microsoft 365
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${daysInMonth}`;
      const result = await pullOutlookCalendarEvents(startDate, endDate);

      if (result.success && result.events && result.events.length > 0) {
        batchMergeCalendarEvents(result.events);
      }
      setM365SyncStatus('Sincronización con Microsoft 365 completada.');
    } catch {
      setM365SyncStatus('No se pudo conectar a Microsoft Graph.');
    } finally {
      setIsSyncingApi(false);
    }
  };

  return (
    <div className="space-y-3 pb-8 md:pb-4">
      {/* Barra Superior Compacta de Control del Calendario - Cero bordes */}
      <div className="bg-white rounded-2xl px-4 py-3 shadow-xs flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 w-full min-w-0">
        {/* Selector de Mes / Semana y Navegación Rápida */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-[#00668F] text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon size={18} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight">
                {viewMode === 'month'
                  ? `${MONTH_NAMES[currentMonth]} ${currentYear}`
                  : `Semana del ${weekDays[0]?.dayNumber} al ${weekDays[6]?.dayNumber} de ${weekDays[0]?.monthName}`}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-gray-700">
                {visibleEvents.length} eventos
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Agenda de: <strong className="text-gray-800">{currentUser.name}</strong> ({currentUser.email})
            </p>
          </div>

          {/* Botones de Navegación */}
          <div className="flex items-center gap-1 ml-1 sm:ml-2">
            <button
              onClick={viewMode === 'month' ? handlePrevMonth : handlePrevWeek}
              title={viewMode === 'month' ? 'Mes Anterior' : 'Semana Anterior'}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-gray-700 transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={viewMode === 'month' ? handleNextMonth : handleNextWeek}
              title={viewMode === 'month' ? 'Mes Siguiente' : 'Semana Siguiente'}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors cursor-pointer"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Conmutador de Vista: Mes vs Semana */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 text-xs font-bold ml-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white text-[#00668F] shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Vista de Cuadrícula Mensual"
            >
              <CalendarIcon size={12} />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-[#00668F] shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Vista de Agenda Semanal y Ventanas Operativas"
            >
              <CalendarRange size={12} />
              <span>Semana</span>
            </button>
          </div>
        </div>

        {/* Control de Privacidad y Botones de Acción */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Conmutador de Privacidad: Mis Reuniones vs Toda la Empresa */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 text-xs font-bold">
            <button
              onClick={() => setViewScope('personal')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'personal'
                  ? 'bg-white text-[#00668F] shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Muestra solo reuniones donde participas directamente"
            >
              <UserCheck size={13} />
              <span>Mis Eventos ({personalEventsCount})</span>
            </button>
            <button
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewScope === 'all'
                  ? 'bg-white text-[#00668F] shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Ver eventos de toda la empresa"
            >
              <Building2 size={13} />
              <span>Toda la Empresa ({combinedEvents.length})</span>
            </button>
          </div>

          {/* Filtro de Tipos */}
          <div className="w-48">
            <CreatableSelect
              value={filterType}
              options={[
                { id: 'all', name: 'Todos los Tipos' },
                ...catalogEventTypes.map((t) => ({
                  id: t.code || t.name,
                  name: t.name,
                })),
              ]}
              onChange={(val) => setFilterType(val || 'all')}
              placeholder="Tipo de evento..."
              isClearable={false}
            />
          </div>

          {/* Sincronización M365 (Teams & Outlook) - Discreta y elegante */}
          <button
            onClick={handleSyncWithOutlook}
            disabled={isSyncingApi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Sincronizar eventos con Microsoft Teams y Outlook"
          >
            <RefreshCw size={13} className={isSyncingApi ? 'animate-spin text-[#0078D4]' : ''} />
            <span className="hidden sm:inline">{isSyncingApi ? 'Sincronizando...' : 'Sincronizar'}</span>
            {m365Config.accessToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Microsoft 365 Conectado" />
            )}
          </button>

          {/* Botón Configuración del Módulo */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Configurar opciones desplegables del calendario"
          >
            <Settings size={16} />
          </button>

          {/* Botón Agendar Evento Estándar */}
          <button
            onClick={() => handleOpenNewModal(todayStr)}
            className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CUADRÍCULA MENSUAL - Cero bordes */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden p-2.5 sm:p-3.5 animate-in fade-in duration-150">
          {/* Cabecera con Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div
                key={w}
                className={`py-1 text-[11px] font-black uppercase tracking-wider ${
                  idx >= 5 ? 'text-rose-500' : 'text-gray-500'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Casillas de los Días */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {allCalendarDays.map((cell, idx) => {
              const dayEvents = getEventsForDate(cell.dateStr);
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => handleOpenNewModal(cell.dateStr)}
                  className={`h-[78px] sm:h-[88px] lg:h-[94px] p-2 rounded-xl transition-all group flex flex-col justify-between cursor-pointer ${
                    cell.isCurrentMonth
                      ? isToday
                        ? 'bg-sky-100 hover:bg-sky-200/80 shadow-xs ring-2 ring-[#00668F]/30'
                        : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] shadow-2xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/60 text-slate-300'
                  }`}
                >
                  {/* Cabecera del Día */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? 'text-[#00668F] font-black'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.day}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNewModal(cell.dateStr);
                      }}
                      title="Añadir evento en este día"
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-[#00668F] transition-opacity"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Eventos en este Día */}
                  <div className="space-y-1 overflow-y-auto max-h-[56px] scrollbar-none">
                    {dayEvents.slice(0, 2).map((evt) => {
                      const style = EVENT_TYPE_STYLES[evt.type] || EVENT_TYPE_STYLES.visita_campo;
                      const isVirtual = evt.meetingMethod === 'virtual';

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold ${style.bg} ${style.text} flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] cursor-pointer shadow-2xs truncate`}
                          title={`${evt.title} (${evt.time})`}
                        >
                          <div className="flex items-center gap-1 min-w-0 truncate">
                            <span className={`w-1 h-1 rounded-full shrink-0 ${style.dot}`} />
                            {evt.isOvernight && <Moon size={9} className="text-amber-200 shrink-0" />}
                            <span className="truncate">{evt.title}</span>
                          </div>
                          {isVirtual && <Video size={10} className="shrink-0 opacity-90" />}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-black text-gray-400 block text-right px-1">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: AGENDA SEMANAL OPERATIVA (STC & Cuadrillas) - Cero bordes */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl shadow-xs p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <CalendarRange size={16} className="text-[#00668F]" />
                <span>Programación de Campo y Ventanas Operativas STC</span>
              </h3>
              <p className="text-[11px] text-gray-500">
                Monitorea paradas nocturnas, cuadrillas en sitio y entregas de hitos de lunes a domingo.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Semana Activa: {weekDays[0]?.dateStr} al {weekDays[6]?.dateStr}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5">
            {weekDays.map((dayItem) => {
              const dayEvts = getEventsForDate(dayItem.dateStr);

              return (
                <div
                  key={dayItem.dateStr}
                  className={`rounded-xl p-2.5 flex flex-col justify-between min-h-[320px] transition-colors ${
                    dayItem.isToday
                      ? 'bg-sky-50 ring-2 ring-[#00668F]/30'
                      : 'bg-slate-50 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Encabezado del día */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2">
                    <div>
                      <span className="text-[10.5px] font-bold text-gray-400 uppercase block leading-none">
                        {dayItem.dayName}
                      </span>
                      <span
                        className={`text-sm font-black leading-tight ${
                          dayItem.isToday ? 'text-[#00668F]' : 'text-gray-900'
                        }`}
                      >
                        {dayItem.dayNumber} {dayItem.monthName.substring(0, 3)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenNewModal(dayItem.dateStr)}
                      className="w-6 h-6 rounded-lg bg-white hover:bg-[#00668F] hover:text-white text-gray-500 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                      title="Agendar en este día"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Lista de eventos del día */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] scrollbar-none">
                    {dayEvts.length === 0 ? (
                      <div className="py-8 text-center text-gray-400">
                        <Clock size={16} className="mx-auto mb-1 opacity-40" />
                        <span className="text-[10.5px] block font-medium">Sin operaciones</span>
                      </div>
                    ) : (
                      dayEvts.map((evt) => {
                        const style = EVENT_TYPE_STYLES[evt.type] || EVENT_TYPE_STYLES.visita_campo;
                        const isVirtual = evt.meetingMethod === 'virtual';

                        return (
                          <div
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className="bg-white rounded-xl p-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-1.5 group border-l-4"
                            style={{
                              borderLeftColor:
                                evt.type === 'parada_tecnica'
                                  ? '#DC2626'
                                  : evt.type === 'entrega_hito'
                                  ? '#059669'
                                  : evt.type === 'inspeccion_stc'
                                  ? '#D97706'
                                  : '#00668F',
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9.5px] font-black text-gray-500 flex items-center gap-1">
                                <Clock size={10} className="text-[#00668F]" />
                                {evt.startTime || evt.time}
                              </span>
                              {evt.isOvernight && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                                  <Moon size={8} /> Nocturno
                                </span>
                              )}
                              {evt.isContractualMilestone && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  Hito 48h
                                </span>
                              )}
                            </div>

                            <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover:text-[#00668F] transition-colors line-clamp-2">
                              {evt.title}
                            </h4>

                            {evt.projectCode && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 block truncate">
                                {evt.projectCode}
                              </span>
                            )}

                            {isVirtual && evt.teamsMeetingUrl && (
                              <a
                                href={evt.teamsMeetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full py-1 px-1.5 rounded-md bg-[#5059C9] hover:bg-[#4349A8] text-white text-[9.5px] font-bold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Video size={10} />
                                <span>Teams</span>
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETALLES DEL EVENTO EXISTENTE - Cero bordes */}
      {/* ========================================================================= */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (EVENT_TYPE_STYLES[selectedEvent.type] || EVENT_TYPE_STYLES.visita_campo).bg
                    } text-white`}
                  >
                    {(EVENT_TYPE_STYLES[selectedEvent.type] || EVENT_TYPE_STYLES.visita_campo).label}
                  </span>
                  {selectedEvent.isOvernight && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-700 text-white flex items-center gap-1">
                      <Moon size={10} />
                      Ventana Operativa Nocturna
                    </span>
                  )}
                  {selectedEvent.isContractualMilestone && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                      Regla Cobro 48h
                    </span>
                  )}
                  {selectedEvent.meetingMethod === 'virtual' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5059C9] text-white flex items-center gap-1">
                      <Video size={10} />
                      Microsoft Teams
                    </span>
                  )}
                  {selectedEvent.isCompanyWide && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-gray-700">
                      Toda la Empresa
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tarjeta de Información */}
            <div className="space-y-2.5 text-xs bg-slate-100 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={14} className="text-[#00668F]" />
                <span className="font-semibold">Horario:</span>
                <span className="font-bold text-gray-900">
                  {selectedEvent.date} ({selectedEvent.time})
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={14} className="text-rose-500" />
                  <span className="font-semibold">Ubicación:</span>
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.projectCode && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Briefcase size={14} className="text-amber-500" />
                  <span className="font-semibold">Proyecto STC:</span>
                  <span>
                    {selectedEvent.projectCode} - {selectedEvent.projectName}
                  </span>
                </div>
              )}

              {selectedEvent.reminderMinutes !== undefined && selectedEvent.reminderMinutes > 0 && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Bell size={14} className="text-[#00668F]" />
                  <span className="font-semibold">Recordatorio configurado:</span>
                  <span className="font-bold text-[#00668F]">
                    {REMINDER_OPTIONS.find((r) => r.value === selectedEvent.reminderMinutes)
                      ?.label || `${selectedEvent.reminderMinutes} min antes`}
                  </span>
                </div>
              )}

              {/* Enlace de Teams si es Virtual */}
              {selectedEvent.meetingMethod === 'virtual' && selectedEvent.teamsMeetingUrl && (
                <div className="p-3 bg-white rounded-xl space-y-2 mt-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5059C9] flex items-center gap-1.5">
                      <Video size={13} />
                      Reunión Microsoft Teams Corporativa
                    </span>
                    <button
                      onClick={() => handleCopyTeamsLink(selectedEvent.teamsMeetingUrl!)}
                      className="text-[10px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
                    </button>
                  </div>
                  <a
                    href={selectedEvent.teamsMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-[#5059C9] hover:bg-[#4349A8] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <Video size={14} />
                    <span>Unirse a la Reunión de Microsoft Teams</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Sincronización con Microsoft 365 / Outlook / Teams */}
              <div className="p-3 bg-white rounded-xl space-y-2 mt-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0078D4] flex items-center gap-1.5">
                    <Globe size={13} />
                    Sincronización con Microsoft 365
                  </span>
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                      selectedEvent.syncStatus === 'synced_m365'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedEvent.syncStatus === 'synced_m365'
                      ? 'Sincronizado M365 & Teams'
                      : 'Pendiente en Outlook / Teams'}
                  </span>
                </div>
                {selectedEvent.syncStatus !== 'synced_m365' ? (
                  <div className="space-y-1.5 pt-0.5">
                    <p className="text-[10.5px] text-slate-600 leading-tight">
                      Para reflejar esta reunión en tu Outlook y en el Teams de los asistentes:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenOutlookCompose(selectedEvent)}
                        className="py-1.5 px-3 rounded-lg bg-[#0078D4] hover:bg-[#006cbd] text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Globe size={13} />
                        <span>Abrir y Guardar en Outlook (1 Clic)</span>
                        <ExternalLink size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await handleSyncSingleEventToGraph(selectedEvent);
                          if (res) {
                            setSelectedEvent({
                              ...selectedEvent,
                              syncStatus: 'synced_m365',
                              m365EventId: res.m365EventId,
                              teamsMeetingUrl: res.teamsMeetingUrl || selectedEvent.teamsMeetingUrl,
                            });
                          }
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Sparkles size={13} />
                        <span>Sincronizar vía API Directa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-emerald-700 font-medium">
                    ✓ Este evento está registrado y actualizado en los servidores de Microsoft 365 (Outlook y Teams).
                  </p>
                )}
              </div>

              {/* Participantes */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="pt-2 text-gray-700">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <Users size={14} className="text-purple-500" />
                    <span>Cuadrilla y Participantes:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {selectedEvent.attendees.map((att, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-white text-[11px] font-medium text-gray-800 shadow-2xs"
                      >
                        {att}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Archivos Adjuntos */}
              {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                <div className="pt-2 text-gray-700">
                  <span className="font-semibold block mb-1.5 flex items-center gap-1">
                    <Paperclip size={13} />
                    Archivos y Documentos Adjuntos:
                  </span>
                  <div className="space-y-1">
                    {selectedEvent.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white text-[11px] shadow-2xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-[#00668F] shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-gray-400">({att.size})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedEvent.description && (
              <div className="text-xs text-gray-700 bg-slate-100 p-3 rounded-xl">
                <span className="font-bold block text-gray-800 mb-1">Notas y Protocolo de Operación:</span>
                <p className="leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>
            )}

            {/* Acciones del Evento */}
            <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenOutlookCompose(selectedEvent)}
                  title="Abrir en Microsoft Outlook Web en tu navegador con todos los campos listos"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0078D4] hover:bg-[#006cbd] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Globe size={13} />
                  <span>Abrir en Outlook Web</span>
                  <ExternalLink size={11} className="opacity-80" />
                </button>

                <button
                  type="button"
                  onClick={() => downloadIcsFile(selectedEvent)}
                  title="Descargar archivo .ics"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} />
                  <span>.ics</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestReminderAlert(selectedEvent)}
                  title="Simula la alerta sonora y el toast en pantalla"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-[#00668F] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Bell size={12} />
                  <span>Alerta</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!selectedEvent.isContractualMilestone && (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#00668F] hover:bg-[#005273] text-white transition-all shadow-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL CREAR NUEVO EVENTO - Cero bordes */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Cabecera limpia y directa */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00668F] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Agendar Evento u Operación</h3>
                  <p className="text-[11px] text-gray-500">
                    Se registrará en el ERP y se preparará para Outlook Web y Microsoft Teams
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-gray-500 hover:text-[#00668F] hover:bg-slate-200 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
                  title="Configurar catálogos del módulo"
                >
                  <Settings size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ALERTA DE CONFLICTO DE CUADRILLA / SOLAPAMIENTO CON MEMORIA COLECTIVA */}
            {detectedConflicts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-xs text-rose-800">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>Memoria Colectiva: Cruce de horarios detectado</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                    {detectedConflicts.length} conflicto{detectedConflicts.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] pl-6">
                  {detectedConflicts.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                      <span>
                        <strong className="text-rose-950 font-bold">{c.userName}</strong> ya tiene programado{' '}
                        <strong>"{c.conflictingEventTitle}"</strong> ({c.conflictingTime}) en esta misma fecha.
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200/70">
                  <p className="text-[10px] text-rose-700 italic">
                    El ERP no permite registrar citas simultáneas para un mismo asistente.
                  </p>
                  <button
                    type="button"
                    onClick={handleSuggestNextFreeSlot}
                    className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1 active:scale-95"
                  >
                    <span>Auto-ajustar a próximo horario libre</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              {/* Título de la Actividad */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Título de la Reunión o Actividad (Obligatorio)
                </label>
                <input
                  type="text"
                  required
                  value={newEventForm.title}
                  onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                  placeholder="Ej: Revisión técnica teleférico / Comité de obra"
                  className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:outline-hidden focus:bg-white focus:shadow-xs font-medium shadow-2xs"
                />
              </div>

              {/* Selector de Asistentes e Invitados */}
              <div>
                <label className="font-bold text-gray-800 block mb-1.5 flex items-center justify-between">
                  <span>Asistentes e Invitados de Inteckno (Obligatorio)</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {selectedAttendeeIds.length} seleccionados
                  </span>
                </label>

                {/* Chips de seleccionados */}
                <div className="flex flex-wrap gap-1.5 mb-2 p-2 rounded-xl bg-slate-100 min-h-[42px] items-center">
                  {selectedAttendeeIds.length === 0 ? (
                    <span className="text-[11px] text-gray-400 italic">
                      Selecciona miembros del equipo abajo...
                    </span>
                  ) : (
                    selectedAttendeeIds.map((uid) => {
                      const u = users.find((usr) => usr.id === uid);
                      if (!u) return null;
                      const isMe = u.id === currentUser.id;

                      return (
                        <span
                          key={u.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white text-[11px] font-bold text-gray-800 shadow-2xs"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                u.role === 'admin_sistemas'
                                  ? '#00668F'
                                  : u.role.startsWith('gerente_')
                                  ? '#7C3AED'
                                  : '#059669',
                            }}
                          />
                          <span>
                            {u.name} {isMe && '(Tú)'}
                          </span>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => toggleAttendee(u.id)}
                              className="text-gray-400 hover:text-rose-600 cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Lista seleccionable rápida */}
                <div className="max-h-36 overflow-y-auto rounded-xl bg-slate-100 p-1.5 space-y-1">
                  {users.map((u) => {
                    const isSelected = selectedAttendeeIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleAttendee(u.id)}
                        className={`p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected ? 'bg-white shadow-2xs font-bold' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <div className="w-6 h-6 rounded-full bg-[#00668F] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-gray-800 block truncate text-[11.5px]">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-gray-500 block truncate">
                              {u.roleLabel} • {u.email}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ml-auto ${
                            isSelected
                              ? 'bg-[#00668F] text-white'
                              : 'bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check size={11} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modalidad de la Reunión (Presencial vs Teams) */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">Modalidad de Reunión</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMethodChange('presencial')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newEventForm.meetingMethod === 'presencial'
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                    }`}
                  >
                    <Building2 size={15} />
                    <span>Presencial en Sitio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMethodChange('virtual')}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      newEventForm.meetingMethod === 'virtual'
                        ? 'bg-[#5059C9] text-white shadow-xs'
                        : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                    }`}
                  >
                    <Video size={15} />
                    <span>Microsoft Teams</span>
                  </button>
                </div>

                {newEventForm.meetingMethod === 'virtual' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-indigo-50/70 space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#5059C9] flex items-center gap-1.5">
                        <Shield size={13} />
                        Enlace generado con Microsoft 365 (@inteckno.com)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyTeamsLink(newEventForm.teamsMeetingUrl)}
                        className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLink ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={newEventForm.teamsMeetingUrl}
                      className="w-full p-2 rounded-lg bg-white text-gray-700 text-[11px] font-mono select-all shadow-2xs"
                    />
                  </div>
                )}
              </div>

              {/* Fecha y Tipo de Evento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-800 block mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:shadow-xs font-medium shadow-2xs"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Tipo de Evento"
                    value={
                      catalogEventTypes.find((t) => t.code === newEventForm.type)?.name ||
                      newEventForm.type ||
                      'Visita de Campo'
                    }
                    onChange={(val) => {
                      const match = catalogEventTypes.find(
                        (t) => t.name.toLowerCase() === val.toLowerCase() || t.code === val
                      );
                      setNewEventForm({
                        ...newEventForm,
                        type: (match?.code || val) as CalendarEvent['type'],
                      });
                    }}
                    options={catalogEventTypes}
                    moduleId="calendario"
                    catalogKey="eventTypes"
                    placeholder="Seleccionar o escribir tipo de evento..."
                  />
                </div>
              </div>

              {/* Conmutador de Ventana Nocturna (Cruza Medianoche) */}
              <div className="p-3 rounded-xl bg-indigo-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Moon size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 block text-xs">
                      Ventana Operativa Nocturna (Cruza Medianoche)
                    </span>
                    <span className="text-[10.5px] text-gray-500">
                      Típico en teleféricos (ej: 10:00 PM a 04:00 AM del día siguiente).
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newEventForm.isOvernight}
                  onChange={(e) =>
                    setNewEventForm({ ...newEventForm, isOvernight: e.target.checked })
                  }
                  className="w-4 h-4 text-[#00668F] rounded-sm focus:ring-[#00668F] cursor-pointer"
                />
              </div>

              {/* Horario Inicio y Fin mediante SELECTORES DESPLEGABLES con auto-ajuste */}
              <div className="p-3 rounded-xl bg-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 block text-[11px] uppercase tracking-wider">
                    Horario de Operación
                  </span>
                  <span className="text-[11px] font-bold text-[#00668F]">
                    Duración: {calculateDurationText(startHour, startMinute, startPeriod, endHour, endMinute, endPeriod, newEventForm.isOvernight)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Hora Inicio */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      Hora de Inicio
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={startHour}
                        onChange={(e) => handleStartHourChange(e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white font-bold text-center text-xs shadow-2xs"
                      >
                        {HOURS_LIST.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="font-bold text-gray-400">:</span>
                      <select
                        value={startMinute}
                        onChange={(e) => setStartMinute(e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white font-bold text-center text-xs shadow-2xs"
                      >
                        {MINUTES_LIST.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={startPeriod}
                        onChange={(e) => handleStartPeriodChange(e.target.value as 'AM' | 'PM')}
                        className="p-2 rounded-lg bg-white font-bold text-xs shadow-2xs"
                      >
                        {PERIOD_LIST.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Hora Fin */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 block mb-1">
                      Hora de Finalización
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white font-bold text-center text-xs shadow-2xs"
                      >
                        {HOURS_LIST.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="font-bold text-gray-400">:</span>
                      <select
                        value={endMinute}
                        onChange={(e) => setEndMinute(e.target.value)}
                        className="flex-1 p-2 rounded-lg bg-white font-bold text-center text-xs shadow-2xs"
                      >
                        {MINUTES_LIST.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={endPeriod}
                        onChange={(e) => setEndPeriod(e.target.value as 'AM' | 'PM')}
                        className="p-2 rounded-lg bg-white font-bold text-xs shadow-2xs"
                      >
                        {PERIOD_LIST.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500 font-medium pt-1">
                  Horario programado:{' '}
                  <strong className="text-gray-800">
                    {startHour}:{startMinute} {startPeriod} - {endHour}:{endMinute} {endPeriod}
                    {newEventForm.isOvernight && ' (Amanece día siguiente)'}
                  </strong>
                </div>
              </div>

              {/* Ubicación / Proyecto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-800 block mb-1">
                    Lugar / Ubicación física (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newEventForm.location}
                    onChange={(e) => setNewEventForm({ ...newEventForm, location: e.target.value })}
                    placeholder="Ej: Sala de Juntas / Estación Metrocable Pilona 4"
                    className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:shadow-xs shadow-2xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-800 block mb-1">Proyecto STC Asociado</label>
                  <CreatableSelect
                    value={newEventForm.projectCode}
                    options={projects.map((p) => ({
                      id: p.code,
                      name: `${p.code} - ${p.name}`,
                    }))}
                    onChange={(val) =>
                      setNewEventForm({ ...newEventForm, projectCode: val || '' })
                    }
                    placeholder="Proyecto STC..."
                    isClearable={false}
                  />
                </div>
              </div>

              {/* Recordatorio Configurable */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  <span className="flex items-center gap-1.5">
                    <Bell size={14} className="text-[#00668F]" />
                    <span>Alerta de Recordatorio</span>
                  </span>
                </label>
                <CreatableSelect
                  value={String(newEventForm.reminderMinutes)}
                  options={
                    catalogReminderTimes.length > 0
                      ? catalogReminderTimes.map((opt) => ({
                          id: String(Number(opt.code) || 0),
                          name: opt.name,
                        }))
                      : REMINDER_OPTIONS.map((opt) => ({
                          id: String(opt.value),
                          name: opt.label,
                        }))
                  }
                  onChange={(val) =>
                    setNewEventForm({ ...newEventForm, reminderMinutes: Number(val) || 0 })
                  }
                  placeholder="Tiempo de recordatorio..."
                  isClearable={false}
                />
              </div>

              {/* Adjuntar Archivos */}
              <div>
                <label className="font-bold text-gray-800 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip size={14} />
                    <span>Adjuntar Fotos o Documentos Técnicos</span>
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {attachments.length} archivos
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                    <Plus size={13} />
                    <span>Seleccionar Archivos</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-gray-400">PDF, JPG, PNG, DOCX</span>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={13} className="text-[#00668F] shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{att.name}</span>
                          <span className="text-[10px] text-gray-400">({att.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas / Descripción */}
              <div>
                <label className="font-bold text-gray-800 block mb-1">
                  Notas / Puntos Clave / Procedimiento Técnico
                </label>
                <textarea
                  rows={2}
                  value={newEventForm.description}
                  onChange={(e) =>
                    setNewEventForm({ ...newEventForm, description: e.target.value })
                  }
                  placeholder="Escribe la agenda o las tareas específicas para la cuadrilla..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:shadow-xs font-medium shadow-2xs"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={detectedConflicts.length > 0 || !newEventForm.title.trim()}
                  className={`px-5 py-2 rounded-xl font-bold shadow-xs transition-all ${
                    detectedConflicts.length > 0 || !newEventForm.title.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-80'
                      : 'bg-[#00668F] hover:bg-[#005273] text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {detectedConflicts.length > 0 ? 'Horario Ocupado (Bloqueado)' : 'Agendar Operación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ASISTENTE DE CONFIRMACIÓN Y SINCRONIZACIÓN CON MICROSOFT 365 */}
      {/* ========================================================================= */}
      {syncSuccessModalEvent && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    ¡Operación Agendada en INTECKNO ERP!
                  </h3>
                  <p className="text-xs text-gray-500">
                    "{syncSuccessModalEvent.title}" quedó guardada en el ERP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSyncSuccessModalEvent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tarjeta Explicativa de Microsoft 365 */}
            <div className="bg-[#F0F6FF] rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#0078D4] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Globe size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#004578]">
                    ¿Cómo sincronizarlo con Outlook y Microsoft Teams?
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Al tener la licencia de Microsoft 365 en la web, el navegador requiere 1 clic de confirmación para escribir en tus servidores de Microsoft:
                  </p>
                </div>
              </div>

              {/* Pasos */}
              <div className="space-y-2 bg-white/80 rounded-xl p-3 text-[11.5px] text-slate-700">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Haz clic en el botón azul de abajo: <strong>"Abrir en Outlook Web"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    En la pestaña oficial de Outlook Web que se abrirá, presiona el botón <strong>"Guardar"</strong> o <strong>"Enviar"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    ¡Listo! El evento quedará guardado en la nube corporativa y aparecerá en tu <strong>Outlook Web</strong> y en tu <strong>Microsoft Teams</strong>.
                  </span>
                </div>
              </div>
            </div>

            {/* Estado de sincronización directa si hubo intento API */}
            {m365SyncStatus && (
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-gray-700 flex items-center gap-2">
                <Info size={14} className="text-[#00668F] shrink-0" />
                <span>{m365SyncStatus}</span>
              </div>
            )}

            {/* Botones Principales de Sincronización */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleOpenOutlookCompose(syncSuccessModalEvent);
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0078D4] hover:bg-[#006cbd] text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
              >
                <Globe size={15} />
                <span>Abrir en Outlook Web y Guardar (1 Clic)</span>
                <ExternalLink size={13} />
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => downloadIcsFile(syncSuccessModalEvent)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  <span>Descargar archivo .ics</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncSuccessModalEvent(null)}
                  className="py-2.5 px-3 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Ver en Calendario ERP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CONFIGURACIÓN MICROSOFT 365 (CONSOLA SISTEMAS & TI) */}
      {/* ========================================================================= */}
      {isM365SettingsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0078D4] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Sincronización con Microsoft 365
                  </h3>
                  <p className="text-[11px] text-gray-500">Configuración corporativa para @inteckno.com</p>
                </div>
              </div>
              <button
                onClick={() => setIsM365SettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Información de la cuenta */}
              <div className="p-3 rounded-xl bg-slate-50 space-y-1.5">
                <span className="font-bold text-gray-700 block">Cuenta Administradora M365:</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#00668F]">sistemas@inteckno.com</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Licencia Web
                  </span>
                </div>
              </div>

              {/* Explicación de los 2 modos */}
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-sky-50 space-y-1">
                  <span className="font-bold text-[#004578] block">
                    Modo 1: Asistente Web 1-Clic (Recomendado y activo ahora)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Al agendar una reunión en el ERP, se abre una pestaña oficial de Outlook Web con todos los campos diligenciados (asistentes, hora y Teams). Al pulsar <strong>'Guardar'</strong> en Outlook, Microsoft lo propaga a Teams y a todos los correos sin requerir configuraciones de Azure.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 space-y-2">
                  <span className="font-bold text-gray-800 block">
                    Modo 2: Microsoft Graph API (Guardado y Sincronización en segundo plano)
                  </span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Para que el ERP sincronice bidireccionalmente en segundo plano, se puede registrar un <em>App ID</em> en el portal de Microsoft Entra / Azure con permisos <code>Calendars.ReadWrite</code>.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="font-bold text-gray-700 block text-[11px]">
                      Client ID (ID de Aplicación Entra ID / Azure):
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 00000000-0000-0000-0000-000000000000"
                      value={m365Config.clientId}
                      onChange={(e) => {
                        const updated = saveM365Config({ clientId: e.target.value.trim() });
                        setM365ConfigState(updated);
                      }}
                      className="w-full p-2 rounded-lg bg-white text-gray-800 font-mono text-[11px] shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsM365SettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold cursor-pointer shadow-xs"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Opciones del Calendario */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="calendario"
        moduleTitle="Calendario de Operaciones"
      />
    </div>
  );
};
