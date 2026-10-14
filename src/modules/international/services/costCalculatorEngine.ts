import { InternationalCalculationState, QuoteCostBreakdown } from '../types';
import { calculateCargoMetrics } from './internationalAiService';

export function calculateQuoteBreakdown(state: InternationalCalculationState): QuoteCostBreakdown {
  const metrics = calculateCargoMetrics(state.packages, state.unitSystem);

  // 1. EXW (Costo Base + Utilidad Base de Fabricación)
  const exwManufacturingUSD = state.manufacturingCostUSD || 0;
  const exwBaseProfitUSD = exwManufacturingUSD * ((state.baseMarginPct || 0) / 100);
  const exwPriceUSD = exwManufacturingUSD + exwBaseProfitUSD;

  // 2. FOB / FCA (Salida de Origen)
  const exportPackagingUSD = state.packagingCostUSD || 0;
  const inlandFreightOriginUSD = state.inlandFreightOriginUSD || 0;
  const exportCustomsUSD = state.exportCustomsAndThcUSD || 0;
  const fobPriceUSD = exwPriceUSD + exportPackagingUSD + inlandFreightOriginUSD + exportCustomsUSD;

  // 3. CFR / CPT (Flete Internacional)
  const internationalFreightUSD = state.internationalFreightUSD || 0;
  const cfrPriceUSD = fobPriceUSD + internationalFreightUSD;

  // 4. CIF / CIP (Seguro Marítimo / Aéreo)
  const calculatedInsurance = cfrPriceUSD * ((state.insuranceRatePct || 0.65) / 100);
  const transitInsuranceUSD = Math.max(calculatedInsurance, state.insuranceMinUSD || 150);
  const cifPriceUSD = cfrPriceUSD + transitInsuranceUSD;

  // 5. DAP (Llegada a Puerto Destino + Transporte Terrestre Interno)
  const destinationPortAndThcUSD = state.destinationThcAndPortUSD || 0;
  const inlandFreightDestinationUSD = state.inlandFreightDestinationUSD || 0;
  const dapPriceUSD = cifPriceUSD + destinationPortAndThcUSD + inlandFreightDestinationUSD;

  // 6. DDP (Impuestos y Aduana de Llegada)
  const effectiveDutyPct = state.isFtaApplied ? 0 : (state.baseDutyPct || 0);
  const importDutyUSD = Math.round(cifPriceUSD * (effectiveDutyPct / 100));
  const importBrokerAndFormalitiesUSD = state.destinationCustomsBrokerUSD || 0;
  const destinationTaxesUSD = Math.round(cifPriceUSD * ((state.localTaxesDestPct || 0) / 100));
  const ddpPriceUSD = dapPriceUSD + importDutyUSD + importBrokerAndFormalitiesUSD + destinationTaxesUSD;

  // Base de precio según el Incoterm seleccionado por el usuario
  let baseIncotermPriceUSD = 0;
  switch (state.selectedIncoterm) {
    case 'EXW':
      baseIncotermPriceUSD = exwPriceUSD;
      break;
    case 'FCA':
    case 'FOB':
      baseIncotermPriceUSD = fobPriceUSD;
      break;
    case 'CPT':
    case 'CFR':
      baseIncotermPriceUSD = cfrPriceUSD;
      break;
    case 'CIP':
    case 'CIF':
      baseIncotermPriceUSD = cifPriceUSD;
      break;
    case 'DAP':
      baseIncotermPriceUSD = dapPriceUSD;
      break;
    case 'DDP':
    default:
      baseIncotermPriceUSD = ddpPriceUSD;
      break;
  }

  // Costos Financieros & Gestión de Riesgo (calculados sobre el subtotal del Incoterm)
  const forexRiskBufferUSD = Math.round(baseIncotermPriceUSD * ((state.forexRiskMarginPct || 0) / 100));

  const letterOfCreditCostUSD = state.hasLetterOfCredit
    ? Math.round(baseIncotermPriceUSD * ((state.letterOfCreditCostPct || 0) / 100))
    : 0;

  const bankGuaranteeCostUSD = state.hasBankGuarantee ? (state.bankGuaranteeCostUSD || 0) : 0;

  const financingCostUSD =
    state.creditTermDays > 0
      ? Math.round(baseIncotermPriceUSD * ((state.financingAnnualRatePct || 0) / 100) * (state.creditTermDays / 360))
      : 0;

  const totalFinancialCostUSD = forexRiskBufferUSD + letterOfCreditCostUSD + bankGuaranteeCostUSD + financingCostUSD;

  // Compliance & Normativas Técnicas Seleccionadas
  const complianceCostUSD = state.complianceStandards
    ? state.complianceStandards.filter((s) => s.selected).reduce((acc, s) => acc + (s.estimatedCostUSD || 0), 0)
    : 0;

  // Precio Final Comercial en USD para el cliente
  const selectedIncotermPriceUSD = Math.round(baseIncotermPriceUSD + totalFinancialCostUSD + complianceCostUSD);

  // Conversión a la divisa solicitada por el cliente
  const targetRate = state.exchangeRates[state.quoteCurrency] || 1;
  const selectedIncotermPriceTargetCurrency = Math.round(selectedIncotermPriceUSD * targetRate * 100) / 100;

  // Costo Real Total para Inteckno (gastos puros sin margen de ganancia)
  let directExpensesUSD = 0;
  if (['FCA', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm)) {
    directExpensesUSD += exportPackagingUSD + inlandFreightOriginUSD + exportCustomsUSD;
  }
  if (['CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm)) {
    directExpensesUSD += internationalFreightUSD;
  }
  if (['CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm)) {
    directExpensesUSD += transitInsuranceUSD;
  }
  if (['DAP', 'DDP'].includes(state.selectedIncoterm)) {
    directExpensesUSD += destinationPortAndThcUSD + inlandFreightDestinationUSD;
  }
  if (state.selectedIncoterm === 'DDP') {
    directExpensesUSD += importDutyUSD + importBrokerAndFormalitiesUSD + destinationTaxesUSD;
  }

  // Costos financieros puros asumidos (excluyendo el colchón forex que es margen de contingencia)
  const financialExpensesUSD = letterOfCreditCostUSD + bankGuaranteeCostUSD + financingCostUSD;
  const complianceExpensesUSD = complianceCostUSD;

  const totalCostIntecknoUSD = Math.round(exwManufacturingUSD + directExpensesUSD + financialExpensesUSD + complianceExpensesUSD);
  
  // Utilidad Real Inteckno (Precio Final menos Costos Reales)
  const totalProfitIntecknoUSD = selectedIncotermPriceUSD - totalCostIntecknoUSD;
  const totalProfitIntecknoCOP = Math.round(totalProfitIntecknoUSD * (state.exchangeRates.COP || 4200));

  const netMarginPct = selectedIncotermPriceUSD > 0
    ? Math.round((totalProfitIntecknoUSD / selectedIncotermPriceUSD) * 1000) / 10
    : 0;

  return {
    exwManufacturingUSD,
    exwBaseProfitUSD,
    exwPriceUSD,

    exportPackagingUSD,
    inlandFreightOriginUSD,
    exportCustomsUSD,
    fobPriceUSD,

    internationalFreightUSD,
    cfrPriceUSD,

    transitInsuranceUSD,
    cifPriceUSD,

    destinationPortAndThcUSD,
    inlandFreightDestinationUSD,
    dapPriceUSD,

    importDutyUSD,
    importBrokerAndFormalitiesUSD,
    destinationTaxesUSD,
    ddpPriceUSD,

    forexRiskBufferUSD,
    letterOfCreditCostUSD,
    bankGuaranteeCostUSD,
    financingCostUSD,
    totalFinancialCostUSD,

    complianceCostUSD,

    selectedIncotermPriceUSD,
    selectedIncotermPriceTargetCurrency,
    totalCostIntecknoUSD,
    totalProfitIntecknoUSD,
    totalProfitIntecknoCOP,
    netMarginPct,

    totalGrossWeightKg: metrics.totalGrossWeightKg,
    totalCBM: metrics.totalCBM,
    volumetricWeightKg: metrics.totalAirVolumetricKg,
    chargeableWeightKg: ['aereo_carga', 'aereo_express'].includes(state.targetFreightMode)
      ? metrics.chargeableWeightAirKg
      : metrics.chargeableWeightSeaKg,
    containerOccupancyPct: Math.min(100, Math.round((metrics.totalCBM / 33.2) * 100)),
  };
}
