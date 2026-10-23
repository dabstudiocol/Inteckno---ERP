import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  Building2,
  DollarSign,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ArrowUpDown,
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
}

export const ProcurementCorporateMatrixTab: React.FC<Props> = ({
  purchaseOrders,
  partners,
  projects,
  currentTrm,
  onSelectPo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<string>('all');

  // Cálculo de Semanas Únicas
  const weeksList = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.weekOfYear) {
        set.add(`Semana ${po.weekOfYear}`);
      } else if (po.date) {
        // Calcular número de semana ISO aproximada
        const d = new Date(po.date);
        const start = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
        set.add(`Semana ${weekNum}`);
      }
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });
  }, [purchaseOrders]);

  // Filtrado de POs
  const filteredList = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedProject !== 'all' && po.projectCode !== selectedProject) {
        return false;
      }
      if (selectedPaymentStatus !== 'all' && po.paymentStatus !== selectedPaymentStatus) {
        return false;
      }
      if (selectedDeliveryStatus !== 'all') {
        const deliv = po.deliveryStatus || (po.status === 'received' ? 'entregado' : 'pendiente');
        if (deliv !== selectedDeliveryStatus) return false;
      }
      if (selectedWeek !== 'all') {
        const poWeekStr = po.weekOfYear ? `Semana ${po.weekOfYear}` : '';
        if (poWeekStr !== selectedWeek) {
          // Intentar calcular
          const d = new Date(po.date);
          const start = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
          if (`Semana ${weekNum}` !== selectedWeek) return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNum = (po.orderNumber || '').toLowerCase().includes(q);
        const matchSolped = (po.solpedNumber || '').toLowerCase().includes(q);
        const matchSup = (po.supplierName || '').toLowerCase().includes(q);
        const matchProj = (po.projectCode || '').toLowerCase().includes(q);
        const matchReq = (po.requesterName || '').toLowerCase().includes(q);
        const matchNotes = (po.notes || '').toLowerCase().includes(q);
        const matchItems = po.items?.some((it) => (it.name || '').toLowerCase().includes(q)) || false;
        if (!matchNum && !matchSolped && !matchSup && !matchProj && !matchReq && !matchNotes && !matchItems) {
          return false;
        }
      }

      return true;
    });
  }, [purchaseOrders, selectedWeek, selectedProject, selectedPaymentStatus, selectedDeliveryStatus, searchTerm]);

  // Exportar a CSV (Matriz Excel BD COMPRAS)
  const handleExportCSV = () => {
    const headers = [
      'Semana',
      'Fecha Solicitud',
      'SOLPED',
      'Nro Orden Compra',
      'Proveedor',
      'NIT Proveedor',
      'Solicitante',
      'Centro de Costos / Proyecto',
      'Rubro de Gasto',
      'Concepto / Insumos',
      'Moneda',
      'Total COP',
      'Total USD',
      'Forma de Pago',
      'Vencimiento Factura',
      'Estado Pago',
      'Valor Pagado COP',
      'Saldo Pendiente COP',
      'Estado Entrega',
      'Transportadora',
      'Nro Guia',
      'Notas',
    ];

    const rows = filteredList.map((po) => {
      const d = new Date(po.date);
      const start = new Date(d.getFullYear(), 0, 1);
      const weekNum = po.weekOfYear || Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
      const totalCOP = po.totalAmountCOP || 0;
      const paidCOP = po.paidAmountCOP || (po.paymentStatus === 'paid' ? totalCOP : 0);
      const balanceCOP = Math.max(0, totalCOP - paidCOP);
      const itemConcepts = po.items?.map((i) => `${i.qty}x ${i.name}`).join('; ') || po.notes || 'Insumo general';

      return [
        `Semana ${weekNum}`,
        po.date,
        po.solpedNumber || 'S/N',
        po.orderNumber,
        `"${(po.supplierName || '').replace(/"/g, '""')}"`,
        po.supplierTaxId || 'S/N',
        `"${(po.requesterName || 'Wilson Alzate').replace(/"/g, '""')}"`,
        po.projectCode || 'General / Oficina',
        po.costCategory || 'Repuestos / Fabricación',
        `"${itemConcepts.replace(/"/g, '""')}"`,
        po.currency || 'COP',
        totalCOP,
        po.totalAmountUSD || Math.round(totalCOP / currentTrm),
        po.paymentTermType || 'Crédito 30 días',
        po.paymentDueDate || 'S/N',
        po.paymentStatus || 'pending',
        paidCOP,
        balanceCOP,
        po.deliveryStatus || (po.status === 'received' ? 'entregado' : 'pendiente'),
        po.carrierName || 'Envía Colvanes',
        po.trackingNumber || 'S/N',
        `"${(po.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BD_COMPRAS_INTECKNO_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalFilteredCOP = filteredList.reduce((acc, po) => acc + (po.totalAmountCOP || 0), 0);
  const totalFilteredPaidCOP = filteredList.reduce((acc, po) => acc + (po.paidAmountCOP || (po.paymentStatus === 'paid' ? (po.totalAmountCOP || 0) : 0)), 0);

  return (
    <div className="space-y-4">
      {/* 1. CABECERA & ACCIÓN DE DESCARGA EXCEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <FileSpreadsheet size={16} />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz Consolidada de Compras (BD COMPRAS)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Réplica interactiva del libro corporativo de compras: 25 columnas de trazabilidad financiera, presupuestal y logística
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <Download size={14} />
          <span>Exportar a Excel (CSV)</span>
        </button>
      </div>

      {/* 2. BARRA DE FILTROS MULTICRITERIO */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
        {/* Búsqueda */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en la matriz..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-[#00668F]"
          />
        </div>

        {/* Filtro por Semana */}
        <div>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">Todas las Semanas</option>
            {weeksList.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Proyecto */}
        <div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.code}>{p.code} — {p.clientName}</option>
            ))}
          </select>
        </div>

        {/* Filtro por Pago */}
        <div>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">Estado de Pago: Todos</option>
            <option value="pending">Pendiente de Pago</option>
            <option value="advance_paid">Anticipo Pagado</option>
            <option value="paid">Pagado 100%</option>
          </select>
        </div>

        {/* Filtro por Entrega */}
        <div>
          <select
            value={selectedDeliveryStatus}
            onChange={(e) => setSelectedDeliveryStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs"
          >
            <option value="all">Estado Entrega: Todos</option>
            <option value="pendiente">Por Despachar</option>
            <option value="en_transito">En Tránsito</option>
            <option value="entregado">Entregado en Bodega</option>
          </select>
        </div>
      </div>

      {/* 3. RESUMEN FINANCIERO DE LA VISTA */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Registros mostrados: <strong className="text-slate-800">{filteredList.length}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Total Comprado: <strong className="text-slate-900 font-mono">{formatCOP(totalFilteredCOP)}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Total Pagado: <strong className="text-emerald-700 font-mono">{formatCOP(totalFilteredPaidCOP)}</strong></span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">Saldo Cartera: <strong className="text-rose-600 font-mono">{formatCOP(Math.max(0, totalFilteredCOP - totalFilteredPaidCOP))}</strong></span>
        </div>
      </div>

      {/* 4. TABLA CONSOLIDADA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5">
        <LightTable
          data={filteredList}
          keyExtractor={(po) => po.id}
          onRowClick={(po) => onSelectPo(po)}
          columns={[
            {
              key: 'week',
              header: 'Semana / Fecha',
              render: (po) => {
                const d = new Date(po.date);
                const start = new Date(d.getFullYear(), 0, 1);
                const weekNum = po.weekOfYear || Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
                return (
                  <div>
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#003650] font-mono font-bold text-[10px]">
                      Sem {weekNum}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{po.date}</div>
                  </div>
                );
              },
            },
            {
              key: 'orderAndSolped',
              header: 'N° OC & # SOLPED',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-[#003650] font-mono">{po.orderNumber}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {po.solpedNumber ? `# SOLPED: ${po.solpedNumber}` : 'Sin SOLPED'}
                  </div>
                </div>
              ),
            },
            {
              key: 'supplier',
              header: 'Proveedor & NIT',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{po.supplierName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    NIT: {po.supplierTaxId || 'Identificado'}
                  </div>
                </div>
              ),
            },
            {
              key: 'projectAndRequester',
              header: 'Proyecto & Solicitante',
              render: (po) => (
                <div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px] font-mono">
                    {po.projectCode || 'General'}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                    {po.requesterName || 'Wilson Alzate'}
                  </div>
                </div>
              ),
            },
            {
              key: 'concepts',
              header: 'Insumos / Rubro',
              render: (po) => (
                <div className="text-xs">
                  <div className="font-semibold text-slate-800 line-clamp-1">
                    {po.items?.[0]?.name || po.notes || 'Insumo de compra'}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    {po.items && po.items.length > 1 ? `+${po.items.length - 1} ítems más` : '1 ítem'}
                  </div>
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Valor Total COP',
              align: 'right',
              render: (po) => (
                <div className="text-right">
                  <div className="font-mono text-xs font-black text-slate-900">
                    {formatCOP(po.totalAmountCOP || 0)}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    ≈ {formatUSD(po.totalAmountUSD || (po.totalAmountCOP || 0) / currentTrm)} USD
                  </div>
                </div>
              ),
            },
            {
              key: 'paymentStatus',
              header: 'Estado de Pago',
              align: 'center',
              render: (po) => {
                if (po.paymentStatus === 'paid') {
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      Pagado 100%
                    </span>
                  );
                }
                if (po.paymentStatus === 'advance_paid') {
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                      Anticipo Pagado
                    </span>
                  );
                }
                return (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Por Pagar
                  </span>
                );
              },
            },
            {
              key: 'deliveryStatus',
              header: 'Entrega en Almacén',
              align: 'center',
              render: (po) => {
                const deliv = po.deliveryStatus || (po.status === 'received' ? 'entregado' : 'pendiente');
                if (deliv === 'entregado') {
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      En Almacén
                    </span>
                  );
                }
                if (deliv === 'en_transito' || po.trackingNumber) {
                  return (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                      En Tránsito
                    </span>
                  );
                }
                return (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    Pendiente
                  </span>
                );
              },
            },
            {
              key: 'actions',
              header: 'Acción',
              align: 'right',
              render: (po) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPo(po);
                  }}
                  className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                  title="Ver detalle"
                >
                  <Eye size={13} />
                </button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
