import { z } from 'zod';

/**
 * Validated Module Keys & Sub-Entities in Inteckno ERP
 * Matches exact Firestore collections and erp_modules documents inspected in Paso 0.
 */
export const ModuleNameEnum = z.enum([
  'projects',
  'tasks',
  'milestones',
  'procurement',
  'purchaseOrders',
  'requisitions',
  'equipment',
  'partners',
  'inventoryAuditLogs',
  'products',
  'kardex',
  'operations',
  'timesheets',
  'expenses',
  'ddrs',
  'remissions',
  'maintenancePlans',
  'workOrders',
  'manufacturingOrders',
  'benchTests',
  'hr',
  'employees',
  'careerProfiles',
  'competenciesCatalog',
  'hseqAlerts',
  'novelties',
  'sstInspections',
  'jobPositions',
  'candidates',
  'finances',
  'retentionFunds',
  'mrpDrafts',
  'commercial',
  'opportunities',
  'contacts',
  'leads',
  'productivity',
  'todos',
  'calendarEvents',
  'documents',
  'articles',
  'chatGroups',
  'users',
  'chat_messages',
  'configs',
]);

export type ModuleName = z.infer<typeof ModuleNameEnum>;

/**
 * Query parameters for GET /api/v1/ai/data/:module
 */
export const DataQuerySchema = z.object({
  fields: z.string().optional().describe('Comma-separated list of fields to project (saves LLM tokens)'),
  filter: z.string().optional().describe('JSON-encoded filter or key:value pairs (e.g., projectCode:ITK-01,status:active)'),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  cursor: z.string().optional().describe('Last item id from previous page for cursor-based pagination'),
});

/**
 * Query parameters for GET /api/v1/ai/summary
 */
export const SummaryQuerySchema = z.object({
  projectCode: z.string().optional().describe('Filter summary KPIs by exact projectCode (= costCenter)'),
});

/**
 * Contract Item (Carpeta Contractual) Schema - Rule 11 & Rule 15
 */
export const ProjectItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'code is required (e.g., ITEM 01)'),
  name: z.string().min(1, 'name is required'),
  budgetPlanned: z.number().min(0).default(0),
  status: z.enum(['activo', 'cerrado', 'suspendido']).default('activo'),
});

/**
 * Cost Matrix Row Schema - Rule 8, 11, 13, 15
 */
export const CostMatrixRowSchema = z.object({
  id: z.string().optional(),
  itemCode: z.string().min(1, 'itemCode must bind to a project contractual folder (e.g. ITEM 01)'),
  category: z.string().min(1),
  concept: z.string().min(1),
  costType: z.enum(['direct', 'indirect']).default('direct'),
  plannedAmount: z.number().min(0).default(0),
  actualAmount: z.number().min(0).default(0),
  hasIva: z.boolean().default(true),
  ivaRate: z.number().min(0).max(1).optional(),
});

/**
 * Action Payloads for POST /api/v1/ai/action
 * Strictly enforces:
 * - Zero Mock Data (Rule 4)
 * - Code == CostCenter (Rule 15)
 * - Tax rate by country (Rule 8)
 * - Non-destructive deep merge in production (Rule 14)
 */
export const UpsertOpportunityPayload = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  title: z.string().min(3),
  clientName: z.string().min(2),
  clientNit: z.string().optional(),
  country: z.string().default('Colombia'),
  currency: z.enum(['COP', 'USD', 'EUR']).default('COP'),
  estimatedValueUSD: z.number().min(0).default(0),
  stage: z.enum(['lead', 'qualification', 'proposal', 'negotiation', 'awarded', 'lost']).default('proposal'),
  expectedCloseDate: z.string().optional(),
  cableType: z.string().optional(),
});

