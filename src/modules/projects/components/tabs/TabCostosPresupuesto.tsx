import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Users,
  Package,
  Truck,
  Briefcase,
  Trash2,
  Info,
  Activity,
  ShieldCheck,
  Gauge,
  Flame,
  Wrench,
  Clock,
} from 'lucide-react';
import { Project } from '../../../../types';
import { CostMatrixItem } from '../../../../types/ProjectSchema';
import { formatCOP, formatUSD } from '../../../../core/services/trmService';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';

export const INTECKNO_OFFICIAL_CATEGORIES: {
  key: CostMatrixItem['category'];
  label: string;
  shortLabel: string;
  color: string;
}[] = [
  { key: 'mano_obra_itk', label: 'Mano de Obra ITK (Horas-Hombre)', shortLabel: 'Mano de Obra ITK', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'mano_obra_externa', label: 'Mano de Obra Externa / Especialistas', shortLabel: 'MO Externa', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'viaticos_transporte', label: 'Transporte, Pasajes & Viáticos', shortLabel: 'Viáticos & Movilidad', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'consumibles_taller', label: 'Consumibles de Taller & EPP', shortLabel: 'Consumibles', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'inspeccion_mrt', label: 'Inspección Electromagnética Cables (MRT)', shortLabel: 'MRT Cables', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'ensayos_end', label: 'Ensayos No Destructivos (END / NDT)', shortLabel: 'Ensayos END', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'analisis_vibraciones', label: 'Análisis de Vibraciones & Tribología', shortLabel: 'Vibraciones', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'termografia', label: 'Termografía Infrarroja', shortLabel: 'Termografía', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'repuestos_fabricacion', label: 'Materiales, Repuestos & Fabricación', shortLabel: 'Repuestos & Piezas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'subcontratos_gruas', label: 'Subcontratos Especializados / Grúas', shortLabel: 'Subcontratos / Grúas', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'imprevistos_contingencia', label: 'Imprevistos & Contingencia de Obra', shortLabel: 'Imprevistos', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
];

export function getCategoryMeta(cat: string) {
  const normalized = 
    cat === 'mano_obra' ? 'mano_obra_itk' :
    cat === 'repuestos_materiales' ? 'repuestos_fabricacion' :
    cat === 'subcontratos' ? 'subcontratos_gruas' :
    cat === 'viaticos' ? 'viaticos_transporte' : cat;
  return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === normalized) || {
    key: normalized as any,
    label: normalized.replace('_', ' ').toUpperCase(),
    shortLabel: normalized.replace('_', ' ').toUpperCase(),
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

interface TabCostosPresupuestoProps {
  project: Project;
  currentTrm: number;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabCostosPresupuesto: React.FC<TabCostosPresupuestoProps> = ({
  project,
  currentTrm,
  onUpdateProject,
}) => {
  // Matriz de Costos cargada desde el proyecto o inicializada
  const [costItems, setCostItems] = useState<CostMatrixItem[]>(() => {
    return (project as any).costMatrix || [];
  });

  // Mantener sincronizada la matriz si el proyecto cambia o se actualiza
  React.useEffect(() => {
    if ((project as any)?.costMatrix) {
      setCostItems((project as any).costMatrix);
    }
  }, [project]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CostMatrixItem | null>(null);
  const [selectedCostDetail, setSelectedCostDetail] = useState<CostMatrixItem | null>(null);

  // Formulario de nuevo rubro financiero
  const [itemForm, setItemForm] = useState<{
    category: CostMatrixItem['category'];
    concept: string;
    unit: string;
    plannedQuantity: number;
    plannedUnitCost: number;
    actualQuantity: number;
    actualUnitCost: number;
    spendingNature: 'PRESUPUESTO' | 'REPROCESO';
  }>({
    category: 'mano_obra_itk',
    concept: '',
    unit: 'Horas',
    plannedQuantity: 40,
    plannedUnitCost: 65000,
    actualQuantity: 0,
    actualUnitCost: 65000,
    spendingNature: 'PRESUPUESTO',
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.concept) return;

    const plannedTotal = itemForm.plannedQuantity * itemForm.plannedUnitCost;
    const actualTotal = itemForm.actualQuantity * itemForm.actualUnitCost;
    const variance = plannedTotal - actualTotal;

    const newItem: CostMatrixItem = {
      id: `COST-${Date.now()}`,
      category: itemForm.category,
      concept: itemForm.concept,
      unit: itemForm.unit,
      plannedQuantity: itemForm.plannedQuantity,
      plannedUnitCost: itemForm.plannedUnitCost,
      plannedTotal,
      actualQuantity: itemForm.actualQuantity,
      actualUnitCost: itemForm.actualUnitCost,
      actualTotal,
      variance,
      spendingNature: itemForm.spendingNature,
    };

    const updated = [newItem, ...costItems];
    setCostItems(updated);
    onUpdateProject?.({
      ...project,
      costMatrix: updated as any,
    } as any);

    setItemForm({
      category: 'mano_obra_itk',
      concept: '',
      unit: 'Horas',
      plannedQuantity: 40,
      plannedUnitCost: 65000,
      actualQuantity: 0,
      actualUnitCost: 65000,
      spendingNature: 'PRESUPUESTO',
    });
    setIsAddItemModalOpen(false);
  };

  // Cálculo de Horas Reportadas en Campo (Timesheet)
  const timesheetList = (project as any)?.timesheetEntries || [];
  const totalTimesheetHours = timesheetList.reduce((acc: number, entry: any) => acc + (Number(entry.hours) || 0), 0);
  const estimatedTimesheetCostCOP = totalTimesheetHours * 65000; // Tarifa base promedio HH Inteckno

  // Totales acumulados
  const totalPlanned = costItems.reduce((sum, i) => sum + i.plannedTotal, 0);
  const totalActual = costItems.reduce((sum, i) => sum + i.actualTotal, 0);
  const totalVariance = totalPlanned - totalActual;

  const getCategoryStats = (cat: string) => {
    const list = costItems.filter((i) => {
      if (i.category === cat) return true;
      if (cat === 'mano_obra_itk' && (i.category === 'mano_obra' || i.category === 'mano_obra_itk')) return true;
      if (cat === 'repuestos_fabricacion' && (i.category === 'repuestos_materiales' || i.category === 'repuestos_fabricacion')) return true;
      if (cat === 'subcontratos_gruas' && (i.category === 'subcontratos' || i.category === 'subcontratos_gruas')) return true;
      if (cat === 'viaticos_transporte' && (i.category === 'viaticos' || i.category === 'viaticos_transporte')) return true;
      return false;
    });
    const planned = list.reduce((sum, i) => sum + i.plannedTotal, 0);
    const actual = list.reduce((sum, i) => sum + i.actualTotal, 0);
    return { count: list.length, planned, actual };
  };

  const manoObra = {
    count: getCategoryStats('mano_obra_itk').count + getCategoryStats('mano_obra_externa').count,
    planned: getCategoryStats('mano_obra_itk').planned + getCategoryStats('mano_obra_externa').planned,
    actual: getCategoryStats('mano_obra_itk').actual + getCategoryStats('mano_obra_externa').actual,
  };
  const ensayosEndMrt = {
    count: getCategoryStats('inspeccion_mrt').count + getCategoryStats('ensayos_end').count + getCategoryStats('analisis_vibraciones').count + getCategoryStats('termografia').count,
    planned: getCategoryStats('inspeccion_mrt').planned + getCategoryStats('ensayos_end').planned + getCategoryStats('analisis_vibraciones').planned + getCategoryStats('termografia').planned,
    actual: getCategoryStats('inspeccion_mrt').actual + getCategoryStats('ensayos_end').actual + getCategoryStats('analisis_vibraciones').actual + getCategoryStats('termografia').actual,
  };
  const repuestos = getCategoryStats('repuestos_fabricacion');
  const viaticosSub = {
    count: getCategoryStats('viaticos_transporte').count + getCategoryStats('subcontratos_gruas').count,
    planned: getCategoryStats('viaticos_transporte').planned + getCategoryStats('subcontratos_gruas').planned,
    actual: getCategoryStats('viaticos_transporte').actual + getCategoryStats('subcontratos_gruas').actual,
  };

  const filteredItems = activeCategoryFilter === 'todos'
    ? costItems
    : costItems.filter((i) => {
        if (i.category === activeCategoryFilter) return true;
        if (activeCategoryFilter === 'mano_obra_itk' && (i.category === 'mano_obra' || i.category === 'mano_obra_externa')) return true;
        if (activeCategoryFilter === 'repuestos_fabricacion' && i.category === 'repuestos_materiales') return true;
        if (activeCategoryFilter === 'subcontratos_gruas' && i.category === 'subcontratos') return true;
        if (activeCategoryFilter === 'viaticos_transporte' && i.category === 'viaticos') return true;
        if (activeCategoryFilter === 'end_mrt' && ['inspeccion_mrt', 'ensayos_end', 'analisis_vibraciones', 'termografia'].includes(i.category)) return true;
        return false;
      });

  // Cálculos financieros contractuales basados en la realidad de Inteckno S.A.S.
  const rawContractAmount = project.contractAmount || project.budgetPV || 0;
  const currency = project.currency || 'COP';
  const contractAmountCOP = currency === 'USD' 
    ? rawContractAmount * currentTrm 
    : currency === 'EUR' 
    ? rawContractAmount * (currentTrm * 1.08) 
    : rawContractAmount;

  const totalIncurred = totalActual;
  const grossProfitCOP = contractAmountCOP - totalIncurred;
  const grossMarginPct = contractAmountCOP > 0 ? (grossProfitCOP / contractAmountCOP) * 100 : 0;

  const totalInvoiced = project.totalInvoiced || 0;
  const pendingToInvoice = Math.max(0, contractAmountCOP - totalInvoiced);
  const advanceAmount = project.advancePaymentAmount || (
    project.advancePaymentPercentage ? (contractAmountCOP * project.advancePaymentPercentage / 100) : 0
  );

  return (
    <div className="space-y-4">
      {/* 0. PANEL EJECUTIVO DE CONTROL DE PROYECTO (ADN FINANCIERO INTECKNO) */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-4 rounded-2xl border border-sky-900 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-sky-800/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-cyan-300 border border-sky-400/30 px-2 py-0.5 rounded">
                Control de Proyecto • Kardex Financiero
              </span>
              <span className="text-xs text-sky-200 font-mono">
                {project.code}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-1">
              {project.name}
            </h2>
            <div className="text-[11px] text-sky-300 mt-0.5 flex flex-wrap gap-x-3">
              <span>Cliente: <strong className="text-white">{project.clientName}</strong></span>
              {project.contractCode && <span>Contrato / OC: <strong className="text-white">{project.contractCode}</strong></span>}
              {project.quoteCode && <span>Cotización: <strong className="text-white">{project.quoteCode}</strong></span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-sky-300 block uppercase">Margen de Rentabilidad</span>
              <span className={`text-base font-black ${
                grossMarginPct >= 30 ? 'text-emerald-400' : grossMarginPct >= 15 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {grossMarginPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
          {/* Valor Contractual */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Valor Contractual Vigente</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {currency === 'COP' ? formatCOP(contractAmountCOP) : `${currency} $${rawContractAmount.toLocaleString('en-US')}`}
            </div>
            {currency !== 'COP' && (
              <div className="text-[10px] text-cyan-300 mt-0.5">
                ≈ {formatCOP(contractAmountCOP)} (TRM {currentTrm.toLocaleString('es-CO')})
              </div>
            )}
          </div>

          {/* Costos Reales Incurridos */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Costos Totales Incurridos</span>
            <div className="text-sm font-bold text-rose-300 mt-0.5">
              {formatCOP(totalIncurred)}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              Presupuesto Plan: {formatCOP(totalPlanned)}
            </div>
          </div>

          {/* Utilidad Bruta */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Utilidad Bruta Proyectada</span>
            <div className={`text-sm font-bold mt-0.5 ${grossProfitCOP >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {formatCOP(grossProfitCOP)}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              Estado: {grossMarginPct >= 30 ? 'Excelente' : grossMarginPct >= 15 ? 'Aceptable' : 'Alerta de Margen'}
            </div>
          </div>

          {/* Facturación y Saldo */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Facturación & Saldos</span>
            <div className="text-sm font-bold text-cyan-200 mt-0.5">
              Facturado: {formatCOP(totalInvoiced)}
            </div>
            <div className="text-[10px] text-sky-300 mt-0.5">
              Pendiente por Facturar: {formatCOP(pendingToInvoice)}
            </div>
          </div>
        </div>
      </div>

      {/* 1. TARJETAS DE CATEGORÍAS FINANCIERAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Mano de Obra */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'mano_obra_itk' ? 'todos' : 'mano_obra_itk')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'mano_obra_itk'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Mano de Obra ITK / Ext.</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Users size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(manoObra.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(manoObra.planned)} ({manoObra.count} rubros)</div>
        </div>

        {/* Ensayos END & MRT */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'end_mrt' ? 'todos' : 'end_mrt')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'end_mrt'
              ? 'border-[#00668F] bg-purple-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">END, MRT & Diagnóstico</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Activity size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(ensayosEndMrt.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(ensayosEndMrt.planned)} ({ensayosEndMrt.count} rubros)</div>
        </div>

        {/* Repuestos y Fabricación */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'repuestos_fabricacion' ? 'todos' : 'repuestos_fabricacion')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'repuestos_fabricacion'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Repuestos & Fabricación</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Package size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(repuestos.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(repuestos.planned)} ({repuestos.count} rubros)</div>
        </div>

        {/* Viáticos & Logística */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'viaticos_transporte' ? 'todos' : 'viaticos_transporte')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'viaticos_transporte'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Viáticos & Subcontratos</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Truck size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(viaticosSub.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(viaticosSub.planned)} ({viaticosSub.count} rubros)</div>
        </div>
      </div>

      {/* 2. TABLA DE LA MATRIZ FINANCIERA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Matriz Financiera de Presupuesto ({filteredItems.length} Rubros)
            </h3>
            <p className="text-[11px] text-slate-500">
              Total Plan: <span className="font-bold text-slate-700">{formatCOP(totalPlanned)}</span> • Real Incurrido: <span className="font-bold text-slate-700">{formatCOP(totalActual)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddItemModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Agregar Rubro</span>
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet size={32} className="mx-auto opacity-30" />
            <p className="text-xs font-bold text-slate-600">No hay rubros de costos en esta categoría</p>
            <p className="text-[11px]">Agrega conceptos de mano de obra, materiales, subcontratos o viáticos para el control presupuestal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Categoría</th>
                  <th className="py-2.5 px-4">Concepto / Actividad</th>
                  <th className="py-2.5 px-4 text-center">Unidad</th>
                  <th className="py-2.5 px-4 text-right">Cant. Plan</th>
                  <th className="py-2.5 px-4 text-right">Costo Unit. Plan</th>
                  <th className="py-2.5 px-4 text-right">Total Planificado</th>
                  <th className="py-2.5 px-4 text-right">Total Real</th>
                  <th className="py-2.5 px-4 text-right">Desviación</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => setSelectedCostDetail(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-4">
                      {(() => {
                        const meta = getCategoryMeta(item.category);
                        return (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${meta.color}`}>
                            {meta.shortLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 group-hover:text-[#00668F] transition-colors">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.concept}</span>
                        {item.spendingNature === 'REPROCESO' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300" title="Reproceso / Calidad (Garantía)">
                            REPROCESO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200" title="Partida de Presupuesto Inicial">
                            PRESUPUESTO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-500 font-mono text-[11px]">{item.unit}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{item.plannedQuantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatCOP(item.plannedUnitCost)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCOP(item.plannedTotal)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatCOP(item.actualTotal)}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${item.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.variance >= 0 ? '+' : ''}{formatCOP(item.variance)}
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedCostDetail(item)}
                          className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 rounded transition-colors"
                          title="Ver detalle del rubro"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Eliminar rubro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: AGREGAR RUBRO */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Agregar Rubro a la Matriz Financiera</h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Naturaleza del Gasto</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, spendingNature: 'PRESUPUESTO' })}
                    className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      itemForm.spendingNature === 'PRESUPUESTO'
                        ? 'bg-[#00668F]/10 border-[#00668F] text-[#00668F]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Presupuesto (Obra)
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, spendingNature: 'REPROCESO' })}
                    className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      itemForm.spendingNature === 'REPROCESO'
                        ? 'bg-rose-50 border-rose-400 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Reproceso / Calidad
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  {INTECKNO_OFFICIAL_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Concepto / Descripción</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Soldador 6G Calificado ASME IX"
                  value={itemForm.concept}
                  onChange={(e) => setItemForm({ ...itemForm, concept: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidad</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cantidad Planificada</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.plannedQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, plannedQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Costo Unitario Plan (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.plannedUnitCost}
                    onChange={(e) => setItemForm({ ...itemForm, plannedUnitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Costo Real Incurrido (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.actualUnitCost * itemForm.actualQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setItemForm({
                        ...itemForm,
                        actualQuantity: 1,
                        actualUnitCost: val,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00668F] text-white rounded-xl font-bold"
                >
                  Registrar Rubro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Rubro */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="¿Eliminar Rubro Financiero?"
        itemName={itemToDelete ? itemToDelete.concept : ''}
        description="Esta acción eliminará el concepto de costo de la matriz financiera del proyecto. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={false}
        confirmText="Eliminar Rubro"
        onConfirm={() => {
          if (itemToDelete) {
            const updated = costItems.filter((i) => i.id !== itemToDelete.id);
            setCostItems(updated);
            if (onUpdateProject) {
              onUpdateProject({ costMatrix: updated } as any);
            }
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Modal Detalle Completo de Rubro */}
      <DetailModal
        isOpen={Boolean(selectedCostDetail)}
        title={selectedCostDetail?.concept || 'Detalle de Rubro Presupuestal'}
        subtitle={selectedCostDetail ? `Categoría: ${selectedCostDetail.category.replace('_', ' ').toUpperCase()} | Proyecto: ${project.name}` : ''}
        badge={selectedCostDetail ? {
          label: selectedCostDetail.variance >= 0 ? 'Dentro de Presupuesto' : 'Sobrecosto / Desvío',
          color: selectedCostDetail.variance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        } : undefined}
        onClose={() => setSelectedCostDetail(null)}
        fields={selectedCostDetail ? [
          { label: 'Concepto / Actividad', value: selectedCostDetail.concept, colSpan: 2 },
          { label: 'Categoría Financiera', value: selectedCostDetail.category.replace('_', ' ').toUpperCase() },
          { label: 'Unidad de Medida', value: selectedCostDetail.unit, isMono: true },
          { label: 'Cantidad Planificada', value: selectedCostDetail.plannedQuantity.toString(), isMono: true },
          { label: 'Costo Unitario Plan', value: formatCOP(selectedCostDetail.plannedUnitCost), isMono: true },
          { label: 'Total Planificado', value: formatCOP(selectedCostDetail.plannedTotal), isMono: true },
          { label: 'Cantidad Real', value: selectedCostDetail.actualQuantity.toString(), isMono: true },
          { label: 'Costo Unitario Real', value: formatCOP(selectedCostDetail.actualUnitCost), isMono: true },
          { label: 'Total Real Incurrido', value: formatCOP(selectedCostDetail.actualTotal), isMono: true },
          { label: 'Desviación Presupuestal', value: `${selectedCostDetail.variance >= 0 ? '+' : ''}${formatCOP(selectedCostDetail.variance)}`, isMono: true },
        ] : []}
      />
    </div>
  );
};
