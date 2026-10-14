/**
 * ProjectSchema.ts
 * Arquitectura Base y Esquemas Dinámicos para el ERP de Inteckno S.A.S.
 * Especialidad: Sistemas de Transporte por Cable (Teleféricos), Inspecciones END (MRT),
 * Montajes Electromecánicos y Trabajo en Alturas Crítico.
 * CERO Mock Data: Persistencia en Firebase Client-Side y almacenamiento local IndexedDB.
 */

export type IntecknoServiceCategory = 
  | 'mantenimiento' // Mantenimiento
  | 'proyectos_especiales' // Proyectos Especiales
  | 'implementacion' // Implementación
  | 'inspecciones_predictivo' // Inspecciones y Mantenimiento Predictivo
  | 'consultoria_diseno' // Consultoría y Diseño
  | 'formacion_tecnica'; // Formación Técnica

export type STCLineOfBusiness = IntecknoServiceCategory | 'inspecciones_end' | 'mantenimiento_montaje';

// Subservicios oficiales por cada Categoría
export const INTECKNO_SERVICES_CATALOG: Record<IntecknoServiceCategory, { label: string; subServices: string[] }> = {
  mantenimiento: {
    label: 'Mantenimiento Electromecánico STC',
    subServices: [
      'Mantenimiento Mayor de Balancines y Rodillos',
      'Overhaul de Volantes y Grupos Motrices',
      'Desarme, Inspección y Calibración de Mordazas',
      'Cambio y Empalme de Cables Tractores / Portadores',
      'Alineación y Mantenimiento de Pilonas',
      'Mantenimiento General de Reductores y Tracción'
    ]
  },
  proyectos_especiales: {
    label: 'Proyectos Especiales',
    subServices: [
      'Modernización Electromecánica Integral',
      'Reubicación y Reforzamiento de Pilonas',
      'Upgrade de Sistema de Tracción y Control',
      'Modificación y Adaptación de Estaciones',
      'Automatización y Sistemas de Seguridad Operativa'
    ]
  },
  implementacion: {
    label: 'Implementación y Montaje',
    subServices: [
      'Montaje Electromecánico Completo de Teleférico',
      'Tendido, Tensado y Empalme de Cable Inicial',
      'Instalación y Pruebas de Cabinas y Vehículos',
      'Puesta en Marcha y Pruebas de Carga',
      'Montaje de Estaciones Motriz y de Retorno'
    ]
  },
  inspecciones_predictivo: {
    label: 'Inspecciones y Mantenimiento Predictivo (MRT / END)',
    subServices: [
      'Inspección Magneto-inductiva (MRT) de Cables (UNE EN 12927)',
      'Ensayo por Ultrasonido (UT) en Ejes y Soldaduras',
      'Líquidos Penetrantes (PT) en Componentes Críticos',
      'Partículas Magnéticas (MT) en Estructuras',
      'Inspección Visual Técnica (VT) y Termografía',
      'Medición de Espesores y Diagnóstico Predictivo'
    ]
  },
  consultoria_diseno: {
    label: 'Consultoría y Diseño de Ingeniería',
    subServices: [
      'Estudio de Prefactibilidad Técnica y Trazado STC',
      'Diseño y Cálculo Estructural de Teleféricos',
      'Interventoría y Supervisión Técnica Especializada',
      'Auditoría y Peritaje Técnico Independiente',
      'Planes de Mantenimiento y Vida Útil Remanente'
    ]
  },
  formacion_tecnica: {
    label: 'Formación Técnica Especializada',
    subServices: [
      'Capacitación en Operación Segura de Teleféricos',
      'Formación en Mantenimiento de Empalmes y Cables',
      'Entrenamiento en Rescate Vertical y Evacuación en Línea',
      'Seminario Técnico en Interpretación de Ensayos END/MRT',
      'Certificación Operativa de Personal en Campo'
    ]
  }
};

export type ProjectLifecycleStatus = 
  | 'active' // En ejecución
  | 'in_adjustments' // En ajustes
  | 'on_hold' // En espera (En pausa)
  | 'cancelled' // Cancelado
  | 'completed' // Cerrado / Finalizado
  | 'archived' // Archivado
  | 'kickoff' 
  | 'in_closing' 
  | 'closed';

// ---------------------------------------------------------------------------
// 1. MOTOR DE ESQUEMAS DINÁMICOS POR CATEGORÍA
// ---------------------------------------------------------------------------

/**
 * 1. Mantenimiento / Proyectos Especiales / Implementación
 */
