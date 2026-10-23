// ============================================================================
// INTECKNO ERP - MODELO DE TIPOS RELACIONALES DEL SISTEMA
// Especializado en Sistemas de Transporte por Cable (STC / Teleféricos)
// ============================================================================

export type UserRole =
  | 'admin_sistemas'
  | 'gerente_general'
  | 'gerente_administrativa'
  | 'gerente_proyectos'
  | 'lider_proyectos'
  | 'lider_ingenieria'
  | 'ingeniero_proyectos'
  | 'supervisor_tecnico'
  | 'tecnico_stc'
  | 'auxiliar_tecnico'
  | 'coord_comercial'
  | 'coord_compras'
  | 'almacenista'
  | 'coord_talento_humano'
  | 'auxiliar_talento_humano'
  | 'coord_administrativo'
  | 'auxiliar_administrativo'
  | 'hseq'
  | 'auxiliar_sst'
  | 'gestor_ambiental'
  | 'asistente_negocios_internacionales'
  | 'conductor'
  | 'practicante_ingenieria'
  | 'contador_externo';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  toastsEnabled: boolean;
  defaultCurrency: 'COP' | 'USD';
  visualDensity: 'comfortable' | 'compact';
  emailAlerts?: boolean;
  fontSize?: 'normal' | 'large' | 'larger';
  defaultLandingModule?: string;
  dateFormat?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  confirmBeforeDelete?: boolean;
}

export interface JobSalaryRange {
  min: number;
  max: number;
  currency: 'COP' | 'USD';
  isConfidential: boolean;
}

export interface JobPosition {
  id?: string;
  code: string;
  title: string;
  department?: string;
  purpose: string; // Pilar 1: Proposito del Cargo
  responsibilities: string[]; // Pilar 2: Responsabilidades Clave
  academicRequirements: string[]; // Pilar 3: Requisitos Academicos
  experienceRequired: string; // Pilar 4: Experiencia Requerida
  technicalSkills?: string[]; // Pilar 5: Habilidades Tecnicas
  technicalSkillsRequired?: string[]; // Pilar 5 alias
  softSkills?: string[]; // Pilar 6: Competencias Blandas
  softSkillsRequired?: string[]; // Pilar 6 alias
  workConditions: string[]; // Pilar 7: Condiciones Laborales
  salaryRange?: JobSalaryRange | string; // Pilar 8: Banda Salarial
  status?: 'activo' | 'vacante_abierta' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
}

export interface JobApplicationCandidate {
  id: string;
  jobPositionId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  cvFileUrl?: string;
  source: 'linkedin' | 'email' | 'manual_upload';
  aiAnalysis?: {
    compatibilityScore: number;
    strengths: string[];
    gaps: string[];
    recommendation: 'entrevistar' | 'reserva' | 'descartar';
    analyzedAt: string;
  };
  stage: 'nuevo' | 'preseleccionado' | 'entrevista' | 'contratado' | 'descartado';
  createdAt?: string;
}

export interface LucianaImprovementPlan {
  readinessScore: number;
  technicalGaps: string[];
  recommendedWikiArticles: string[];
  recommendedCourses?: string[];
  promotionalPath?: {
    nextRoleTitle: string;
    missingRequirements: string[];
  };
  summary: string;
  generatedAt: string;
}

export interface EvaluationScoreCriterion {
  criterion: string;
  category: 'responsabilidad' | 'habilidad' | 'hseq';
  score: number;
  comment?: string;
}

export interface PerformanceEvaluation {
  id: string;
  userId?: string;
  jobPositionId?: string;
  evaluatorId?: string;
  evaluatorName: string;
  type: 'periodo_prueba' | 'semestral' | 'anual';
  date: string;
  scores?: EvaluationScoreCriterion[];
  overallScore?: number;
  score?: number; // legacy alias
  feedback?: string;
  lucianaSummaryNotes?: string;
  employeeComments?: string;
  employeeSignedAt?: string;
  commitments: string[];
  status?: 'aprobado' | 'en_seguimiento' | 'destacado';
}

export interface VerifiedSkill {
  id: string;
  name: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';
  category?: 'stc' | 'hseq' | 'gestion' | 'herramientas' | 'software';
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface EmployeeCertification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  fileUrl?: string;
  status: 'vigente' | 'por_vencer' | 'vencido';
}

export interface DataPrivacyConsent {
  accepted: boolean;
  acceptedAt: string;
  policyVersion: string;
  ipAddress?: string;
}

export interface WorkExperience {
  id: string;
  role: string;
  company: string;
  city?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  level?: string;
  graduationYear?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  level: string;
}

