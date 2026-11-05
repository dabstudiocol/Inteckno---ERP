import React, { useMemo } from 'react';
import {
  TrendingUp,
  FolderKanban,
  ShoppingCart,
  Package,
  Clock,
  Receipt,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { formatCOP, formatUSD } from '../../core/services/trmService';
import { Project, Opportunity } from '../../types';

interface DocumentFlowBarProps {
  projectId?: string;
  projectCode?: string;
  className?: string;
  compact?: boolean;
}

export const DocumentFlowBar: React.FC<DocumentFlowBarProps> = ({
  projectId,
  projectCode,
  className = '',
  compact = false,
}) => {
  const {
    projects,
    opportunities,
    requisitions,
    purchaseOrders,
    timesheets,
    setActiveModule,
  } = useErp();

  // Resolver el proyecto activo
  const activeProject: Project | undefined = useMemo(() => {
    if (projectId) return projects.find((p) => p.id === projectId);
    if (projectCode) return projects.find((p) => p.code === projectCode);
    return projects[0];
  }, [projects, projectId, projectCode]);

  if (!activeProject) return null;

  // 1. Oportunidad Comercial vinculada
  const linkedOpportunity: Opportunity | undefined = useMemo(() => {
    if (activeProject.opportunityId) {
      const match = opportunities.find((o) => o.id === activeProject.opportunityId);
      if (match) return match;
    }
    return opportunities.find(
      (o) =>
        (o.awardedProjectId && o.awardedProjectId === activeProject.id) ||
        (o.code && o.code === activeProject.code) ||
        (o.title && o.title.toLowerCase().includes(activeProject.code.toLowerCase()))
    );
  }, [opportunities, activeProject]);

  // 2. SOLPEDs vinculadas
  const linkedRequisitions = useMemo(() => {
    return requisitions.filter(
      (r) =>
        r.projectId === activeProject.id ||
        (r.projectCode && r.projectCode === activeProject.code)
    );
  }, [requisitions, activeProject]);

  const reqApprovedCount = linkedRequisitions.filter((r) => r.status === 'approved').length;
  const reqPendingCount = linkedRequisitions.filter((r) => r.status === 'submitted' || r.status === 'pending_wilson_approval').length;

  // 3. Órdenes de Compra vinculadas
  const linkedPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) =>
        po.projectId === activeProject.id ||
        (po.projectCode && po.projectCode === activeProject.code)
    );
  }, [purchaseOrders, activeProject]);

  const totalPoCOP = linkedPOs.reduce((acc, po) => acc + (po.totalAmountCOP || 0), 0);
  const poReceivedCount = linkedPOs.filter((po) => po.status === 'received' || po.physicalReceiptDone).length;

  // 4. Horas de Campo (WBS / HH)
  const linkedTimesheets = useMemo(() => {
    const globalTs = timesheets.filter(
      (t) =>
        t.projectId === activeProject.id ||
        (t.projectCode && t.projectCode === activeProject.code)
    );
    const prjTs = (activeProject as any).timesheetEntries || [];
    const merged = [...globalTs];
    prjTs.forEach((pt: any) => {
      if (!merged.some((m) => m.id === pt.id)) {
        merged.push(pt);
      }
    });
    return merged;
  }, [timesheets, activeProject]);

  const totalHours = linkedTimesheets.reduce((acc, t) => acc + (Number(t.hours) || 0), 0);
  const totalLaborCost = linkedTimesheets.reduce(
    (acc, t) => acc + ((Number(t.hours) || 0) * (Number(t.hourlyRateCOP) || 0)),
    0
  );

  // 5. Facturación e Hitos vinculados
  const billingItems = (activeProject.billingItems || []) as any[];
  const totalInvoiced = activeProject.totalInvoiced ||
    billingItems.reduce((acc, b) => acc + (b.grandTotal || b.subtotal || 0), 0);

  const billedMilestonesCount = billingItems.filter((b) => b.status === 'paid' || b.status === 'invoiced').length;

  const progressPercent = activeProject.budgetPV > 0
    ? Math.min(100, Math.round((activeProject.earnedValueEV / activeProject.budgetPV) * 100))
    : ((activeProject as any).progress || 0);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all ${className}`}
      style={{ fontFamily: "'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* Cabecera del Hilo Conductor */}
      <div className="bg-[#0A1620] px-4 py-2 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-black tracking-wider uppercase text-slate-300 truncate">
            Autopista de Negocio (Document Flow):
          </span>
          <span className="text-xs font-bold text-sky-400 font-mono truncate">
            {activeProject.code} • {activeProject.name}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 hidden sm:block font-medium">
          Cliente: <strong className="text-white">{activeProject.clientName}</strong>
        </div>
      </div>

      {/* Tarjetas de Trazabilidad Conectadas */}
      <div className="p-3 sm:p-3.5 overflow-x-auto scrollbar-none">
        <div className="flex items-stretch gap-2.5 min-w-max">
          
          {/* NODO 1: Oportunidad Comercial */}
          <div className="w-56 bg-slate-50 hover:bg-sky-50/50 p-3 rounded-xl border border-slate-200/80 hover:border-sky-300 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-sky-700">
                <TrendingUp size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">1. Comercial</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('crm')}
                className="text-[10px] text-sky-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Abrir en CRM"
              >
                <span>Ver CRM</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              {linkedOpportunity ? (
                <>
                  <div className="text-xs font-bold text-slate-900 truncate" title={linkedOpportunity.title}>
                    {linkedOpportunity.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {formatCOP(linkedOpportunity.estimatedValue || linkedOpportunity.estimatedValueUSD * 4000 || 0)}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Adjudicado / Ganado
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Proyecto directo de operaciones
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center text-slate-300 font-bold shrink-0">➔</div>

          {/* NODO 2: Proyecto Central (WBS & EVM) */}
          <div className="w-60 bg-emerald-50/40 hover:bg-emerald-50 p-3 rounded-xl border border-emerald-200 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/60">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <FolderKanban size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">2. Proyecto STC</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('proyectos')}
                className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>WBS / Costos</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 font-mono">{activeProject.code}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  {progressPercent}% Avance
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Costo Real (AC):</span>
                <strong className="text-slate-800 font-mono">{formatCOP(activeProject.actualCostAC || 0)}</strong>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between">
                <span>Presupuesto (PV):</span>
                <strong className="text-slate-800 font-mono">{formatCOP(activeProject.budgetPV || 0)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center text-slate-300 font-bold shrink-0">➔</div>

          {/* NODO 3: Requisiciones (SOLPED) */}
          <div className="w-56 bg-slate-50 hover:bg-amber-50/40 p-3 rounded-xl border border-slate-200/80 hover:border-amber-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-amber-800">
                <ShoppingCart size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">3. SOLPEDs</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('requisiciones')}
                className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver ({linkedRequisitions.length})</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              <div className="text-xs font-bold text-slate-900">
                {linkedRequisitions.length === 0 ? 'Sin SOLPEDs aún' : `${linkedRequisitions.length} Solicitud(es)`}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                <span className="text-emerald-700 font-semibold">{reqApprovedCount} Aprobadas</span>
                {reqPendingCount > 0 && (
                  <span className="text-amber-700 font-semibold">{reqPendingCount} En trámite</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModule('requisiciones');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('inteckno:create-solped-for-project', { detail: { project: activeProject } })
                    );
                  }, 80);
                }}
                className="mt-2 w-full py-1 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={11} />
                <span>+ Pedir Materiales</span>
              </button>
            </div>
          </div>

          <div className="flex items-center text-slate-300 font-bold shrink-0">➔</div>

          {/* NODO 4: Órdenes de Compra (Procurement) */}
          <div className="w-60 bg-slate-50 hover:bg-indigo-50/40 p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-indigo-800">
                <Package size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">4. Compras (OC)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('compras')}
                className="text-[10px] text-indigo-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver Compras</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{linkedPOs.length} Órdenes</span>
                <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded-md">
                  {poReceivedCount}/{linkedPOs.length} Recibidas
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Compromiso Total:</span>
                <strong className="text-slate-800 font-mono">{formatCOP(totalPoCOP)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center text-slate-300 font-bold shrink-0">➔</div>

          {/* NODO 5: Horas de Campo & Mano de Obra */}
          <div className="w-56 bg-slate-50 hover:bg-purple-50/40 p-3 rounded-xl border border-slate-200/80 hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-purple-800">
                <Clock size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">5. Horas (HH)</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('registro-horas')}
                className="text-[10px] text-purple-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Ver Horas</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{totalHours} Horas</span>
                <span className="text-[10px] font-mono text-purple-700 font-bold">
                  {linkedTimesheets.length} registros
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Costo Mano Obra:</span>
                <strong className="text-slate-800 font-mono">{formatCOP(totalLaborCost)}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center text-slate-300 font-bold shrink-0">➔</div>

          {/* NODO 6: Facturación & Cierre de Hito */}
          <div className="w-56 bg-slate-50 hover:bg-teal-50/40 p-3 rounded-xl border border-slate-200/80 hover:border-teal-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5 text-teal-800">
                <Receipt size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">6. Facturación</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule('contabilidad')}
                className="text-[10px] text-teal-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Facturas</span>
                <ArrowRight size={11} />
              </button>
            </div>
            <div className="my-2 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {billingItems.length} Hitos
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded-md">
                  {billedMilestonesCount} Facturados
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                <span>Facturado Total:</span>
                <strong className="text-slate-800 font-mono">{formatCOP(totalInvoiced)}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
