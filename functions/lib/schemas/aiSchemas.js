"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiActionRequestSchema = exports.ExecuteRelationalIdAuditFixPayload = exports.ExecuteLevel679ArchitecturePayload = exports.ExecuteLevel4And5ArchitecturePayload = exports.RestructureLevel3GovernancePayload = exports.PurgeMockDataPayload = exports.RecalculateProjectEvmPayload = exports.SyncUsersToEmployeesPayload = exports.SandboxDeletePayload = exports.UpsertRemissionPayload = exports.UpsertProductPayload = exports.RecordTimesheetPayload = exports.UpsertPurchaseOrderPayload = exports.UpsertRequisitionPayload = exports.UpsertProjectPayload = exports.UpsertOpportunityPayload = exports.CostMatrixRowSchema = exports.ProjectItemSchema = exports.SummaryQuerySchema = exports.DataQuerySchema = exports.ModuleNameEnum = void 0;
const zod_1 = require("zod");
/**
 * Validated Module Keys & Sub-Entities in Inteckno ERP
 * Matches exact Firestore collections and erp_modules documents inspected in Paso 0.
 */
exports.ModuleNameEnum = zod_1.z.enum([
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
/**
 * Query parameters for GET /api/v1/ai/data/:module
 */
exports.DataQuerySchema = zod_1.z.object({
    fields: zod_1.z.string().optional().describe('Comma-separated list of fields to project (saves LLM tokens)'),
    filter: zod_1.z.string().optional().describe('JSON-encoded filter or key:value pairs (e.g., projectCode:ITK-01,status:active)'),
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(50),
    cursor: zod_1.z.string().optional().describe('Last item id from previous page for cursor-based pagination'),
});
/**
 * Query parameters for GET /api/v1/ai/summary
 */
exports.SummaryQuerySchema = zod_1.z.object({
    projectCode: zod_1.z.string().optional().describe('Filter summary KPIs by exact projectCode (= costCenter)'),
});
/**
 * Contract Item (Carpeta Contractual) Schema - Rule 11 & Rule 15
 */
exports.ProjectItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().min(1, 'code is required (e.g., ITEM 01)'),
    name: zod_1.z.string().min(1, 'name is required'),
    budgetPlanned: zod_1.z.number().min(0).default(0),
    status: zod_1.z.enum(['activo', 'cerrado', 'suspendido']).default('activo'),
});
/**
 * Cost Matrix Row Schema - Rule 8, 11, 13, 15
 */
exports.CostMatrixRowSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    itemCode: zod_1.z.string().min(1, 'itemCode must bind to a project contractual folder (e.g. ITEM 01)'),
    category: zod_1.z.string().min(1),
    concept: zod_1.z.string().min(1),
    costType: zod_1.z.enum(['direct', 'indirect']).default('direct'),
    plannedAmount: zod_1.z.number().min(0).default(0),
    actualAmount: zod_1.z.number().min(0).default(0),
    hasIva: zod_1.z.boolean().default(true),
    ivaRate: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Action Payloads for POST /api/v1/ai/action
 * Strictly enforces:
 * - Zero Mock Data (Rule 4)
 * - Code == CostCenter (Rule 15)
 * - Tax rate by country (Rule 8)
 * - Non-destructive deep merge in production (Rule 14)
 */