export interface ProfessionalProfile {
  headline?: string;
  summary?: string;
  experience: WorkExperience[];
  education: EducationItem[];
  certifications: EmployeeCertification[];
  practicalSkills: string[];
  softSkills: string[];
  languages: LanguageItem[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  roleLabel: string;
  department: string;
  avatar: string;
  avatarColor: string;
  phone: string;
  birthDate?: string;
  bloodType?: string;
  address?: string;
  city?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
  isActive?: boolean;
  nationalId?: string; // Cédula o Documento de Identidad
  accountStatus?: 'activa' | 'suspendida' | 'desactivada';
  jobPositionId?: string; // Referencia al cargo oficial del Módulo de Cargos
  m365AccountSynced?: boolean;
  m365Id?: string;
  lastLoginAt?: string;
  forcePasswordChange?: boolean;
  onboardingCompleted?: boolean;
  inductionPath?: string;
  competencies: string[];
  hseqStatus: 'valid' | 'expired' | 'pending';
  hseqExpiresAt: string;
  canWorkHeights: boolean;
  preferences?: UserPreferences;
  // Ficha de Cargo Oficial ITK & Evaluaciones
  jobPosition?: JobPosition;
  jobReadinessScore?: number;
  lucianaImprovementPlan?: LucianaImprovementPlan;
  performanceEvaluations?: PerformanceEvaluation[];
  verifiedSkills?: VerifiedSkill[];
  certifications?: EmployeeCertification[];
  linkedInUrl?: string;
  professionalProfile?: ProfessionalProfile;
  dataPrivacyConsent?: DataPrivacyConsent;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  module?: 'usuarios' | 'gastos' | 'inventario' | 'compras' | 'facturacion' | 'proyectos';
  action:
    | 'user_created'
    | 'user_updated'
    | 'role_changed'
    | 'password_reset'
    | 'account_deactivated'
    | 'account_reactivated'
    | 'permission_changed'
    | 'expense_created'
    | 'expense_approved'
    | 'stock_adjusted'
    | 'stock_updated'
    | 'equipment_loaned'
    | 'equipment_returned'
    | 'remission_created'
    | 'remission_processed'
    | 'po_created'
    | 'po_approved'
    | 'act_signed'
    | 'invoice_issued';
  performedByUserId: string;
  performedByName: string;
  targetUserId?: string;
  targetUserName?: string;
  targetEntityId?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export type LineOfBusiness =
  | 'Consultoría'
  | 'Diagnóstico'
  | 'Mantenimiento'
  | 'Diseño'
  | 'Fabricación'
  | 'Montaje'
  | 'Suministro';

export type ProjectStatus =
  | 'active' // En ejecución: El plan ya se puso en marcha y se están realizando las actividades
  | 'in_adjustments' // En ajustes: Se modifica tras encontrar observaciones una vez aprobado o iniciado
  | 'on_hold' // En espera (En pausa): Las actividades se detuvieron temporalmente
  | 'cancelled' // Cancelado: El proyecto se terminó antes de completarse
  | 'completed' // Cerrado / Finalizado: Se completaron los objetivos y se entregaron los resultados
  | 'archived' // Archivado: El proyecto terminó o se canceló, y sus registros se guardan para consulta
  // Compatibilidad legacy
  | 'in_progress'
  | 'prospecting'
  | 'kickoff'
  | 'in_closing'
  | 'closed';

export interface Project {
  id: string;
  code: string; // ej. PRJ-2026-MED-01
  name: string;
  clientName: string;
  lineOfBusiness: LineOfBusiness;
  serviceType: string; // ej. Magnetografía de cables, Inspección Anual, Overhaul de Cabinas
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  location: string;
  costCenter: string;
  budgetPV: number; // Planned Value (Valor Planificado)
  actualCostAC: number; // Actual Cost (Costo Real acumulado)
  earnedValueEV: number; // Earned Value (Valor Ganado según avance físico)
  spi: number; // EV / PV (>1 adelantado, <1 retrasado)
  cpi: number; // EV / AC (>1 eficiente, <1 sobrecosto)
  cv: number; // EV - AC
  totalInvoiced: number;
  totalPaid: number;
  projectLeaderId: string;
  projectLeaderName: string;
  supervisorId: string;
  supervisorName: string;
  assignedTeamIds: string[];
  templateReused: boolean;
  templateName?: string;
  closedDossierSigned: boolean;
  liquidationSigned: boolean;
  lessonLearnedDone: boolean;
  csatScore?: number; // 1 a 100
  kickoffDate?: string;
  opportunityFicheUrl?: string;
  clientNit?: string;
  commercialContact?: {
    name: string;
    email: string;
    phone: string;
  };
  technicalContact?: {
    name: string;
    email: string;
    phone: string;
  };
  projectCategory?: string;
  contractAmount?: number;
  currency?: 'COP' | 'USD' | 'EUR';
  billingMethod?: 'fixed_price' | 'time_and_materials';
  paymentMilestones?: {
    id: string;
    name: string;
    percentage: number;
    amount: number;
    status?: 'pending' | 'invoiced' | 'paid';
  }[];
  applicableRates?: string;
  description?: string;
  serviceCategory?: string;
  categoryId?: string;
  serviceId?: string;
  dynamicData?: Record<string, any>;
}

export type DependencyType = 'FC' | 'CC' | 'FF' | 'CF';

export interface TaskPredecessor {
  taskCode: string;
  type: DependencyType; // FC (Fin a Comienzo), CC (Comienzo a Comienzo), FF (Fin a Fin), CF (Comienzo a Fin)
  lagDays?: number; // Días de adelanto o posposición (+ / -)
}

export interface WBSTask {
  id: string;
  projectId: string;
  code: string; // ej: 1.1, 1.1.2
  name: string; // Verbo en infinitivo + objeto técnico
  description?: string;
  plannedHours: number;
  actualHours: number;
  progressPct: number;
  isCriticalPath: boolean;
  predecessors: string[]; // Códigos simples para compatibilidad previa
  predecessorDetails?: TaskPredecessor[]; // Configuración detallada de predecesores (FC, CC, FF, CF)
  dependencyType?: DependencyType; // Tipo por defecto para predecesores
  lagDays?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority?: 'alta' | 'media' | 'baja';
  deliverable?: string; // Entregable clave
  assignedToName?: string;
  assignedResources?: string[]; // Mano de obra, maquinaria, herramientas especiales
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  isMilestone?: boolean; // Hito de control (duración 0)
  constraintType?: 'lo_antes_posible' | 'fecha_fija' | 'a_partir_de'; // Tipo de restricción temporal en español
  costCenter?: string;
  costEstimate?: number; // Presupuesto estimado en COP
  progressMethod?: 'percent' | 'hours'; // Método de cálculo de avance
  // Atributos de cálculo CPM
  earlyStart?: string;
  earlyFinish?: string;
  lateStart?: string;
  lateFinish?: string;
  totalFloat?: number;
}

export interface DailyProgressReport {
  id: string;
  reportNumber: string; // DDR-2026-001
  projectId: string;
  projectCode: string;
  projectName: string;
  date: string;
  reporterId: string;
  reporterName: string;
  weather: 'despejado' | 'nublado' | 'lluvia' | 'tormenta_electrica';
  workHeightsAuthorized: boolean;
  activitiesDone: string;
  progressDeltaPct: number;
  teamPresent: string[];
  equipmentUsed: string[];
  incidentsReported: boolean;
  incidentNotes?: string;
  approvedByLeader: boolean;
  approvedAt?: string;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  taskName: string;
  date: string;
  hours: number;
  isBillable: boolean;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export type ExpenseCategory =
  | 'viaticos_alimentacion'
  | 'tiquetes_transporte'
  | 'alojamiento'
  | 'materiales_urgentes'
  | 'herramientas'
  | 'gastos_oficina'
  | 'otros';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ExpenseEntry {
  id: string;
  userId: string;
  userName: string;
  projectId?: string;
  projectCode?: string;
  costCenter: string;
  date: string;
  category: ExpenseCategory;
  categoryLabel: string;
  amount: number;
  currency: 'COP' | 'USD' | 'EUR';
  receiptPhotoUrl?: string;
  description: string;
  status: 'pending' | 'approved' | 'legalized' | 'rejected';
  legalizedAt?: string;
  supplierName?: string;
  supplierTaxId?: string;
  invoiceNumber?: string;
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  taxPercentage?: number;
  paymentMethod?: string;
  items?: InvoiceLineItem[];
  aiExtracted?: boolean;
  imputationType?: 'proyecto' | 'oficina';
}

export interface Partner {
  id: string;
  type: 'supplier' | 'customer' | 'both';
  taxId: string; // NIT / RUT
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  paymentTerms: string;
  isHomologatedLegal: boolean; // Visto bueno Clemencia García
  isHomologatedTechnical: boolean; // Visto bueno Ingeniería
  homologationExpiry?: string;
  ratingScore: number; // 1 a 5 estrellas
  criticality: 'alta' | 'media' | 'baja';
  category?: string;
}

export interface Product {
  id: string;
  sku: string; // Código de Referencia
  name: string; // Descripción
  category: string; // Categoría
  unit: string; // Unidad: m, cm, ml, pulg, unid, kg, etc.
  costPriceCOP: number;
  costPriceUSD: number;
  realStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  isCriticalSpare: boolean; // Alerta de stock y certificado obligatorio
  isHomologatedITK: boolean; // Suministros homologados Inteckno
  locationName: string;
  shelf: string;
  observations?: string;
  m365ExcelRowId?: string;
  lastSyncedM365At?: string;
  projectCodeAllocation?: string; // Código de proyecto reservado
  safetyDataSheetUrl?: string; // Hoja de seguridad (MSDS/SDS)
  technicalDataSheetUrl?: string; // Ficha técnica
  physicalState?: 'liquido' | 'solido' | 'gas_vapor' | 'otro' | string; // Estado de la materia
  calibrationInfo?: string; // Calibración (vigencia, fecha o requerimiento)
  purchaseDate?: string; // Fecha de compra
  purchaseYear?: string; // Año de compra registrado en Excel oficial
  totalEntradas?: number; // Total acumulado de entradas históricas
  totalSalidas?: number; // Total acumulado de salidas históricas
  providerName?: string;
  serialNumber?: string;

  // Motores Especializados Inteckno S.A.S. (Teleféricos y END/NDT)
  trackingType?: 'SERIALIZADO' | 'AGREGADO';
  warehouseType?: 'BODEGA_PRINCIPAL' | 'TALLER_CENTRAL' | 'VEHICULO_CUADRILLA' | 'ESTACION_MONTAÑA' | 'CUARENTENA';
  assignedVehicleId?: string;
  assignedMountainStation?: string;
  stockFisico?: number;
  stockReservado?: number;
  isDimensional?: boolean;
  segmentosFisicos?: PhysicalCableSegment[];
  isKit?: boolean;
  kitItems?: KitComponentItem[];
  uomConversion?: UnitConversionRule;
  isChemicalEND?: boolean;
  lotesFEFO?: ChemicalLotFEFO[];
  calibracionFechaVencimiento?: string;
  calibracionCertificadoUrl?: string;
  calibracionVigente?: boolean;
  checkEvents?: EquipmentCheckEvent[];
}

export interface InventoryAuditLog {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  userId: string;
  userName: string;
  userEmail: string;
  source: 'erp_web' | 'm365_excel_online' | 'qr_scanner_movil';
  previousStock: number;
  newStock: number;
  delta: number;
  reason: string;
  projectCode?: string;
  timestamp: string;
  flaggedAsAnomaly?: boolean;
  anomalyReason?: string;
  anomalySeverity?: 'baja' | 'media' | 'alta' | 'critica';
  notifiedToGM?: boolean;
}

// ----------------------------------------------------------------------------
// REMISIONES DE DESPACHO Y REINGRESO (CUSTODIA EN CAMPO Y CONTROL DE CONSUMO)
// ----------------------------------------------------------------------------
export interface RemissionItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  category?: string;
  unit: string;
  qtyDispatched: number;
  qtyReturned: number;
  qtyConsumed: number; // qtyDispatched - qtyReturned (se imputa a costo del proyecto)
  unitCostUSD: number;
  unitCostCOP: number;
  condition?: 'bueno' | 'regular' | 'danado' | 'consumido';
  notes?: string;
}

export type RemissionStatus =
  | 'en_campo'
  | 'retornado_parcial'
  | 'retornado_total'
  | 'liquidado';

export interface DispatchRemission {
  id: string;
  remissionNumber: string; // ej. REM-OUT-2026-001
  returnRemissionNumber?: string; // ej. REM-IN-2026-001
  type: 'salida' | 'reingreso';
  departureDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  responsibleTechnicianId: string;
  responsibleTechnicianName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  status: RemissionStatus;
  items: RemissionItem[];
  totalDispatchedItems: number;
  totalReturnedItems: number;
  totalConsumedValueUSD: number;
  totalConsumedValueCOP: number;
  notes?: string;
  returnNotes?: string;
  barcodeScanned?: boolean;
  recipientSignatureUrl?: string; // Firma digital biométrica en pantalla (Salida)
  recipientSignedAt?: string;
  recipientSignerName?: string;
  recipientSignerDoc?: string;
  returnSignatureUrl?: string; // Firma digital biométrica en pantalla (Reingreso)
  returnSignedAt?: string;
  returnSignerName?: string;
  returnSignerDoc?: string;
}

export interface EquipmentTool {
  id: string;
  code: string; // ej. DMT-MAG-01, UT-KRAUT-02
  name: string;
  serialNumber: string;
  type: 'magnetografo' | 'ultrasonido' | 'dinamometro' | 'estacion_total' | 'herramienta_especial';
  calibrationDate: string;
  calibrationExpiry: string;
  isCalibrated: boolean;
  calibrationCertNumber: string;
  status: 'available' | 'assigned_in_field' | 'maintenance' | 'damaged_pending_compensation';
  assignedProjectId?: string;
  assignedProjectCode?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  loanDate?: string;
  expectedReturnDate?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  name: string;
  qty: number; // Para compatibilidad
  orderedQty: number; // Cantidad total requerida / ordenada
  receivedQty: number; // Cantidad recibida físicamente en entregas parciales
  pendingQty?: number; // orderedQty - receivedQty
  unitPriceUSD: number;
  unitPriceCOP: number;
  subtotalUSD: number;
  subtotalCOP: number;
  historicalPriceCOP?: number;
  historicalPriceUSD?: number;
  priceInflationPercent?: number; // > 10% activa warning visual
  priceInflationWarning?: boolean;
  rejectedAlternatives?: string[]; // IDs o SKUs descartados por ingeniería
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'rfq'
  | 'pending_gm_approval' // Regla: compras > USD 2.000 requieren Visto Bueno de Gustavo Mejía
  | 'approved'
  | 'ordered'
  | 'partial' // Entrega parcial en almacén
  | 'received'
  | 'rejected'
  | 'warranty_return';

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // PO-2026-001
  supplierId: string;
  supplierName: string;
  supplierHomologated: boolean;
  projectId?: string;
  projectCode?: string;
  date: string;
  currency: 'USD' | 'COP';
  totalAmountUSD: number;
  totalAmountCOP: number;
  status: PurchaseOrderStatus;
  originRequisitionId?: string;
  gmApproved: boolean;
  gmApprovedBy?: string;
  gmApprovedAt?: string;
  qualityCertificateRequired: boolean;
  qualityCertificateAttached: boolean;
  physicalReceiptDone: boolean;
  technicalQualityInspectionDone: boolean;
  items: PurchaseOrderItem[];
  notes?: string;
  deliveryBatchesCount?: number; // Contador de recepciones parciales
  estimatedArrivalDate?: string; // Fecha estimada de llegada de los items
  // Logística y Trazabilidad de Transporte
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  // Calidad y No Conformidades
  qualityCertificateUrl?: string;
  qualityCertificateNumber?: string;
  conformingReceivedQty?: number;
  nonConformingReceivedQty?: number;
  nonConformingReason?: string;
  returnNoteNumber?: string;
  // Finanzas, Anticipos y Cruce de 3 Vías
  advancePaymentPercentage?: number;
  advancePaymentAmountCOP?: number;
  advancePaymentProofUrl?: string;
  paymentStatus?: 'pending' | 'advance_paid' | 'authorized_for_payment' | 'paid';
  threeWayMatchStatus?: 'pending' | 'matched' | 'discrepancy';
  threeWayMatchApprovedAt?: string;
  threeWayMatchApprovedBy?: string;
  fiscalInvoiceNumber?: string;
  fiscalInvoiceNit?: string;
  // Historial de Enmiendas Auditables
  amendments?: {
    id: string;
    date: string;
    user: string;
    reason: string;
    changes: string;
  }[];
  // TRM y Control Cambiario
  budgetProjectTrm?: number;
  currentTrmAtOrder?: number;
  exchangeRateAlert?: boolean;
  exchangeRateOvercostPercent?: number;
  // Blindajes de Ingeniería y Homologación
  isFastTrackEmergency?: boolean;
  drawingVersion?: string;
}

export interface InternalRequisitionItem {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  description?: string;
  measures?: string; // Medidas exactas requeridas por ingeniería
  unit?: string;
  qtyRequested: number;
  inStock: boolean;
  availableStock: number;
  qtyToPurchase?: number; // Cantidad faltante que se debe comprar
  unitCostUSD?: number;
  isHomologated?: boolean;
  homologatedWithSku?: string;
  homologatedWithName?: string;
  homologationNotes?: string;
  rejectedAlternatives?: string[]; // SKUs rechazados por el ingeniero para este ítem
}

// --------------------------------------------------------------------------
// TIPOS NEXT-GEN: BOM DIFFING, SMART RFQ & ALERTA CRÍTICA
// --------------------------------------------------------------------------
export interface BOMDiffChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  sku: string;
  name: string;
  v1Qty?: number;
  v2Qty?: number;
  deltaQty?: number;
  unit?: string;
  notes?: string;
}

export interface BOMDiffResult {
  v1Revision: string;
  v2Revision: string;
  hasDeltas: boolean;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  changes: BOMDiffChange[];
}

export interface SmartConsolidatedGroup {
  productId: string;
  sku: string;
  name: string;
  totalQtyToPurchase: number;
  unit: string;
  projects: { projectId: string; projectCode: string; qty: number }[];
  suggestedSupplierId?: string;
  suggestedSupplierName?: string;
  estimatedTotalCOP: number;
  estimatedTotalUSD: number;
  volumeDiscountOpportunity: boolean;
}

export interface CriticalBlockAlert {
  id: string;
  targetUserId: string; // ej. Wilson Mejía
  targetUserName: string;
  title: string;
  message: string;
  urgency: 'HIGH' | 'CRITICAL';
  projectCode?: string;
  sku?: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'buyer_review'
  | 'pending_approval'
  | 'pending_wilson_approval'
  | 'approved_for_quotation'
  | 'approved'
  | 'fulfilled'
  | 'auto_po_generated'
  | 'rejected';

export interface InternalRequisition {
  id: string;
  reqNumber: string; // REQ-2026-001
  requesterId: string;
  requesterName: string;
  department: string; // ej: 'Diseño Mecánico' | 'Ingeniería Eléctrica'
  engineeringArea?: 'diseno' | 'electrico';
  projectId: string;
  projectCode: string;
  projectName: string;
  submissionDate?: string; // Fecha de envío
  neededDate: string; // Fecha estimada que lo necesitan
  priority: 'normal' | 'urgente' | string;
  requisitionType?: string; // Clasificación configurada en el módulo
  status: RequisitionStatus;
  targetApproverId?: string; // ID del aprobador asignado (Wilson, Clemencia, Gustavo, etc.)
  targetApproverName?: string; // Nombre del aprobador
  items: InternalRequisitionItem[];
  generatedPoId?: string;
  generatedPoNumber?: string;
  buyerReviewedBy?: string;
  buyerReviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  sourceDocumentName?: string;
  createdAt: string;
}

export interface BillingMilestone {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  milestoneIndex: number;
  title: string;
  percentage: number;
  amountCOP: number;
  amountUSD: number;
  dueDate: string;
  acceptanceActSigned: boolean;
  acceptanceActSignedAt?: string;
  invoiceDeadlineTimestamp?: number; // Exactamente +48h desde que se firma el acta
  invoiceIssued: boolean;
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  isPaid: boolean;
  paidAt?: string;
}

export interface StockMove {
  id: string;
  date: string;
  productSku: string;
  productName: string;
  type: 'in_purchase' | 'out_project' | 'internal_transfer' | 'adjustment';
  qty: number;
  sourceLocation: string;
  destLocation: string;
  referenceNumber: string; // ej. PO-2026-001 o REQ-2026-002
  projectCode?: string;
  operatorName: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  module?: string;
}

// ============================================================================
// EXTENSIONES DEL DOMINIO PARA LOS 7 PILARES INTECKNO
// ============================================================================

// 1. GESTIÓN COMERCIAL
export type OpportunityStage =
  | 'prospecting'
  | 'qualification'
  | 'technical_proposal'
  | 'economic_proposal'
  | 'under_review'
  | 'awarded'
  | 'lost';

export interface OpportunityActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | 'document_sent';
  description: string;
  authorName: string;
  timestamp: string;
  linkedEventId?: string;
}

export interface OpportunityQuotationItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  currency: 'COP' | 'USD' | 'EUR';
  category?: 'Servicio STC' | 'Ensayos NDT/MRT' | 'Repuesto/Suministro' | 'Logística/Viáticos' | string;
  discountPercent?: number;
}