export const UpsertProjectPayload = z.object({
  id: z.string().optional(),
  code: z.string().min(2, 'Project code is mandatory and serves as costCenter'),
  name: z.string().min(3),
  clientName: z.string().min(2),
  clientNit: z.string().optional(),
  clientCountry: z.string().default('Colombia'),
  location: z.string().optional(),
  status: z.enum(['prospecting', 'kickoff', 'active', 'in_closing', 'closed']).default('kickoff'),
  contractAmount: z.number().min(0).default(0),
  budgetPV: z.number().min(0).default(0),
  currency: z.enum(['COP', 'USD']).default('COP'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectItems: z.array(ProjectItemSchema).optional(),
  costMatrix: z.array(CostMatrixRowSchema).optional(),
});

export const UpsertRequisitionPayload = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1, 'projectId is required'),
  projectCode: z.string().min(1, 'projectCode is required'),
  itemCode: z.string().min(1, 'itemCode (Carpeta Contractual) is required by Plan 1'),
  requesterId: z.string().default('AI-AGENT'),
  requesterName: z.string().default('Agente IA Autorizado'),
  priority: z.enum(['normal', 'urgente']).default('normal'),
  justification: z.string().min(3),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      name: z.string().min(1),
      qty: z.number().positive(),
      unit: z.string().default('unid'),
    })
  ).min(1),
});

export const UpsertPurchaseOrderPayload = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1, 'projectId is required'),
  projectCode: z.string().min(1, 'projectCode is required'),
  itemCode: z.string().min(1, 'itemCode (Carpeta Contractual) is mandatory'),
  supplierId: z.string().min(1),
  supplierName: z.string().min(1),
  country: z.string().default('Colombia'),
  hasIva: z.boolean().default(true),
  trm: z.number().positive().default(4150),
  originRequisitionId: z.string().optional(),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      name: z.string().min(1),
      qty: z.number().positive(),
      unit: z.string().default('unid'),
      unitPriceCOP: z.number().min(0),
    })
  ).min(1),
});

export const RecordTimesheetPayload = z.object({
  id: z.string().optional(),
  employeeId: z.string().min(1),
  projectId: z.string().min(1),
  projectCode: z.string().min(1),
  itemCode: z.string().min(1, 'itemCode is required to allocate labor cost to contractual folder'),
  taskId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  hoursOrdinary: z.number().min(0).max(24).default(0),
  hoursExtraDay: z.number().min(0).max(24).default(0),
  hoursNight: z.number().min(0).max(24).default(0),
  hoursExtraNight: z.number().min(0).max(24).default(0),
  hoursSunday: z.number().min(0).max(24).default(0),
  notes: z.string().optional(),
});

export const UpsertProductPayload = z.object({
  id: z.string().optional(),
  sku: z.string().min(2),
  name: z.string().min(2),
  category: z.string().min(2),
  unit: z.string().default('unid'),
  costPriceCOP: z.number().min(0),
  costPriceUSD: z.number().min(0).optional(),
  realStock: z.number().min(0).default(0),
  reservedStock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  locationName: z.string().optional(),
  notes: z.string().optional(),
  observations: z.string().optional(),
});

export const UpsertRemissionPayload = z.object({
  id: z.string().optional(),
  remissionNumber: z.string().optional(),
  projectId: z.string().min(1),
  projectCode: z.string().min(1),
  itemCode: z.string().default('ITEM 01'),
  responsibleId: z.string().min(1),
  responsibleName: z.string().min(1),
  destinationFront: z.string().min(1),
  type: z.enum(['consumable', 'equipment_loan']).default('equipment_loan'),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      sku: z.string().min(1),
      name: z.string().min(1),
      qty: z.number().positive().default(1),
      unit: z.string().default('UNIDAD'),
    })
  ).min(1),
  cleanInformalNoteOnProduct: z.boolean().default(true),
});

export const SandboxDeletePayload = z.object({
  collectionOrModule: ModuleNameEnum,
  targetId: z.string().min(1),
  confirmWord: z.literal('BORRAR'),
});

export const SyncUsersToEmployeesPayload = z.object({
  defaultLaborRates: z
    .object({
      baseSalary: z.number().min(0).default(2500000),
      multiplier: z.number().positive().default(1.52),
      monthlyHours: z.number().positive().default(210),
    })
    .optional(),
  autoCreateMissingRecords: z.boolean().default(true),
  consolidateDuplicateUsers: z.boolean().default(true),
});

export const RecalculateProjectEvmPayload = z.object({
  projectId: z.string().optional(),
  stripBase64Photos: z.boolean().default(true),
});