export interface MantenimientoMontajeSchemaData {
  cableInterventionLengthMeters: number; // Longitud del cable intervenido
  componentIntervened: 
    | 'Balancines' 
    | 'Volantes' 
    | 'Reductores' 
    | 'Mordazas' 
    | 'Pilonas_Torres' 
    | 'Cable_Tractor_Portador' 
    | 'Cabinas_Vehiculos';
  systemType?: 'teleferico_monocable' | 'teleferico_bicable' | 'funicular' | 'teleferico_vaiven';
  towersCount?: number;
  cableSplicingRequired?: boolean;
  splicingLengthMeters?: number;
  heavyLiftingRequired?: boolean;
}

/**
 * 2. Inspecciones y Mantenimiento Predictivo (MRT, END, Ultrasonido)
 */
export interface InspeccionesENDSchemaData {
  applicableStandard: 'UNE EN 12927' | 'UNE EN 1709' | 'ISO 4309' | 'ASTM E165' | string; // Normativa aplicable
  measurementEquipmentId?: string; // Equipo de medición a utilizar (MRT, detector UT)
  measurementEquipmentName: string;
  testType: 'MRT' | 'Ultrasonido' | 'Tintas' | 'Particulas_Magneticas' | 'Visual_VT';
  cableDiameterMm?: number;
  cableLengthMeters?: number;
  cableConstruction?: string;
  mrtSensorHead?: string;
  defectsAcceptanceLimit?: string;
}

/**
 * 3. Consultoría y Diseño
 */
export interface ConsultoriaDisenoSchemaData {
  studyPhase: 'Prefactibilidad' | 'Diseño' | 'Supervisión' | 'Interventoría' | 'Peritaje'; // Fase del Estudio
  deliverablesExpected: string[];
  scopeSummary: string;
  calculationSoftwareUsed?: string;
}

/**
 * 4. Formación Técnica
 */
export interface FormacionTecnicaSchemaData {
  trainingTopic: string; // Tema de Capacitación
  targetAudience: string; // ej. Técnicos de Mantenimiento, Operadores
  sessionHours: number;
  attendeesCountEstimate?: number;
  certificationIssued: boolean;
}

export type STCDynamicData = 
  | MantenimientoMontajeSchemaData 
  | InspeccionesENDSchemaData 
  | ConsultoriaDisenoSchemaData 
  | FormacionTecnicaSchemaData 
  | Record<string, any>;

// ---------------------------------------------------------------------------
// 2. SUMINISTROS, REPUESTOS CRÍTICOS Y EQUIPOS DE INSPECCIÓN (MRT)
// ---------------------------------------------------------------------------

export interface CriticalSparePart {
  id: string;
  partCode: string; // ej. SKF-23140-CC, GUARN-4800, MORD-DT104
  name: string; // Rodamiento, Guarnición de volante, Mordaza
  category: 'rodamientos' | 'guarniciones' | 'mordazas' | 'ejes' | 'sensores' | 'otros';
  quantityReceived: number;
  receivedDate: string;
  qualityCertificateUrl: string; // OBLIGATORIO al recibir repuesto crítico
  qualityCertificateName?: string;
  supplier: string;
  batchNumber?: string;
  verifiedBy: string;
  certificateNumber?: string;
  acceptanceStatus: 'aprobado' | 'cuarentena' | 'rechazado';
}

export interface InspectionEquipment {
  id: string;
  equipmentName: string; // ej. Equipo Magneto-inductivo MRT Intron, Detector UT Krautkramer
  serialNumber: string;
  brand: string;
  model: string;
  calibrationDate: string;
  calibrationExpiryDate: string; // Fecha de expiración de calibración
  calibrationCertificateUrl?: string; // PDF Certificado de Calibración
  calibrationCertificateName?: string;
  laboratoryName: string;
  status: 'calibrado' | 'por_vencer' | 'vencido' | 'fuera_servicio';
}

// ---------------------------------------------------------------------------
// 3. HOJA DE HORAS CON VALIDACIÓN NIVEL I/II EN END Y GPS EN MONTAÑA
// ---------------------------------------------------------------------------

export interface ProjectTimesheetEntry {
  id: string;
  projectId: string;
  taskId: string;
  taskName: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string;
  hours: number;
  
  // Regla END: Certificación Nivel I o II en HR
  isEndTask: boolean;
  endMethod?: 'MRT' | 'UT' | 'PT' | 'MT' | 'VT';
  inspectorCertLevel?: 'Nivel I' | 'Nivel II' | 'Nivel III' | 'no_certificado';
  certExpiryDate?: string;
  isCertValid?: boolean;
  