export interface OpportunityQuotation {
  id: string;
  code: string;
  title: string;
  operationType?: 'nacional' | 'exportacion' | 'importacion';
  items: OpportunityQuotationItem[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  logisticsCost?: number; // Flete local o internacional, viáticos en sitio
  customsDutyRate?: number; // Arancel para importación (ej: 0.05, 0.10)
  customsDutyAmount?: number;
  importFees?: number; // Gastos de nacionalización / SIA
  commercialMarginPercent?: number; // Margen o mark-up comercial para importación
  taxRate: number; // IVA (0.19 o 0)
  taxAmount?: number;
  applyReteFuente?: boolean;
  reteFuenteRate?: number; // ej: 0.04
  reteFuenteAmount?: number;
  applyReteIca?: boolean;
  reteIcaRate?: number; // ej: 0.00966
  reteIcaAmount?: number;
  total: number;
  netReceivable?: number; // Neto en caja proyectado tras retenciones
  validUntil: string;
  paymentTerms: string;
  createdAt: string;
  paymentTermType?: 'anticipo_50_50' | 'contado' | 'credito_30' | 'credito_60' | 'credito_90' | 'contra_entrega' | 'personalizado';
  paymentTermSurchargePercent?: number; // Costo financiero diferido (ej: +2.0%, +4.5%)
  paymentTermSurchargeAmount?: number;
  incoterm?: string;
  incotermType?: 'EXW' | 'FCA' | 'FOB' | 'CPT' | 'CIP' | 'CIF' | 'DAP' | 'DPU' | 'DDP' | 'personalizado';
  incotermSurchargePercent?: number;
  incotermSurchargeAmount?: number;
  customsSubheading?: string; // Subpartida arancelaria DIAN (ej: 8431.39.00.00)
  customsAssistedByLuciana?: boolean;
  customsLucianaNotes?: string;
  destinationCity?: string;
  exchangeRateTRM?: number;
  trmSource?: string;
  trmDate?: string;
  warranty?: string;
  currency: 'COP' | 'USD' | 'EUR';
  notes?: string;
}

export interface OpportunityPliegoAnalysis {
  summary: string;
  requirements: string[];
  budget: string;
  keyDates: { label: string; date: string }[];
  intecknoFitVerdict: 'cumple' | 'parcial' | 'no_cumple';
  analyzedAt: string;
  extractedScope?: string;
  riskFactors?: string[];
}

export interface OpportunityStakeholder {
  contactId: string;
  name: string;
  role: 'Decisor' | 'Influenciador Técnico' | 'Comprador' | 'Interventor' | 'Operaciones' | string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface Opportunity {
  id: string;
  code: string;
  title: string;
  clientId: string;
  clientName: string;
  clientContactPerson?: string;
  clientEmail?: string;
  clientPhone?: string;
  cableType: string;
  country: string;
  estimatedValueUSD: number;
  probabilityPct?: number;
  stage: OpportunityStage;
  expectedCloseDate: string;
  technicalSpecs: string;
  assignedOwnerId: string;
  assignedOwnerName: string;
  awardedProjectId?: string;
  createdAt: string;
  tags?: string[];
  leadSource?: string;
  // Nuevas extensiones Inteligencia Comercial y Seguimiento
  aiDealScore?: number;
  aiDealScoreDetails?: string;
  aiDealScoreFactors?: { factor: string; impact: string; isPositive?: boolean }[];
  activityLog?: OpportunityActivity[];
  quotations?: OpportunityQuotation[];
  attachedPliegoUrl?: string;
  pliegoRawText?: string;
  pliegoAnalysis?: OpportunityPliegoAnalysis;
  stakeholders?: OpportunityStakeholder[];
  lastActivityAt?: string;
}

export interface ContactBankAccount {
  id: string;
  bankName: string;
  accountType: 'Ahorros' | 'Corriente' | 'Moneda Extranjera';
  accountNumber: string;
  holderName: string;
  currency: 'COP' | 'USD' | 'EUR';
}

export interface RelatedContactPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary?: boolean;
}

export interface CRMContact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  stcSystem: string;
  country: string;
  notes: string;

