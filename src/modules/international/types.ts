export type UnitSystem = 'metric' | 'imperial';

export type Incoterm = 'EXW' | 'FCA' | 'FOB' | 'CPT' | 'CFR' | 'CIP' | 'CIF' | 'DAP' | 'DDP';

export type CurrencyCode = 'USD' | 'EUR' | 'COP' | 'MXN' | 'CLP' | 'PEN' | 'BOB' | 'CHF';

export type FreightMode = 'maritimo_fcl' | 'maritimo_lcl' | 'aereo_carga' | 'aereo_express' | 'terrestre_internacional';

export type PackagingType = 
  | 'madera_fumigada_nimf15'
  | 'vacio_vci_anticorrosion'
  | 'pallet_reforzado_pesado'
  | 'cuna_metalica_amortiguada'
  | 'huacal_estructural';

export type ContainerType = '20ft' | '40ft' | '40hc' | 'flat_rack' | 'open_top';

export interface CargoPackage {
  id: string;
  description: string;
  length: number; // en cm o pulgadas
  width: number;  // en cm o pulgadas
  height: number; // en cm o pulgadas
  weight: number; // en kg o lbs
  quantity: number;
  fragile: boolean;
  moistureSensitive: boolean;
  stackable: boolean;
}

export interface ContainerSpec {
  id: ContainerType;
  name: string;
  maxVolumeCBM: number;
  maxPayloadKg: number;
  innerLengthM: number;
  innerWidthM: number;
  innerHeightM: number;
}

export interface AiPackagingRecommendation {
  packagingType: PackagingType;
  packagingName: string;
  packagingCostUSD: number;
  freightMode: FreightMode;
  freightModeName: string;
  containerRecommendation: ContainerType;
  rationale: string;
  cbmTotal: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  containerOccupancyVolumePct: number;
  containerOccupancyWeightPct: number;
  suggestedMeasures: string;
}

export interface AiHsCodeRecommendation {
  hsCode: string;
  nomenclatureTitle: string;
  generalDutyPct: number;
  hasFtaAgreement: boolean;
  ftaName: string;
  preferentialDutyPct: number;
  certificateOfOriginType: string;
  rulesOfOriginNotes: string;
  rationale: string;
}

export interface ComplianceStandard {
  id: string;
  code: string;
  name: string;
  agency: string;
  mandatory: boolean;
  estimatedCostUSD: number;
  testingBody: string;
  description: string;
  selected: boolean;
}

export interface CurrencyRates {
  USD: number; // Base 1 USD
  EUR: number; // EUR per USD (ej: 0.92)
  COP: number; // COP per USD (ej: 4200)
  MXN: number; // MXN per USD (ej: 19.8)
  CLP: number; // CLP per USD (ej: 940)
  PEN?: number; // Sol Peruano por USD (ej: 3.75)
  BOB?: number; // Boliviano por USD (ej: 6.96)
  CHF?: number; // Franco Suizo por USD (ej: 0.88)
}

export interface InternationalCalculationState {
  // 1. Logística
  unitSystem: UnitSystem;
  packages: CargoPackage[];
  originCountry: string;
  destinationCountry: string;
  destinationCity: string;
  targetPackaging: PackagingType;
  packagingCostUSD: number;
  targetFreightMode: FreightMode;
  targetContainer: ContainerType;

  // 2. Costos de Fabricación & Incoterms
  manufacturingCostUSD: number;
  baseMarginPct: number; // Margen básico de venta sobre fabricación
  selectedIncoterm: Incoterm;

  // Logística Local Origen (FCA/FOB)
  inlandFreightOriginUSD: number;
  exportCustomsAndThcUSD: number;

  // Flete & Seguro Internacional (CFR/CIF)
  internationalFreightUSD: number;
  insuranceRatePct: number; // % sobre CFR (default 0.65%)
  insuranceMinUSD: number;

  // Destino (DAP)
  destinationThcAndPortUSD: number;
  inlandFreightDestinationUSD: number;

  // Aduana Destino (DDP)
  hsCode: string;
  hsDescription: string;
  baseDutyPct: number;
  isFtaApplied: boolean;
  ftaAgreementName: string;
  destinationCustomsBrokerUSD: number;
  localTaxesDestPct: number; // IVA / Impuestos importación en destino

