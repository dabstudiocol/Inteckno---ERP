import { InternalRequisition, Product, Partner, SmartConsolidatedGroup } from '../types';

/**
 * Agrupa ítems pendientes de compra de múltiples proyectos aprobados
 * para generar lotes de compra por volumen y buscar economías de escala.
 */
export function groupRequisitionsForVolumePurchasing(
  requisitions: InternalRequisition[] = [],
  products: Product[] = [],
  partners: Partner[] = []
): SmartConsolidatedGroup[] {
  const safeReqs = Array.isArray(requisitions) ? requisitions : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safePartners = Array.isArray(partners) ? partners : [];

  // Filtrar solo requisiciones en estado apto para cotización/compra
  const activeReqs = safeReqs.filter(
    (r) => r && (r.status === 'approved' || r.status === 'approved_for_quotation' || r.status === 'buyer_review')
  );

  const groupMap = new Map<string, SmartConsolidatedGroup>();

  activeReqs.forEach((req) => {
    (req.items || []).forEach((it) => {
      // Solo ítems que requieren compra
      const qtyToBuy = it.qtyToPurchase || (it.inStock ? 0 : it.qtyRequested);
      if (qtyToBuy <= 0) return;

      const prod = products.find((p) => p.id === it.productId || p.sku.toLowerCase() === it.productSku.toLowerCase());
      const key = it.productSku.trim().toUpperCase();

      if (!groupMap.has(key)) {
        // Encontrar proveedor sugerido si existe
        const defaultPartner = partners.find((p) => p.type === 'supplier' || p.type === 'both');

        groupMap.set(key, {
          productId: it.productId,
          sku: it.productSku,
          name: it.productName,
          totalQtyToPurchase: 0,
          unit: it.unit || prod?.unit || 'unid',
          projects: [],
          suggestedSupplierId: defaultPartner?.id,
          suggestedSupplierName: defaultPartner?.name || 'Proveedor Homologado Inteckno',
          estimatedTotalCOP: 0,
          estimatedTotalUSD: 0,
          volumeDiscountOpportunity: false,
        });
      }

      const group = groupMap.get(key)!;
      group.totalQtyToPurchase += qtyToBuy;
      group.projects.push({
        projectId: req.projectId,
        projectCode: req.projectCode,
        qty: qtyToBuy,
      });

      const unitCostCOP = prod?.costPriceCOP || 0;
      const unitCostUSD = prod?.costPriceUSD || 0;
      group.estimatedTotalCOP = group.totalQtyToPurchase * unitCostCOP;
      group.estimatedTotalUSD = group.totalQtyToPurchase * unitCostUSD;

      // Si se requiere en 2 o más proyectos distintos o cantidad considerable, es oportunidad de volumen
      if (group.projects.length >= 2 || group.totalQtyToPurchase >= 10) {
        group.volumeDiscountOpportunity = true;
      }
    });
  });

  return Array.from(groupMap.values()).sort((a, b) => (b.volumeDiscountOpportunity ? 1 : 0) - (a.volumeDiscountOpportunity ? 1 : 0));
}

/**
 * Cruza el precio cotizado actual contra el precio histórico en el sistema.
 * Si subió > 10%, genera un flag de advertencia por inflación.
 */
export function detectPriceInflation(
  currentPrice: number,
  historicalPrice: number
): { isWarning: boolean; percentDiff: number; message: string } {
  if (!historicalPrice || historicalPrice <= 0 || !currentPrice || currentPrice <= 0) {
    return { isWarning: false, percentDiff: 0, message: 'Sin histórico previo para comparar' };
  }

  const diff = currentPrice - historicalPrice;
  const percentDiff = Math.round((diff / historicalPrice) * 100);

  if (percentDiff > 10) {
    return {
      isWarning: true,
      percentDiff,
      message: `¡Alerta de Inflación (+${percentDiff}%)! El precio cotizado supera por más del 10% la última orden de compra registrada.`,
    };
  }

  if (percentDiff < 0) {
    return {
      isWarning: false,
      percentDiff,
      message: `Ahorro conseguido: -${Math.abs(percentDiff)}% respecto a la compra anterior.`,
    };
  }

  return {
    isWarning: false,
    percentDiff,
    message: 'Precio alineado con el histórico del catálogo.',
  };
}
