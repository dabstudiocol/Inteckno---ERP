import React, { useState } from 'react';
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
  Clock,
  Plus,
  ShoppingCart,
  Receipt,
  ShieldCheck,
  FileText,
  Users,
  Sun,
  CloudRain,
  Wind,
  Check,
  Send,
  MessageSquare,
  History
} from 'lucide-react';
import { Project, WBSTask } from '../../../../types';
import { formatCOP, formatUSD } from '../../../../core/services/trmService';
import { useErp } from '../../../../core/storage/erpStore';

export interface DailyOperationalReport {
  id: string;
  date: string;
  author: string;
  progressReportedPct: number;
  crewCount: number;
  weatherCondition: 'despejado' | 'nublado' | 'lluvioso' | 'viento_fuerte';
  activitiesSummary: string;
  intervenedComponents?: string;
  safetyObservations?: string;
  status: 'normal' | 'alerta' | 'detenido';
  createdAt: string;
}

interface TabDashboardProps {
  project: Project;
  tasks: WBSTask[];
  currentTrm: number;
  onNavigateTab?: (tab: string) => void;
}

export const TabDashboard: React.FC<TabDashboardProps> = ({ 
  project, 
  tasks, 
  currentTrm,
  onNavigateTab 
}) => {
  const { updateProject, setActiveModule, navigateWithContext, currentUser, notify } = useErp();
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

  // Estado para Reporte Diario de Obra (DDR)
  const [showDdrForm, setShowDdrForm] = useState(false);
  const [ddrDate, setDdrDate] = useState(new Date().toISOString().split('T')[0]);
  const [ddrCrewCount, setDdrCrewCount] = useState<number>(3);
  const [ddrProgressPct, setDdrProgressPct] = useState<number>(physicalProgressPct);
  const [ddrWeather, setDdrWeather] = useState<'despejado' | 'nublado' | 'lluvioso' | 'viento_fuerte'>('despejado');
  const [ddrActivities, setDdrActivities] = useState('');
  const [ddrComponents, setDdrComponents] = useState(dyn.component || 'Pilonas / Cabezales STC');
  const [ddrSafety, setDdrSafety] = useState('');
  const [ddrStatus, setDdrStatus] = useState<'normal' | 'alerta' | 'detenido'>('normal');

  // Historial de reportes diarios
  const dailyReports: DailyOperationalReport[] = dyn.dailyReports || [];

  const handleSaveDdr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ddrActivities.trim()) {
      notify?.('warning', 'Actividades Requeridas', 'Por favor describe las labores ejecutadas en la jornada.');
      return;
    }

    const newReport: DailyOperationalReport = {
      id: `DDR-${Date.now()}`,
      date: ddrDate,
      author: currentUser.name || 'Residente de Obra STC',
      progressReportedPct: Number(ddrProgressPct) || physicalProgressPct,
      crewCount: Number(ddrCrewCount) || 1,
      weatherCondition: ddrWeather,
      activitiesSummary: ddrActivities.trim(),
      intervenedComponents: ddrComponents.trim() || undefined,
      safetyObservations: ddrSafety.trim() || undefined,
      status: ddrStatus,
      createdAt: new Date().toISOString(),
    };

    const updatedReports = [newReport, ...dailyReports];
    const updatedDyn = {
      ...dyn,
      dailyReports: updatedReports,
      lastReportDate: ddrDate,
    };

    updateProject(project.id, {
      dynamicData: updatedDyn,
      updatedAt: new Date().toISOString(),
    });

    setShowDdrForm(false);
    setDdrActivities('');
    setDdrSafety('');
    notify?.('success', 'Reporte Diario Registrado', `Se guardó el diario de obra para la fecha ${ddrDate}.`);
  };

  const handleTriggerSolped = () => {
    navigateWithContext('requisiciones', 'create_solped', { project });
    notify?.('info', 'Petición de Materiales', `Creando SOLPED para el proyecto ${project.code}.`);
  };

  const handleTriggerGasto = () => {
    navigateWithContext('gastos', 'create_expense', { projectId: project.id, projectCode: project.code });
    notify?.('info', 'Legalización de Gastos', `Imputando viático al proyecto ${project.code}.`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. HUB DE ACCIONES RÁPIDAS DEL PROYECTO (USABILIDAD DIRECTA) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300">
                Centro de Operaciones Activas
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
              Acciones Rápidas del Proyecto: <span className="text-[#38BDF8]">{project.code}</span>
            </h2>
            <p className="text-xs text-slate-300">
              {project.name} • {project.clientName} ({project.location || 'Colombia'})
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDdrForm(!showDdrForm)}
              className="px-3.5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <FileCheck2 size={15} />
              <span>{showDdrForm ? 'Cerrar Formulario DDR' : '+ Registrar Diario de Obra (DDR)'}</span>
            </button>
          </div>
        </div>

        {/* Botonera de autopistas y accesos directos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3.5">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTab) {
                onNavigateTab('horas');
              } else {
                navigateWithContext('registro-horas', 'impute_hours', { projectId: project.id });
              }
            }}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Clock size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Imputar Horas</span>
            <span className="text-[10px] text-slate-400 block truncate">Registro de HH campo</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerSolped}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <ShoppingCart size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Pedir Materiales</span>
            <span className="text-[10px] text-slate-400 block truncate">Crear SOLPED directa</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerGasto}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Receipt size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Registrar Gasto</span>
            <span className="text-[10px] text-slate-400 block truncate">Viático o compra menor</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('wbs') : null}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Layers size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Plan y Gantt</span>
            <span className="text-[10px] text-slate-400 block truncate">WBS y dependencias</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('costos') : null}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <DollarSign size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Matriz Costos</span>
            <span className="text-[10px] text-slate-400 block truncate">Presupuesto vs Real</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('hseq') : null}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/80 text-left transition-all cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <ShieldCheck size={15} />
            </div>
            <span className="text-xs font-bold block text-white">Seguridad SST</span>
            <span className="text-[10px] text-slate-400 block truncate">Permisos de alturas</span>
          </button>
        </div>
      </div>

      {/* FORMULARIO DESPLEGABLE: REGISTRO DE DIARIO DE OBRA (DDR) */}
      {showDdrForm && (
        <form onSubmit={handleSaveDdr} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-sky-200 dark:border-sky-900/60 shadow-lg space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#00668F] flex items-center justify-center">
                <FileCheck2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Nuevo Reporte de Diario de Obra (DDR)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bitácora oficial de avance, novedades operativas y cuadrilla presente en sitio
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-[#00668F]">
              {project.code}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de la Jornada
              </label>
              <input
                type="date"
                value={ddrDate}
                onChange={(e) => setDdrDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Personal Técnico en Sitio
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={ddrCrewCount || ''}
                placeholder="0"
                onChange={(e) => setDdrCrewCount(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                % Avance Físico Alcanzado
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={ddrProgressPct || ''}
                placeholder="0"
                onChange={(e) => setDdrProgressPct(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Condición Climática
              </label>
              <select
                value={ddrWeather}
                onChange={(e) => setDdrWeather(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="despejado">☀️ Despejado / Óptimo</option>
                <option value="nublado">⛅ Nublado / Seco</option>
                <option value="lluvioso">🌧️ Lluvioso / Parada Parcial</option>
                <option value="viento_fuerte">💨 Viento Fuerte (&gt; 45 km/h)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Componente / Pilona / Estación Intervenida
              </label>
              <input
                type="text"
                value={ddrComponents}
                onChange={(e) => setDdrComponents(e.target.value)}
                placeholder="Ej. Pilona 4 a 7, Balancín de entrada, Polea motriz..."
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estado Operativo de la Jornada
              </label>
              <select
                value={ddrStatus}
                onChange={(e) => setDdrStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
              >
                <option value="normal">🟢 Ejecución Normal según Cronograma</option>
                <option value="alerta">🟡 Novedad Menor / Ajuste de Tiempo</option>
                <option value="detenido">🔴 Parada de Operación por Clima / Fuerza Mayor</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descripción de Labores y Avances del Día *
            </label>
            <textarea
              rows={3}
              value={ddrActivities}
              onChange={(e) => setDdrActivities(e.target.value)}
              placeholder="Detalla minuciosamente el trabajo completado hoy: maniobras de izaje, apriete dinamométrico, alineación con láser, pruebas de tensión..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              required
            />
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observaciones de Seguridad SST / Novedades de Campo
            </label>
            <input
              type="text"
              value={ddrSafety}
              onChange={(e) => setDdrSafety(e.target.value)}
              placeholder="Permiso de alturas firmado, inspección de líneas de vida ok, sin incidentes..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowDdrForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Send size={13} />
              <span>Guardar Reporte Diario de Obra</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. KPIS AUTOMÁTICOS: Avance Físico vs Esperado y Costo Real vs Presupuestado */}
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

      {/* 3. HISTORIAL DE BITÁCORA DIARIA (DDR) */}
      {dailyReports.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <History size={16} />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Bitácora de Campo Reciente (Diario de Obra DDR)
                </h3>
                <p className="text-[10px] text-slate-500">
                  {dailyReports.length} reporte(s) de jornada registrados por el equipo técnico
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDdrForm(true)}
              className="text-xs font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>Añadir Reporte</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {dailyReports.slice(0, 5).map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{rep.date}</span>
                    <span className="text-[11px] text-slate-400">• Por {rep.author}</span>
                    {rep.intervenedComponents && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#00668F] text-[10px] font-bold">
                        {rep.intervenedComponents}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      Cuadrilla: <strong>{rep.crewCount} técnicos</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Avance: {rep.progressReportedPct}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rep.activitiesSummary}
                </p>

                {rep.safetyObservations && (
                  <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                    <span>SST: {rep.safetyObservations}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. RENDERIZADOR DE PARÁMETROS TÉCNICOS STC TELEFÉRICOS */}
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