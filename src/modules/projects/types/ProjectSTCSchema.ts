/**
 * ProjectSTCSchema.ts
 * Motor de Esquemas Dinámicos y Tipos Fuertes para Proyectos STC de Ingeniería Mecánica.
 * Especialidades: Piping (Tuberías de Alta Presión), Estructuras Metálicas y Tanques (API 650).
 * Cero Mock Data: Diseñado para persistencia pura en Cloud Firestore y consumo en cliente.
 */

export type STCProjectType = 'piping' | 'estructuras' | 'tanques' | 'montaje_integral';

// ---------------------------------------------------------------------------
// 1. DYNAMIC SCHEMA ENGINE STC: Parámetros específicos por especialidad
// ---------------------------------------------------------------------------

export interface PipingDynamicData {
  nominalDiameterInches: number; // Pulgadas Diametrales (ej: 2", 4", 8", 12")
  totalDiameterInchesInch: number; // Pulgadas Diametrales totales a soldar (Factor P.D.)
  designPressurePSI: number; // Presión de diseño (ej: 150, 300, 600, 1500 PSI)
  testPressurePSI: number; // Presión de prueba hidrostática (ej: 1.5x diseño)
  schedule: 'SCH 10' | 'SCH 40' | 'SCH 80' | 'SCH 160' | 'SCH XXS';
  materialGrade: 'A106-B' | 'A333-Gr6' | 'A312-TP316L' | 'API 5L-X52' | 'API 5L-X65';
  fluidType: 'vapor' | 'hidrocarburo' | 'gas_alta_presion' | 'agua_enfriamiento' | 'acido';
  isometricSheetNumbers: string[]; // Números de planos isométricos asociados
  ndtTestingRequirement: 'RT_100%' | 'RT_20%' | 'UT_Phased_Array' | 'PT_100%' | 'VT_Visual';
}

export interface StructuresDynamicData {
  totalTonnageTon: number; // Tonelaje proyectado en toneladas métricas
  profileTypes: Array<'W' | 'IPE' | 'HEB' | 'HEA' | 'UPN' | 'Tubular_HSS'>;
  steelGrade: 'A36' | 'A572-Gr50' | 'A992' | 'A588_CorTen';
  paintSystem: 'epoxico_poliamida' | 'poliuretano_alifatico' | 'inorganico_zinc' | 'galvanizado_caliente';
  dryFilmThicknessMils: number; // Espesor de película seca en Mils (DFT)
  torqueInspectionPct: number; // % Inspección de pernos pretensados (ASTM A325 / A490)
  craneRequirementTon: number; // Capacidad de izaje requerida en obra (Ton)
}

export interface TanksDynamicData {
  designStandard: 'API 650' | 'API 620' | 'UL 142' | 'AWWA D100';
  capacityBarrelsOrM3: number; // Capacidad volumétrica (BBL o m³)
  diameterMeters: number;
  heightMeters: number;
  shellCoursesCount: number; // Cantidad de anillos de virola
  basePlateMaterial: 'A36' | 'A283-C' | 'A516-Gr70' | 'SS-304L' | 'SS-316L';
  roofType: 'conico_fijo' | 'flotante_externo' | 'flotante_interno' | 'domo_geodesico';
  hydrostaticTestDate?: string;
  vacuumBoxBottomTestRequired: boolean;
}

export type STCDynamicData = PipingDynamicData | StructuresDynamicData | TanksDynamicData | Record<string, any>;

// ---------------------------------------------------------------------------
// 2. CONTROL DE CALIDAD QC & TRAZABILIDAD (Mill Test, Coladas, Ensayos)
// ---------------------------------------------------------------------------

export interface MillTestCertificate {
  id: string;
  heatNumber: string; // Número de colada o lote de acería (Heat No.)
  materialDescription: string;
  standardNorm: string; // ej: ASTM A106 Gr B / ASTM A516 Gr 70
  supplierName: string;
  purchaseOrderId?: string;
  certificatePdfUrl: string; // URL en Firebase Storage
  chemicalComposition?: {
    carbonPct?: number;
    manganesePct?: number;
    phosphorusPct?: number;
    sulfurPct?: number;
    siliconPct?: number;
  };
  mechanicalProperties?: {
    yieldStrengthPSI?: number; // Límite de fluencia
    tensileStrengthPSI?: number; // Resistencia a la tracción
    elongationPct?: number;
    impactCharpyJoules?: number;
  };
  inspectorAcceptedBy: string;
  inspectorAcceptedAt: string;
  verificationStatus: 'aprobado' | 'observado' | 'rechazado';
}