  // Nuevos campos de cabecera y clasificación
  tags?: string[];
  nit?: string;
  dunsId?: string;
  website?: string;

  // Contactos relacionados vinculados
  relatedContacts?: RelatedContactPerson[];
  linkedContactIds?: string[];

  // Ventas y Compras
  salesPurchases?: {
    // VENTAS
    assignedSalespersonId?: string;
    assignedSalespersonName?: string;
    priceListCurrency?: string;
    paymentTermsSales?: string;
    paymentMethodSales?: string;
    incoterm?: string;
    incotermLocation?: string;

    // COMPRAS
    paymentTermsPurchases?: string;
    paymentMethodPurchases?: string;

    // INFORMACIÓN FISCAL
    fiscalPosition?: string;

    // VARIOS
    internalReference?: string;
    industry?: string;
  };

  // Facturación
  billing?: {
    // GENERAL
    bankAccounts?: ContactBankAccount[];
    // FACTURAS CLIENTE
    qrCodePaymentUrl?: string;
    routingId?: string;
  };

  // Notas Internas
  internalNotes?: string;

  // Facturación DIAN
  dianBilling?: {
    responsibilities?: string[];
    fiscalRegime?: 'IVA' | 'No aplica' | 'IC' | 'IVA e IC' | string;
    isLargeTaxpayer?: boolean;
    commercialName?: string;
  };
}

