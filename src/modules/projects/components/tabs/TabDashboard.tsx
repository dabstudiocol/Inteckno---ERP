import React from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Compass,
  FileCheck2,
  Activity,
  Zap,
  Radio,
  Wrench,
  Cpu,
  Clock
} from 'lucide-react';
import { Project, WBSTask } from '../../../../types';
import { formatCOP, formatUSD } from '../../../../core/services/trmService';

interface TabDashboardProps {
  project: Project;
  tasks: WBSTask[];
  currentTrm: number;
}

export const TabDashboard: React.FC<TabDashboardProps> = ({ project, tasks, currentTrm }) => {
  const dyn = (project as any).dynamicData || {};
  const lineOfBusiness = project.lineOfBusiness || 'Diagnóstico';

  // Cálculos EVM y Avance Físico
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;

  // Avance físico ponderado por horas
  const totalPlannedHours = tasks.reduce((sum, t) => sum + (t.plannedHours || 0), 0) || 100;
  const earnedHours = tasks.reduce((sum, t) => sum + ((t.plannedHours || 0) * (t.progressPct || 0)) / 100, 0);
  const physicalProgressPct = Math.round((earnedHours / totalPlannedHours) * 100);

  // Estimación de avance esperado según fecha
  const startMs = new Date(project.startDate).getTime();
  const endMs = new Date(project.endDate).getTime();
  const nowMs = Date.now();
  let expectedProgressPct = 50;
  if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
    expectedProgressPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));
  }

  // Costos EVM
  const budgetPV = project.budgetPV || 0;
  const actualCostAC = project.actualCostAC || 0;
  const earnedValueEV = project.earnedValueEV || (budgetPV * physicalProgressPct) / 100;

  // Índices SPI y CPI
  const spi = expectedProgressPct > 0 ? Number(((physicalProgressPct / expectedProgressPct) || 1).toFixed(2)) : 1.0;
  const cpi = actualCostAC > 0 ? Number(((earnedValueEV / actualCostAC) || 1).toFixed(2)) : 1.0;
  const costVariance = earnedValueEV - actualCostAC;

  return (
    <div className="space-y-4">
      {/* 1. KPIs AUTOMÁTICOS: Avance Físico vs Esperado y Costo Real vs Presupuestado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Avance Físico vs Esperado */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Avance Físico vs Esperado</span>
            <Activity className="w-4 h-4 text-[#00668F]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{physicalProgressPct}%</span>
            <span className="text-xs text-slate-500 font-medium">Meta: {expectedProgressPct}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all ${physicalProgressPct >= expectedProgressPct ? 'bg-emerald-600' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(physicalProgressPct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>SPI: <strong className={spi >= 1 ? 'text-emerald-700' : 'text-amber-700'}>{spi}</strong></span>
            <span>{spi >= 1 ? 'A tiempo / Adelantado' : 'Con retraso'}</span>
          </div>
        </div>

        {/* KPI 2: Costo Real vs Presupuestado */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Costo Real vs Presupuesto</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCOP(actualCostAC)}</div>
            <span className="text-[11px] text-slate-500">de {formatCOP(budgetPV)} (Presupuesto Planificado)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>CPI: <strong className={cpi >= 1 ? 'text-emerald-700' : 'text-red-700'}>{cpi}</strong></span>
            <span>{cpi >= 1 ? 'Eficiencia de costo' : 'Sobrecosto'}</span>
          </div>
        </div>

        {/* KPI 3: Valor Ganado */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Valor Ganado (Avance Real)</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatCOP(earnedValueEV)}</div>
          <div className="text-[11px] text-slate-500">
            Variación de Costo: <span className={costVariance >= 0 ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
              {costVariance >= 0 ? '+' : ''}{formatCOP(costVariance)}
            </span>
          </div>
        </div>

        {/* KPI 4: Estado de Actividades */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Actividades del Plan</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalTasks}</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-emerald-700 font-medium">{completedTasks} completadas</span>
            <span>•</span>
            <span className="text-blue-700 font-medium">{inProgressTasks} en curso</span>
          </div>
        </div>
      </div>

      {/* 2. RENDERIZADOR DE PARÁMETROS TÉCNICOS STC TELEFÉRICOS */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#00668F] flex items-center justify-center">
              <Radio size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Parámetros Técnicos del Sistema de Cable ({project.serviceType || 'Teleférico'})
              </h3>
              <p className="text-[10px] text-slate-500">
                Especificaciones de teleférico según la especialidad técnica
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Centro de Costos: {project.costCenter}
          </span>
        </div>

        {/* Renderizado Condicional por Especialidad de Cable */}
        {Object.keys(dyn).length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs">
            No se han configurado especificaciones técnicas adicionales para este proyecto.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Inspecciones END / MRT */}
            {dyn.testType && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Método de Ensayo END</span>
                <span className="text-xs sm:text-sm font-bold text-[#00668F] block">{dyn.testType}</span>
                <span className="text-[10px] text-slate-400 block">Norma: {dyn.applicableStandard || 'UNE EN 12927'}</span>
              </div>
            )}

            {dyn.cableDiameterMm !== undefined && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Diámetro de Cable</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">{dyn.cableDiameterMm} mm</span>
                <span className="text-[10px] text-slate-400 block">Longitud: {dyn.cableLengthMeters || 0} m</span>
              </div>
            )}

            {dyn.cableConstruction && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Construcción Cable</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">{dyn.cableConstruction}</span>
                <span className="text-[10px] text-slate-400 block">Sensor: {dyn.mrtSensorHead || 'Estándar'}</span>
              </div>
            )}

            {/* Mantenimiento y Montaje */}
            {dyn.component && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Componente Intervenido</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">{dyn.component}</span>
                <span className="text-[10px] text-slate-400 block">Sistema: {dyn.systemType ? dyn.systemType.replace('_', ' ') : 'Monocable'}</span>
              </div>
            )}

            {dyn.towersCount !== undefined && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Pilonas / Torres</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">{dyn.towersCount} torres</span>
                <span className="text-[10px] text-slate-400 block">{dyn.heavyLiftingRequired ? 'Requiere grúa en torre' : 'Sin grúa'}</span>
              </div>
            )}

            {dyn.cableSplicingRequired !== undefined && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Empalme de Cable</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">
                  {dyn.cableSplicingRequired ? 'Recorte & Empalme Requerido' : 'No requiere empalme'}
                </span>
                {dyn.splicingLengthMeters && (
                  <span className="text-[10px] text-slate-400 block">Longitud empalme: {dyn.splicingLengthMeters}m</span>
                )}
              </div>
            )}

            {/* Proyectos Especiales / Modernización */}
            {dyn.modernizationType && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Tipo Modernización</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block capitalize">{dyn.modernizationType.replace('_', ' ')}</span>
                <span className="text-[10px] text-slate-400 block">Parada max: {dyn.interruptionHoursAllowed || 0} hrs</span>
              </div>
            )}

            {dyn.technicalScope && (
              <div className="col-span-2 sm:col-span-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Alcance Técnico del Proyecto</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{dyn.technicalScope}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
