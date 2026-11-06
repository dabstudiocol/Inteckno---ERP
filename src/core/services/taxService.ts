/** Tasa de IVA/VAT/ITBMS general por país de ejecución del proyecto (Regla 8 y Auditoría Nivel 3). */
const normalize = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export interface TaxRule {
  countryCode: string;
  countryName: string;
  taxName: string;
  rate: number;
  label: string;
  authority: string;
}

export const TAX_REGISTRY: Record<string, TaxRule> = {
  CO: { countryCode: 'CO', countryName: 'Colombia', taxName: 'IVA', rate: 0.19, label: '19%', authority: 'DIAN' },
  MX: { countryCode: 'MX', countryName: 'México', taxName: 'IVA', rate: 0.16, label: '16%', authority: 'SAT' },
  PA: { countryCode: 'PA', countryName: 'Panamá', taxName: 'ITBMS', rate: 0.07, label: '7%', authority: 'DGI' },
  CL: { countryCode: 'CL', countryName: 'Chile', taxName: 'IVA', rate: 0.19, label: '19%', authority: 'SII' },
  PE: { countryCode: 'PE', countryName: 'Perú', taxName: 'IGV', rate: 0.18, label: '18%', authority: 'SUNAT' },
  BO: { countryCode: 'BO', countryName: 'Bolivia', taxName: 'IVA', rate: 0.13, label: '13%', authority: 'SIN' },
  EC: { countryCode: 'EC', countryName: 'Ecuador', taxName: 'IVA', rate: 0.15, label: '15%', authority: 'SRI' },
  ES: { countryCode: 'ES', countryName: 'España', taxName: 'IVA', rate: 0.21, label: '21%', authority: 'AEAT' },
  DO: { countryCode: 'DO', countryName: 'Rep. Dominicana', taxName: 'ITBIS', rate: 0.18, label: '18%', authority: 'DGII' },
  CR: { countryCode: 'CR', countryName: 'Costa Rica', taxName: 'IVA', rate: 0.13, label: '13%', authority: 'Hacienda' },
  GT: { countryCode: 'GT', countryName: 'Guatemala', taxName: 'IVA', rate: 0.12, label: '12%', authority: 'SAT' },
  AR: { countryCode: 'AR', countryName: 'Argentina', taxName: 'IVA', rate: 0.21, label: '21%', authority: 'AFIP' },
};

export function getProjectTaxRate(country?: string): {
  rate: number;
  label: string;
  countryName: string;
  countryCode: string;
  taxName: string;
  taxAppliedCode: string;
} {
  const upper = (country || '').trim().toUpperCase();
  if (TAX_REGISTRY[upper]) {
    const r = TAX_REGISTRY[upper];
    return {
      rate: r.rate,
      label: r.label,
      countryName: r.countryName,
      countryCode: r.countryCode,
      taxName: r.taxName,
      taxAppliedCode: `${r.countryCode}_${r.taxName}`,
    };
  }

  const norm = normalize(country || '');
  const matchEntry = Object.values(TAX_REGISTRY).find((r) => {
    const normName = normalize(r.countryName);
    return norm.includes(normName) || (r.countryCode === 'DO' && norm.includes('dominicana'));
  });

  const resolved = matchEntry || TAX_REGISTRY.CO;
  return {
    rate: resolved.rate,
    label: resolved.label,
    countryName: resolved.countryName,
    countryCode: resolved.countryCode,
    taxName: resolved.taxName,
    taxAppliedCode: `${resolved.countryCode}_${resolved.taxName}`,
  };
}

export class TaxEngine {
  public static calculateProjectFinancials(
    countryOrCode: string | undefined,
    costMatrix: Array<{
      baseCost?: number;
      actualTotal?: number;
      actualAmount?: number;
      plannedTotal?: number;
      plannedAmount?: number;
      taxable?: boolean;
      hasIva?: boolean;
    }>
  ) {
    const taxRule = getProjectTaxRate(countryOrCode);
    let subtotal = 0;
    let taxableAmount = 0;

    for (const item of costMatrix || []) {
      const base = Number(
        item.baseCost ?? item.actualTotal ?? item.actualAmount ?? item.plannedTotal ?? item.plannedAmount ?? 0
      );
      const isTaxable = item.taxable !== undefined ? item.taxable : item.hasIva !== false;
      subtotal += base;
      if (isTaxable) {
        taxableAmount += base;
      }
    }

    const calculatedTaxTotal = Math.round(taxableAmount * taxRule.rate);
    const grandTotal = subtotal + calculatedTaxTotal;

    return {
      subtotal,
      taxableAmount,
      taxAppliedCode: taxRule.taxAppliedCode,
      effectiveTaxRate: taxRule.rate,
      calculatedTaxTotal,
      grandTotal,
    };
  }
}
