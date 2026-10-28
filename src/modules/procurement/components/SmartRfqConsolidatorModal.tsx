import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  DollarSign,
  Plus,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { InternalRequisition, Product, Partner, SmartConsolidatedGroup, PurchaseOrder } from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { groupRequisitionsForVolumePurchasing, detectPriceInflation } from '../../../utils/rfqOptimizer';
import { formatCOP, formatUSD, getStoredTRM } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface SmartRfqConsolidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisitions?: InternalRequisition[];
  products?: Product[];
  partners?: Partner[];
  onCreateConsolidatedPO?: (poData: Partial<PurchaseOrder>) => void;
  onCreatePurchaseOrder?: (group: SmartConsolidatedGroup, selectedSupplierId: string) => void;
}

export const SmartRfqConsolidatorModal: React.FC<SmartRfqConsolidatorModalProps> = ({
  isOpen,
  onClose,
  requisitions: propReqs,
  products: propProducts,
  partners: propPartners,
  onCreateConsolidatedPO,
  onCreatePurchaseOrder,
}) => {
  const erpStore = useErp();

  if (!isOpen) return null;

  const safeReqs: InternalRequisition[] = Array.isArray(propReqs)
    ? propReqs
    : Array.isArray(erpStore.requisitions)
    ? erpStore.requisitions
    : [];

  const safeProducts: Product[] = Array.isArray(propProducts)
    ? propProducts
    : Array.isArray(erpStore.products)
    ? erpStore.products
    : [];

  const safePartners: Partner[] = Array.isArray(propPartners)
    ? propPartners
    : Array.isArray(erpStore.partners)
    ? erpStore.partners
    : [];

  const currentTrm = getStoredTRM();
  const consolidatedGroups = groupRequisitionsForVolumePurchasing(safeReqs, safeProducts, safePartners);

  // Estados para simular cotización recibida de proveedor y detectar inflación
  const [selectedGroup, setSelectedGroup] = useState<SmartConsolidatedGroup | null>(
    consolidatedGroups[0] || null
  );
  const [quotedPriceCOP, setQuotedPriceCOP] = useState<number>(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    safePartners.find((p) => p && (p.type === 'supplier' || p.type === 'both'))?.id || ''
  );

  // Buscar histórico del producto seleccionado
  const selectedProd = selectedGroup
    ? safeProducts.find((p) => p && (p.sku === selectedGroup.sku || p.id === selectedGroup.productId))
    : null;
  const historicalPriceCOP = selectedProd?.costPriceCOP || 0;

  // Detección de Inflación en Vivo
  const inflationCheck = detectPriceInflation(quotedPriceCOP, historicalPriceCOP);

  const handleCreateRfq = () => {
    if (!selectedGroup) return;

    const selectedPartner = safePartners.find((p) => p && p.id === selectedSupplierId);
    const finalPriceCOP = quotedPriceCOP > 0 ? quotedPriceCOP : historicalPriceCOP;
    const finalPriceUSD = Number((finalPriceCOP / currentTrm).toFixed(2));

    const totalCOP = selectedGroup.totalQtyToPurchase * finalPriceCOP;
    const totalUSD = selectedGroup.totalQtyToPurchase * finalPriceUSD;

    if (onCreatePurchaseOrder) {
      onCreatePurchaseOrder(selectedGroup, selectedSupplierId);
    } else if (onCreateConsolidatedPO) {
      onCreateConsolidatedPO({
        orderNumber: `PO-VOL-${Date.now().toString().slice(-4)}`,
        supplierId: selectedSupplierId,
        supplierName: selectedPartner?.name || 'Proveedor Consolidado',
        supplierHomologated: true,
        projectCode: selectedGroup.projects.map((p) => p.projectCode).join(' + '),
        date: new Date().toISOString().split('T')[0],
        currency: 'COP',
        totalAmountCOP: totalCOP,
        totalAmountUSD: totalUSD,
        status: 'rfq',
        items: [
          {
            productId: selectedGroup.productId,
            sku: selectedGroup.sku,
            name: selectedGroup.name,
            qty: selectedGroup.totalQtyToPurchase,
            orderedQty: selectedGroup.totalQtyToPurchase,
            receivedQty: 0,
            pendingQty: selectedGroup.totalQtyToPurchase,
            unitPriceCOP: finalPriceCOP,
            unitPriceUSD: finalPriceUSD,
            subtotalCOP: totalCOP,
            subtotalUSD: totalUSD,
            historicalPriceCOP,
            priceInflationWarning: inflationCheck.isWarning,
            priceInflationPercent: inflationCheck.percentDiff,
          },
        ],
        notes: `Consolidación de volumen de ${selectedGroup.projects.length} proyectos (${selectedGroup.projects.map((p) => p.projectCode).join(', ')}).`,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera Sólida Corporativa */}
        <div className="p-4 bg-[#003650] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Sparkles size={20} className="text-[#F39200]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Cotización Inteligente a Proveedores: Agrupación por Volumen</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#F39200] text-slate-950 uppercase tracking-wider">
                  Estilo SAP Ariba / Odoo
                </span>
              </div>
              <p className="text-xs text-slate-300">
                LUC-IA-NA agrupa ítems idénticos entre proyectos para cotización unificada y alerta alzas de precio {'>'} 10%.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-gray-800">
          
          {/* Listado de Oportunidades de Consolidación */}
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
              <Layers size={16} className="text-[#00668F]" />
              Materiales con Demanda Multidisciplinaria Identificada ({consolidatedGroups.length})
            </h4>
            
            {consolidatedGroups.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-gray-500">
                No hay compras pendientes cruzadas entre proyectos en este momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {consolidatedGroups.map((group) => {
                  const isSelected = selectedGroup?.sku === group.sku;

                  return (
                    <div
                      key={group.sku}
                      onClick={() => {
                        setSelectedGroup(group);
                        const p = safeProducts.find((prod) => prod.sku === group.sku);
                        setQuotedPriceCOP(p?.costPriceCOP || 0);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#00668F] bg-sky-50/40 ring-2 ring-[#00668F]/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-gray-900 bg-slate-100 px-2 py-0.5 rounded">
                            {group.sku}
                          </span>
                          <h5 className="font-bold text-gray-900 text-xs mt-1">{group.name}</h5>
                        </div>
                        {group.volumeDiscountOpportunity && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                            <TrendingUp size={11} /> DESCUENTO VOLUMEN
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-gray-500 block">Total a comprar:</span>
                          <span className="font-black text-gray-900 text-sm">
                            {group.totalQtyToPurchase} {group.unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500 block">Proyectos que lo solicitan:</span>
                          <span className="font-bold text-[#00668F]">
                            {group.projects.map((p) => p.projectCode).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel de Validación de Cotización & Detector de Inflación */}
          {selectedGroup && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                <DollarSign size={15} className="text-emerald-700" />
                Simulador de Cotización & Control de Precios ({selectedGroup.sku})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Proveedor */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Proveedor a Cotizar</label>
                  <CreatableSelect
                    options={safePartners
                      .filter((p) => p && (p.type === 'supplier' || p.type === 'both'))
                      .map((p) => ({
                        id: p.id,
                        name: `${p.name} (${p.taxId})`,
                        code: p.taxId
                      }))}
                    value={selectedSupplierId}
                    onChange={(val) => setSelectedSupplierId(val)}
                    placeholder="Seleccionar o buscar proveedor..."
                  />
                </div>

                {/* Precio Histórico */}
                <div>
                  <label className="font-bold text-gray-500 block mb-1">Precio Histórico Registrado</label>
                  <div className="p-2 rounded-lg bg-white border border-gray-200 text-xs font-mono font-bold text-gray-700">
                    {formatCOP(historicalPriceCOP)} / {selectedGroup.unit}
                  </div>
                </div>

                {/* Precio Cotizado Actual */}
                <div>
                  <label className="font-bold text-emerald-800 block mb-1">Precio Cotizado por Proveedor (COP)</label>
                  <input
                    type="number"
                    min="0"
                    value={quotedPriceCOP}
                    onChange={(e) => setQuotedPriceCOP(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-white border border-emerald-300 font-mono font-bold text-xs text-gray-900"
                    placeholder="Digita el precio cotizado..."
                  />
                </div>
              </div>

              {/* Alerta de Inflación (> 10%) */}
              {inflationCheck.isWarning ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-900 block text-xs">
                      ⚠️ ALERTA DE ANOMALÍA DE PRECIO DETECTADA (+{inflationCheck.percentDiff}%)
                    </span>
                    <p className="text-rose-800 text-[11px] mt-0.5">
                      {inflationCheck.message} Sugerencia: Solicitar renegociación por volumen de los {selectedGroup.totalQtyToPurchase} {selectedGroup.unit} o evaluar proveedores alternativos antes de emitir la PO.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{inflationCheck.message}</span>
                </div>
              )}

              {/* Resumen de Total Consolidado */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-xs">
                <span className="text-gray-600">
                  Importe Total Proyectado ({selectedGroup.totalQtyToPurchase} {selectedGroup.unit}):
                </span>
                <span className="font-mono text-base text-gray-900">
                  {formatCOP(selectedGroup.totalQtyToPurchase * (quotedPriceCOP || historicalPriceCOP))} COP
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Pie con Acciones */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            Al consolidar, los proyectos compartirán el flete y descuento comercial del proveedor.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateRfq}
              disabled={!selectedGroup}
              className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Send size={14} />
              <span>Emitir Cotización Consolidada (Smart RFQ)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