exports.UpsertOpportunityPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().optional(),
    title: zod_1.z.string().min(3),
    clientName: zod_1.z.string().min(2),
    clientNit: zod_1.z.string().optional(),
    country: zod_1.z.string().default('Colombia'),
    currency: zod_1.z.enum(['COP', 'USD', 'EUR']).default('COP'),
    estimatedValueUSD: zod_1.z.number().min(0).default(0),
    stage: zod_1.z.enum(['lead', 'qualification', 'proposal', 'negotiation', 'awarded', 'lost']).default('proposal'),
    expectedCloseDate: zod_1.z.string().optional(),
    cableType: zod_1.z.string().optional(),
});
exports.UpsertProjectPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    code: zod_1.z.string().min(2, 'Project code is mandatory and serves as costCenter'),
    name: zod_1.z.string().min(3),
    clientName: zod_1.z.string().min(2),
    clientNit: zod_1.z.string().optional(),
    clientCountry: zod_1.z.string().default('Colombia'),
    location: zod_1.z.string().optional(),
    status: zod_1.z.enum(['prospecting', 'kickoff', 'active', 'in_closing', 'closed']).default('kickoff'),
    contractAmount: zod_1.z.number().min(0).default(0),
    budgetPV: zod_1.z.number().min(0).default(0),
    currency: zod_1.z.enum(['COP', 'USD']).default('COP'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    projectItems: zod_1.z.array(exports.ProjectItemSchema).optional(),
    costMatrix: zod_1.z.array(exports.CostMatrixRowSchema).optional(),
});
exports.UpsertRequisitionPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    projectId: zod_1.z.string().min(1, 'projectId is required'),
    projectCode: zod_1.z.string().min(1, 'projectCode is required'),
    itemCode: zod_1.z.string().min(1, 'itemCode (Carpeta Contractual) is required by Plan 1'),
    requesterId: zod_1.z.string().default('AI-AGENT'),
    requesterName: zod_1.z.string().default('Agente IA Autorizado'),
    priority: zod_1.z.enum(['normal', 'urgente']).default('normal'),
    justification: zod_1.z.string().min(3),
    items: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        qty: zod_1.z.number().positive(),
        unit: zod_1.z.string().default('unid'),
    })).min(1),
});
exports.UpsertPurchaseOrderPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    projectId: zod_1.z.string().min(1, 'projectId is required'),
    projectCode: zod_1.z.string().min(1, 'projectCode is required'),
    itemCode: zod_1.z.string().min(1, 'itemCode (Carpeta Contractual) is mandatory'),
    supplierId: zod_1.z.string().min(1),
    supplierName: zod_1.z.string().min(1),
    country: zod_1.z.string().default('Colombia'),
    hasIva: zod_1.z.boolean().default(true),
    trm: zod_1.z.number().positive().default(4150),
    originRequisitionId: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        qty: zod_1.z.number().positive(),
        unit: zod_1.z.string().default('unid'),
        unitPriceCOP: zod_1.z.number().min(0),
    })).min(1),
});
exports.RecordTimesheetPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    employeeId: zod_1.z.string().min(1),
    projectId: zod_1.z.string().min(1),
    projectCode: zod_1.z.string().min(1),
    itemCode: zod_1.z.string().min(1, 'itemCode is required to allocate labor cost to contractual folder'),
    taskId: zod_1.z.string().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    hoursOrdinary: zod_1.z.number().min(0).max(24).default(0),
    hoursExtraDay: zod_1.z.number().min(0).max(24).default(0),
    hoursNight: zod_1.z.number().min(0).max(24).default(0),
    hoursExtraNight: zod_1.z.number().min(0).max(24).default(0),
    hoursSunday: zod_1.z.number().min(0).max(24).default(0),
    notes: zod_1.z.string().optional(),
});
exports.UpsertProductPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    sku: zod_1.z.string().min(2),
    name: zod_1.z.string().min(2),
    category: zod_1.z.string().min(2),
    unit: zod_1.z.string().default('unid'),
    costPriceCOP: zod_1.z.number().min(0),
    costPriceUSD: zod_1.z.number().min(0).optional(),
    realStock: zod_1.z.number().min(0).default(0),
    reservedStock: zod_1.z.number().min(0).default(0),
    minStock: zod_1.z.number().min(0).default(0),
    locationName: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    observations: zod_1.z.string().optional(),
});
exports.UpsertRemissionPayload = zod_1.z.object({
    id: zod_1.z.string().optional(),
    remissionNumber: zod_1.z.string().optional(),
    projectId: zod_1.z.string().min(1),
    projectCode: zod_1.z.string().min(1),
    itemCode: zod_1.z.string().default('ITEM 01'),
    responsibleId: zod_1.z.string().min(1),
    responsibleName: zod_1.z.string().min(1),
    destinationFront: zod_1.z.string().min(1),
    type: zod_1.z.enum(['consumable', 'equipment_loan']).default('equipment_loan'),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string().min(1),
        sku: zod_1.z.string().min(1),
        name: zod_1.z.string().min(1),
        qty: zod_1.z.number().positive().default(1),
        unit: zod_1.z.string().default('UNIDAD'),
    })).min(1),
    cleanInformalNoteOnProduct: zod_1.z.boolean().default(true),
});
exports.SandboxDeletePayload = zod_1.z.object({
    collectionOrModule: exports.ModuleNameEnum,
    targetId: zod_1.z.string().min(1),
    confirmWord: zod_1.z.literal('BORRAR'),
});
exports.SyncUsersToEmployeesPayload = zod_1.z.object({
    defaultLaborRates: zod_1.z
        .object({
        baseSalary: zod_1.z.number().min(0).default(2500000),
        multiplier: zod_1.z.number().positive().default(1.52),
        monthlyHours: zod_1.z.number().positive().default(210),
    })
        .optional(),
    autoCreateMissingRecords: zod_1.z.boolean().default(true),
    consolidateDuplicateUsers: zod_1.z.boolean().default(true),
});
exports.RecalculateProjectEvmPayload = zod_1.z.object({
    projectId: zod_1.z.string().optional(),
    stripBase64Photos: zod_1.z.boolean().default(true),
});
exports.PurgeMockDataPayload = zod_1.z.object({
    targetCollections: zod_1.z.array(zod_1.z.string()).default(['projects', 'contacts', 'opportunities']),
    searchTerms: zod_1.z.array(zod_1.z.string()).default(['PRUEBA', 'TEST', 'CODIGO PROYECTO PRUEBA']),
    mode: zod_1.z.enum(['DRY_RUN_FIRST', 'EXECUTE']).default('DRY_RUN_FIRST'),
});
exports.RestructureLevel3GovernancePayload = zod_1.z.object({
    projectId: zod_1.z.string().default('PRJ-1793367181536'),
    reconcileBacAndOffer: zod_1.z.boolean().default(true),
    decoupleCareerProfilesFromUsers: zod_1.z.boolean().default(true),
    segregateEquipmentFromConsumables: zod_1.z.boolean().default(true),
    recalculateTaxEngineSummary: zod_1.z.boolean().default(true),
});
exports.ExecuteLevel4And5ArchitecturePayload = zod_1.z.object({
    enforceJobPositionForeignKeys: zod_1.z.boolean().default(true),
    normalizeCompetenciesCatalog: zod_1.z.boolean().default(true),
    runHseqProactiveAlertEngine: zod_1.z.boolean().default(true),
    hseqWarningDaysThreshold: zod_1.z.number().int().min(1).default(60),
    enforceCascadingSoftDeleteOnOrphans: zod_1.z.boolean().default(true),
    runMrpAutomatedEngine: zod_1.z.boolean().default(true),
    configureRetentionAndAdvanceSubledger: zod_1.z.boolean().default(true),
    defaultAdvancePct: zod_1.z.number().min(0).max(50).default(10),
    defaultRetentionGuaranteePct: zod_1.z.number().min(0).max(30).default(5),
});
exports.ExecuteLevel679ArchitecturePayload = zod_1.z.object({
    postDavidHurtadoHoursToProject: zod_1.z.boolean().default(true),
    projectId: zod_1.z.string().default('PRJ-1793367181536'),
    itemCode: zod_1.z.string().default('ITEM PRUEBA 1'),
    hours: zod_1.z.number().default(10),
    hourlyRateCOP: zod_1.z.number().default(27505),
    enforceLotoProtocolInWorkOrders: zod_1.z.boolean().default(true),
    enableCryptographicMilestoneSignatures: zod_1.z.boolean().default(true),
    configureGeofencesAndMakerChecker: zod_1.z.boolean().default(true),
});
exports.ExecuteRelationalIdAuditFixPayload = zod_1.z.object({
    fixLoanProductRelationalIds: zod_1.z.boolean().default(true),
    removeOrphanContactsFromActive: zod_1.z.boolean().default(true),
    linkAllUsersToEmployeeIds: zod_1.z.boolean().default(true),
    standardizeSkillCatalogIds: zod_1.z.boolean().default(true),
});
exports.AiActionRequestSchema = zod_1.z.discriminatedUnion('action', [
    zod_1.z.object({ action: zod_1.z.literal('upsert_opportunity'), payload: exports.UpsertOpportunityPayload }),
    zod_1.z.object({ action: zod_1.z.literal('upsert_project'), payload: exports.UpsertProjectPayload }),
    zod_1.z.object({ action: zod_1.z.literal('upsert_requisition'), payload: exports.UpsertRequisitionPayload }),
    zod_1.z.object({ action: zod_1.z.literal('upsert_purchase_order'), payload: exports.UpsertPurchaseOrderPayload }),
    zod_1.z.object({ action: zod_1.z.literal('record_timesheet'), payload: exports.RecordTimesheetPayload }),
    zod_1.z.object({ action: zod_1.z.literal('upsert_product'), payload: exports.UpsertProductPayload }),
    zod_1.z.object({ action: zod_1.z.literal('upsert_remission'), payload: exports.UpsertRemissionPayload }),
    zod_1.z.object({ action: zod_1.z.literal('sandbox_delete_entity'), payload: exports.SandboxDeletePayload }),
    zod_1.z.object({ action: zod_1.z.literal('SYNC_USERS_TO_EMPLOYEES'), payload: exports.SyncUsersToEmployeesPayload }),
    zod_1.z.object({ action: zod_1.z.literal('RECALCULATE_PROJECT_EVM'), payload: exports.RecalculateProjectEvmPayload }),
    zod_1.z.object({ action: zod_1.z.literal('PURGE_MOCK_DATA'), payload: exports.PurgeMockDataPayload }),
    zod_1.z.object({ action: zod_1.z.literal('RESTRUCTURE_LEVEL3_GOVERNANCE'), payload: exports.RestructureLevel3GovernancePayload }),
    zod_1.z.object({ action: zod_1.z.literal('EXECUTE_LEVEL4_AND_5_ARCHITECTURE'), payload: exports.ExecuteLevel4And5ArchitecturePayload }),
    zod_1.z.object({ action: zod_1.z.literal('EXECUTE_LEVEL6_7_9_ARCHITECTURE'), payload: exports.ExecuteLevel679ArchitecturePayload }),
    zod_1.z.object({ action: zod_1.z.literal('EXECUTE_RELATIONAL_ID_AUDIT_FIX'), payload: exports.ExecuteRelationalIdAuditFixPayload }),
]);
//# sourceMappingURL=aiSchemas.js.map