  workDescription: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    altitudeMeters?: number;
    capturedAt: string;
  };
  status: 'borrador' | 'aprobado' | 'rechazado';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 4. SEGURIDAD HSEQ (ARO EN TELEFÉRICOS) - PERSISTENCIA OFFLINE INDEXEDDB
// ---------------------------------------------------------------------------

export type TelefericoPermitType = 
  | 'trabajo_en_alturas_pilonas'
  | 'rescate_en_linea'
  | 'intervencion_volante_reductor'
  | 'empalme_cable_tension'
  | 'espacio_confinado_estacion'
  | 'trabajo_en_caliente';

export interface HSEQAroPermit {
  id: string;
  projectId: string;
  permitNumber: string; // ej. ARO-STC-001
  permitType: TelefericoPermitType;
  date: string;
  startTime: string;
  endTime: string;
  workLocation: string; // ej. Pilona 7, Estación Motriz, Estación Retorno
  towerNumber?: string;
  heightMeters?: number;
  taskDescription: string;
  
  // Pruebas y Controles en Alturas / Teleféricos
  safetyChecklist: {
    heightEquipmentInspected: boolean; // Arnés, eslingas doble terminal con absorbedor
    rescueKitOnSite: boolean; // Kit de descenso y evacuación en línea disponible
    lifelineAnchored: boolean; // Línea de vida vertical / horizontal certificada
    radioCommunicationsVerified: boolean; // Comunicación radial entre pilona y estación
    weatherPermitConfirmed: boolean; // Viento < 40 km/h, sin tormenta eléctrica
    lockoutTagoutApplied: boolean; // Bloqueo mecánico y eléctrico (LOTO) en sala de máquinas
    extinguisherAvailable?: boolean; // Para trabajo en caliente
  };
  
  authorizedPersonnel: Array<{
    name: string;
    idNumber: string;
    heightCertStatus: 'vigente' | 'vencido';
    signatureCaptured: boolean;
  }>;
  personnelNames?: string[];
  
  supervisorName: string;
  supervisorApproved: boolean;
  isOfflineDraft: boolean;
  syncedToFirebase: boolean;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// 5. ÓRDENES DE CAMBIO (Addendums Inmutables)
// ---------------------------------------------------------------------------

export interface ProjectChangeOrder {
  id: string;
  projectId: string;
  orderNumber: string; // ej. ADD-001
  title: string;
  justification: string;
  amountAddedCOP: number;
  amountAddedUSD: number;
  daysAdded: number;
  requestedBy: string;
  approvedByClient: string;
  approvalDate: string;
  supportDocUrl?: string;
  status: 'propuesta' | 'aprobada' | 'rechazada';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 6. MATRIZ DE COSTOS Y PRESUPUESTO
// ---------------------------------------------------------------------------

export interface CostMatrixItem {
  id: string;
  category: 'mano_obra' | 'repuestos_materiales' | 'subcontratos' | 'viaticos';
  concept: string;
  unit: string;
  plannedQuantity: number;
  plannedUnitCost: number;
  plannedTotal: number;
  actualQuantity: number;
  actualUnitCost: number;
  actualTotal: number;
  variance: number;
}

// ---------------------------------------------------------------------------
// 7. ESQUEMA PRINCIPAL DE PROYECTO STC TELEFÉRICOS
// ---------------------------------------------------------------------------

export interface STCFullProject {
  id: string;
  code: string;
  name: string;
  clientName: string;
  clientNit?: string;
  categoryId: string;
  serviceId: string;
  lineOfBusiness?: STCLineOfBusiness;
  serviceType?: string;
  location: string;
  costCenter: string;
  status: ProjectLifecycleStatus;
  startDate: string;
  endDate: string;
  
  // Líneas base contractuales
  baselineBudgetCOP: number;
  baselineBudgetUSD: number;
  currentBudgetCOP: number;
  currentBudgetUSD: number;
  
  // Indicadores EVM
  budgetPV: number;
  earnedValueEV: number;
  actualCostAC: number;
  spi: number;
  cpi: number;
  cv: number;
  progressPercent: number;

  // Responsables
  projectLeaderId: string;
  projectLeaderName: string;
  commercialContactName?: string;
  commercialContactEmail?: string;

  // Motor dinámico específico para Teleféricos
  dynamicData: Record<string, any>;

  // Listas hijas integradas
  criticalSpares: CriticalSparePart[];
  inspectionEquipment: InspectionEquipment[];
  changeOrders: ProjectChangeOrder[];
  costMatrix: CostMatrixItem[];

  createdAt: string;
  updatedAt: string;
}
