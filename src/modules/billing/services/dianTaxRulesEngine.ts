import { DianRutData } from '../../../types';

export interface TaxCalculationResult {
  subtotal: number;
  ivaRate: number;
  ivaAmount: number;
  totalGross: number;
  // Retenciones en la Fuente calculadas
  applyReteFuente: boolean;
  reteFuenteRate: number; // Ej. 0.04 (4%)
  reteFuenteAmount: number;
  reteFuenteReason: string;

  applyReteIva: boolean;
  reteIvaRate: number; // Ej. 0.15 (15% del IVA)
  reteIvaAmount: number;
  reteIvaReason: string;

  applyReteIca: boolean;
  reteIcaRate: number; // Ej. 0.007 (7 por mil)
  reteIcaAmount: number;
  reteIcaReason: string;

  totalWithholdings: number;
  netPayable: number; // Valor neto a pagar o a girar
  requiresSupportDocument: boolean;
}

export type ConceptType =
  | 'compra_repuestos'
  | 'mantenimiento_maquinaria'
  | 'servicios_ingenieria'
  | 'honorarios_consultoria'
  | 'fletes_transporte';

/**
 * Motor de Reglas Tributarias de Colombia (Estatuto Tributario & DIAN)
 * Determina automáticamente las retenciones aplicables con base en el RUT del tercero.
 */
export function calculateColombianTaxesAndWithholdings(
  subtotal: number,
  concept: ConceptType,
  vendorRut: DianRutData,
  buyerIsGrandTaxpayer: boolean = false // Si Inteckno o el comprador actúa como Gran Contribuyente
): TaxCalculationResult {
  const responsibilities = vendorRut.responsabilidades.map((r) => r.code);
  const isSimpleRegime = responsibilities.includes('O-47');
  const isSelfWithholder = responsibilities.includes('O-15');
  const isGrandTaxpayer = responsibilities.includes('O-13');
  const isNonVatPayer = responsibilities.includes('R-99-PN');

  // 1. Cálculo de IVA
  let ivaRate = 0.19; // 19% general
  if (isNonVatPayer || concept === 'fletes_transporte') {
    ivaRate = 0; // No responsable de IVA o exento
  }
  const ivaAmount = Math.round(subtotal * ivaRate);
  const totalGross = subtotal + ivaAmount;

  // 2. Retención en la Fuente por Renta (ReteFuente)
  let applyReteFuente = true;
  let reteFuenteRate = 0;
  let reteFuenteReason = '';

  if (isSimpleRegime) {
    applyReteFuente = false;
    reteFuenteRate = 0;
    reteFuenteReason = 'Exento: El proveedor pertenece al Régimen Simple de Tributación (Art. 911 E.T.)';
  } else if (isSelfWithholder) {
    applyReteFuente = false;
    reteFuenteRate = 0;
    reteFuenteReason = 'Exento: El proveedor es Autorretenedor en Renta (Casilla 53: O-15)';
  } else {
    // Tarifas según concepto tributario
    switch (concept) {
      case 'compra_repuestos':
        reteFuenteRate = 0.025; // 2.5% declarantes
        reteFuenteReason = 'Tarifa general de compras de bienes/repuestos para declarantes (2.5%)';
        break;
      case 'mantenimiento_maquinaria':
        reteFuenteRate = 0.04; // 4% servicios técnicos
        reteFuenteReason = 'Tarifa de servicios de mantenimiento y reparación especializada (4%)';
        break;
      case 'servicios_ingenieria':
      case 'honorarios_consultoria':
        reteFuenteRate = vendorRut.tipoPersona === 'juridica' ? 0.11 : 0.10;
        reteFuenteReason = 'Honorarios y servicios de consultoría calificada (10% - 11%)';
        break;
      case 'fletes_transporte':
        reteFuenteRate = 0.01; // 1% transporte de carga terrestre
        reteFuenteReason = 'Retención especial en transporte de carga terrestre (1%)';
        break;
    }
  }

  const reteFuenteAmount = applyReteFuente ? Math.round(subtotal * reteFuenteRate) : 0;

  // 3. Retención en la Fuente por IVA (ReteIVA - 15% del valor del IVA)
  let applyReteIva = false;
  let reteIvaRate = 0;
  let reteIvaAmount = 0;
  let reteIvaReason = 'No aplica: Comprador no es agente de retención de IVA para este tercero';

  if (ivaAmount > 0 && buyerIsGrandTaxpayer && !isGrandTaxpayer && !isSimpleRegime) {
    applyReteIva = true;
    reteIvaRate = 0.15; // 15% del impuesto generado
    reteIvaAmount = Math.round(ivaAmount * reteIvaRate);
    reteIvaReason = 'Retención del 15% sobre el valor del IVA al régimen común (Art. 437-1 E.T.)';
  }

  // 4. Retención de Industria y Comercio (ReteICA)
  let applyReteIca = true;
  let reteIcaRate = vendorRut.tarifaReteICA || 0.007; // Por defecto 7 por mil (0.007)
  let reteIcaReason = `Tarifa municipal ReteICA según código DANE ${vendorRut.municipioCodeDANE || 'Medellín 05001'}`;

  if (isSimpleRegime) {
    applyReteIca = false;
    reteIcaRate = 0;
    reteIcaReason = 'Exento: El Régimen Simple de Tributación consolida el ICA en su declaración anual DIAN';
  }

  const reteIcaAmount = applyReteIca ? Math.round(subtotal * reteIcaRate) : 0;

  // 5. Totales Consolidados
  const totalWithholdings = reteFuenteAmount + reteIvaAmount + reteIcaAmount;
  const netPayable = totalGross - totalWithholdings;

  return {
    subtotal,
    ivaRate,
    ivaAmount,
    totalGross,
    applyReteFuente,
    reteFuenteRate,
    reteFuenteAmount,
    reteFuenteReason,
    applyReteIva,
    reteIvaRate,
    reteIvaAmount,
    reteIvaReason,
    applyReteIca,
    reteIcaRate,
    reteIcaAmount,
    reteIcaReason,
    totalWithholdings,
    netPayable,
    requiresSupportDocument: isNonVatPayer || vendorRut.requiereDocumentoSoporte,
  };
}