export const PurgeMockDataPayload = z.object({
  targetCollections: z.array(z.string()).default(['projects', 'contacts', 'opportunities']),
  searchTerms: z.array(z.string()).default(['PRUEBA', 'TEST', 'CODIGO PROYECTO PRUEBA']),
  mode: z.enum(['DRY_RUN_FIRST', 'EXECUTE']).default('DRY_RUN_FIRST'),
});

export const RestructureLevel3GovernancePayload = z.object({
  projectId: z.string().default('PRJ-1793367181536'),
  reconcileBacAndOffer: z.boolean().default(true),
  decoupleCareerProfilesFromUsers: z.boolean().default(true),
  segregateEquipmentFromConsumables: z.boolean().default(true),
  recalculateTaxEngineSummary: z.boolean().default(true),
});

export const ExecuteLevel4And5ArchitecturePayload = z.object({
  enforceJobPositionForeignKeys: z.boolean().default(true),
  normalizeCompetenciesCatalog: z.boolean().default(true),
  runHseqProactiveAlertEngine: z.boolean().default(true),
  hseqWarningDaysThreshold: z.number().int().min(1).default(60),
  enforceCascadingSoftDeleteOnOrphans: z.boolean().default(true),
  runMrpAutomatedEngine: z.boolean().default(true),
  configureRetentionAndAdvanceSubledger: z.boolean().default(true),
  defaultAdvancePct: z.number().min(0).max(50).default(10),
  defaultRetentionGuaranteePct: z.number().min(0).max(30).default(5),
});

export const ExecuteLevel679ArchitecturePayload = z.object({
  postDavidHurtadoHoursToProject: z.boolean().default(true),
  projectId: z.string().default('PRJ-1793367181536'),
  itemCode: z.string().default('ITEM PRUEBA 1'),
  hours: z.number().default(10),
  hourlyRateCOP: z.number().default(27505),
  enforceLotoProtocolInWorkOrders: z.boolean().default(true),
  enableCryptographicMilestoneSignatures: z.boolean().default(true),
  configureGeofencesAndMakerChecker: z.boolean().default(true),
});

export const ExecuteRelationalIdAuditFixPayload = z.object({
  fixLoanProductRelationalIds: z.boolean().default(true),
  removeOrphanContactsFromActive: z.boolean().default(true),
  linkAllUsersToEmployeeIds: z.boolean().default(true),
  standardizeSkillCatalogIds: z.boolean().default(true),
});

export const AiActionRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('upsert_opportunity'), payload: UpsertOpportunityPayload }),
  z.object({ action: z.literal('upsert_project'), payload: UpsertProjectPayload }),
  z.object({ action: z.literal('upsert_requisition'), payload: UpsertRequisitionPayload }),
  z.object({ action: z.literal('upsert_purchase_order'), payload: UpsertPurchaseOrderPayload }),
  z.object({ action: z.literal('record_timesheet'), payload: RecordTimesheetPayload }),
  z.object({ action: z.literal('upsert_product'), payload: UpsertProductPayload }),
  z.object({ action: z.literal('upsert_remission'), payload: UpsertRemissionPayload }),
  z.object({ action: z.literal('sandbox_delete_entity'), payload: SandboxDeletePayload }),
  z.object({ action: z.literal('SYNC_USERS_TO_EMPLOYEES'), payload: SyncUsersToEmployeesPayload }),
  z.object({ action: z.literal('RECALCULATE_PROJECT_EVM'), payload: RecalculateProjectEvmPayload }),
  z.object({ action: z.literal('PURGE_MOCK_DATA'), payload: PurgeMockDataPayload }),
  z.object({ action: z.literal('RESTRUCTURE_LEVEL3_GOVERNANCE'), payload: RestructureLevel3GovernancePayload }),
  z.object({ action: z.literal('EXECUTE_LEVEL4_AND_5_ARCHITECTURE'), payload: ExecuteLevel4And5ArchitecturePayload }),
  z.object({ action: z.literal('EXECUTE_LEVEL6_7_9_ARCHITECTURE'), payload: ExecuteLevel679ArchitecturePayload }),
  z.object({ action: z.literal('EXECUTE_RELATIONAL_ID_AUDIT_FIX'), payload: ExecuteRelationalIdAuditFixPayload }),
]);

export type AiActionRequest = z.infer<typeof AiActionRequestSchema>;
