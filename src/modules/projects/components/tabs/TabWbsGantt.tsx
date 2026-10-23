import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Plus,
  Clock,
  Layers,
  RefreshCw,
  GitBranch,
  Trash2,
  Info,
  DollarSign,
  Flag,
  Settings2,
  Edit2,
  Check,
  X,
  FolderKanban,
  Copy,
} from 'lucide-react';
import { Project, WBSTask, DependencyType } from '../../../../types';
import { useModuleCatalog } from '../../../../core/services/moduleConfigService';
import { generateWBSWithLuciana } from '../../../../core/services/lucianaService';
import { UniversalModuleConfigModal } from '../../../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';
import { TemplateManagerModal } from '../../../../components/common/TemplateManagerModal';
import { INTECKNO_WBS_TEMPLATES_5_FAMILIAS } from '../../../../core/config/intecknoDomainCatalog';

interface TabWbsGanttProps {
  project: Project;
  tasks: WBSTask[];
  erpUsers?: { id: string; name: string; roleLabel?: string }[];
  onAddTask: (task: Omit<WBSTask, 'id'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<WBSTask>) => void;
  onDeleteTask: (taskId: string) => void;
}

export interface CalculatedTask extends WBSTask {
  computedStart: Date;
  computedEnd: Date;
  computedDurationDays: number;
  earlyStartDays: number;
  earlyFinishDays: number;
  lateStartDays: number;
  lateFinishDays: number;
  totalFloatDays: number;
  autoIsCritical: boolean;
}

// Catálogos por defecto para Inteckno S.A.S.
const DEFAULT_RECURSOS_INTECKNO = [
  'Inspector Nivel II END (MRT / Ultrasonido)',
  'Técnico Especialista en Empalme de Cables STC',
  'Cuadrilla de Montaje y Mantenimiento en Alturas',
  'Supervisor Técnico Mecánico de Teleféricos',
  'Ingeniero Residente de Proyecto',
  'Gestor HSEQ y Coordinador de Alturas',
  'Magnetógrafo MRT Intron con Cabezal Sensor',
  'Detector de Defectos por Ultrasonido Krautkrämer',
  'Tirfor y Equipo de Tracción de Cable',
  'Prensa Hidráulica y Mordazas de Tensión',
  'Kit de Rescate y Evacuación en Línea',
];

const DEFAULT_ENTREGABLES_INTECKNO = [
  'Informe de Inspección Magneto-inductiva (MRT)',
  'Certificado de Ensayo No Destructivo (END)',
  'Acta de Montaje y Alineación de Balancines',
  'Registro de Empalme y Tensión de Cable Tractor',
  'Dossier de Calidad y Calibración de Equipos',
  'Plan de Trabajo Seguro en Alturas (ARO/ATS)',
  'Informe de Diagnóstico y Plan de Mantenimiento',
  'Acta de Entrega y Puesta en Marcha',
];

const DEFAULT_PRIORIDADES_INTECKNO = [
  { id: 'alta', label: 'Prioridad Alta (Crítica)', color: 'bg-rose-500 text-white' },
  { id: 'media', label: 'Prioridad Media (Normal)', color: 'bg-amber-500 text-white' },
  { id: 'baja', label: 'Prioridad Baja', color: 'bg-slate-400 text-white' },
];

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatCOP = (val: number) => {
  return `$${Math.round(val || 0).toLocaleString('es-CO')} COP`;
};

const parseISODateSafe = (dateStr?: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0);
  }
  return new Date(dateStr);
};

const formatDateStr = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDaysSafe = (dateStr: string, days: number): string => {
  const d = parseISODateSafe(dateStr);
  return formatDateStr(addDays(d, days));
};

const calculateDaysDiff = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 1;
  const s = parseISODateSafe(startStr);
  const e = parseISODateSafe(endStr);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

