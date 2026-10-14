import { BOMDiffChange, BOMDiffResult } from '../types';

export interface RawBOMItem {
  sku?: string;
  name: string;
  qty: number;
  unit?: string;
  measures?: string;
  notes?: string;
}

/**
 * Realiza un diff puramente en cliente entre dos versiones de listas de materiales (BOMs).
 * Determina qué ítems fueron agregados, eliminados o cambiaron en cantidad/especificaciones.
 */
export function calculateBOMDiff(
  v1Items: RawBOMItem[],
  v2Items: RawBOMItem[],
  v1RevisionName: string = 'Rev 1.0 (Plano Anterior)',
  v2RevisionName: string = 'Rev 2.0 (Plano Actualizado)'
): BOMDiffResult {
  const changes: BOMDiffChange[] = [];

  const v1Map = new Map<string, RawBOMItem>();
  v1Items.forEach((it) => {
    const key = (it.sku || it.name).trim().toLowerCase();
    v1Map.set(key, it);
  });

  const v2Map = new Map<string, RawBOMItem>();
  v2Items.forEach((it) => {
    const key = (it.sku || it.name).trim().toLowerCase();
    v2Map.set(key, it);
  });

  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  // 1. Revisar ítems de V2 contra V1 (Agregados o Modificados)
  v2Items.forEach((v2) => {
    const key = (v2.sku || v2.name).trim().toLowerCase();
    const v1 = v1Map.get(key);

    if (!v1) {
      addedCount++;
      changes.push({
        type: 'added',
        sku: v2.sku || 'N/A',
        name: v2.name,
        v2Qty: v2.qty,
        deltaQty: v2.qty,
        unit: v2.unit || 'unid',
        notes: v2.notes || v2.measures,
      });
    } else {
      const deltaQty = v2.qty - v1.qty;
      const isChanged = deltaQty !== 0 || (v2.measures && v1.measures && v2.measures !== v1.measures);

      if (isChanged) {
        modifiedCount++;
        changes.push({
          type: 'modified',
          sku: v2.sku || v1.sku || 'N/A',
          name: v2.name,
          v1Qty: v1.qty,
          v2Qty: v2.qty,
          deltaQty,
          unit: v2.unit || v1.unit || 'unid',
          notes: deltaQty > 0 ? `Incremento de +${deltaQty} ${v2.unit || 'und'}` : `Reducción de ${deltaQty} ${v2.unit || 'und'}`,
        });
      } else {
        changes.push({
          type: 'unchanged',
          sku: v2.sku || v1.sku || 'N/A',
          name: v2.name,
          v1Qty: v1.qty,
          v2Qty: v2.qty,
          deltaQty: 0,
          unit: v2.unit || v1.unit || 'unid',
        });
      }
    }
  });

  // 2. Revisar ítems que estaban en V1 pero ya no están en V2 (Eliminados)
  v1Items.forEach((v1) => {
    const key = (v1.sku || v1.name).trim().toLowerCase();
    if (!v2Map.has(key)) {
      removedCount++;
      changes.push({
        type: 'removed',
        sku: v1.sku || 'N/A',
        name: v1.name,
        v1Qty: v1.qty,
        deltaQty: -v1.qty,
        unit: v1.unit || 'unid',
        notes: 'Material retirado de esta revisión de ingeniería',
      });
    }
  });

  return {
    v1Revision: v1RevisionName,
    v2Revision: v2RevisionName,
    hasDeltas: addedCount > 0 || removedCount > 0 || modifiedCount > 0,
    addedCount,
    removedCount,
    modifiedCount,
    changes,
  };
}