  // 4. Financiero & Riesgo
  quoteCurrency: CurrencyCode;
  exchangeRates: CurrencyRates;
  forexRiskMarginPct: number; // Margen de volatilidad cambiaria (ej: 1.5%)
  hasLetterOfCredit: boolean;
  letterOfCreditCostPct: number; // Costo L/C (ej: 1.8%)
  hasBankGuarantee: boolean;
  bankGuaranteeCostUSD: number; // Póliza cumplimiento
  creditTermDays: 0 | 30 | 60 | 90 | 120;
  financingAnnualRatePct: number; // Tasa de financiamiento (ej: 9.5% anual)

  // 5. Compliance
  complianceStandards: ComplianceStandard[];
}

export interface QuoteCostBreakdown {
  // Acumulados por Incoterm
  exwManufacturingUSD: number;
  exwBaseProfitUSD: number;
  exwPriceUSD: number;

  exportPackagingUSD: number;
  inlandFreightOriginUSD: number;
  exportCustomsUSD: number;
  fobPriceUSD: number;

  internationalFreightUSD: number;
  cfrPriceUSD: number;

  transitInsuranceUSD: number;
  cifPriceUSD: number;

  destinationPortAndThcUSD: number;
  inlandFreightDestinationUSD: number;
  dapPriceUSD: number;

  importDutyUSD: number;
  importBrokerAndFormalitiesUSD: number;
  destinationTaxesUSD: number;
  ddpPriceUSD: number;

  // Financieros & Riesgo
  forexRiskBufferUSD: number;
  letterOfCreditCostUSD: number;
  bankGuaranteeCostUSD: number;
  financingCostUSD: number;
  totalFinancialCostUSD: number;

  // Compliance
  complianceCostUSD: number;

  // Totales
  selectedIncotermPriceUSD: number;
  selectedIncotermPriceTargetCurrency: number;
  totalCostIntecknoUSD: number;
  totalProfitIntecknoUSD: number;
  totalProfitIntecknoCOP: number;
  netMarginPct: number;

  // Metadatos
  totalGrossWeightKg: number;
  totalCBM: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  containerOccupancyPct: number;
}

export type OpportunityCategory = 
  | 'licitacion_publica'
  | 'compra_privada_repuestos'
  | 'mantenimiento_mayor'
  | 'proyecto_nuevo_stc'
  | 'modernizacion_tecnologica';

export type OpportunityStatus = 
  | 'abierta'
  | 'en_evaluacion'
  | 'convocatoria_proxima'
  | 'adjudicada';

export interface GlobalOpportunity {
  id: string;
  title: string;
  entity: string;
  country: string;
  city: string;
  flag: string;
  category: OpportunityCategory;
  categoryLabel: string;
  status: OpportunityStatus;
  budgetUSD: number;
  budgetLocal: string;
  deadline: string;
  publishedDate: string;
  sourcePlatform: string;
  sourceUrl: string;
  procurementCode?: string;
  matchScore: number; // 0 - 100
  matchReason: string;
  productsRequired: string[];
  scopeSummary: string;
  aiStrategy: string;
  competitorsExpected: string[];
  contactName?: string;
  contactEmail?: string;
  isConvertedToCrm?: boolean;
  // Trazabilidad & Verificación Oficial
  directSourceUrl?: string; // Enlace directo a la convocatoria o pliego oficial específico
  officialDocuments?: { name: string; url: string; type: 'pdf' | 'web' }[]; // Enlaces a bases, pliegos o anexos oficiales
  officialExcerpt?: string; // Extracto textual del pliego oficial / objeto contractual
  verificationSteps?: string[]; // Paso a paso para auditar y ubicar la oportunidad en el portal
  directSearchUrl?: string; // Enlace de búsqueda directa (Google / Buscador gubernamental oficial)
  sourcePlatformUrl?: string; // URL raíz oficial activa del portal
  entityTaxId?: string; // Identificador fiscal de la entidad (NIT, RFC, RUT)
  legalFramework?: string; // Marco legal de contratación pública
}

