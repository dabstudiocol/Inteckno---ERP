import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  FileText,
  Building,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface WarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders?: PurchaseOrder[];
  onApplyReceipt?: (orderId: string, itemReceipts: { sku: string; receivedQty: number; notes?: string }[]) => { success: boolean; error?: string };
}

type ItemStatusType = 'complete' | 'partial' | 'error';

interface ItemReceiptState {
  qtyEntering: number;
  status: ItemStatusType;
  notes: string;
}

export const WarehouseReceiptModal: React.FC<WarehouseReceiptModalProps> = ({
  isOpen,
  onClose,
  purchaseOrders: propPOs,
  onApplyReceipt,
}) => {
  const erpStore = useErp();

  if (!isOpen) return null;

  const safePOs: PurchaseOrder[] = Array.isArray(propPOs)
    ? propPOs
    : Array.isArray(erpStore.purchaseOrders)
    ? erpStore.purchaseOrders
    : [];

  // Filtrar órdenes que tienen saldo pendiente por ingresar (o aprobadas/en camino)
  const pendingPOs = safePOs.filter(
    (po) => po && po.status !== 'rejected' && po.status !== 'draft'
  );

  const [selectedPOId, setSelectedPOId] = useState<string>(pendingPOs[0]?.id || '');
  const selectedPO = safePOs.find((p) => p.id === selectedPOId) || pendingPOs[0] || null;

  // Estado de cada ítem en la recepción
  const [itemsState, setItemsState] = useState<Record<string, ItemReceiptState>>({});
  const [generalReceiptNotes, setGeneralReceiptNotes] = useState<string>('');
  const [remissionNumber, setRemissionNumber] = useState<string>('');
  const [targetWarehouse, setTargetWarehouse] = useState<string>('Almacén Central Medellín (Sede Poblado)');

  // Control de bloqueo de salida si hay cambios sin guardar
  const [showExitWarning, setShowExitWarning] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  // Blindaje Poka-Yoke: Foto obligatoria de la pieza y remisión firmada
  const [receiptPhotoAttached, setReceiptPhotoAttached] = useState<boolean>(false);
  const [signedRemissionAttached, setSignedRemissionAttached] = useState<boolean>(false);

  // Inicializar ítems al seleccionar orden
  useEffect(() => {
    if (selectedPO && selectedPO.items) {
      const initial: Record<string, ItemReceiptState> = {};
      selectedPO.items.forEach((it) => {
        const ordered = it.orderedQty !== undefined ? it.orderedQty : (it.qty || 0);
        const alreadyReceived = it.receivedQty || 0;
        const pending = Math.max(0, ordered - alreadyReceived);
        
        initial[it.sku] = {
          qtyEntering: pending, // Por defecto sugiere recibir el saldo pendiente
          status: pending === 0 ? 'complete' : 'complete',
          notes: '',
        };
      });
      setItemsState(initial);
      setHasUnsavedChanges(false);
    }
  }, [selectedPOId]);

  const updateItemQty = (sku: string, qty: number, pendingMax: number) => {
    setHasUnsavedChanges(true);
    setItemsState((prev) => {
      const current = prev[sku] || { qtyEntering: 0, status: 'complete', notes: '' };
      const safeQty = Math.max(0, qty);
      let autoStatus: ItemStatusType = current.status;

      if (safeQty < pendingMax) {
        autoStatus = 'partial';
      } else if (safeQty === pendingMax) {
        autoStatus = 'complete';
      }

      return {
        ...prev,
        [sku]: {
          ...current,
          qtyEntering: safeQty,
          status: autoStatus,
        },
      };
    });
  };

  const updateItemStatus = (sku: string, status: ItemStatusType) => {
    setHasUnsavedChanges(true);
    setItemsState((prev) => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        status,
      },
    }));
  };

  const updateItemNotes = (sku: string, notes: string) => {
    setHasUnsavedChanges(true);
    setItemsState((prev) => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        notes,
      },
    }));
  };

  const handleReceiveAll = () => {
    if (!selectedPO) return;
    setHasUnsavedChanges(true);
    const updated: Record<string, ItemReceiptState> = {};
    selectedPO.items.forEach((it) => {
      const ordered = it.orderedQty !== undefined ? it.orderedQty : (it.qty || 0);
      const alreadyReceived = it.receivedQty || 0;
      const pending = Math.max(0, ordered - alreadyReceived);
      updated[it.sku] = {
        qtyEntering: pending,
        status: 'complete',
        notes: '',
      };
    });
    setItemsState(updated);
  };

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowExitWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmExit = () => {
    setShowExitWarning(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    // Validar que si hay parcial o error, exista especificación
    for (const it of selectedPO.items) {
      const state = itemsState[it.sku];
      if (!state) continue;
      if ((state.status === 'partial' || state.status === 'error') && !state.notes.trim()) {
        alert(`Debes especificar la novedad u observación para el ítem "${it.name}" (Referencia: ${it.sku})`);
        return;
      }
    }

    // Blindaje Poka-Yoke: Foto obligatoria de la pieza y remisión firmada
    const isCriticalOrMajor = selectedPO.qualityCertificateRequired || (selectedPO.totalAmountCOP || 0) > 2000000;
    if (isCriticalOrMajor && (!receiptPhotoAttached || !signedRemissionAttached)) {
      alert(
        'Blindaje Poka-Yoke Anti-Error Humano:\nPara repuestos críticos de teleférico o compras superiores a $2.000.000 COP, es OBLIGATORIO confirmar la fotografía física de la pieza recibida y la remisión física debidamente firmada.'
      );
      return;
    }

    const receiptsPayload = selectedPO.items.map((it) => {
      const state = itemsState[it.sku] || { qtyEntering: 0, status: 'complete', notes: '' };
      return {
        sku: it.sku,
        receivedQty: Number(state.qtyEntering) || 0,
        notes: state.notes ? `${state.notes} [Ubicación: ${targetWarehouse}]` : `Ingreso a: ${targetWarehouse}`,
      };
    });

    if (onApplyReceipt) {
      onApplyReceipt(selectedPO.id, receiptsPayload);
    } else if (erpStore.receivePurchaseOrderPartial) {
      erpStore.receivePurchaseOrderPartial(selectedPO.id, receiptsPayload);
    }

    setHasUnsavedChanges(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera Sólida Corporativa Inteckno */}
        <div className="p-4 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Registro de Ingreso a Almacén / Recepción de Mercancía</h3>
              <p className="text-xs text-slate-300">
                Verifica ítem por ítem lo que el proveedor entregó físicamente. Si no llegó completo, especifica la novedad.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSaveReceipt} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* Selección de la Orden de Compra & Datos del Proveedor */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">
                    Seleccionar Orden de Compra Pendiente de Ingreso
                  </label>
                  <CreatableSelect
                    options={pendingPOs.length === 0 ? [] : pendingPOs.map((po) => ({
                      id: po.id,
                      name: `${po.orderNumber} — Proveedor: ${po.supplierName} (${po.projectCode ? `Proyecto: ${po.projectCode}` : 'Gasto General'}) — Estado: ${po.status.toUpperCase()}`,
                      code: po.orderNumber
                    }))}
                    value={selectedPOId}
                    onChange={(val) => setSelectedPOId(val)}
                    placeholder="Buscar y seleccionar orden de compra..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Sede / Bodega de Ingreso
                  </label>
                  <CreatableSelect
                    options={[
                      { id: 'Almacén Central Medellín (Sede Poblado)', name: 'Almacén Central Medellín (Sede Poblado)' },
                      { id: 'Taller Central Guayabal (Banco de Ensayos & Maquinado)', name: 'Taller Central Guayabal (Banco de Ensayos)' },
                      { id: 'Bodega de Campo Metro de Medellín (Patios Bello / Línea K)', name: 'Bodega Metro Medellín (Patios Bello Línea K)' },
                      { id: 'Bodega Internacional Mi Teleférico La Paz (Bolivia)', name: 'Bodega Internacional La Paz (Bolivia)' },
                      { id: 'Bodega Internacional Inteckno RD (Santo Domingo)', name: 'Bodega Internacional Rep. Dominicana' },
                      { id: 'Contenedor Móvil de Obra (Sistemas de Cable)', name: 'Contenedor Móvil de Obra' },
                    ]}
                    value={targetWarehouse}
                    onChange={(val) => {
                      setTargetWarehouse(val);
                      setHasUnsavedChanges(true);
                    }}
                    allowCustomText={true}
                    placeholder="Seleccionar o escribir bodega..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    N° Remisión / Factura
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: REM-88421"
                    value={remissionNumber}
                    onChange={(e) => {
                      setRemissionNumber(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                  />
                </div>
              </div>

              {selectedPO && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <div>
                    <span>Proveedor: </span>
                    <strong className="text-slate-900">{selectedPO.supplierName}</strong>
                    <span className="mx-2">•</span>
                    <span>Destino: </span>
                    <strong className="text-slate-900">{selectedPO.projectCode || 'Operaciones / Administración'}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleReceiveAll}
                    className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  >
                    ✓ Marcar Todo como Recibido 100%
                  </button>
                </div>
              )}
            </div>

            {/* Listado de Ítems de la Orden de Compra */}
            {selectedPO ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800">
                  <span>Ítems Comprados ({selectedPO.items.length})</span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Indica la cantidad real recibida en bodega y su estado
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {selectedPO.items.map((it) => {
                    const ordered = it.orderedQty !== undefined ? it.orderedQty : (it.qty || 0);
                    const alreadyReceived = it.receivedQty || 0;
                    const pending = Math.max(0, ordered - alreadyReceived);
                    const itState = itemsState[it.sku] || { qtyEntering: pending, status: 'complete', notes: '' };

                    return (
                      <div key={it.sku} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                        
                        {/* Fila Principal de Información y Cantidades */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          
                          {/* SKU y Nombre */}
                          <div className="sm:col-span-5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100">
                                {it.sku}
                              </span>
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{it.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Unidad: {(it as any).unit || 'und'} • Comprados: <strong>{ordered}</strong> | Recibidos antes: <strong className="text-emerald-700">{alreadyReceived}</strong> | Saldo: <strong className="text-amber-700">{pending}</strong>
                            </div>
                          </div>

                          {/* Cantidad que ingresa hoy */}
                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Cantidad que Ingresa Hoy:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max={pending}
                                value={itState.qtyEntering}
                                onChange={(e) => updateItemQty(it.sku, Number(e.target.value), pending)}
                                className="w-24 h-9 px-2 text-center rounded-lg border border-slate-300 font-bold font-mono text-xs focus:bg-white focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(it.sku, pending, pending)}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
                                title="Recibir el saldo pendiente completo"
                              >
                                Max ({pending})
                              </button>
                            </div>
                          </div>

                          {/* Estado de Recepción del Renglón */}
                          <div className="sm:col-span-4">
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                              Estado de la Entrega:
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateItemStatus(it.sku, 'complete')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  itState.status === 'complete'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <Check size={12} />
                                <span>Completo</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => updateItemStatus(it.sku, 'partial')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  itState.status === 'partial'
                                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle size={12} />
                                <span>Parcial</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => updateItemStatus(it.sku, 'error')}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  itState.status === 'error'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <XCircle size={12} />
                                <span>Discrepancia</span>
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Campo Obligatorio de Especificación si es Parcial o Error */}
                        {(itState.status === 'partial' || itState.status === 'error') && (
                          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1 animate-in fade-in duration-100">
                            <label className="text-[10px] font-bold text-amber-950 flex items-center gap-1">
                              <AlertCircle size={12} className="text-amber-600" />
                              <span>
                                {itState.status === 'partial'
                                  ? 'Especificar motivo de entrega parcial (Saldo pendiente por entregar):'
                                  : 'Especificar discrepancia o error en la entrega (Material incorrecto o averiado):'}
                              </span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder={
                                itState.status === 'partial'
                                  ? 'Ej: Proveedor despachará las unidades restantes el próximo viernes...'
                                  : 'Ej: Llegó diámetro 38mm en vez de 52mm / Empaque roto...'
                              }
                              value={itState.notes}
                              onChange={(e) => updateItemNotes(it.sku, e.target.value)}
                              className="w-full h-8 px-2.5 rounded-lg bg-white border border-amber-300 text-xs text-amber-950 font-medium focus:outline-hidden"
                            />
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                Selecciona una orden de compra para iniciar la recepción.
              </div>
            )}

            {/* BLINDAJE POKA-YOKE: RECEPCIÓN CON FOTO OBLIGATORIA Y REMISIÓN FIRMADA */}
            {selectedPO && (
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs">
                <div className="font-bold text-indigo-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-indigo-600" /> Control Poka-Yoke de Almacén: Verificación Física
                  </span>
                  {(selectedPO.qualityCertificateRequired || (selectedPO.totalAmountCOP || 0) > 2000000) && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase tracking-wide">
                      Obligatorio por Repuesto Crítico / Monto Mayor
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={receiptPhotoAttached}
                      onChange={(e) => setReceiptPhotoAttached(e.target.checked)}
                      className="rounded text-[#00668F] cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">1. Foto Física de la Pieza Recibida</span>
                      <span className="text-[10px] text-slate-500">Inspección visual de estado y sin golpes</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={signedRemissionAttached}
                      onChange={(e) => setSignedRemissionAttached(e.target.checked)}
                      className="rounded text-[#00668F] cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">2. Remisión Física Firmada por Almacén</span>
                      <span className="text-[10px] text-slate-500">Soporte físico con firma del transportador</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Observaciones Generales del Acta de Recepción */}
            <div>
              <label className="font-bold text-slate-800 block mb-1">
                Observaciones Generales de la Remisión / Acta de Almacén
              </label>
              <textarea
                rows={2}
                value={generalReceiptNotes}
                onChange={(e) => {
                  setGeneralReceiptNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Indica el estado del transportador, empaques, sello de seguridad..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
              />
            </div>

          </div>

          {/* Pie de Acciones */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Al confirmar, el inventario se actualizará en tiempo real y quedará trazabilidad inmutable.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedPO}
                className="px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 text-xs"
              >
                <CheckCircle2 size={15} />
                <span>Registrar Ingreso a Almacén</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* MODAL BLOQUEANTE DE ADVERTENCIA DE SALIDA */}
      {showExitWarning && (
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">¿Deseas salir sin registrar el ingreso?</h4>
                <p className="text-xs text-slate-500">Hay datos de recepción de mercancía en curso.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Si cierras ahora, las cantidades ingresadas físicamente no quedarán asentadas en el inventario ni en la orden de compra.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitWarning(false)}
                className="px-4 py-2 rounded-xl bg-[#003650] text-white font-bold text-xs cursor-pointer"
              >
                Continuar Registrando
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer"
              >
                Descartar y Salir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
