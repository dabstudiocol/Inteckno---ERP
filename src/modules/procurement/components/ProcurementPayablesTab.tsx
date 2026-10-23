import React, { useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  Eye,
  Check,
  CreditCard,
  AlertCircle,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { PurchaseOrder, Partner, Project } from '../../../types';
import { LightTable } from '../../../components/ui/LightTable';
import { formatCOP, formatUSD } from '../../../core/services/trmService';

interface Props {
  purchaseOrders: PurchaseOrder[];
  partners: Partner[];
  projects: Project[];
  currentTrm: number;
  onSelectPo: (po: PurchaseOrder) => void;
  onUpdatePo: (poId: string, updates: Partial<PurchaseOrder>) => void;
}

export const ProcurementPayablesTab: React.FC<Props> = ({
  purchaseOrders,
  partners,
  projects,
  currentTrm,
  onSelectPo,
  onUpdatePo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [termFilter, setTermFilter] = useState<'all' | 'contado' | 'anticipo' | 'credito'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [payingPo, setPayingPo] = useState<PurchaseOrder | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentDateInput, setPaymentDateInput] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filtrar POs no rechazadas
  const validPOs = purchaseOrders.filter((po) => po.status !== 'rejected');

  // Cálculos de Cuentas por Pagar
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const payablesList = validPOs.filter((po) => {
    // Si statusFilter es 'paid', mostramos las pagadas
    if (statusFilter === 'paid') {
      return po.paymentStatus === 'paid';
    }
    // Por defecto mostramos las que tienen saldo pendiente
    const isPaid = po.paymentStatus === 'paid';
    if (statusFilter === 'overdue') {
      if (isPaid) return false;
      if (!po.paymentDueDate) return false;
      return po.paymentDueDate < todayStr;
    }
    if (statusFilter === 'pending') {
      return !isPaid;
    }
    return !isPaid; // Default
  });

  // Métricas Consolidadas
  const totalDebtCOP = validPOs
    .filter((po) => po.paymentStatus !== 'paid')
    .reduce((sum, po) => sum + Math.max(0, (po.totalAmountCOP || 0) - (po.paidAmountCOP || 0)), 0);

  const overduePOs = validPOs.filter((po) => {
    if (po.paymentStatus === 'paid') return false;
    return po.paymentDueDate && po.paymentDueDate < todayStr;
  });
  const totalOverdueDebtCOP = overduePOs.reduce(
    (sum, po) => sum + Math.max(0, (po.totalAmountCOP || 0) - (po.paidAmountCOP || 0)),
    0
  );

  const dueSoonPOs = validPOs.filter((po) => {
    if (po.paymentStatus === 'paid') return false;
    if (!po.paymentDueDate) return false;
    const diffDays = Math.ceil((new Date(po.paymentDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  });

  // Filtrado por búsqueda y tipo de plazo
  const filteredList = payablesList.filter((po) => {
    if (termFilter !== 'all' && (po.paymentTermType || 'credito') !== termFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNumber = (po.orderNumber || '').toLowerCase().includes(q);
      const matchSupplier = (po.supplierName || '').toLowerCase().includes(q);
      const matchProject = (po.projectCode || '').toLowerCase().includes(q);
      const matchSolped = (po.solpedNumber || '').toLowerCase().includes(q);
      if (!matchNumber && !matchSupplier && !matchProject && !matchSolped) return false;
    }
    return true;
  });

  const handleOpenPaymentModal = (po: PurchaseOrder) => {
    setPayingPo(po);
    const balance = Math.max(0, (po.totalAmountCOP || 0) - (po.paidAmountCOP || 0));
    setPaymentAmountInput(balance);
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPo) return;
    const currentPaid = payingPo.paidAmountCOP || 0;
    const newPaid = currentPaid + paymentAmountInput;
    const isFullyPaid = newPaid >= (payingPo.totalAmountCOP || 0);

    onUpdatePo(payingPo.id, {
      paidAmountCOP: newPaid,
      paymentStatus: isFullyPaid ? 'paid' : 'advance_paid',
      notes: `${payingPo.notes || ''} [Pago registrado el ${paymentDateInput}: ${formatCOP(paymentAmountInput)}]`.trim(),
    });

    setPayingPo(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. TARJETAS DE CONTROL FINANCIERO DE CARTERA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Cartera por Pagar</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#00668F]">
              <DollarSign size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(totalDebtCOP)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ≈ {formatUSD(totalDebtCOP / currentTrm)} USD • {validPOs.filter((p) => p.paymentStatus !== 'paid').length} facturas pendientes
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Facturas Vencidas</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle size={14} />
            </span>
          </div>
          <div className="text-base font-black text-rose-700 truncate">{formatCOP(totalOverdueDebtCOP)}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
            {overduePOs.length} órdenes vencidas que requieren pago urgente
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Por Vencer (15 Días)</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock size={14} />
            </span>
          </div>
          <div className="text-base font-black text-amber-800 truncate">
            {dueSoonPOs.length} Facturas
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">
            Programación de tesorería y flujo de caja quincenal
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Cruce de 3 Vías</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={14} />
            </span>
          </div>
          <div className="text-base font-black text-emerald-800 truncate">
            {validPOs.filter((p) => p.threeWayMatchStatus === 'matched').length} Conciliadas
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">
            OC + Remisión de Almacén + Factura Aprobada
          </div>
        </div>
      </div>

      {/* 2. FILTROS Y BÚSQUEDA */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° OC, # SOLPED, proveedor o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Filtro por Plazo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'contado', 'anticipo', 'credito'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTermFilter(t)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all capitalize ${
                  termFilter === t ? 'bg-[#003650] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'Todos los Plazos' : t}
              </button>
            ))}
          </div>

          {/* Filtro por Estado */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['pending', 'overdue', 'paid'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  statusFilter === s ? 'bg-[#003650] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'pending' ? 'Por Pagar' : s === 'overdue' ? 'Vencidas' : 'Pagadas 100%'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TABLA DE CUENTAS POR PAGAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cuentas por Pagar & Programación de Tesorería ({filteredList.length} Facturas)
            </h3>
            <p className="text-[11px] text-slate-500">
              Matriz corporativa de vencimientos, anticipos y compromisos con proveedores
            </p>
          </div>
        </div>

        <LightTable
          data={filteredList}
          keyExtractor={(po) => po.id}
          onRowClick={(po) => onSelectPo(po)}
          columns={[
            {
              key: 'orderNumber',
              header: 'N° Orden / # SOLPED',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-[#003650] font-mono flex items-center gap-1">
                    <span>{po.orderNumber}</span>
                    {po.exchangeRateAlert && (
                      <span className="text-[8px] px-1 bg-amber-100 text-amber-800 rounded font-bold">TRM</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {po.solpedNumber ? `# SOLPED: ${po.solpedNumber}` : `Emisión: ${po.date}`}
                  </div>
                </div>
              ),
            },
            {
              key: 'supplier',
              header: 'Proveedor / Imputación',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{po.supplierName}</div>
                  <div className="text-[11px] text-slate-500">
                    {po.projectCode ? `Proyecto: ${po.projectCode}` : 'Gasto General / Oficina'}
                  </div>
                </div>
              ),
            },
            {
              key: 'paymentTermType',
              header: 'Condición de Pago',
              render: (po) => {
                const term = po.paymentTermType || 'credito';
                return (
                  <div>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      term === 'contado' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : term === 'anticipo'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {term === 'contado' ? 'Contado' : term === 'anticipo' ? 'Anticipo 50%' : 'Crédito'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {po.paymentTerms || '30 días F/F'}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'dueDate',
              header: 'Vencimiento Factura',
              render: (po) => {
                if (!po.paymentDueDate) {
                  return <span className="text-[11px] text-slate-400 italic">Sin fecha pactada</span>;
                }
                const isOverdue = po.paymentDueDate < todayStr && po.paymentStatus !== 'paid';
                return (
                  <div>
                    <div className={`font-mono text-xs font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      {po.paymentDueDate}
                    </div>
                    {isOverdue && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                        VENCIDA
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'amounts',
              header: 'Total / Saldo Pendiente',
              align: 'right',
              render: (po) => {
                const total = po.totalAmountCOP || 0;
                const paid = po.paidAmountCOP || 0;
                const balance = Math.max(0, total - paid);
                return (
                  <div className="text-right">
                    <div className="font-mono text-xs font-black text-slate-900">
                      {formatCOP(total)}
                    </div>
                    <div className={`font-mono text-[11px] font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Saldo: {formatCOP(balance)}
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'Acciones',
              align: 'right',
              render: (po) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {po.paymentStatus !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(po)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Registrar Abono o Pago Total"
                    >
                      <CreditCard size={12} />
                      <span>Pagar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectPo(po)}
                    className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Ver detalle de la orden"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL REGISTRAR PAGO */}
      {payingPo && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registrar Pago a Proveedor</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {payingPo.orderNumber} • {payingPo.supplierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingPo(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Valor Total OC:</span>
                  <span className="font-mono font-bold">{formatCOP(payingPo.totalAmountCOP || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ya Pagado:</span>
                  <span className="font-mono">{formatCOP(payingPo.paidAmountCOP || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
                  <span>Saldo por Liquidar:</span>
                  <span className="font-mono text-rose-600">
                    {formatCOP(Math.max(0, (payingPo.totalAmountCOP || 0) - (payingPo.paidAmountCOP || 0)))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto a Pagar (COP) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Math.max(0, (payingPo.totalAmountCOP || 0) - (payingPo.paidAmountCOP || 0))}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha de Transferencia / Pago *</label>
                <input
                  type="date"
                  required
                  value={paymentDateInput}
                  onChange={(e) => setPaymentDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingPo(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