// 2. MÓDULOS INTECKNO (TRANSVERSALES)
export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  members: string[]; // user IDs or user names
  isCustom?: boolean;
  avatarColor?: string;
  isDirect?: boolean;
  directPartnerId?: string;
  linkedProjectId?: string;
  cableSystemName?: string;
  isEmergency?: boolean;
  category?: 'general' | 'proyecto' | 'emergencia' | 'directo' | 'hseq';
}

export interface ChatMessage {
  id: string;
  channel: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  readBy?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: {
    type: 'image' | 'file' | 'audio';
    url: string;
    name: string;
    size?: string;
    duration?: number;
    mimeType?: string;
    base64Data?: string;
  };
  audioData?: {
    base64?: string;
    durationSeconds?: number;
    mimeType?: string;
  };
  transcriptionText?: string;
  aiExtraction?: {
    equipmentComponent?: string; // ej: rodillo, balancín, cable tractor, mordaza, sensor inductivo
    locationTower?: string; // ej: Pilona 4, Estación Motriz, Retorno
    severity?: 'informativo' | 'advertencia' | 'critico';
    summary?: string;
    actionSuggested?: string;
    detectedAt?: string;
  };
  aiAnalysis?: {
    diagnosis: string;
    rootCauses: string[];
    recommendations: string[];
    severity: 'informativo' | 'advertencia' | 'critico';
    analyzedAt: string;
  };
  aiStatus?: 'idle' | 'processing' | 'done' | 'error';
  linkedProjectId?: string;
  linkedWorkOrderId?: string;
  linkedTaskUuid?: string;
  isEmergency?: boolean;
  createdAt?: number; // Timestamp Unix ms para validación de los 15 minutos
  isEdited?: boolean;
  editedAt?: string;
  isForwarded?: boolean;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  starredBy?: string[]; // IDs de colaboradores que marcaron como favorito
  isDeleted?: boolean;
  deletedForUserIds?: string[];
}

