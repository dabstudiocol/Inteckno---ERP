import { DispatchRemission, RemissionItem, EquipmentTool, Product } from '../../types';

export interface MetrologyBlockCheckResult {
  hasExpiredTools: boolean;
  expiredTools: EquipmentTool[];
  errorMessage?: string;
}

export interface ReturnCalculationResult {
  updatedItems: RemissionItem[];
  consumedCostUSD: number;
  consumedCostCOP: number;
  totalReturned: number;
  allReturned: boolean;
}

/**
 * Verifica si algún equipo NDT a despachar tiene su certificado de calibración vencido
 * según la norma ISO/IEC 17025 y las reglas de aseguramiento metrológico de Inteckno.
 */
export function checkMetrologyDispatchBlock(
  equipmentList: EquipmentTool[],
  itemsToDispatch: Array<{ productId?: string; sku: string }>
): MetrologyBlockCheckResult {
  const expiredTools: EquipmentTool[] = [];
  const nowMs = Date.now();

  for (const item of itemsToDispatch) {
    const foundEq = equipmentList.find((e) => e.id === item.productId || e.code === item.sku);
    if (foundEq) {
      const isExpired =
        !foundEq.isCalibrated ||
        (foundEq.calibrationExpiry && new Date(foundEq.calibrationExpiry).getTime() < nowMs);
      if (isExpired) {
        expiredTools.push(foundEq);
      }
    }
  }

  if (expiredTools.length > 0) {
    const toolNames = expiredTools
      .map((t) => `${t.name} (${t.code} - Venció: ${t.calibrationExpiry})`)
      .join(', ');
    return {
      hasExpiredTools: true,
      expiredTools,
      errorMessage: `No es posible autorizar la salida: el equipo [${toolNames}] tiene su Certificado de Calibración VENCIDO. Debe recalibrarse según norma ISO/IEC 17025.`,
    };
  }

  return { hasExpiredTools: false, expiredTools: [] };
}

/**
 * Calcula la liquidación de consumo neto, reintegro físico y costos
 * al procesar el retorno de una remisión desde el terreno.
 */
export function calculateRemissionReturn(
  originalItems: RemissionItem[],
  returnedPayload: Array<{ id: string; qtyReturned: number; condition?: RemissionItem['condition']; notes?: string }>
): ReturnCalculationResult {
  let consumedCostUSD = 0;
  let consumedCostCOP = 0;
  let totalReturned = 0;

  const updatedItems: RemissionItem[] = originalItems.map((item) => {
    const retInfo = returnedPayload.find((r) => r.id === item.id);
    const qtyReturned = retInfo
      ? Math.min(item.qtyDispatched, Math.max(0, Number(retInfo.qtyReturned) || 0))
      : item.qtyDispatched;
    const qtyConsumed = Math.max(0, item.qtyDispatched - qtyReturned);

    totalReturned += qtyReturned;
    consumedCostUSD += qtyConsumed * item.unitCostUSD;
    consumedCostCOP += qtyConsumed * item.unitCostCOP;

    return {
      ...item,
      qtyReturned,
      qtyConsumed,
      condition: retInfo?.condition || (qtyConsumed > 0 ? 'consumido' : 'bueno'),
      notes: retInfo?.notes || item.notes,
    };
  });

  const allReturned = updatedItems.every((it) => it.qtyConsumed === 0);

  return {
    updatedItems,
    consumedCostUSD,
    consumedCostCOP,
    totalReturned,
    allReturned,
  };
}

/**
 * Calcula la restitución de inventario físico para los productos que retornaron a bodega.
 */
export function calculateRestockedProducts(
  currentProducts: Product[],
  returnedItems: RemissionItem[]
): Product[] {
  return currentProducts.map((p) => {
    const retItem = returnedItems.find((it) => it.productId === p.id || it.sku === p.sku);
    if (retItem && retItem.qtyReturned > 0) {
      const newStock = p.realStock + retItem.qtyReturned;
      return {
        ...p,
        realStock: newStock,
        availableStock: Math.max(0, newStock - p.reservedStock),
      };
    }
    return p;
  });
}
