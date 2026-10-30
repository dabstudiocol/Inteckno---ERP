import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Printer,
  Download,
  Filter,
  DollarSign,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { PurchaseOrder, Project, Partner } from '../../../types';
import { formatCOP, formatUSD, formatTRM } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface ProcurementReportsDashboardProps {
  purchaseOrders: PurchaseOrder[];
  projects: Project[];
  partners: Partner[];
  trm: number;
}

type PeriodFilter = 'current_month' | 'last_month' | 'year' | 'all';
type ScopeFilter = 'all' | 'projects' | 'office';

export const ProcurementReportsDashboard: React.FC<ProcurementReportsDashboardProps> = ({
  purchaseOrders,
  projects,
  partners,
  trm,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('current_month');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [hoveredProjectIdx, setHoveredProjectIdx] = useState<number | null>(null);
  const [hoveredSupplierIdx, setHoveredSupplierIdx] = useState<number | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Filtrado de órdenes de compra
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (!po || po.status === 'rejected') return false;

      // Filtro de periodo
      if (po.date) {
        const orderDate = new Date(po.date);
        if (period === 'current_month') {
          if (
            orderDate.getFullYear() !== currentYear ||
            orderDate.getMonth() !== currentMonth
          ) {
            return false;
          }
        } else if (period === 'last_month') {
          const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          if (
            orderDate.getFullYear() !== targetYear ||
            orderDate.getMonth() !== targetMonth
          ) {
            return false;
          }
        } else if (period === 'year') {
          if (orderDate.getFullYear() !== currentYear) {
            return false;
          }
        }
      }

      // Filtro por alcance (Proyectos vs Oficina)
      const isProjectPo = Boolean(
        po.projectCode &&
        po.projectCode !== 'OFICINA' &&
        po.projectCode !== 'Administración & Oficina' &&
        po.projectCode !== 'General'
      );

      if (scope === 'projects' && !isProjectPo) return false;
      if (scope === 'office' && isProjectPo) return false;

      // Filtro específico de proyecto
      if (selectedProjectId !== 'all') {
        const proj = projects.find((p) => p.id === selectedProjectId);
        if (proj && po.projectCode !== proj.code) return false;
      }

      return true;
    });
  }, [purchaseOrders, period, scope, selectedProjectId, currentYear, currentMonth, projects]);

  // Cálculos consolidados en COP y USD
  const metrics = useMemo(() => {
    let totalCOP = 0;
    let projectCOP = 0;
    let officeCOP = 0;
    let receivedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    filteredOrders.forEach((po) => {
      const orderTotalCOP =
        po.totalAmountCOP ||
        (po.totalAmountUSD ? Math.round(po.totalAmountUSD * trm) : 0) ||
        (po.items || []).reduce((acc, it) => acc + (it.orderedQty || it.qty || 0) * (it.unitPriceCOP || 0), 0);

      totalCOP += orderTotalCOP;

      const isProject = Boolean(
        po.projectCode &&
        po.projectCode !== 'OFICINA' &&
        po.projectCode !== 'Administración & Oficina' &&
        po.projectCode !== 'General'
      );

      if (isProject) {
        projectCOP += orderTotalCOP;
      } else {
        officeCOP += orderTotalCOP;
      }

      if (po.status === 'received') {
        receivedCount++;
      } else {
        pendingCount++;
        if (po.estimatedArrivalDate && po.estimatedArrivalDate < todayStr) {
          overdueCount++;
        }
      }
    });

    const totalUSD = totalCOP > 0 ? Number((totalCOP / trm).toFixed(2)) : 0;
    const projectPct = totalCOP > 0 ? Math.round((projectCOP / totalCOP) * 100) : 0;
    const officePct = totalCOP > 0 ? Math.round((officeCOP / totalCOP) * 100) : 0;

    return {
      totalCOP,
      totalUSD,
      projectCOP,
      projectPct,
      officeCOP,
      officePct,
      ordersCount: filteredOrders.length,
      receivedCount,
      pendingCount,
      overdueCount,
    };
  }, [filteredOrders, trm]);

  // Desglose Integral de Compras (Proyectos STC + Sedes, Oficinas y Taller)
  const projectsBreakdown = useMemo(() => {
    const map = new Map<string, { code: string; name: string; category: string; totalCOP: number; count: number }>();

    filteredOrders.forEach((po) => {
      let code = po.projectCode || 'OFICINA';
      let name = 'Administración & Sede Principal';
      let category = 'Oficina / General';

      const proj = projects.find((p) => p.code === code || p.id === po.projectId);
      if (proj) {
        code = proj.code;
        name = proj.name;
        category = 'Proyecto STC';
      } else if (code.toUpperCase().includes('TALLER') || code.toUpperCase().includes('MANT')) {
        name = 'Taller Central & Mantenimiento';
        category = 'Taller / Operación';
      } else if (code.toUpperCase().includes('EPP') || code.toUpperCase().includes('DOTACION')) {
        name = 'Dotación & Seguridad Industrial';
        category = 'Seguridad / SST';
      } else if (code === 'OFICINA' || code === 'General' || code.toUpperCase().includes('ADMIN')) {
        name = 'Sede Administrativa & Operaciones';
        category = 'Oficina & Sedes';
      } else {
        name = code;
        category = 'Destino Operativo';
      }

      const orderTotalCOP =
        po.totalAmountCOP ||
        (po.totalAmountUSD ? Math.round(po.totalAmountUSD * trm) : 0) ||
        (po.items || []).reduce((acc, it) => acc + (it.orderedQty || it.qty || 0) * (it.unitPriceCOP || 0), 0);

      const existing = map.get(code) || { code, name, category, totalCOP: 0, count: 0 };
      existing.totalCOP += orderTotalCOP;
      existing.count += 1;
      map.set(code, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalCOP - a.totalCOP);
  }, [filteredOrders, projects, trm]);

  // Top Proveedores
  const topSuppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; totalCOP: number; count: number }>();

    filteredOrders.forEach((po) => {
      const suppName = po.supplierName || 'Proveedor no especificado';
      const orderTotalCOP =
        po.totalAmountCOP ||
        (po.totalAmountUSD ? Math.round(po.totalAmountUSD * trm) : 0) ||
        (po.items || []).reduce((acc, it) => acc + (it.orderedQty || it.qty || 0) * (it.unitPriceCOP || 0), 0);

      const existing = map.get(suppName) || { id: po.supplierId || suppName, name: suppName, totalCOP: 0, count: 0 };
      existing.totalCOP += orderTotalCOP;
      existing.count += 1;
      map.set(suppName, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalCOP - a.totalCOP)
      .slice(0, 5);
  }, [filteredOrders, trm]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Barra de Filtros y Acciones del Reporte */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Selector de Periodo */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriod('current_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'current_month'
                  ? 'bg-[#003650] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Actual
            </button>
            <button
              onClick={() => setPeriod('last_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'last_month'
                  ? 'bg-[#003650] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'year'
                  ? 'bg-[#003650] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año {currentYear}
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'all'
                  ? 'bg-[#003650] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico Completo
            </button>
          </div>

          {/* Filtro por Ámbito */}
          <div className="w-56 shrink-0">
            <CreatableSelect
              value={
                scope === 'all' ? 'Todo (Proyectos + Oficina)' :
                scope === 'projects' ? 'Solo Proyectos STC' :
                scope === 'office' ? 'Solo Oficina & Administrativo' :
                scope
              }
              onChange={(val) => {
                if (val === 'Todo (Proyectos + Oficina)' || !val) setScope('all');
                else if (val === 'Solo Proyectos STC') setScope('projects');
                else if (val === 'Solo Oficina & Administrativo') setScope('office');
                else setScope(val as any);
              }}
              options={[
                'Todo (Proyectos + Oficina)',
                'Solo Proyectos STC',
                'Solo Oficina & Administrativo',
              ]}
              placeholder="Ámbito..."
              
              allowCustomText={false}
              inputClassName="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
            />
          </div>

          {/* Filtro por Proyecto específico */}
          {scope !== 'office' && (
            <div className="w-64 shrink-0">
              <CreatableSelect
                value={
                  selectedProjectId === 'all'
                    ? 'Todos los Proyectos'
                    : (() => {
                        const found = projects.find((p) => p.id === selectedProjectId);
                        return found ? `${found.code} - ${found.name}` : selectedProjectId;
                      })()
                }
                onChange={(val) => {
                  if (val === 'Todos los Proyectos' || !val) {
                    setSelectedProjectId('all');
                  } else {
                    const code = val.split(' - ')[0]?.trim();
                    const found = projects.find((p) => p.code === code || p.id === val);
                    setSelectedProjectId(found ? found.id : val);
                  }
                }}
                options={[
                  'Todos los Proyectos',
                  ...projects.map((p) => `${p.code} - ${p.name}`),
                ]}
                placeholder="Proyecto..."
                
                allowCustomText={false}
                inputClassName="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Imprimir informe de compras"
          >
            <Printer size={14} className="text-[#003650]" />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS CON COLORES SÓLIDOS Y MONEDA PRINCIPAL COP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Comprado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Comprado ({period === 'current_month' ? 'Mes' : 'Periodo'})</span>
            <DollarSign size={16} className="text-[#003650]" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatCOP(metrics.totalCOP)}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between pt-0.5">
            <span>Equivalente TRM:</span>
            <span className="font-mono text-slate-700 font-bold">{formatUSD(metrics.totalUSD)}</span>
          </div>
        </div>

        {/* Destinado a Proyectos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Proyectos STC</span>
            <FolderKanban size={16} className="text-[#00668F]" />
          </div>
          <div className="text-xl font-black text-[#003650] tracking-tight">
            {formatCOP(metrics.projectCOP)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Participación:</span>
            <span className="font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md">
              {metrics.projectPct}% del gasto
            </span>
          </div>
        </div>

        {/* Destinado a Oficina / General */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Oficina & Sede</span>
            <Building2 size={16} className="text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-800 tracking-tight">
            {formatCOP(metrics.officeCOP)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Participación:</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {metrics.officePct}% del gasto
            </span>
          </div>
        </div>

        {/* Estado Operativo de Órdenes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estado de Entregas</span>
            <Truck size={16} className="text-emerald-700" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{metrics.ordersCount}</span>
            <span className="text-xs font-normal text-slate-400 font-sans">órdenes emitidas</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] pt-0.5">
            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              {metrics.receivedCount} en almacén
            </span>
            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
              {metrics.pendingCount} en tránsito
            </span>
            {metrics.overdueCount > 0 && (
              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                {metrics.overdueCount} atrasadas
              </span>
            )}
          </div>
        </div>

      </div>

      {/* SECCIÓN ANALÍTICA: DESGLOSE POR PROYECTO & TOP PROVEEDORES CON GRÁFICOS DE PIE INTERACTIVOS Y RESPONSIVOS */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        
        {/* Desglose de Compras (Gráfico Donut Interactivo + Desglose Detallado) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#00668F] flex items-center justify-center shrink-0">
                <FolderKanban size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Distribución de Compras por Destino</h4>
                <p className="text-[11px] text-slate-500">Pase el cursor sobre el gráfico o la lista para explorar</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
              {projectsBreakdown.length} destinos
            </span>
          </div>

          {projectsBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay órdenes registradas en este período.
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
                const colors = ['#00668F', '#F59E0B', '#10B981', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6'];
                const total = metrics.totalCOP || 1;
                let cumulativePercent = 0;

                const slices = projectsBreakdown.map((item, idx) => {
                  const percent = (item.totalCOP / total) * 100;
                  const startPct = cumulativePercent;
                  cumulativePercent += percent;
                  return {
                    ...item,
                    percent,
                    startPct,
                    endPct: cumulativePercent,
                    color: colors[idx % colors.length],
                  };
                });

                const getCoordinatesForPercent = (p: number, radius: number) => {
                  const angle = (p / 100) * 2 * Math.PI - Math.PI / 2;
                  return {
                    x: 120 + radius * Math.cos(angle),
                    y: 120 + radius * Math.sin(angle),
                  };
                };

                const activeItem = hoveredProjectIdx !== null ? slices[hoveredProjectIdx] : null;

                return (
                  <div className="space-y-5">
                    {/* Donut SVG Centrado con Espacio Generoso y Centro Reactivo */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50/70 to-white border border-slate-200/80 flex flex-col items-center justify-center">
                      <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 240 240" className="w-full h-full transform -rotate-90 select-none">
                          {slices.map((slice, i) => {
                            if (slice.percent <= 0) return null;
                            const isHovered = hoveredProjectIdx === i;
                            const isDimmed = hoveredProjectIdx !== null && !isHovered;

                            if (slice.percent >= 99.9) {
                              return (
                                <circle
                                  key={i}
                                  cx="120"
                                  cy="120"
                                  r="84"
                                  fill="none"
                                  stroke={slice.color}
                                  strokeWidth={isHovered ? 28 : 22}
                                  className="transition-all duration-200 cursor-pointer"
                                  onMouseEnter={() => setHoveredProjectIdx(i)}
                                  onMouseLeave={() => setHoveredProjectIdx(null)}
                                />
                              );
                            }

                            // Aplicamos pequeño margen angular entre sectores para acabado nítido sin superposiciones
                            const gap = slices.length > 1 ? 0.35 : 0;
                            const safeStart = Math.min(slice.startPct + gap, slice.endPct);
                            const safeEnd = Math.max(slice.endPct - gap, safeStart);

                            const start = getCoordinatesForPercent(safeStart, 84);
                            const end = getCoordinatesForPercent(safeEnd, 84);
                            const largeArcFlag = slice.percent > 50 ? 1 : 0;
                            const pathData = `M ${start.x} ${start.y} A 84 84 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

                            return (
                              <path
                                key={i}
                                d={pathData}
                                fill="none"
                                stroke={slice.color}
                                strokeWidth={isHovered ? 28 : 22}
                                strokeLinecap="butt"
                                opacity={isDimmed ? 0.35 : 1}
                                className="transition-all duration-200 cursor-pointer"
                                onMouseEnter={() => setHoveredProjectIdx(i)}
                                onMouseLeave={() => setHoveredProjectIdx(null)}
                              >
                                <title>{`${slice.name}: ${slice.percent.toFixed(1)}% (${formatCOP(slice.totalCOP)})`}</title>
                              </path>
                            );
                          })}
                        </svg>

                        {/* Centro del Donut Reactivo e Impecable (Con diámetro libre amplio de 142px) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                          {activeItem ? (
                            <div className="space-y-0.5 animate-in fade-in duration-150">
                              <span
                                className="text-2xl font-black font-mono tracking-tight block"
                                style={{ color: activeItem.color }}
                              >
                                {activeItem.percent.toFixed(1)}%
                              </span>
                              <span className="text-xs font-bold text-slate-900 font-mono block leading-tight">
                                {formatCOP(activeItem.totalCOP)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 block truncate max-w-[125px] mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                                {activeItem.code}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5 animate-in fade-in duration-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Total Período
                              </span>
                              <span className="text-sm sm:text-base font-black text-slate-900 font-mono tracking-tight block leading-tight">
                                {formatCOP(metrics.totalCOP)}
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 font-mono block">
                                {formatUSD(metrics.totalUSD)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjetas Desglosadas con Barras de Progreso Interactivas */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {slices.map((item, idx) => {
                        const isHovered = hoveredProjectIdx === idx;
                        const isDimmed = hoveredProjectIdx !== null && !isHovered;

                        return (
                          <div
                            key={item.code}
                            onMouseEnter={() => setHoveredProjectIdx(idx)}
                            onMouseLeave={() => setHoveredProjectIdx(null)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isHovered
                                ? 'bg-white border-slate-300 shadow-md ring-2 ring-sky-100 scale-[1.01]'
                                : 'bg-slate-50/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            } ${isDimmed ? 'opacity-50' : 'opacity-100'}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                              <div className="min-w-0 space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    {item.code}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-600">
                                    {item.category}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-slate-900 leading-snug">
                                  {item.name}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs sm:text-sm font-black font-mono text-slate-900">
                                  {formatCOP(item.totalCOP)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {formatUSD(Number((item.totalCOP / trm).toFixed(2)))}
                                </div>
                              </div>
                            </div>

                            {/* Barra de progreso de la cuota */}
                            <div className="space-y-1">
                              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(4, item.percent)}%`,
                                    backgroundColor: item.color,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>{item.count} {item.count === 1 ? 'orden emitida' : 'órdenes emitidas'}</span>
                                <span className="font-bold text-slate-700">{item.percent.toFixed(1)}% del total</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Origen de las Compras: Top Proveedores con Gráfico Donut Interactivo */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Building2 size={18} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Origen de las Compras (Proveedores)</h4>
                <p className="text-[11px] text-slate-500">Volumen y cuota por proveedor contratado</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
              {topSuppliers.length} aliados
            </span>
          </div>

          {topSuppliers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay órdenes registradas con proveedores en este período.
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
                const colors = ['#00668F', '#F59E0B', '#10B981', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6'];
                const total = metrics.totalCOP || 1;
                let cumulativePercent = 0;

                const slices = topSuppliers.map((supp, idx) => {
                  const percent = (supp.totalCOP / total) * 100;
                  const startPct = cumulativePercent;
                  cumulativePercent += percent;
                  return {
                    ...supp,
                    percent,
                    startPct,
                    endPct: cumulativePercent,
                    color: colors[idx % colors.length],
                  };
                });

                const getCoordinatesForPercent = (p: number, radius: number) => {
                  const angle = (p / 100) * 2 * Math.PI - Math.PI / 2;
                  return {
                    x: 120 + radius * Math.cos(angle),
                    y: 120 + radius * Math.sin(angle),
                  };
                };

                const activeItem = hoveredSupplierIdx !== null ? slices[hoveredSupplierIdx] : null;

                return (
                  <div className="space-y-5">
                    {/* Donut SVG Centrado con Espacio Generoso y Centro Reactivo */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50/70 to-white border border-slate-200/80 flex flex-col items-center justify-center">
                      <div className="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 240 240" className="w-full h-full transform -rotate-90 select-none">
                          {slices.map((slice, i) => {
                            if (slice.percent <= 0) return null;
                            const isHovered = hoveredSupplierIdx === i;
                            const isDimmed = hoveredSupplierIdx !== null && !isHovered;

                            if (slice.percent >= 99.9) {
                              return (
                                <circle
                                  key={i}
                                  cx="120"
                                  cy="120"
                                  r="84"
                                  fill="none"
                                  stroke={slice.color}
                                  strokeWidth={isHovered ? 28 : 22}
                                  className="transition-all duration-200 cursor-pointer"
                                  onMouseEnter={() => setHoveredSupplierIdx(i)}
                                  onMouseLeave={() => setHoveredSupplierIdx(null)}
                                />
                              );
                            }

                            // Aplicamos pequeño margen angular entre sectores para acabado nítido sin superposiciones
                            const gap = slices.length > 1 ? 0.35 : 0;
                            const safeStart = Math.min(slice.startPct + gap, slice.endPct);
                            const safeEnd = Math.max(slice.endPct - gap, safeStart);

                            const start = getCoordinatesForPercent(safeStart, 84);
                            const end = getCoordinatesForPercent(safeEnd, 84);
                            const largeArcFlag = slice.percent > 50 ? 1 : 0;
                            const pathData = `M ${start.x} ${start.y} A 84 84 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;

                            return (
                              <path
                                key={i}
                                d={pathData}
                                fill="none"
                                stroke={slice.color}
                                strokeWidth={isHovered ? 28 : 22}
                                strokeLinecap="butt"
                                opacity={isDimmed ? 0.35 : 1}
                                className="transition-all duration-200 cursor-pointer"
                                onMouseEnter={() => setHoveredSupplierIdx(i)}
                                onMouseLeave={() => setHoveredSupplierIdx(null)}
                              >
                                <title>{`${slice.name}: ${slice.percent.toFixed(1)}% (${formatCOP(slice.totalCOP)})`}</title>
                              </path>
                            );
                          })}
                        </svg>

                        {/* Centro del Donut Reactivo e Impecable (Con diámetro libre amplio de 142px) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                          {activeItem ? (
                            <div className="space-y-0.5 animate-in fade-in duration-150">
                              <span
                                className="text-2xl font-black font-mono tracking-tight block"
                                style={{ color: activeItem.color }}
                              >
                                {activeItem.percent.toFixed(1)}%
                              </span>
                              <span className="text-xs font-bold text-slate-900 font-mono block leading-tight">
                                {formatCOP(activeItem.totalCOP)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 block truncate max-w-[125px] mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                                {activeItem.name}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5 animate-in fade-in duration-150">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Proveedores
                              </span>
                              <span className="text-sm sm:text-base font-black text-slate-900 font-mono tracking-tight block leading-tight">
                                {topSuppliers.length} aliados
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 font-mono block">
                                100% cuota
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tarjetas de Proveedores con Ranking y Valores Exactos */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {slices.map((supp, index) => {
                        const isHovered = hoveredSupplierIdx === index;
                        const isDimmed = hoveredSupplierIdx !== null && !isHovered;

                        return (
                          <div
                            key={supp.id}
                            onMouseEnter={() => setHoveredSupplierIdx(index)}
                            onMouseLeave={() => setHoveredSupplierIdx(null)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                              isHovered
                                ? 'bg-white border-slate-300 shadow-md ring-2 ring-emerald-100 scale-[1.01]'
                                : 'bg-slate-50/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                            } ${isDimmed ? 'opacity-50' : 'opacity-100'}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span
                                  className="w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs"
                                  style={{ backgroundColor: supp.color }}
                                >
                                  {index + 1}
                                </span>
                                <div className="truncate">
                                  <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                    {supp.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {supp.count} {supp.count === 1 ? 'orden registrada' : 'órdenes registradas'}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs sm:text-sm font-black font-mono text-slate-900">
                                  {formatCOP(supp.totalCOP)}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {formatUSD(Number((supp.totalCOP / trm).toFixed(2)))}
                                </div>
                              </div>
                            </div>

                            {/* Barra de Progreso del Proveedor */}
                            <div className="space-y-1">
                              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(4, supp.percent)}%`,
                                    backgroundColor: supp.color,
                                  }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>Participación en compras</span>
                                <span className="font-bold text-slate-700">{supp.percent.toFixed(1)}% del volumen</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

      </div>

      {/* RESUMEN DETALLADO DE ÓRDENES EN EL PERÍODO */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Listado de Órdenes del Período ({filteredOrders.length})</h4>
            <p className="text-xs text-slate-500">Registro auditable con fecha, proveedor, proyecto e importe en COP y USD</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                <th className="py-2.5 px-3">N° Orden</th>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Proveedor</th>
                <th className="py-2.5 px-3">Imputación (Destino)</th>
                <th className="py-2.5 px-3">Estado Almacén</th>
                <th className="py-2.5 px-3 text-right">Total COP</th>
                <th className="py-2.5 px-3 text-right">Total USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((po) => {
                const totalCOP =
                  po.totalAmountCOP ||
                  (po.totalAmountUSD ? Math.round(po.totalAmountUSD * trm) : 0) ||
                  (po.items || []).reduce((acc, it) => acc + (it.orderedQty || it.qty || 0) * (it.unitPriceCOP || 0), 0);
                const totalUSD = totalCOP > 0 ? Number((totalCOP / trm).toFixed(2)) : 0;

                return (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#003650]">{po.orderNumber}</td>
                    <td className="py-2.5 px-3 text-slate-500">{po.date || '—'}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{po.supplierName}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {po.projectCode || 'Oficina'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          po.status === 'received'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {po.status === 'received' ? 'En Bodega' : 'En Tránsito'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCOP(totalCOP)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {formatUSD(totalUSD)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