export interface DocumentItem {
  id: string;
  code: string;
  title: string;
  category: 'planos' | 'certificados_hseq' | 'manuales_stc' | 'actas_contratos' | 'procedimientos' | 'pliegos_licitacion';
  categoryLabel: string;
  projectCode?: string;
  projectName?: string;
  uploadedBy: string;
  date: string;
  fileSize: string;
  fileType: string;
  sharepointUrl?: string;
  sharepointFolder?: string;
  sharepointWebUrl?: string;
  fileUrl?: string;
  version?: string;
  description?: string;
  scope?: 'empresa' | 'personal' | 'compartido';
  department?: 'Operaciones' | 'HSEQ' | 'Comercial' | 'Ingeniería' | 'Administración' | 'Sistemas';
  sharedWith?: string[];
  folderName?: string;
  source?: 'firebase_storage' | 'sharepoint_m365' | 'onedrive' | 'local_upload';
  status?: 'activo' | 'por_vencer' | 'vencido' | 'obsoleto';
  versionHistory?: Array<{
    version: string;
    date: string;
    uploadedBy: string;
    notes?: string;
    fileUrl?: string;
    fileSize?: string;
    sharepointWebUrl?: string;
  }>;
  aiExtraction?: {
    summary: string;
    bullets?: string[];
    extractedMetadata?: Record<string, any>;
    expirationDate?: string;
    issuingEntity?: string;
    confidenceScore?: number;
    processedAt?: string;
    equipmentComponent?: string;
    locationTower?: string;
    keyMetrics?: Array<{
      label: string;
      value: string | number;
      status?: 'ok' | 'alerta' | 'critico' | string;
    }>;
  };
  linkedEntities?: {
    projectId?: string;
    systemId?: string;
    workerId?: string;
    expenseId?: string;
    workOrderId?: string;
  };
  isFavorite?: boolean;
}