export interface WeldJointTraceability {
  id: string;
  jointCode: string; // ej: J-001-ISO-04
  isometricNumber: string;
  nominalDiameter: number;
  schedule: string;
  weldProcess: 'SMAW' | 'GTAW' | 'GMAW' | 'FCAW' | 'SAW';
  welderId: string; // Referencia al ID del soldador en HR
  welderStamp: string; // Estampa del soldador (ej: ST-04)
  wpsCode: string; // Procedimiento de soldadura WPS calificado
  fillerHeatNumber: string; // Colada del electrodo o aporte (E7018 / ER70S-6)
  baseMetalHeatNumber: string; // Colada del tubo / accesorio
  ndtResult: 'pendiente' | 'aprobado' | 'rechazado_reparacion';
  ndtReportNumber?: string;
  dateWelded: string;
}

// ---------------------------------------------------------------------------
// 3. SEGURIDAD Y HSEQ OFFLINE (Permisos de Alto Riesgo & Geocercas)
// ---------------------------------------------------------------------------

export type HighRiskPermitType =
  | 'trabajo_en_caliente' // Soldadura, corte y oxicorte
  | 'espacio_confinado' // Interior de tanques o tuberías enterradas
  | 'trabajo_en_alturas' // Izajes y montaje de estructuras > 1.50m
  | 'izaje_critico'; // Maniobras con grúas telescópicas

export interface HighRiskSafetyPermitOffline {
  id: string;
  projectId: string;
  permitType: HighRiskPermitType;
  date: string;
  startTime: string;
  endTime: string;
  workLocationDetails: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    timestamp: number;
  };
  gasMeasurement?: {
    oxygenPct: number; // Normal: 19.5% - 23.5%
    lelExplosivityPct: number; // < 10% LEL
    carbonMonoxidePPM: number; // < 25 ppm
    h2sPPM: number; // < 10 ppm
    measuredAt: string;
  };
  fireWatchAssignedName: string; // Vigía de fuego
  safetyChecklist: {
    extinguisherInPlace: boolean;
    fireBlanketInstalled: boolean; // Mantas ignífugas
    atmosphericTestClear: boolean;
    harnessInspected: boolean;
    rescuePlanAvailable: boolean;
  };
  authorizedWorkers: Array<{
    userId: string;
    name: string;
    wpqCertStatus: 'vigente' | 'vencido' | 'no_aplica';
    signatureBase64?: string;
  }>;
  supervisorSignatureBase64: string;
  status: 'borrador_offline' | 'activo' | 'cerrado' | 'sincronizado';
  isSyncedToFirestore: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// 4. CONTROL FINANCIERO Y ÓRDENES DE CAMBIO (Addendums Inmutables)
// ---------------------------------------------------------------------------

export interface STCChangeOrderAddendum {
  id: string;
  addendumNumber: string; // ej: ADD-001
  title: string;
  justification: string;
  additionalAmountCOP: number;
  additionalAmountUSD: number;
  additionalDays: number;
  approvedByClientRepresentative: string;
  approvedAt: string;
  supportActDocumentUrl?: string;
  status: 'propuesto' | 'aprobado_cliente' | 'rechazado';
}

// ---------------------------------------------------------------------------
// 5. PROYECTO PRINCIPAL STC (Entidad Almacenada en Firestore)
// ---------------------------------------------------------------------------

export interface STCProjectSchema {
  id: string;
  code: string; // ej: STC-PRJ-2026-001
  name: string;
  client: string;
  projectType: STCProjectType;
  location: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number; // Radio de tolerancia de geocerca en planta/obra (ej. 250m)
  contractNumber: string;
  startDate: string;
  endDate: string;
  baselineBudgetUSD: number;
  baselineBudgetCOP: number;
  currentBudgetUSD: number; // Presupuesto actualizado con Addendums
  currentBudgetCOP: number;
  progressPercent: number;
  status: 'planeacion' | 'fabricacion_taller' | 'montaje_campo' | 'pruebas_precom' | 'entregado' | 'pausado';

  // Dynamic Schema Container
  dynamicData: STCDynamicData;

  // Trazabilidad y Control Documental
  millTestCertificates: MillTestCertificate[];
  weldJoints: WeldJointTraceability[];
  addendums: STCChangeOrderAddendum[];

  // Auditoría Firestore
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}
