import React, { useState, useRef } from 'react';
import { WBSTask } from '../../types';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface GanttChartProps {
  tasks: WBSTask[];
  onTaskClick?: (task: WBSTask) => void;
  projectName?: string;
  projectCode?: string;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskClick,
  projectName = 'Proyecto STC',
  projectCode = 'PRJ',
}) => {
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [hoveredTask, setHoveredTask] = useState<WBSTask | null>(null);
  const [isActivitiesCollapsed, setIsActivitiesCollapsed] = useState(false);

  const displayedTasks = filterCriticalOnly
    ? tasks.filter((t) => t.isCriticalPath)
    : tasks;

  // Estadísticas del cronograma
  const totalPlannedHours = tasks.reduce((acc, t) => acc + (t.plannedHours || 0), 0);
  const totalActualHours = tasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
  const avgProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, t) => acc + (t.progressPct || 0), 0) / tasks.length)
    : 0;
  const criticalTasksCount = tasks.filter((t) => t.isCriticalPath).length;

  // Escala de tiempo simulada en 8 semanas / hitos
  const timelineWeeks = [
    { id: 'w1', label: 'Sem 1', range: 'Días 1-5' },
    { id: 'w2', label: 'Sem 2', range: 'Días 6-10' },
    { id: 'w3', label: 'Sem 3', range: 'Días 11-15' },
    { id: 'w4', label: 'Sem 4', range: 'Días 16-20' },
    { id: 'w5', label: 'Sem 5', range: 'Días 21-25' },
    { id: 'w6', label: 'Sem 6', range: 'Días 26-30' },
    { id: 'w7', label: 'Sem 7', range: 'Días 31-35' },
    { id: 'w8', label: 'Sem 8', range: 'Días 36-40' },
  ];

  // Calcular posición y ancho visual de la barra de cada tarea en el Gantt
  const getTaskBarSpan = (task: WBSTask, index: number) => {
    // Si la tarea tiene predecesores, la ubicamos después
    const hasPredecessor = task.predecessors && task.predecessors.length > 0;
    const startWeek = hasPredecessor ? Math.min(6, (index * 2) % 6 + 1) : Math.max(0, index % 3);
    const durationWeeks = Math.max(1, Math.min(3, Math.ceil(task.plannedHours / 20)));

    const leftPercent = (startWeek / timelineWeeks.length) * 100;
    const widthPercent = Math.min(100 - leftPercent, (durationWeeks / timelineWeeks.length) * 100);

    return { leftPercent, widthPercent, startWeek, durationWeeks };
  };

  return (
    <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-4">
      {/* Header y Filtros del Diagrama de Gantt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00668F]/10 text-[#00668F]">
              WBS • EDT Cronograma Dinámico
            </span>
            <span className="text-xs text-gray-500 font-semibold">{projectCode}</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
            Diagrama de Gantt & Ruta Crítica (CPM)
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Seguimiento temporal de actividades de campo, holguras y predecesoras para teleféricos.
          </p>
        </div>

        {/* Controles de Vista */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              filterCriticalOnly
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <ShieldAlert size={14} />
            <span>{filterCriticalOnly ? 'Viendo Solo Ruta Crítica' : 'Filtrar Ruta Crítica'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards de Ejecución de Tareas (Solid & Borderless) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50">
          <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase">Total Tareas EDT</div>
          <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{tasks.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{criticalTasksCount} en ruta crítica</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50">
          <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase">Avance Promedio</div>
          <div className="text-lg sm:text-xl font-black text-[#00668F] mt-0.5">{avgProgress}%</div>
          <div className="progress-track w-full bg-gray-200 h-1.5 rounded-full mt-1.5 overflow-hidden relative">
            <div className="bg-[#00668F] h-full rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50">
          <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase">Horas Planificadas</div>
          <div className="text-lg sm:text-xl font-black text-gray-800 mt-0.5">{totalPlannedHours} hrs</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Base de estimación</div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50">
          <div className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase">Horas Incurridas (AC)</div>
          <div className={`text-lg sm:text-xl font-black mt-0.5 ${totalActualHours > totalPlannedHours ? 'text-amber-600' : 'text-emerald-700'}`}>
            {totalActualHours} hrs
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {totalPlannedHours > 0 ? Math.round((totalActualHours / totalPlannedHours) * 100) : 0}% consumido
          </div>
        </div>
      </div>

      {/* Indicador y Controles de Desplazamiento Horizontal en Móvil */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 bg-sky-50 text-[#00668F] rounded-xl text-[11px] font-medium gap-2">
        <button
          type="button"
          onClick={() => setIsActivitiesCollapsed(!isActivitiesCollapsed)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-[#00668F] font-bold text-xs shadow-2xs active:scale-95 cursor-pointer shrink-0"
        >
          {isActivitiesCollapsed ? (
            <>
              <ChevronRight size={13} />
              <span>Expandir Nombres</span>
            </>
          ) : (
            <>
              <ChevronLeft size={13} />
              <span>Plegar (Solo WBS)</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (ganttScrollRef.current) {
                ganttScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
              }
            }}
            className="px-2 py-1 rounded-lg bg-white text-[#00668F] font-bold text-xs active:scale-95 shadow-2xs cursor-pointer flex items-center gap-0.5"
            title="Ver semanas anteriores"
          >
            <span>◀</span>
            <span className="text-[10px]">Sem</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (ganttScrollRef.current) {
                ganttScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
              }
            }}
            className="px-2 py-1 rounded-lg bg-white text-[#00668F] font-bold text-xs active:scale-95 shadow-2xs cursor-pointer flex items-center gap-0.5"
            title="Ver semanas siguientes"
          >
            <span className="text-[10px]">Sem</span>
            <span>▶</span>
          </button>
        </div>
      </div>

      {/* DIAGRAMA DE GANTT (Móvil y Escritorio): Matriz de Cronograma con Scroll Horizontal Fluido */}
      <div
        ref={ganttScrollRef}
        className="w-full max-w-full overflow-x-auto rounded-xl bg-white shadow-2xs touch-pan-x overscroll-x-contain scrollbar-thin"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className={`w-full transition-all duration-200 ${isActivitiesCollapsed ? 'min-w-[612px]' : 'min-w-[730px]'}`}>
          {/* Cabecera del Gantt (Columnas de Tiempo) */}
          <div className="flex bg-slate-100 text-xs font-bold text-gray-700 min-w-full">
            <div
              className={`p-2.5 sticky left-0 bg-slate-100 z-20 shrink-0 transition-all duration-200 flex items-center justify-between ${
                isActivitiesCollapsed
                  ? 'w-[52px] min-w-[52px] justify-center px-1'
                  : 'w-[170px] sm:w-[210px] min-w-[170px] sm:min-w-[210px]'
              }`}
            >
              {isActivitiesCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsActivitiesCollapsed(false)}
                  title="Expandir nombres de actividades"
                  className="w-full flex items-center justify-center gap-0.5 text-[#00668F] font-black text-[11px] cursor-pointer"
                >
                  <span>WBS</span>
                  <ChevronRight size={12} />
                </button>
              ) : (
                <>
                  <span className="text-xs font-bold text-gray-800 truncate">
                    Actividad
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsActivitiesCollapsed(true)}
                    title="Plegar columna para ver más cronograma"
                    className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-[#00668F] transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] font-semibold"
                  >
                    <span className="hidden sm:inline">Plegar</span>
                    <ChevronLeft size={13} />
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 min-w-[560px] grid grid-cols-8 text-center">
              {timelineWeeks.map((w) => (
                <div key={w.id} className="p-2">
                  <span className="block text-[11px] font-bold text-gray-800">{w.label}</span>
                  <span className="block text-[9px] text-gray-400 font-normal">{w.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Barras de Tareas */}
          <div className="divide-y divide-slate-100">
            {displayedTasks.length > 0 ? (
              displayedTasks.map((task, idx) => {
                const { leftPercent, widthPercent } = getTaskBarSpan(task, idx);
                const isDone = task.progressPct === 100 || task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredTask(task)}
                    onMouseLeave={() => setHoveredTask(null)}
                    onClick={() => onTaskClick?.(task)}
                    className={`flex items-center hover:bg-sky-50/50 transition-colors group cursor-pointer ${
                      task.isCriticalPath ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Columna Izquierda: Información de la Tarea (Sticky para scroll horizontal) */}
                    <div
                      className={`p-2 sticky left-0 bg-white group-hover:bg-slate-50 z-20 shrink-0 transition-all duration-200 ${
                        isActivitiesCollapsed
                          ? 'w-[52px] min-w-[52px] flex flex-col items-center justify-center px-1'
                          : 'w-[170px] sm:w-[210px] min-w-[170px] sm:min-w-[210px]'
                      }`}
                    >
                      {isActivitiesCollapsed ? (
                        <div
                          className="flex flex-col items-center justify-center text-center w-full"
                          title={`${task.code} - ${task.name} (${task.progressPct}%)`}
                        >
                          <span
                            className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                              task.isCriticalPath
                                ? 'bg-rose-100 text-rose-800 font-black'
                                : 'bg-slate-100 text-slate-700 font-bold'
                            }`}
                          >
                            {task.code}
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-700 mt-0.5 leading-none">
                            {task.progressPct}%
                          </span>
                        </div>
                      ) : (
                        <div className="min-w-0 w-full space-y-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                                task.isCriticalPath
                                  ? 'bg-rose-100 text-rose-800 font-black'
                                  : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              {task.code}
                            </span>
                            {task.isCriticalPath && (
                              <span className="text-[8px] font-extrabold px-1 py-0.2 rounded bg-rose-500 text-white tracking-wider shrink-0">
                                CRÍTICA
                              </span>
                            )}
                            <span className="text-xs font-bold text-gray-900 truncate" title={task.name}>
                              {task.name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="truncate">
                              {task.assignedToName?.split(' ')[0] || 'Asignado'} • {task.actualHours}/{task.plannedHours}h
                            </span>
                            <span className="font-black text-gray-800 shrink-0 ml-1">
                              {task.progressPct}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Columna Derecha: Barra de Cronograma Gantt */}
                    <div className="flex-1 min-w-[560px] p-2 relative h-12 sm:h-13 flex items-center">
                      {/* Guías de fondo de las semanas */}
                      <div className="absolute inset-0 grid grid-cols-8 divide-x divide-slate-100 pointer-events-none opacity-40" />

                      {/* Barra de la Tarea en el Gantt */}
                      <div
                        className="absolute h-6 sm:h-7 rounded-lg transition-all flex items-center px-2 overflow-hidden z-10"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${Math.max(12, widthPercent)}%`,
                          backgroundColor: task.isCriticalPath
                            ? '#FEE2E2'
                            : isDone
                            ? '#D1FAE5'
                            : '#E0F2FE',
                        }}
                      >
                        {/* Relleno de porcentaje de avance interior */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-l-md transition-all opacity-90"
                          style={{
                            width: `${task.progressPct}%`,
                            backgroundColor: task.isCriticalPath
                              ? '#EF4444'
                              : isDone
                              ? '#10B981'
                              : '#00668F',
                          }}
                        />

                        {/* Texto dentro de la barra */}
                        <div className="relative z-10 flex items-center justify-between w-full text-[10px] font-black px-1 text-slate-800">
                          <span className="truncate text-white">
                            {task.code} ({task.plannedHours}h)
                          </span>
                          <span className="text-white font-black">
                            {task.progressPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-gray-400">
                No hay actividades disponibles para los filtros seleccionados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leyenda del Diagrama de Gantt */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Completada (100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00668F]" />
            <span>En Ejecución</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="font-bold text-rose-700">Ruta Crítica (Holgura Cero)</span>
          </div>
        </div>

        <div className="text-[11px] text-gray-400">
          Toca o haz clic en cualquier tarea para editar sus datos.
        </div>
      </div>
    </div>
  );
};

