import React, { useState } from 'react';
import {
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
  Camera,
  FileText,
  FileCheck2,
  Truck,
  RotateCcw,
  Ban,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  InternalRequisition,
  InternalRequisitionItem,
  Product,
  Partner,
  PurchaseOrder,
  PurchaseOrderItem,
} from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { formatCOP, formatUSD, formatTRM, getStoredTRM } from '../../../core/services/trmService';
import { groupRequisitionsForVolumePurchasing } from '../../../utils/rfqOptimizer';

interface BuyerOverviewTabProps {
  requisitions?: InternalRequisition[];
  purchaseOrders?: PurchaseOrder[];
  products?: Product[];
  partners?: Partner[];
  onOpenBomDiff: () => void;
  onOpenSmartRfq: () => void;
  onOpenScanner: () => void;
  onRejectAlternative?: (reqId: string, itemId: string, sku: string) => void;
  onUpdateRequisitionItem?: (reqId: string, updatedItems: InternalRequisitionItem[]) => void;
  onUpdatePO?: (po: PurchaseOrder) => void;
}

export const BuyerOverviewTab: React.FC<BuyerOverviewTabProps> = ({
  requisitions: propReqs,
  purchaseOrders: propPOs,
  products: propProducts,
  partners: propPartners,
  onOpenBomDiff,
  onOpenSmartRfq,
  onOpenScanner,
  onRejectAlternative,
  onUpdateRequisitionItem,
  onUpdatePO,
}) => {
  const erpStore = useErp();

  const safeReqs: InternalRequisition[] = Array.isArray(propReqs)
    ? propReqs
    : Array.isArray(erpStore.requisitions)
    ? erpStore.requisitions
    : [];

  const safePOs: PurchaseOrder[] = Array.isArray(propPOs)
    ? propPOs
    : Array.isArray(erpStore.purchaseOrders)
    ? erpStore.purchaseOrders
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

  // Grupos consolidados inteligentes
  const consolidatedGroups = groupRequisitionsForVolumePurchasing(safeReqs, safeProducts, safePartners);

  // Estadísticas del Comprador
  const partialOrdersCount = safePOs.filter((po) => po && po.status === 'partial').length;
  const pendingPurchasesCount = safeReqs.reduce(
    (acc, r) => acc + (r?.items || []).filter((i) => i && !i.inStock).length,
    0
  );

  // Total valorizado de compras en tránsito
  const totalInTransitCOP = safePOs
    .filter((po) => po && (po.status === 'ordered' || po.status === 'partial'))
    .reduce((acc, po) => acc + (po.totalAmountCOP || 0), 0);

  // Rechazar alternativa de homologación inteligente
  const handleRejectAlternative = (req: InternalRequisition, itemIndex: number, rejectedSku: string) => {
    const updated = [...req.items];
    const it = updated[itemIndex];
    const prevRejections = it.rejectedAlternatives || [];

    updated[itemIndex] = {
      ...it,
      isHomologated: false,
      homologatedWithSku: undefined,
      homologatedWithName: undefined,
      homologationNotes: `Alternativa ${rejectedSku} descartada por ingeniería. Ítem devuelto a búsqueda técnica.`,
      rejectedAlternatives: [...prevRejections, rejectedSku],
    };

    if (onUpdateRequisitionItem) {
      onUpdateRequisitionItem(req.id, updated);
    } else if (erpStore.updateRequisition) {
      erpStore.updateRequisition(req.id, { items: updated });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* BARRA SUPERIOR DE ACCIONES RÁPIDAS DEL COMPRADOR (SOLID COLORS) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-[#00668F] shrink-0 border border-slate-200">
            <Building size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">Torre de Control de Compras & Abastecimiento</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                TRM: ${formatTRM(currentTrm)} COP
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Integración de compras consolidadas SAP/Odoo, versionado de planos y recepción con escáner móvil.
            </p>
          </div>
        </div>

        {/* Botones Killer de Acción */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenBomDiff}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-2xs"
            title="Comparar versiones de planos (V1 vs V2) y calcular deltas de materiales"
          >
            <Layers size={13} className="text-emerald-400" />
            <span>BOM Diffing & Planos</span>
          </button>

          <button
            type="button"
            onClick={onOpenSmartRfq}
            className="px-3 py-1.5 rounded-lg bg-[#00668F] hover:bg-[#005273] text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-2xs"
            title="Agrupar materiales entre proyectos y detectar inflación de proveedores"
          >
            <Sparkles size={13} className="text-[#F39200]" />
            <span>Smart RFQ ({consolidatedGroups.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenScanner}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-2xs"
            title="Activar escáner de cámara para recepción de entregas parciales"
          >
            <Camera size={13} />
            <span>Recepción Parcial QR</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE INDICADORES EN COP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Compras en Tránsito */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 block uppercase">Órdenes en Tránsito / Almacén</span>
          <div className="mt-1">
            <span className="text-xl font-black text-gray-900 block">{formatCOP(totalInTransitCOP)}</span>
            <span className="text-xs text-gray-400 font-mono">≈ {formatUSD(totalInTransitCOP / currentTrm)} USD</span>
          </div>
        </div>

        {/* Entregas Parciales Activas */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 block uppercase">Entregas Parciales (PARTIAL)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{partialOrdersCount}</span>
            <span className="text-xs text-gray-500">órdenes con saldo pendiente por ingresar</span>
          </div>
        </div>

        {/* Oportunidades de Compra por Volumen */}
        <div className="bg-white p-4 rounded-xl border border-sky-200 shadow-2xs">
          <span className="text-[11px] font-bold text-[#00668F] block uppercase">Grupos de Volumen Multidisciplina</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00668F]">{consolidatedGroups.length}</span>
            <span className="text-xs text-gray-500">ítems listos para descuento por escala</span>
          </div>
        </div>
      </div>

      {/* BANDEJA DE HOMOLOGACIONES & ALTERNATIVAS TÉCNICAS */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#00668F]" />
              Homologación Flexible & Alternativas Técnicas
            </h4>
            <p className="text-slate-500 text-[11px]">
              Si un ingeniero rechaza una alternativa, se bloquea exclusivamente ese SKU y el ítem regresa a cotización.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100 text-gray-600 font-bold text-[11px]">
                <th className="p-2.5">Proyecto / Requisición</th>
                <th className="p-2.5">Material Requerido</th>
                <th className="p-2.5 text-center">Cant.</th>
                <th className="p-2.5">Alternativa Homologada</th>
                <th className="p-2.5">Alternativas Rechazadas</th>
                <th className="p-2.5 text-center">Acción de Ingeniería</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[11px]">
              {safeReqs.flatMap((req) =>
                (req.items || []).map((it, idx) => (
                  <tr key={`${req.id}-${idx}`} className="hover:bg-slate-50">
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-slate-900 block">{req.projectCode}</span>
                      <span className="text-[10px] text-gray-400">{req.reqNumber}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-gray-800">{it.productName}</span>
                      <span className="font-mono text-gray-400 block text-[10px]">{it.productSku}</span>
                    </td>
                    <td className="p-2.5 text-center font-bold font-mono">
                      {it.qtyRequested} {it.unit || 'und'}
                    </td>
                    <td className="p-2.5">
                      {it.isHomologated ? (
                        <div>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {it.homologatedWithSku || 'Alternativa Aceptada'}
                          </span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">{it.homologatedWithName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sin homologar</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {it.rejectedAlternatives && it.rejectedAlternatives.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {it.rejectedAlternatives.map((rej) => (
                            <span key={rej} className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[9px] font-bold line-through">
                              {rej}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Ninguna</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {it.isHomologated && (
                        <button
                          type="button"
                          onClick={() => handleRejectAlternative(req, idx, it.homologatedWithSku || 'ALT-01')}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] border border-rose-200 transition-colors cursor-pointer"
                          title="Rechazar esta alternativa y retornar el ítem original a compras"
                        >
                          Descartar Alternativa
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