export interface CalendarAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

export interface CalendarReminderToast {
  eventId: string;
  title: string;
  time: string;
  date: string;
  location: string;
  meetingMethod?: 'presencial' | 'virtual';
  teamsMeetingUrl?: string;
  attendees: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  startTime?: string;
  endTime?: string;
  type: 'visita_campo' | 'inspeccion_stc' | 'comite_gerencial' | 'entrega_hito' | 'auditoria_hseq' | 'parada_tecnica';
  location: string;
  creatorId?: string;
  attendees: string[];
  attendeeIds?: string[];
  projectCode?: string;
  projectName?: string;
  description?: string;
  meetingMethod?: 'presencial' | 'virtual';
  teamsMeetingUrl?: string;
  reminderMinutes?: number;
  attachments?: CalendarAttachment[];
  isCompanyWide?: boolean;

  // Nuevos campos técnicos y de sincronización M365 / Hitos
  m365EventId?: string;
  isOvernight?: boolean; // Para ventanas operativas nocturnas STC (ej: 22:30 a 04:30)
  linkedProjectId?: string;
  linkedWorkOrderId?: string;
  syncStatus?: 'local_only' | 'synced_m365' | 'sync_error';
  lastSyncedAt?: string;
  isExternalOutlook?: boolean; // Evento importado desde Outlook
  outlookWebLink?: string;
  isContractualMilestone?: boolean; // Hito proyectado automáticamente
}

export type TodoStatus = 'pendiente' | 'en_curso' | 'en_revision' | 'completada';

export interface TodoChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoPhotoEvidence {
  id: string;
  url: string;
  uploadedAt: string;
  description?: string;
  aiValidation?: string;
}

export interface TodoItem {
  id: string;
  userId: string;
  assignedToUserId?: string;
  assignedToName?: string;
  title: string;
  priority: 'alta' | 'media' | 'baja';
  dueDate: string;
  completed: boolean;
  status?: TodoStatus;
  category?: string;
  relatedModule?: string;
  projectCode?: string;
  notes?: string;
  checklist?: TodoChecklistItem[];
  photoEvidences?: TodoPhotoEvidence[];
  m365TaskId?: string;
  m365Synced?: boolean;
  generatedByLuciana?: boolean;
  lucianaSourceContext?: string;
  completedAt?: string;
  completedBy?: string;
  calendarEventId?: string;
  createdAt?: string;
}

export interface WikiArticleChecklistStep {
  step: number;
  title: string;
  instruction: string;
  completed?: boolean;
}

export interface WikiArticleMediaItem {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'video' | 'drawing';
  description?: string;
  compareUrl?: string;
  compareDescription?: string;
}

export interface WikiArticle {
  id: string;
  title: string;
  category:
    | 'mantenimiento_cables'
    | 'mordazas_pinzas'
    | 'balancines_poleas'
    | 'seguridad_alturas'
    | 'normativa_stc'
    | 'lecciones_aprendidas'
    | 'induccion_onboarding'
    | 'induccion_general'
    | 'compras_adquisiciones'
    | 'almacen_herramientas'
    | 'uso_erp'
    | 'viaticos_contabilidad';
  summary: string;
  content: string;
  author: string;
  readTime: string;
  updatedAt: string;
  status?: 'borrador' | 'en_revision' | 'aprobado';
  generatedByLuciana?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  interactiveChecklist?: WikiArticleChecklistStep[];
  mediaUrls?: WikiArticleMediaItem[];
  targetRoles?: string[];
  readByUsers?: string[];
  sharepointSyncUrl?: string;
  sharepointDocUrl?: string;
  tags?: string[];
  pdfDownloadName?: string;
  learningPathOrder?: number;
  learningPathRole?:
    | 'mecanico_stc'
    | 'inspector_end'
    | 'electricista_stc'
    | 'transversal'
    | 'induccion_corporativa'
    | 'compras_logistica'
    | 'administrativo_contable';
}

// 3. NEGOCIOS INTERNACIONALES
export interface PricingSimulation {
  cableLengthKm: number;
  towersCount: number;
  cabinQty: number;
  originCountry: 'Francia' | 'Austria' | 'Suiza' | 'China';
  destinationCountry: 'Colombia' | 'México' | 'Bolivia' | 'Ecuador' | 'Chile';
  logisticsMode: 'maritimo' | 'aereo';
  importDutyPct: number;
  baseHardwareCostUSD: number;
  internationalFreightUSD: number;
  insuranceUSD: number;
  customsTaxesUSD: number;
  engineeringLaborUSD: number;
  marginPct: number;
  totalPriceUSD: number;
  profitMarginUSD: number;
}

export interface InternationalLead {
  id: string;
  country: string;
  city: string;
  tenderTitle: string;
  operatorEntity: string;
  budgetEstimatedUSD: number;
  status: 'en_convocatoria' | 'pliegos_borrador' | 'en_evaluacion' | 'cerrada';
  submissionDeadline: string;
  systemType: string;
  sourceUrl: string;
}