export const TabWbsGantt: React.FC<TabWbsGanttProps> = ({
  project,
  tasks,
  erpUsers = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [viewMode, setViewMode] = useState<'gantt' | 'arbol'>('gantt');
  const [isGeneratingWBS, setIsGeneratingWBS] = useState(false);
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WBSTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<WBSTask | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<CalculatedTask | null>(null);

  // Catálogos reactivos desde la Configuración de Módulo del ERP
  const deliverableItems = useModuleCatalog('proyectos', 'deliverables');
  const priorityItems = useModuleCatalog('proyectos', 'priorities');
  const resourceItems = useModuleCatalog('proyectos', 'resources');

  const customEntregables = useMemo(() => {
    if (deliverableItems.length > 0) return deliverableItems.map(d => d.name);
    return DEFAULT_ENTREGABLES_INTECKNO;
  }, [deliverableItems]);

  const customPrioridades = useMemo(() => {
    if (priorityItems.length > 0) {
      return priorityItems.map(p => {
        let color = 'bg-slate-400 text-white';
        const codeUpper = (p.code || p.name).toUpperCase();
        if (codeUpper.includes('ALTA') || codeUpper.includes('CRÍT')) {
          color = 'bg-rose-500 text-white';
        } else if (codeUpper.includes('MED') || codeUpper.includes('NORM')) {
          color = 'bg-amber-500 text-white';
        }
        return {
          id: p.id,
          label: p.name,
          color,
        };
      });
    }
    return DEFAULT_PRIORIDADES_INTECKNO;
  }, [priorityItems]);

  const customRecursos = useMemo(() => {
    if (resourceItems.length > 0) return resourceItems.map(r => r.name);
    return DEFAULT_RECURSOS_INTECKNO;
  }, [resourceItems]);

  // Modal de Configuración Universal del Módulo Proyectos
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Fecha base del proyecto normalizada con timezone seguro
  const projStartDate = useMemo(() => {
    return parseISODateSafe(project.startDate);
  }, [project.startDate]);

  // Formulario de Actividad WBS con Avance y Fechas Vinculadas
  const [taskForm, setTaskForm] = useState({
    code: '',
    name: '',
    description: '',
    plannedHours: 40,
    actualHours: 0,
    progressPct: 0,
    startDate: '',
    endDate: '',
    durationDays: 5,
    isMilestone: false,
    priority: 'alta' as 'alta' | 'media' | 'baja',
    deliverable: customEntregables[0] || DEFAULT_ENTREGABLES_INTECKNO[0],
    assignedToName: '',
    assignedResources: customRecursos[0] || DEFAULT_RECURSOS_INTECKNO[0],
    costEstimate: 0,
    progressMethod: 'percent' as 'percent' | 'hours',
    dependencyType: 'FC' as DependencyType,
    lagDays: 0,
    predecessorsStr: '',
  });

  const [hoursError, setHoursError] = useState<string | null>(null);

  // Validar y ajustar horas planificadas contra límite físico de días (máx 24h por día)
  const validateHours = (hours: number, days: number): boolean => {
    if (days <= 0) return true;
    const maxPossibleHours = days * 24;
    if (hours > maxPossibleHours) {
      setHoursError(`En ${days} días no pueden programarse más de ${maxPossibleHours} horas totales.`);
      return false;
    }
    setHoursError(null);
    return true;
  };

  // Función núcleo: Sincronizar automáticamente fechas según la tarea predecesora
  const calculateDatesFromPredecessor = (
    predCode: string,
    relType: DependencyType,
    lag: number,
    dur: number
  ) => {
    if (!predCode) return null;
    const cleanCode = predCode.trim();
    const predTask = tasks.find((t) => t.code === cleanCode);
    if (!predTask) return null;

    const predStart = predTask.startDate || project.startDate || formatDateStr(new Date());
    const predDur = predTask.durationDays || 1;
    const predEnd = predTask.endDate || addDaysSafe(predStart, predDur);
    const validDur = dur > 0 ? dur : 1;

    let newStart = taskForm.startDate;
    let newEnd = taskForm.endDate;

    if (relType === 'FC') {
      // Fin a Comienzo: Inicia justo cuando la predecesora finaliza (+ retraso si aplica)
      newStart = addDaysSafe(predEnd, lag);
      newEnd = addDaysSafe(newStart, validDur);
    } else if (relType === 'CC') {
      // Comienzo a Comienzo: Inicia a la par con la predecesora (+ retraso)
      newStart = addDaysSafe(predStart, lag);
      newEnd = addDaysSafe(newStart, validDur);
    } else if (relType === 'FF') {
      // Fin a Fin: Termina cuando la predecesora finaliza (+ retraso)
      newEnd = addDaysSafe(predEnd, lag);
      newStart = addDaysSafe(newEnd, -validDur);
    } else if (relType === 'CF') {
      // Comienzo a Fin: Termina cuando la predecesora inicia (+ retraso)
      newEnd = addDaysSafe(predStart, lag);
      newStart = addDaysSafe(newEnd, -validDur);
    }

    return { newStart, newEnd, predEnd, predStart };
  };

  const handlePredecessorChange = (newPredCode: string) => {
    const sync = calculateDatesFromPredecessor(
      newPredCode,
      taskForm.dependencyType,
      taskForm.lagDays,
      taskForm.durationDays
    );

    if (sync) {
      const adjustedHours = Math.min(taskForm.plannedHours, taskForm.durationDays * 24);
      validateHours(adjustedHours, taskForm.durationDays);
      setTaskForm((prev) => ({
        ...prev,
        predecessorsStr: newPredCode,
        startDate: sync.newStart,
        endDate: sync.newEnd,
        plannedHours: adjustedHours,
      }));
    } else {
      setTaskForm((prev) => ({
        ...prev,
        predecessorsStr: newPredCode,
      }));
    }
  };

  const handleDependencyTypeChange = (newRel: DependencyType) => {
    const firstPred = taskForm.predecessorsStr.split(',')[0]?.trim();
    const sync = calculateDatesFromPredecessor(
      firstPred,
      newRel,
      taskForm.lagDays,
      taskForm.durationDays
    );

    if (sync) {
      setTaskForm((prev) => ({
        ...prev,
        dependencyType: newRel,
        startDate: sync.newStart,
        endDate: sync.newEnd,
      }));
    } else {
      setTaskForm((prev) => ({ ...prev, dependencyType: newRel }));
    }
  };

  const handleLagDaysChange = (newLag: number) => {
    const firstPred = taskForm.predecessorsStr.split(',')[0]?.trim();
    const sync = calculateDatesFromPredecessor(
      firstPred,
      taskForm.dependencyType,
      newLag,
      taskForm.durationDays
    );

    if (sync) {
      setTaskForm((prev) => ({
        ...prev,
        lagDays: newLag,
        startDate: sync.newStart,
        endDate: sync.newEnd,
      }));
    } else {
      setTaskForm((prev) => ({ ...prev, lagDays: newLag }));
    }
  };

  // Cambio en Fecha Esperada Inicio: preserva la duración y recalcula Fecha Esperada Fin
  const handleStartDateChange = (newStart: string) => {
    if (!newStart) return;

    // Validación de precedencia: En Fin a Comienzo (FC), no puede empezar antes de que termine su predecesora
    const firstPred = taskForm.predecessorsStr.split(',')[0]?.trim();
    const predTask = tasks.find((t) => t.code === firstPred);
    if (predTask && taskForm.dependencyType === 'FC') {
      const predEnd = predTask.endDate || addDaysSafe(predTask.startDate || project.startDate || formatDateStr(new Date()), predTask.durationDays || 1);
      const minStartAllowed = addDaysSafe(predEnd, taskForm.lagDays);
      if (newStart < minStartAllowed) {
        alert(
          `SECUENCIA TÉCNICA OBLIGATORIA: La actividad depende de "${predTask.code} - ${predTask.name}" que finaliza el ${predEnd}. Por relación Fin a Comienzo (FC), esta actividad no puede iniciar antes del ${minStartAllowed}. Ajustando a la fecha válida más pronta.`
        );
        newStart = minStartAllowed;
      }
    }

    const dur = taskForm.durationDays || 1;
    const newEnd = addDaysSafe(newStart, dur);
    const adjustedHours = Math.min(taskForm.plannedHours, dur * 24);
    validateHours(adjustedHours, dur);
    setTaskForm((prev) => ({
      ...prev,
      startDate: newStart,
      endDate: newEnd,
      plannedHours: adjustedHours,
    }));
  };

  // Cambio en Fecha Esperada Fin: recalcula la duración en días y valida coherencia
  const handleEndDateChange = (newEnd: string) => {
    if (!newEnd || !taskForm.startDate) return;
    if (newEnd < taskForm.startDate) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    const dur = calculateDaysDiff(taskForm.startDate, newEnd);
    const adjustedHours = Math.min(taskForm.plannedHours, dur * 24);
    validateHours(adjustedHours, dur);
    setTaskForm((prev) => ({
      ...prev,
      endDate: newEnd,
      durationDays: dur,
      plannedHours: adjustedHours,
    }));
  };

  // Cambio en Duración (Días): recalcula Fecha Esperada Fin automáticamente
  const handleDurationChange = (days: number) => {
    const validDays = Math.max(1, days);
    const start = taskForm.startDate || formatDateStr(new Date());
    const newEnd = addDaysSafe(start, validDays);
    const adjustedHours = Math.min(taskForm.plannedHours, validDays * 24);
    validateHours(adjustedHours, validDays);
    setTaskForm((prev) => ({
      ...prev,
      durationDays: validDays,
      endDate: newEnd,
      plannedHours: adjustedHours,
    }));
  };

  const handleHoursChange = (hours: number) => {
    validateHours(hours, taskForm.durationDays);
    setTaskForm((prev) => ({
      ...prev,
      plannedHours: hours,
    }));
  };

  const openNewTaskModal = () => {
    const nextCode = `${tasks.length + 1}.0`;
    let initialStart = project.startDate || formatDateStr(new Date());
    let defaultPred = '';

    // Si ya existen actividades, encadenar automáticamente después de la última
    if (tasks.length > 0) {
      const lastTask = tasks[tasks.length - 1];
      defaultPred = lastTask.code;
      const lastTaskStart = lastTask.startDate || project.startDate || formatDateStr(new Date());
      const lastTaskDur = lastTask.durationDays || 1;
      const lastTaskEnd = lastTask.endDate || addDaysSafe(lastTaskStart, lastTaskDur);
      initialStart = lastTaskEnd;
    }

    const dur = 5;
    const initialEnd = addDaysSafe(initialStart, dur);

    setEditingTask(null);
    setHoursError(null);
    setTaskForm({
      code: nextCode,
      name: '',
      description: '',
      plannedHours: 40,
      actualHours: 0,
      progressPct: 0,
      startDate: initialStart,
      endDate: initialEnd,
      durationDays: dur,
      isMilestone: false,
      priority: 'alta',
      deliverable: customEntregables[0] || DEFAULT_ENTREGABLES_INTECKNO[0],
      assignedToName: project.supervisorName || erpUsers[0]?.name || 'Equipo de Ingeniería STC',
      assignedResources: customRecursos[0] || DEFAULT_RECURSOS_INTECKNO[0],
      costEstimate: 0,
      progressMethod: 'percent',
      dependencyType: 'FC',
      lagDays: 0,
      predecessorsStr: defaultPred,
    });
    setIsNewTaskModalOpen(true);
  };

  const openEditTaskModal = (task: WBSTask) => {
    setEditingTask(task);
    setHoursError(null);
    const start = task.startDate || formatDateStr(new Date());
    const dur = task.durationDays || 5;
    const end = task.endDate || addDaysSafe(start, dur);

    setTaskForm({
      code: task.code || '',
      name: task.name || '',
      description: task.description || '',
      plannedHours: task.plannedHours || Math.min(40, dur * 24),
      actualHours: task.actualHours || 0,
      progressPct: task.progressPct || 0,
      startDate: start,
      endDate: end,
      durationDays: dur,
      isMilestone: Boolean(task.isMilestone),
      priority: task.priority || 'alta',
      deliverable: task.deliverable || customEntregables[0] || DEFAULT_ENTREGABLES_INTECKNO[0],
      assignedToName: task.assignedToName || '',
      assignedResources: task.assignedResources?.join(', ') || customRecursos[0] || DEFAULT_RECURSOS_INTECKNO[0],
      costEstimate: task.costEstimate || 0,
      progressMethod: task.progressMethod || 'percent',
      dependencyType: task.dependencyType || 'FC',
      lagDays: task.lagDays || 0,
      predecessorsStr: task.predecessors ? task.predecessors.join(', ') : '',
    });
    setIsNewTaskModalOpen(true);
  };

  // Motor de cálculo CPM (Critical Path Method)
  const calculatedTasks: CalculatedTask[] = useMemo(() => {
    if (tasks.length === 0) return [];

    const getTaskDuration = (t: WBSTask): number => {
      if (t.isMilestone) return 0;
      if (t.durationDays && t.durationDays > 0) return t.durationDays;
      if (t.startDate && t.endDate) {
        return calculateDaysDiff(t.startDate, t.endDate);
      }
      return Math.max(1, Math.round((t.plannedHours || 8) / 8));
    };

    interface Node {
      task: WBSTask;
      duration: number;
      es: number;
      ef: number;
      ls: number;
      lf: number;
      preds: { code: string; type: DependencyType; lag: number }[];
      succs: string[];
    }

    const nodes: Map<string, Node> = new Map();

    tasks.forEach((t) => {
      const duration = getTaskDuration(t);
      const parsedPreds: { code: string; type: DependencyType; lag: number }[] = [];

      if (t.predecessors && t.predecessors.length > 0) {
        t.predecessors.forEach((pStr) => {
          const trimmed = pStr.trim();
          if (trimmed) {
            parsedPreds.push({
              code: trimmed,
              type: t.dependencyType || 'FC',
              lag: t.lagDays || 0,
            });
          }
        });
      }

      nodes.set(t.code, {
        task: t,
        duration,
        es: 0,
        ef: duration,
        ls: 0,
        lf: 0,
        preds: parsedPreds,
        succs: [],
      });
    });

    // Construir sucesores
    nodes.forEach((node, code) => {
      node.preds.forEach((p) => {
        const parentNode = nodes.get(p.code);
        if (parentNode) {
          parentNode.succs.push(code);
        }
      });
    });

    // Forward Pass
    let changed = true;
    let iterations = 0;
    while (changed && iterations < tasks.length * 4) {
      changed = false;
      iterations++;

      nodes.forEach((node) => {
        let earlyStartCandidate = 0;

        if (node.preds.length === 0) {
          if (node.task.startDate) {
            const taskInit = parseISODateSafe(node.task.startDate);
            const daysOffset = Math.max(0, Math.round((taskInit.getTime() - projStartDate.getTime()) / (1000 * 60 * 60 * 24)));
            earlyStartCandidate = daysOffset;
          } else {
            earlyStartCandidate = 0;
          }
        } else {
          let maxPredConstraint = 0;
          node.preds.forEach((p) => {
            const predNode = nodes.get(p.code);
            if (predNode) {
              const lag = p.lag || 0;
              let reqStart = 0;
              if (p.type === 'FC') {
                reqStart = predNode.ef + lag;
              } else if (p.type === 'CC') {
                reqStart = predNode.es + lag;
              } else if (p.type === 'FF') {
                reqStart = predNode.ef + lag - node.duration;
              } else if (p.type === 'CF') {
                reqStart = predNode.es + lag - node.duration;
              }
              maxPredConstraint = Math.max(maxPredConstraint, reqStart);
            }
          });

          earlyStartCandidate = Math.max(0, maxPredConstraint);
        }

        const newEf = earlyStartCandidate + node.duration;
        if (node.es !== earlyStartCandidate || node.ef !== newEf) {
          node.es = earlyStartCandidate;
          node.ef = newEf;
          changed = true;
        }
      });
    }

    let projectMaxEf = 0;
    nodes.forEach((n) => {
      projectMaxEf = Math.max(projectMaxEf, n.ef);
    });

    // Backward Pass
    nodes.forEach((n) => {
      n.lf = projectMaxEf;
      n.ls = n.lf - n.duration;
    });

    changed = true;
    iterations = 0;
    while (changed && iterations < tasks.length * 4) {
      changed = false;
      iterations++;

      nodes.forEach((node) => {
        if (node.succs.length === 0) {
          node.lf = projectMaxEf;
          node.ls = node.lf - node.duration;
        } else {
          let minSuccLf = projectMaxEf;
          node.succs.forEach((succCode) => {
            const succNode = nodes.get(succCode);
            if (succNode) {
              const rel = succNode.preds.find((p) => p.code === node.task.code);
              const lag = rel?.lag || 0;
              const type = rel?.type || 'FC';

              let allowedFinish = projectMaxEf;
              if (type === 'FC') {
                allowedFinish = succNode.ls - lag;
              } else if (type === 'CC') {
                allowedFinish = succNode.ls - lag + node.duration;
              } else if (type === 'FF') {
                allowedFinish = succNode.lf - lag;
              } else if (type === 'CF') {
                allowedFinish = succNode.lf - lag + node.duration;
              }
              minSuccLf = Math.min(minSuccLf, allowedFinish);
            }
          });

          const newLf = Math.max(node.ef, minSuccLf);
          const newLs = newLf - node.duration;
          if (node.lf !== newLf || node.ls !== newLs) {
            node.lf = newLf;
            node.ls = newLs;
            changed = true;
          }
        }
      });
    }

    const timesheetEntries = (project as any)?.timesheetEntries || [];

    return tasks.map((task) => {
      const node = nodes.get(task.code)!;
      const totalFloat = Math.max(0, node.ls - node.es);
      const isAutoCritical = totalFloat === 0;

      const computedStart = addDays(projStartDate, node.es);
      const computedEnd = addDays(projStartDate, node.ef);

      // Sincronización en Tiempo Real: Sumar horas de la Hoja de Horas (Timesheet) del proyecto
      const cleanTaskName = task.name?.trim().toLowerCase() || '';
      const cleanTaskCode = task.code?.trim().toLowerCase() || '';

      const timesheetHours = timesheetEntries
        .filter((e: any) => {
          if (!e) return false;
          const matchId = e.taskId && (e.taskId === task.id || e.taskId === task.code);
          const eName = e.taskName ? e.taskName.trim().toLowerCase() : '';
          const matchName = eName && cleanTaskName && (
            eName === cleanTaskName ||
            eName.includes(cleanTaskName) ||
            cleanTaskName.includes(eName)
          );
          const eCode = e.taskCode ? e.taskCode.trim().toLowerCase() : '';
          const matchCode = eCode && cleanTaskCode && eCode === cleanTaskCode;
          return Boolean(matchId || matchName || matchCode);
        })
        .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);

      const effectiveActualHours = Math.max(task.actualHours || 0, timesheetHours);
      const planned = task.plannedHours || (node.duration * 8) || 40;
      const computedPctFromHours = planned > 0
        ? Math.min(100, Math.round((effectiveActualHours / planned) * 100))
        : 0;

      // Si el método es por horas o no se ha definido avance manual explícito (>0), reflejar el avance de horas
      const effectiveProgressPct = (task.progressMethod === 'hours' || !task.progressPct || task.progressPct === 0)
        ? computedPctFromHours
        : Math.max(task.progressPct, computedPctFromHours);

      let effectiveStatus = task.status;
      if (effectiveProgressPct >= 100) {
        effectiveStatus = 'completed';
      } else if (effectiveProgressPct > 0 && effectiveStatus === 'pending') {
        effectiveStatus = 'in_progress';
      }

      return {
        ...task,
        actualHours: effectiveActualHours,
        progressPct: effectiveProgressPct,
        status: effectiveStatus,
        computedStart,
        computedEnd,
        computedDurationDays: node.duration,
        earlyStartDays: node.es,
        earlyFinishDays: node.ef,
        lateStartDays: node.ls,
        lateFinishDays: node.lf,
        totalFloatDays: totalFloat,
        autoIsCritical: isAutoCritical,
        isCriticalPath: isAutoCritical,
      };
    });
  }, [tasks, projStartDate, (project as any)?.timesheetEntries]);

  // Semanas y días de la cuadrícula Gantt
  const timelineWeeks = useMemo(() => {
    let maxDays = 21;
    calculatedTasks.forEach((t) => {
      maxDays = Math.max(maxDays, t.earlyFinishDays + 2);
    });
    const totalWeeks = Math.max(3, Math.ceil(maxDays / 7));
    const weeks: { weekNum: number; days: { dateStr: string; dayLabel: string; dayIndex: number }[] }[] = [];

    for (let w = 0; w < totalWeeks; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d;
        const currentD = addDays(projStartDate, dayIdx);
        const dayLabel = `${currentD.getDate()}/${currentD.getMonth() + 1}`;
        days.push({
          dateStr: formatDateStr(currentD),
          dayLabel,
          dayIndex: dayIdx,
        });
      }
      weeks.push({
        weekNum: w + 1,
        days,
      });
    }

    return { weeks, totalDays: totalWeeks * 7 };
  }, [calculatedTasks, projStartDate]);

  // Generación con IA LUC-IA-NA
  const handleGenerateWBS = async () => {
    setIsGeneratingWBS(true);
    try {
      const generatedDraft = await generateWBSWithLuciana(
        project.name,
        (project as any).lineOfBusiness || 'tuberias',
        project.serviceType || 'Ingeniería Mecánica STC'
      );

      for (const draft of generatedDraft) {
        onAddTask({
          projectId: project.id,
          code: draft.code,
          name: draft.name,
          plannedHours: draft.plannedHours,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: draft.isCriticalPath,
          predecessors: draft.predecessors,
          status: 'pending',
          priority: 'alta',
          deliverable: customEntregables[0] || DEFAULT_ENTREGABLES_INTECKNO[0],
          assignedToName: draft.assignedRole || 'Equipo de Ingeniería STC',
          durationDays: Math.max(1, Math.round(draft.plannedHours / 8)),
          dependencyType: 'FC',
          lagDays: 0,
        });
      }
    } catch (err) {
      console.error('Error generando WBS con LUC-IA-NA:', err);
    } finally {
      setIsGeneratingWBS(false);
    }
  };

  const handleApplyOfficialTemplate = (templateId: string) => {
    const tpl = INTECKNO_WBS_TEMPLATES_5_FAMILIAS.find(t => t.id === templateId);
    if (!tpl) return;

    for (const item of tpl.tasks) {
      onAddTask({
        projectId: project.id,
        code: item.code,
        name: item.name,
        plannedHours: item.plannedHours,
        actualHours: 0,
        progressPct: 0,
        isCriticalPath: item.isCriticalPath,
        predecessors: item.predecessors,
        status: 'pending',
        priority: item.isCriticalPath ? 'alta' : 'media',
        deliverable: item.deliverable,
        assignedToName: item.assignedRole,
        durationDays: Math.max(1, Math.round(item.plannedHours / 8)),
        dependencyType: 'FC',
        lagDays: 0,
      });
    }
  };

  const handleSaveTaskForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.name) return;

    if (!validateHours(taskForm.plannedHours, taskForm.durationDays)) {
      return;
    }

    const preds = taskForm.predecessorsStr
      ? taskForm.predecessorsStr.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    let progressPct = Number(taskForm.progressPct) || 0;
    const actualHours = editingTask ? (editingTask.actualHours || 0) : (taskForm.actualHours || 0);

    if (taskForm.progressMethod === 'hours') {
      const planned = Number(taskForm.plannedHours) || 1;
      progressPct = Math.min(100, Math.round((actualHours / planned) * 100));
    }

    let status = editingTask ? editingTask.status : ('pending' as const);
    if (progressPct >= 100) {
      status = 'completed';
    } else if (progressPct > 0 && status === 'pending') {
      status = 'in_progress';
    }

    const taskPayload = {
      projectId: project.id,
      code: taskForm.code.trim(),
      name: taskForm.name.trim(),
      description: taskForm.description.trim(),
      plannedHours: Number(taskForm.plannedHours) || 8,
      durationDays: taskForm.isMilestone ? 0 : Number(taskForm.durationDays) || 1,
      isMilestone: taskForm.isMilestone,
      priority: taskForm.priority,
      deliverable: taskForm.deliverable,
      startDate: taskForm.startDate,
      endDate: taskForm.endDate,
      assignedToName: taskForm.assignedToName.trim() || 'Equipo de Ingeniería STC',
      assignedResources: taskForm.assignedResources
        ? taskForm.assignedResources.split(',').map((r) => r.trim()).filter(Boolean)
        : [customRecursos[0] || DEFAULT_RECURSOS_INTECKNO[0]],
      costEstimate: Number(taskForm.costEstimate) || 0,
      costCenter: project.code,
      progressMethod: taskForm.progressMethod,
      dependencyType: taskForm.dependencyType,
      lagDays: Number(taskForm.lagDays) || 0,
      predecessors: preds,
      actualHours: actualHours,
      progressPct: progressPct,
      isCriticalPath: editingTask ? editingTask.isCriticalPath : false,
      status: status,
    };

    if (editingTask) {
      onUpdateTask(editingTask.id, taskPayload);
    } else {
      onAddTask(taskPayload);
    }

    setIsNewTaskModalOpen(false);
    setEditingTask(null);
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'completed': return { text: 'Finalizada', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'in_progress': return { text: 'En Ejecución', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' };
      case 'blocked': return { text: 'Detenida', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
      default: return { text: 'Programada', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const getPriorityLabel = (pr?: string) => {
    switch (pr) {
      case 'alta': return { text: 'Alta', bg: 'bg-rose-500 text-white' };
      case 'media': return { text: 'Media', bg: 'bg-amber-500 text-white' };
      default: return { text: 'Baja', bg: 'bg-slate-400 text-white' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra Superior de Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('gantt')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'gantt'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Calendar size={14} />
            <span>Matriz Gantt Deslizable ({tasks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('arbol')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'arbol'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers size={14} />
            <span>Estructura de Actividades</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Plantillas Oficiales Inteckno (Basado en 195 Proyectos Reales) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-[#00668F] dark:text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Cargar cronograma preconfigurado de ingeniería STC"
            >
              <Sparkles size={14} className="text-[#00668F] dark:text-cyan-300 animate-pulse" />
              <span>Plantillas Oficiales Inteckno</span>
            </button>

            {isTemplateDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2.5 space-y-1.5">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00668F] block">
                    Cronogramas WBS Especializados
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Carga automática de fases, roles, entregables y horas extraídas de los proyectos reales de la empresa.
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                  {INTECKNO_WBS_TEMPLATES_5_FAMILIAS.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        handleApplyOfficialTemplate(tpl.id);
                        setIsTemplateDropdownOpen(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50/70 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer border border-transparent hover:border-sky-200 dark:hover:border-slate-700"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#00668F] transition-colors">
                        {tpl.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{tpl.normativeStandard}</span> • {tpl.tasks.length} Actividades
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {tpl.description}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 rounded-b-xl flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">¿Deseas editar o duplicar una plantilla?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTemplateDropdownOpen(false);
                      setIsTemplateManagerOpen(true);
                    }}
                    className="text-[10px] font-bold text-[#00668F] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Abrir Gestor Completo</span>
                    <FolderKanban size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botón Gestor de Plantillas (Ver, Editar en Detalle, Duplicar) */}
          <button
            type="button"
            onClick={() => setIsTemplateManagerOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Ver en detalle, editar actividades/horas o duplicar plantillas WBS para adaptarlas a este proyecto"
          >
            <FolderKanban size={14} className="text-[#00668F]" />
            <span>Gestionar Plantillas</span>
          </button>

          <button
            type="button"
            onClick={openNewTaskModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Nueva Actividad</span>
          </button>
        </div>
      </div>

      {/* VISTA 1: MATRIZ DE GANTT DESLIZABLE */}
      {viewMode === 'gantt' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Barra Informativa y Leyendas */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#00668F] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                  {project.code}
                </span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Cronograma Maestro y Control de Actividades Técnicas
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Desliza horizontalmente la tabla para visualizar todas las columnas y el avance en el tiempo. Haz clic en cualquier actividad para ver o editar sus datos completos.
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-xs bg-emerald-500" /> En Tiempo
              </span>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                <span className="w-3 h-3 rounded-xs bg-rose-500" /> Ruta Crítica (Holgura = 0)
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rotate-45 bg-amber-500" /> Hito
              </span>
            </div>
          </div>

          {calculatedTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Layers size={36} className="mx-auto opacity-30" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No hay actividades registradas en el cronograma</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Haz clic en <strong>"Nueva Actividad"</strong> o usa <strong>"Plan de Trabajo con IA"</strong> para cargar actividades de Inteckno.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center w-24">Estado</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center w-16">Prioridad</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 w-64">Código / Actividad Técnica</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 w-44">Entregable Inteckno</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center w-24">Inicio Plan</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200 dark:border-slate-700 text-center w-24">Fin Plan</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center w-14">Días</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center w-24">% Avance</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-right w-28">Costo COP</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center w-20">Horas (P/R)</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 dark:border-slate-700 text-center w-16">Acciones</th>

                    {timelineWeeks.weeks.map((week) => (
                      <th
                        key={week.weekNum}
                        colSpan={7}
                        className="py-1 px-1 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-200/60 dark:bg-slate-700/60 text-[9px]"
                      >
                        Semana {week.weekNum}
                      </th>
                    ))}
                  </tr>

                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[9px] font-mono">
                    <th colSpan={11} className="border-r border-slate-200 dark:border-slate-700 py-1 px-3 text-right font-sans font-semibold text-slate-400">
                      Escala Diaria del Mes:
                    </th>
                    {timelineWeeks.weeks.map((week) =>
                      week.days.map((day) => (
                        <th
                          key={day.dayIndex}
                          className="py-1 px-0.5 text-center border-r border-slate-200 dark:border-slate-700/60 w-7 min-w-[28px]"
                        >
                          {day.dayLabel}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculatedTasks.map((task) => {
                    const st = getStatusLabel(task.status);
                    const pr = getPriorityLabel(task.priority);

                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedTaskDetail(task)}
                      >
                        {/* Estado */}
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.status}
                            onChange={(e) => onUpdateTask(task.id, { status: e.target.value as any })}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer border-0 focus:outline-none ${st.bg}`}
                          >
                            <option value="pending">Programada</option>
                            <option value="in_progress">En Ejecución</option>
                            <option value="completed">Finalizada</option>
                            <option value="blocked">Detenida</option>
                          </select>
                        </td>

                        {/* Prioridad */}
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pr.bg}`}>
                            {pr.text}
                          </span>
                        </td>

                        {/* Código y Nombre */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#00668F] shrink-0 text-xs">
                              {task.code}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#00668F]">
                              {task.name}
                            </span>
                            {task.autoIsCritical && (
                              <span className="text-[8px] font-bold px-1 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded shrink-0">
                                CRÍTICA
                              </span>
                            )}
                          </div>
                          {task.predecessors && task.predecessors.length > 0 && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <GitBranch size={10} /> {task.dependencyType || 'FC'}: {task.predecessors.join(', ')}
                            </div>
                          )}
                        </td>

                        {/* Entregable */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[180px]">
                          {task.deliverable || customEntregables[0]}
                        </td>

                        {/* Fechas */}
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {formatDateStr(task.computedStart)}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {formatDateStr(task.computedEnd)}
                        </td>

                        {/* Días */}
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {task.isMilestone ? '0 (Hito)' : task.computedDurationDays}
                        </td>

                        {/* % Avance */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-center">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-0.5">
                            <span>{task.progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#00668F] h-1.5 rounded-full"
                              style={{ width: `${task.progressPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Costo COP */}
                        <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-right font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {formatCOP(task.costEstimate || 0)}
                        </td>

                        {/* Horas Plan / Real */}
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{task.plannedHours}h</span>
                          <span className="text-slate-400"> / {task.actualHours || 0}h</span>
                        </td>

                        {/* Acciones */}
                        <td className="py-2 px-1 border-r border-slate-100 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditTaskModal(task)}
                              className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Editar actividad completa"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskToDelete(task)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              title="Eliminar actividad"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Barras del Gantt continuas y alineadas */}
                        {timelineWeeks.weeks.map((week) =>
                          week.days.map((day) => {
                            const isWithin =
                              day.dayIndex >= task.earlyStartDays &&
                              day.dayIndex < task.earlyFinishDays;
                            const isStartDay = day.dayIndex === task.earlyStartDays;
                            const isEndDay = day.dayIndex === task.earlyFinishDays - 1;

                            return (
                              <td
                                key={day.dayIndex}
                                className={`h-10 text-center relative p-0 border-0 ${
                                  isWithin
                                    ? task.autoIsCritical
                                      ? 'bg-rose-500'
                                      : 'bg-emerald-500'
                                    : 'border-r border-slate-100 dark:border-slate-800'
                                } ${isStartDay ? 'rounded-l-lg' : ''} ${isEndDay ? 'rounded-r-lg border-r border-slate-100 dark:border-slate-800' : ''}`}
                              >
                                {task.isMilestone && isStartDay ? (
                                  <div className="w-3.5 h-3.5 rotate-45 bg-amber-500 border border-amber-600 mx-auto shadow-sm" title={`Hito: ${task.name}`} />
                                ) : isWithin ? (
                                  <div
                                    className="h-full w-full flex items-center justify-center text-[9px] font-bold text-white transition-all select-none"
                                    title={`${task.code}: ${task.name} (${task.computedDurationDays} días) [${formatDateStr(task.computedStart)} al ${formatDateStr(task.computedEnd)}]`}
                                  >
                                    {isStartDay && (
                                      <span className="text-[9px] px-1 font-mono truncate font-semibold">
                                        {task.progressPct}%
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: ÁRBOL WBS */}
      {viewMode === 'arbol' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {calculatedTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Layers size={36} className="mx-auto opacity-30" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Sin actividades configuradas en el plan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                <span className="col-span-1">Código</span>
                <span className="col-span-4">Actividad Técnica</span>
                <span className="col-span-2 text-center">Calendario & Duración</span>
                <span className="col-span-2 text-center">Avance Físico</span>
                <span className="col-span-1">Responsable</span>
                <span className="col-span-2 text-right">Acciones</span>
              </div>

              {calculatedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskDetail(task)}
                  className="px-4 py-3 text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors grid grid-cols-12 gap-2 items-center cursor-pointer group"
                >
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="font-mono font-bold text-[#00668F]">{task.code}</span>
                    {task.autoIsCritical && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" title="Ruta Crítica Automática" />
                    )}
                  </div>

                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#00668F] transition-colors">
                        {task.name}
                      </h4>
                      {task.isMilestone && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1 py-0.2 rounded font-bold">
                          HITO
                        </span>
                      )}
                    </div>
                    {task.predecessors && task.predecessors.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <GitBranch size={10} /> {task.dependencyType || 'FC'}: {task.predecessors.join(', ')}
                        {task.lagDays ? ` (+${task.lagDays}d retraso)` : ''}
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    <div className="font-bold">
                      {formatDateStr(task.computedStart)} → {formatDateStr(task.computedEnd)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {task.computedDurationDays} días ({task.plannedHours}h)
                    </div>
                  </div>

                  <div className="col-span-2 px-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>{task.progressPct}%</span>
                      <span className="font-mono">{task.actualHours || 0}/{task.plannedHours}h</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#00668F] h-1.5 rounded-full transition-all"
                        style={{ width: `${task.progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 text-slate-600 dark:text-slate-400 truncate text-[11px]">
                    {task.assignedToName}
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => openEditTaskModal(task)}
                      className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Editar actividad completa"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTaskDetail(task)}
                      className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Ficha técnica"
                    >
                      <Info size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                      title="Eliminar actividad"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: FORMULARIO ALINEADO EN RENGLONES Y TOTALMENTE EDITABLE */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Header Fijo */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-[#00668F] rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {editingTask ? 'Editar Información de la Actividad Técnica' : 'Nueva Actividad Técnica Inteckno'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Centro de Costos: <span className="font-mono font-bold text-[#00668F]">{project.code}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Formulario con campos alineados en renglones limpios */}
            <form onSubmit={handleSaveTaskForm} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Sección 1: Identificación y Actividad Técnica */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-[#00668F] uppercase tracking-wider text-[10px] block">
                  1. Identificación y Actividad Técnica
                </span>

                {/* Renglón A: Código WBS y Nombre */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Código de Actividad
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. 1.0, 1.1"
                      value={taskForm.code}
                      onChange={(e) => setTaskForm({ ...taskForm, code: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nombre de la Actividad
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Realizar inspección magneto-inductiva de cable tractor"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                </div>

                {/* Renglón B: Prioridad Técnica y Entregable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Prioridad Técnica
                    </label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {customPrioridades.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Entregable Clave Asociado
                    </label>
                    <input
                      type="text"
                      list="entregables-datalist"
                      value={taskForm.deliverable}
                      onChange={(e) => setTaskForm({ ...taskForm, deliverable: e.target.value })}
                      placeholder="Seleccionar o escribir entregable..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <datalist id="entregables-datalist">
                      {customEntregables.map((ent, idx) => (
                        <option key={idx} value={ent} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Renglón C: Descripción */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alcance Detallado / Observaciones Técnicas
                  </label>
                  <textarea
                    rows={2}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Detalles sobre normas de aplicación, puntos de amarre o requerimientos específicos..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {/* Sección 2: Tiempos y Fechas (Sincronización Bidireccional Automática) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#00668F] uppercase tracking-wider text-[10px] block">
                    2. Tiempos, Calendario y Programación
                  </span>
                  {taskForm.predecessorsStr && (
                    <span className="text-[11px] text-[#00668F] font-semibold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                      🔗 Fechas vinculadas a la predecesora {taskForm.predecessorsStr}
                    </span>
                  )}
                </div>

                {/* Renglón 1: Fechas y Duraciones (Cálculo bidireccional en tiempo real) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Esperada Inicio
                    </label>
                    <input
                      type="date"
                      required
                      value={taskForm.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Fecha Esperada Fin
                    </label>
                    <input
                      type="date"
                      required
                      value={taskForm.endDate}
                      min={taskForm.startDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Duración (Días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={taskForm.isMilestone}
                      value={taskForm.isMilestone ? 0 : taskForm.durationDays}
                      onChange={(e) => handleDurationChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-[#00668F]"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Horas Planificadas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={taskForm.durationDays * 24}
                      disabled={taskForm.isMilestone}
                      value={taskForm.isMilestone ? 0 : taskForm.plannedHours}
                      onChange={(e) => handleHoursChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Alerta de validación de horas si excede límite físico */}
                {hoursError && (
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    ⚠️ {hoursError}
                  </div>
                )}

                {/* Renglón 2: Hito de Control Explicado y Alineado */}
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="isMilestoneModal"
                    checked={taskForm.isMilestone}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setTaskForm({
                        ...taskForm,
                        isMilestone: checked,
                        durationDays: checked ? 0 : 5,
                        plannedHours: checked ? 0 : 40,
                      });
                      setHoursError(null);
                    }}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="isMilestoneModal" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer block">
                      ¿Es un Hito de Control (Evento Clave sin duración)?
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Un <strong>Hito</strong> marca un momento o logro decisivo en el proyecto que no consume días de trabajo (duración = 0 días). Por ejemplo: <em>"Llegada del cable a puerto"</em>, <em>"Firma de acta de inicio"</em> o <em>"Entrega final aprobada por el cliente"</em>. Se representa en el cronograma con un diamante dorado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección 3: Relaciones de Precedencia y Dependencias */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-[#00668F] uppercase tracking-wider text-[10px] block">
                  3. Relaciones de Precedencia y Dependencias Técnicas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Actividad Predecesora
                    </label>
                    <select
                      value={taskForm.predecessorsStr.split(',')[0]?.trim() || ''}
                      onChange={(e) => handlePredecessorChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="">Sin predecesora (Inicia directamente)</option>
                      {tasks
                        .filter((t) => t.id !== editingTask?.id && t.code !== taskForm.code)
                        .map((t) => (
                          <option key={t.id || t.code} value={t.code}>
                            {t.code} - {t.name} (Termina: {t.endDate || 'N/A'})
                          </option>
                        ))}
                    </select>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Al elegirla, sus fechas empatan automáticamente.
                    </span>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Relación
                    </label>
                    <select
                      value={taskForm.dependencyType}
                      onChange={(e) => handleDependencyTypeChange(e.target.value as DependencyType)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="FC">Fin a Comienzo (Inicia al terminar la anterior)</option>
                      <option value="CC">Comienzo a Comienzo (Inician al mismo tiempo)</option>
                      <option value="FF">Fin a Fin (Terminan al mismo tiempo)</option>
                      <option value="CF">Comienzo a Fin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tiempo de Espera / Días de Holgura
                    </label>
                    <input
                      type="number"
                      value={taskForm.lagDays}
                      onChange={(e) => handleLagDaysChange(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Recursos Técnicos Inteckno, Costos y Avance */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-[#00668F] uppercase tracking-wider text-[10px] block">
                  4. Recursos Técnicos Inteckno, Costos y Avance
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Responsable Técnico
                    </label>
                    <input
                      type="text"
                      list="users-datalist-inteckno"
                      value={taskForm.assignedToName}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedToName: e.target.value })}
                      placeholder="Seleccionar o escribir..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                    <datalist id="users-datalist-inteckno">
                      {erpUsers.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} {u.roleLabel ? `(${u.roleLabel})` : ''}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Presupuesto Estimado COP
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                      <input
                        type="text"
                        value={taskForm.costEstimate ? taskForm.costEstimate.toLocaleString('es-CO') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setTaskForm({ ...taskForm, costEstimate: raw ? Number(raw) : 0 });
                        }}
                        placeholder="0"
                        className="w-full font-mono pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Método de Avance
                    </label>
                    <select
                      value={taskForm.progressMethod}
                      onChange={(e) => setTaskForm({ ...taskForm, progressMethod: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="percent">Porcentaje Físico Directo</option>
                      <option value="hours">Basado en Horas Incurridas (Hoja de Horas)</option>
                    </select>
                  </div>
                </div>

                {/* Control Dinámico de Avance */}
                {taskForm.progressMethod === 'percent' ? (
                  <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        Porcentaje de Avance Físico de la Actividad
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Ingresa el porcentaje real completado para esta tarea (0% a 100%).
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={taskForm.progressPct}
                        onChange={(e) => setTaskForm({ ...taskForm, progressPct: Number(e.target.value) })}
                        className="w-28 sm:w-36 accent-[#00668F]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taskForm.progressPct}
                        onChange={(e) => setTaskForm({ ...taskForm, progressPct: Math.min(100, Math.max(0, Number(e.target.value))) })}
                        className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-[#00668F]"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#00668F] block">
                        🔗 Avance Conectado a Hoja de Horas
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Horas reales ejecutadas: <strong>{editingTask ? (editingTask.actualHours || 0) : 0} hrs</strong> de <strong>{taskForm.plannedHours} hrs</strong> planificadas.
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Este porcentaje aumenta automáticamente a medida que los técnicos registran sus horas en la pestaña "Hoja de Horas".
                      </p>
                    </div>
                    <div className="text-right pl-3">
                      <span className="text-lg font-bold font-mono text-[#00668F]">
                        {Math.min(100, Math.round(((editingTask ? (editingTask.actualHours || 0) : 0) / (Number(taskForm.plannedHours) || 1)) * 100))}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Avance Automático</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Recursos Técnicos / Cuadrilla y Equipos
                  </label>
                  <input
                    type="text"
                    list="recursos-datalist-inteckno"
                    value={taskForm.assignedResources}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedResources: e.target.value })}
                    placeholder="Seleccionar o escribir cuadrilla y equipos..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <datalist id="recursos-datalist-inteckno">
                    {customRecursos.map((rec, idx) => (
                      <option key={idx} value={rec} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Botones Fijos en el Pie */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {editingTask ? 'Guardar Cambios' : 'Registrar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL: PERSONALIZADOR DE TODAS LAS OPCIONES Y CATÁLOGOS DEL MÓDULO */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="proyectos"
        moduleTitle="Configuración del Módulo de Proyectos & Opciones Técnicas"
      />

      {/* Modal Confirmación de Eliminación */}
      <ConfirmDeleteModal
        isOpen={Boolean(taskToDelete)}
        title="¿Eliminar Actividad del Plan?"
        itemName={taskToDelete ? `${taskToDelete.code} - ${taskToDelete.name}` : ''}
        description="Esta acción eliminará el paquete de trabajo del cronograma técnico del proyecto. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={false}
        confirmText="Eliminar Actividad"
        onConfirm={() => {
          if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* Modal Detalle Completo de Actividad */}
      <DetailModal
        isOpen={Boolean(selectedTaskDetail)}
        title={selectedTaskDetail?.name || 'Ficha de Actividad Técnica'}
        subtitle={selectedTaskDetail ? `Código: ${selectedTaskDetail.code} | Proyecto: ${project.name}` : ''}
        badge={selectedTaskDetail ? {
          label: selectedTaskDetail.autoIsCritical ? 'Ruta Crítica' : selectedTaskDetail.status === 'completed' ? 'Finalizada' : 'En Ejecución',
          color: selectedTaskDetail.autoIsCritical ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
        } : undefined}
        onClose={() => setSelectedTaskDetail(null)}
        actions={selectedTaskDetail ? (
          <button
            onClick={() => {
              openEditTaskModal(selectedTaskDetail);
              setSelectedTaskDetail(null);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#00668F] text-white hover:bg-[#005273] transition-colors"
          >
            Editar Actividad
          </button>
        ) : undefined}
        fields={selectedTaskDetail ? [
          { label: 'Código de Actividad', value: selectedTaskDetail.code, isMono: true },
          { label: 'Ruta Crítica (CPM)', value: selectedTaskDetail.autoIsCritical ? 'SÍ (Holgura = 0 días)' : `No (Holgura: ${selectedTaskDetail.totalFloatDays} días)` },
          { label: 'Hito de Control', value: selectedTaskDetail.isMilestone ? 'SÍ (Evento de control)' : 'No (Actividad regular)' },
          { label: 'Prioridad', value: selectedTaskDetail.priority ? selectedTaskDetail.priority.toUpperCase() : 'ALTA' },
          { label: 'Entregable Inteckno', value: selectedTaskDetail.deliverable || customEntregables[0] },
          { label: 'Responsable Asignado', value: selectedTaskDetail.assignedToName || 'No asignado' },
          { label: 'Fecha Inicio Calculada', value: formatDateStr(selectedTaskDetail.computedStart), isMono: true },
          { label: 'Fecha Fin Calculada', value: formatDateStr(selectedTaskDetail.computedEnd), isMono: true },
          { label: 'Duración Estimada', value: `${selectedTaskDetail.computedDurationDays} días (${selectedTaskDetail.plannedHours} h)` },
          { label: 'Avance Físico', value: `${selectedTaskDetail.progressPct}%`, isMono: true },
          { label: 'Predecesores', value: selectedTaskDetail.predecessors?.length ? `${selectedTaskDetail.dependencyType || 'FC'}: ${selectedTaskDetail.predecessors.join(', ')}` : 'Ninguno (Inicia con fecha esperada)' },
          { label: 'Tiempo de Espera / Días de Holgura', value: `${selectedTaskDetail.lagDays || 0} días` },
          { label: 'Presupuesto Estimado', value: formatCOP(selectedTaskDetail.costEstimate || 0), isMono: true },
          { label: 'Centro de Costos', value: project.code, isMono: true },
          { label: 'Recursos y Equipos', value: selectedTaskDetail.assignedResources?.join(', ') || customRecursos[0], colSpan: 2 },
          { label: 'Descripción / Alcance', value: selectedTaskDetail.description || 'Sin observaciones adicionales.', colSpan: 2 },
        ] : []}
      />

      {/* Modal Avanzado de Gestión de Plantillas (Ver, Editar, Duplicar WBS) */}
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        activeProjectName={`${project.code} - ${project.name}`}
        onApplyTemplate={(tpl) => {
          for (const item of tpl.tasks) {
            onAddTask({
              projectId: project.id,
              code: item.code,
              name: item.name,
              plannedHours: item.plannedHours,
              actualHours: 0,
              progressPct: 0,
              isCriticalPath: item.isCriticalPath,
              predecessors: item.predecessors,
              status: 'pending',
              priority: item.isCriticalPath ? 'alta' : 'media',
              deliverable: item.deliverable,
              assignedToName: item.assignedRole || 'Equipo de Ingeniería STC',
              durationDays: Math.max(1, Math.round(item.plannedHours / 8)),
              dependencyType: 'FC',
              lagDays: 0,
            });
          }
        }}
      />
    </div>
  );
};
