import React, { useState } from 'react';
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  Building2,
  Calendar,
  Layers,
  MapPin,
} from 'lucide-react';
import { PurchaseOrder, Partner, Project } from '../../../types';
import { LightTable } from '../../../components/ui/LightTable';
import { formatCOP } from '../../../core/services/trmService';

interface Props {
  purchaseOrders: PurchaseOrder[];
  partners: Partner[];
  projects: Project[];
  onSelectPo: (po: PurchaseOrder) => void;
  onUpdatePo: (poId: string, updates: Partial<PurchaseOrder>) => void;
}

export const ProcurementPendingDeliveryTab: React.FC<Props> = ({
  purchaseOrders,
  partners,
  projects,
  onSelectPo,
  onUpdatePo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_transit' | 'delayed'>('all');
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receivedDateInput, setReceivedDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receivedWarehouse, setReceivedWarehouse] = useState<string>('BOD-MED-01');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtrar órdenes pendientes de recepción física
  const pendingList = purchaseOrders.filter((po) => {
    if (po.status === 'rejected' || po.status === 'received') return false;
    if (po.deliveryStatus === 'entregado') return false;
    return true;
  });

  // Métricas
  const inTransitCount = pendingList.filter((po) => po.deliveryStatus === 'en_transito' || Boolean(po.trackingNumber)).length;
  const delayedCount = pendingList.filter((po) => po.estimatedArrivalDate && po.estimatedArrivalDate < todayStr).length;
  const pendingDispatchCount = pendingList.filter((po) => !po.trackingNumber && po.deliveryStatus !== 'en_transito').length;

  // Filtrado
  const filteredList = pendingList.filter((po) => {
    const isDelayed = po.estimatedArrivalDate && po.estimatedArrivalDate < todayStr;
    if (statusFilter === 'delayed' && !isDelayed) return false;
    if (statusFilter === 'in_transit' && !(po.deliveryStatus === 'en_transito' || po.trackingNumber)) return false;
    if (statusFilter === 'pending' && (po.deliveryStatus === 'en_transito' || po.trackingNumber)) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = (po.orderNumber || '').toLowerCase().includes(q);
      const matchSup = (po.supplierName || '').toLowerCase().includes(q);
      const matchProj = (po.projectCode || '').toLowerCase().includes(q);
      const matchGuide = (po.trackingNumber || '').toLowerCase().includes(q);
      const matchSolped = (po.solpedNumber || '').toLowerCase().includes(q);
      if (!matchNum && !matchSup && !matchProj && !matchGuide && !matchSolped) return false;
    }
    return true;
  });

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    onUpdatePo(receivingPo.id, {
      deliveryStatus: 'entregado',
      deliveryDate: receivedDateInput,
      physicalReceiptDone: true,
      status: 'received',
      notes: `${receivingPo.notes || ''} [Recepción física confirmada en ${receivedWarehouse} el ${receivedDateInput}]`.trim(),
    });

    setReceivingPo(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. TARJETAS DE SEGUIMIENTO LOGÍSTICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Pendientes de Entrada</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-[#00668F]">
              <Package size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{pendingList.length} Pedidos</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Compras aprobadas y pagadas pendientes de recibir en bodega
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-blue-700 uppercase">En Tránsito con Guía</span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Truck size={14} />
            </span>
          </div>
          <div className="text-base font-black text-blue-800 truncate">{inTransitCount} En Ruta</div>
          <div className="text-[10px] text-blue-700 mt-0.5">
            Transportadora asignada con número de guía de rastreo
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Por Despachar (Fábrica)</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock size={14} />
            </span>
          </div>
          <div className="text-base font-black text-amber-800 truncate">{pendingDispatchCount} En Alistamiento</div>
          <div className="text-[10px] text-amber-700 mt-0.5">
            Pendiente confirmación de despacho por el proveedor
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase">Entregas Retrasadas</span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle size={14} />
            </span>
          </div>
          <div className="text-base font-black text-rose-700 truncate">{delayedCount} Críticas</div>
          <div className="text-[10px] text-rose-600 mt-0.5">
            Han superado la fecha límite prometida por el fabricante
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
              placeholder="Buscar por N° OC, # SOLPED, proveedor, guía o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          {(['all', 'pending', 'in_transit', 'delayed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all capitalize ${
                statusFilter === s ? 'bg-[#003650] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'pending' ? 'Por Despachar' : s === 'in_transit' ? 'En Tránsito' : 'Retrasados'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. TABLA DE ENTREGAS PENDIENTES */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Seguimiento Logístico de Recepción Física ({filteredList.length} Pedidos)
            </h3>
            <p className="text-[11px] text-slate-500">
              Monitoreo de guías de transportadoras, aduana y confirmación de ingreso al Kardex
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
                  <div className="font-bold text-xs text-[#003650] font-mono">
                    {po.orderNumber}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {po.solpedNumber ? `# SOLPED: ${po.solpedNumber}` : `Emisión: ${po.date}`}
                  </div>
                </div>
              ),
            },
            {
              key: 'supplier',
              header: 'Proveedor / Destino',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{po.supplierName}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span>{po.projectCode || 'Almacén Central Poblado'}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'deliveryDates',
              header: 'Fecha Prometida',
              render: (po) => {
                if (!po.estimatedArrivalDate) {
                  return <span className="text-[11px] text-slate-400 italic">No especificada</span>;
                }
                const isDelayed = po.estimatedArrivalDate < todayStr;
                return (
                  <div>
                    <div className={`font-mono text-xs font-bold ${isDelayed ? 'text-rose-600' : 'text-slate-800'}`}>
                      {po.estimatedArrivalDate}
                    </div>
                    {isDelayed && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                        RETRASADA
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'logistics',
              header: 'Transportadora & Guía',
              render: (po) => (
                <div>
                  <div className="font-bold text-xs text-slate-800">
                    {po.carrierName || 'Envía / TCC / Coordinadora'}
                  </div>
                  {po.trackingNumber ? (
                    <div className="text-[11px] text-[#00668F] font-mono font-semibold">
                      Guía: {po.trackingNumber}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-700 italic">
                      Sin guía asignada
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'itemsSummary',
              header: 'Ítems por Recibir',
              render: (po) => (
                <div className="text-xs">
                  <span className="font-bold text-slate-800">{po.items?.length || 1} renglones</span>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {po.items?.[0]?.name || 'Insumo / Repuesto'}
                  </div>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              align: 'right',
              render: (po) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setReceivingPo(po);
                      setReceivedDateInput(todayStr);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    title="Confirmar Entrada en Almacén"
                  >
                    <CheckCircle2 size={12} />
                    <span>Recibir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPo(po)}
                    className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    title="Ver detalle"
                  >
                    <Eye size={13} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* MODAL CONFIRMAR RECEPCIÓN EN BODEGA */}
      {receivingPo && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recepción Física en Almacén</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {receivingPo.orderNumber} • {receivingPo.supplierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPo(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <p className="font-bold text-[11px]">
                  ✓ Entrada de Mercancía al Inventario
                </p>
                <p className="text-[10px] text-emerald-800">
                  Al confirmar la recepción, los ítems de esta orden ingresarán como inventario disponible en la bodega seleccionada y se cerrará la pendiente logística.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bodega / Almacén de Destino *</label>
                <select
                  value={receivedWarehouse}
                  onChange={(e) => setReceivedWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="BOD-MED-01">BOD-MED-01 (Almacén Central Poblado, Medellín)</option>
                  <option value="TAL-GBL-02">TAL-GBL-02 (Taller de Fabricación Guayabal)</option>
                  <option value="BOD-METRO-03">BOD-METRO-03 (Patios Bello Metro Medellín Línea K)</option>
                  <option value="BOD-BOL-04">BOD-BOL-04 (Almacén de Obra Bolivia - Mi Teleférico)</option>
                  <option value="BOD-RD-05">BOD-RD-05 (Almacén Obra República Dominicana)</option>
                  <option value="BOD-MOV-06">BOD-MOV-06 (Contenedor Móvil de Obra)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fecha Real de Llegada *</label>
                <input
                  type="date"
                  required
                  value={receivedDateInput}
                  onChange={(e) => setReceivedDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReceivingPo(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs"
                >
                  Confirmar Ingreso a Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