// 4. TALENTO HUMANO Y SST
export interface EmployeeRecord {
  id: string;
  name: string;
  documentId: string;
  role: string;
  department: string;
  hireDate: string;
  baseSalaryCOP: number;
  heightCertExpiry: string;
  heightCertStatus: 'vigente' | 'por_vencer' | 'vencido';
  medicalExamExpiry: string;
  medicalExamStatus: 'vigente' | 'por_vencer' | 'vencido';
  vacationDaysAvailable: number;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'vacaciones' | 'permiso_medico' | 'calamidad' | 'dia_familia';
  startDate: string;
  endDate: string;
  daysCount: number;
  status: 'pendiente' | 'aprobada' | 'rechazada';
}

// 5. OPERACIONES Y MANTENIMIENTO TÉCNICO
export interface MaintenancePlan {
  id: string;
  code: string;
  projectCode: string;
  systemName: string;
  component: 'Cable Portador-Tractor' | 'Pilonas y Balancines' | 'Pinzas Desembragables' | 'Grupo Motriz y Freno';
  frequency: 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  lastDoneDate: string;
  nextDueDate: string;
  responsibleTechnician: string;
  status: 'al_dia' | 'proximo_a_vencer' | 'vencido';
}

// DEFINICIÓN DE ÁREAS Y CONTROL DE ACCESO BASADO EN ROLES (RBAC)
export type AreaId =
  | 'empresa'
  | 'comercial'
  | 'operaciones'
  | 'abastecimiento'
  | 'talento'
  | 'financiera'
  | 'internacional';

export interface AreaInfo {
  id: AreaId;
  name: string;
  tagline: string;
  accentColor: string;
  bgBadge: string;
  modules: {
    id: string;
    label: string;
    description: string;
  }[];
}

// ============================================================================
// ECOSISTEMA DIAN (COLOMBIA) - TIPOS DE FACTURACIÓN, NÓMINA Y RUT
// ============================================================================

export type DianTaxResponsibilityCode =
  | 'O-13' // Gran Contribuyente
  | 'O-15' // Autorretenedor
  | 'O-23' // Agente de retención IVA
  | 'O-47' // Régimen Simple de Tributación (RST)
  | 'R-99-PN'; // No responsable de IVA (Persona Natural)

export interface DianTaxResponsibility {
  code: DianTaxResponsibilityCode | string;
  name: string;
  description: string;
}

export interface DianEconomicActivity {
  code: string; // Código CIIU (ej. 3312, 7112, 4659)
  description: string;
  type: 'principal' | 'secundaria';
}

export interface DianRutData {
  nit: string;
  dv: string;
  tipoPersona: 'juridica' | 'natural';
  razonSocial: string;
  primerNombre?: string;
  otrosNombres?: string;
  primerApellido?: string;
  segundoApellido?: string;
  nombreComercial?: string;
  direccion: string;
  departamento: string;
  departamentoCodeDANE: string;
  municipio: string;
  municipioCodeDANE: string;
  correoFacturacionElectronica: string;
  telefono: string;
  actividadPrincipal: DianEconomicActivity;
  actividadesSecundarias: DianEconomicActivity[];
  responsabilidades: DianTaxResponsibility[];
  regimenTributario: 'ordinario' | 'simple' | 'no_responsable_iva';
  tarifaReteICA?: number; // Ej. 0.007 (7 por mil)
  requiereDocumentoSoporte: boolean;
  verificadoDian: boolean;
  fechaVerificacion?: string;
}

export interface DianElectronicInvoice {
  id: string;
  prefix: string; // ej. FE, FEV
  number: string;
  cufe: string; // Código Único de Factura Electrónica
  qrCodeUrl: string;
  issueDate: string;
  issueTime: string;
  issuerNit: string;
  customerNit: string;
  customerName: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  dianStatus: 'aprobado' | 'rechazado' | 'en_proceso' | 'contingencia';
  dianMessage: string;
  xmlSignedUrl?: string;
  pdfRepresentationUrl?: string;
  radianEvents?: {
    acuseRecibo?: { registered: boolean; date?: string; cude?: string };
    reciboBienesServicios?: { registered: boolean; date?: string; cude?: string };
    aceptacionExpresa?: { registered: boolean; date?: string; cude?: string };
  };
}

export interface DianSupportDocument {
  id: string;
  prefix: string; // ej. DS, DSE
  consecutive: number;
  cuds: string; // Código Único de Documento Soporte
  issueDate: string;
  vendorNit: string;
  vendorDV: string;
  vendorName: string;
  vendorCity: string;
  vendorDaneCode: string;
  description: string;
  subtotal: number;
  reteFuenteRate: number; // Ej: 0.025 o 0.04
  reteFuenteAmount: number;
  reteIcaRate: number; // Ej: 0.007
  reteIcaAmount: number;
  netPayable: number;
  conceptType: 'servicio_tecnico' | 'mano_de_obra_obra' | 'repuestos_menores' | 'honorarios';
  dianStatus: 'emitido' | 'ajustado' | 'anulado';
  dianValidationCode?: string;
}

export interface DianPayrollDocument {
  id: string;
  prefix: string; // ej. NE
  consecutive: number;
  cune: string; // Código Único de Nómina Electrónica
  periodStart: string;
  periodEnd: string;
  settlementDate: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  basicSalary: number;
  workedDays: number;
  transportAllowance: number;
  overtimeAmount: number; // Horas extras y recargos
  totalAccrued: number; // Total devengado
  healthDeduction: number; // 4%
  pensionDeduction: number; // 4%
  withholdingTax: number;
  totalDeductions: number; // Total deducciones
  netPaid: number;
  dianStatus: 'transmitido' | 'pendiente' | 'rechazado';
}

export * from './InventorySchema';


