import { Product, PurchaseOrder, EquipmentTool } from '../../types';

export interface StockReceiptResult {
  updatedProducts: Product[];
  newProductsToAdd: Product[];
}

export interface EquipmentDetectionResult {
  newEquipmentTools: EquipmentTool[];
  newNotifications: Array<{
    id: string;
    type: 'urgent' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    targetRole?: string;
    timestamp: string;
    read: boolean;
  }>;
}

/**
 * Calcula la reconciliación de stock para productos existentes y nuevos
 * al recibir una Orden de Compra (total o parcial).
 */
export function calculateStockReceipt(
  currentProducts: Product[],
  itemsReceived: Array<{
    productId?: string;
    sku: string;
    name?: string;
    qty: number;
    unitPriceCOP?: number;
    unitPriceUSD?: number;
    unit?: string;
  }>
): StockReceiptResult {
  const newProductsToAdd: Product[] = [];
  
  const updatedProducts = currentProducts.map((prod) => {
    const matchedItem = itemsReceived.find(
      (it) => (it.productId && it.productId === prod.id) || (it.sku && it.sku === prod.sku)
    );
    if (matchedItem) {
      const addedStock = Number(matchedItem.qty) || 0;
      const newStock = prod.realStock + addedStock;
      return {
        ...prod,
        realStock: newStock,
        availableStock: Math.max(0, newStock - prod.reservedStock),
      };
    }
    return prod;
  });

  itemsReceived.forEach((it) => {
    const exists = currentProducts.some(
      (p) => (it.productId && p.id === it.productId) || (it.sku && p.sku === it.sku)
    );
    const alreadyQueued = newProductsToAdd.some(
      (p) => (it.productId && p.id === it.productId) || (it.sku && p.sku === it.sku)
    );
    if (!exists && !alreadyQueued && it.sku) {
      const qty = Number(it.qty) || 1;
      newProductsToAdd.push({
        id: it.productId || `PRD-${Date.now()}-${it.sku}`,
        sku: it.sku,
        name: it.name || it.sku,
        category: 'Repuestos & Fabricación STC',
        unit: it.unit || 'unid',
        costPriceCOP: it.unitPriceCOP || 0,
        costPriceUSD: it.unitPriceUSD || 0,
        realStock: qty,
        reservedStock: 0,
        availableStock: qty,
        minStock: 1,
        isCriticalSpare: false,
        isHomologatedITK: true,
        locationName: 'Almacén Central Medellín (Sede Poblado)',
        shelf: 'A-01',
      });
    }
  });

  return { updatedProducts, newProductsToAdd };
}

/**
 * Detecta si los ítems de la Orden de Compra corresponden a herramientas de precisión
 * o equipos especiales que requieran registro metrológico y notificación obligatoria a HSEQ.
 */
export function detectPrecisionEquipmentForCalib(
  po: PurchaseOrder,
  itemsToEvaluate: Array<{
    name?: string;
    sku?: string;
    unitPriceCOP?: number;
  }>
): EquipmentDetectionResult {
  const newEquipmentTools: EquipmentTool[] = [];
  const newNotifications: EquipmentDetectionResult['newNotifications'] = [];

  itemsToEvaluate.forEach((it, idx) => {
    const isHighPrecision = /torquimetro|torqumetro|laser|lser|alineador|multimetro|multmetro|ensayo|end|ndt|vibrac/i.test(
      `${it.name || ''} ${it.sku || ''}`
    );

    if (isHighPrecision || po.isEquipmentPurchase) {
      const today = new Date();
      const calibMonths = po.equipmentCalibPeriodMonths || 12;
      const nextDue = new Date(today.getTime() + calibMonths * 30 * 24 * 60 * 60 * 1000);
      const nextDueDateStr = nextDue.toISOString().split('T')[0];
      const eqCode = `EQ-${it.sku || 'TOOL'}-${Date.now().toString().slice(-4)}`;

      newEquipmentTools.push({
        id: `EQ-${Date.now()}-${idx}`,
        code: eqCode,
        name: it.name || 'Herramienta de Precisión',
        serialNumber: `SN-${Date.now().toString().slice(-6)}`,
        type: 'herramienta_especial',
        calibrationDate: today.toISOString().split('T')[0],
        calibrationExpiry: nextDueDateStr,
        nextDueDate: nextDueDateStr,
        isCalibrated: true,
        calibrationCertNumber: `CAL-${Date.now().toString().slice(-5)}`,
        status: 'available',
        dailyUsageCostCOP: Math.round((it.unitPriceCOP || 100000) * 0.03),
      });

      newNotifications.push({
        id: `notif-eq-${Date.now()}-${idx}`,
        type: 'urgent',
        title: 'Metrología y Calibración HSEQ',
        message: `Herramienta de precisión recibida: ${it.name} (${eqCode}). Próxima calibración obligatoria: ${nextDueDateStr}. Revisar re-calibración antes de la fecha indicada.`,
        targetRole: 'hseq',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  });

  return { newEquipmentTools, newNotifications };
}
