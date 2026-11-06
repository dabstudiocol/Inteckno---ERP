import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import {
  AiActionRequestSchema,
  DataQuerySchema,
  ModuleNameEnum,
  SummaryQuerySchema,
} from '../schemas/aiSchemas';
import {
  executeAiAction,
  loadProductsFromFirestore,
  readErpModuleData,
  runErpIntegrityDiagnostics,
} from '../services/erpDataService';
import {
  checkIdempotencyKey,
  recordAiAuditLog,
  saveIdempotencyKey,
} from '../services/auditAndBackupService';
import { calculateRealProjectMargin, getProjectTaxRate } from '../services/businessRules';

const API_VERSION = '1.0.0-ai-gateway';

/**
 * GET /api/v1/ai/status
 * Health, module counts, deployed version, and active environment ('prod' | 'sandbox')
 */
export async function getStatusController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  try {
    const db = admin.firestore();
    const [projSnap, procSnap, opsSnap, hrSnap, commSnap, prodSnap, usersSnap] = await Promise.all([
      db.collection('erp_modules').doc('projects').get(),
      db.collection('erp_modules').doc('procurement').get(),
      db.collection('erp_modules').doc('operations').get(),
      db.collection('erp_modules').doc('hr').get(),
      db.collection('erp_modules').doc('commercial').get(),
      db.collection('erp_inventory').doc('meta').get(),
      db.collection('users').count().get(),
    ]);

    const pData = projSnap.exists ? projSnap.data() || {} : {};
    const prData = procSnap.exists ? procSnap.data() || {} : {};
    const oData = opsSnap.exists ? opsSnap.data() || {} : {};
    const hData = hrSnap.exists ? hrSnap.data() || {} : {};
    const cData = commSnap.exists ? commSnap.data() || {} : {};
    const invMeta = prodSnap.exists ? prodSnap.data() || {} : {};

    const counts = {
      projects: Array.isArray(pData.projects) ? pData.projects.length : 0,
      tasks: Array.isArray(pData.tasks) ? pData.tasks.length : 0,
      milestones: Array.isArray(pData.milestones) ? pData.milestones.length : 0,
      purchaseOrders: Array.isArray(prData.purchaseOrders) ? prData.purchaseOrders.length : 0,
      requisitions: Array.isArray(prData.requisitions) ? prData.requisitions.length : 0,
      partners: Array.isArray(prData.partners) ? prData.partners.length : 0,
      products: Number(invMeta.totalProducts || 0),
      timesheets: Array.isArray(oData.timesheets) ? oData.timesheets.length : 0,
      expenses: Array.isArray(oData.expenses) ? oData.expenses.length : 0,
      workOrders: Array.isArray(oData.workOrders) ? oData.workOrders.length : 0,
      employees: Array.isArray(hData.employees) ? hData.employees.length : 0,
      opportunities: Array.isArray(cData.opportunities) ? cData.opportunities.length : 0,
      contacts: Array.isArray(cData.contacts) ? cData.contacts.length : 0,
      users: usersSnap.data().count,
    };

    const payload = {
      status: 'ok',
      version: API_VERSION,
      environment: ctx.environment,
      keyId: ctx.keyId,
      scopes: ctx.scopes,
      timestamp: new Date().toISOString(),
      counts,
    };

    await recordAiAuditLog({
      ctx,
      method: 'GET',
      path: '/status',
      statusCode: 200,
      summary: `Status check in ${ctx.environment}`,
    });

    res.status(200).json(payload);
  } catch (err: any) {
    res.status(500).json({ error: 'STATUS_ERROR', message: err?.message || 'Error retrieving status' });
  }
}

/**
 * GET /api/v1/ai/schema
 * Full catalog of modules, collections, fields, and Closed-Loop Information Highway relationships
 */
export async function getSchemaController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  const schemaCatalog = {
    version: API_VERSION,
    architecture: 'Cloud-First Real-Time Firestore (`erp_modules` + `erp_products` + `erp_kardex`)',
    businessRules: {
      zeroMockData: 'Empty collections return [] and numeric fields 0. Never invent placeholder rows.',
      costCenterRule: 'Project.code === Project.costCenter',
      realMarginFormula: '(Contract - EAC) / Contract where EAC = max(actualCostAC, plannedCost). Returns "N/D" if EAC === 0.',
      colombiaLaborHourFormula: '((baseSalaryCOP * 1.52) / 210) per Ley 2101/2021. Never invent rate if salary is missing.',
      dynamicTaxByCountry: 'Colombia 19%, México 16%, Chile 19%, Perú 18%, Bolivia 13%, Ecuador 15%, Panamá 7%.',
      nonDestructiveProdWrites: 'In prod, POST /action performs non-destructive deep merge and creates pre-write backup in erp_backups.',
    },
    informationHighways: [
      {
        axis: 'EJE 1: Comercial -> Proyectos STC',
        flow: 'opportunities -> projects (inherits clientNit, offerBudget, projectItems [ITEM 01..N], milestones)',
        joinKeys: ['opportunityId', 'clientId', 'code'],
      },
      {
        axis: 'EJE 2: Ingeniería -> Abastecimiento -> Almacén -> Matriz de Costos',
        flow: 'projects.projectItems -> requisitions (SOLPED) -> purchaseOrders (OC) -> products / kardex -> projects.costMatrix',
        joinKeys: ['projectId', 'projectCode', 'itemCode', 'originRequisitionId', 'sku'],
      },
      {
        axis: 'EJE 3: Campo -> Nómina RRHH -> Valor Ganado (EVM)',
        flow: 'employees (baseSalaryCOP) -> timesheets (hours + itemCode) -> projects.actualCostAC & costMatrix',
        joinKeys: ['employeeId', 'projectId', 'projectCode', 'itemCode'],
      },
      {
        axis: 'EJE 4: Operaciones -> Facturación 48h -> Recaudo -> EBITDA',
        flow: 'projects -> milestones (acceptanceActSigned -> 48h rule) -> billingItems / dian_invoices',
        joinKeys: ['projectId', 'projectCode', 'milestoneIndex'],
      },
    ],
    firestoreStorageLayout: {
      'erp_modules/projects': ['projects', 'tasks', 'milestones'],
      'erp_modules/procurement': ['purchaseOrders', 'requisitions', 'equipment', 'partners', 'inventoryAuditLogs'],
      'erp_modules/operations': ['timesheets', 'expenses', 'ddrs', 'remissions', 'maintenancePlans', 'workOrders', 'manufacturingOrders', 'benchTests'],
      'erp_modules/hr': ['employees', 'novelties', 'sstInspections', 'jobPositions', 'candidates'],
      'erp_modules/commercial': ['opportunities', 'contacts', 'leads'],
      'erp_modules/productivity': ['todos', 'calendarEvents', 'documents', 'articles', 'chatGroups'],
      'erp_products/{productId}': 'Individual SKU documents synced with erp_inventory/meta & chunk_0..N (300 items/chunk)',
      'erp_kardex/{kardexId}': 'Immutable stock audit ledger',
      'users/{userId}': 'Corporate users and RBAC profiles',
    },
    queryableModules: ModuleNameEnum.options,
  };

  await recordAiAuditLog({
    ctx,
    method: 'GET',
    path: '/schema',
    statusCode: 200,
    summary: 'Schema & Highway discovery',
  });

  res.status(200).json(schemaCatalog);
}

/**
 * GET /api/v1/ai/data/:module
 * Paginated, filtered, field-projected, condensed reader for any ERP module
 */
export async function getModuleDataController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  const modParse = ModuleNameEnum.safeParse(req.params.module);
  if (!modParse.success) {
    res.status(400).json({
      error: 'INVALID_MODULE_NAME',
      message: `Unknown module '${req.params.module}'. Valid modules: ${ModuleNameEnum.options.join(', ')}`,
    });
    return;
  }

  const queryParse = DataQuerySchema.safeParse(req.query);
  if (!queryParse.success) {
    res.status(400).json({
      error: 'INVALID_QUERY_PARAMS',
      details: queryParse.error.flatten(),
    });
    return;
  }

  try {
    const result = await readErpModuleData({
      module: modParse.data,
      fields: queryParse.data.fields,
      filter: queryParse.data.filter,
      limit: queryParse.data.limit,
      cursor: queryParse.data.cursor,
      hasPiiScope: ctx.scopes.includes('pii'),
    });

    await recordAiAuditLog({
      ctx,
      method: 'GET',
      path: `/data/${modParse.data}`,
      statusCode: 200,
      summary: `Read ${result.returnedCount}/${result.totalCount} items from ${modParse.data}`,
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'DATA_READ_ERROR', message: err?.message || 'Error reading module data' });
  }
}

/**
 * GET /api/v1/ai/summary
 * Ultra-condensed executive & operational KPIs (?projectCode= optional)
 */
export async function getSummaryController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  const qParse = SummaryQuerySchema.safeParse(req.query);
  if (!qParse.success) {
    res.status(400).json({ error: 'INVALID_QUERY', details: qParse.error.flatten() });
    return;
  }

  try {
    const db = admin.firestore();
    const [projSnap, procSnap, commSnap, products] = await Promise.all([
      db.collection('erp_modules').doc('projects').get(),
      db.collection('erp_modules').doc('procurement').get(),
      db.collection('erp_modules').doc('commercial').get(),
      loadProductsFromFirestore(),
    ]);

    const pData = projSnap.exists ? projSnap.data() || {} : {};
    const prData = procSnap.exists ? procSnap.data() || {} : {};
    const cData = commSnap.exists ? commSnap.data() || {} : {};

    let projects: any[] = Array.isArray(pData.projects) ? pData.projects : [];
    let purchaseOrders: any[] = Array.isArray(prData.purchaseOrders) ? prData.purchaseOrders : [];
    let requisitions: any[] = Array.isArray(prData.requisitions) ? prData.requisitions : [];
    const opportunities: any[] = Array.isArray(cData.opportunities) ? cData.opportunities : [];

    const filterCode = qParse.data.projectCode?.trim().toLowerCase();
    if (filterCode) {
      projects = projects.filter((p) => String(p.code || '').toLowerCase() === filterCode);
      purchaseOrders = purchaseOrders.filter((po) => String(po.projectCode || '').toLowerCase() === filterCode);
      requisitions = requisitions.filter((r) => String(r.projectCode || '').toLowerCase() === filterCode);
    }

    const projectSummaries = projects.map((p) => {
      const m = calculateRealProjectMargin(p);
      const tax = getProjectTaxRate(p.clientCountry || p.location);
      return {
        code: p.code,
        name: p.name,
        status: p.status,
        country: tax.countryName,
        taxRate: tax.rate,
        contractCOP: m.contractAmount,
        eacCOP: m.eac,
        actualCostCOP: m.actualCost,
        committedPOCOP: Number(p.committedCostPO || 0),
        marginPct: m.marginPct,
        itemsCount: Array.isArray(p.projectItems) ? p.projectItems.length : 1,
      };
    });

    const totalContractCOP = projectSummaries.reduce((a, b) => a + b.contractCOP, 0);
    const totalActualCostCOP = projectSummaries.reduce((a, b) => a + b.actualCostCOP, 0);
    const totalCommittedPOCOP = purchaseOrders.reduce((a, b) => a + Number(b.totalAmountCOP || 0), 0);
    const lowStockSkus = products.filter((pr) => Number(pr.realStock || 0) <= Number(pr.minStock || 0)).length;

    const summary = {
      filterProjectCode: qParse.data.projectCode || null,
      kpis: {
        projectsCount: projectSummaries.length,
        totalContractCOP,
        totalActualCostCOP,
        totalCommittedPOCOP,
        openRequisitionsCount: requisitions.filter((r) => r.status !== 'fulfilled').length,
        activeOpportunitiesCount: opportunities.filter((o) => o.stage !== 'lost').length,
        totalSkusInStock: products.length,
        lowStockAlertCount: lowStockSkus,
      },
      projects: projectSummaries,
    };

    await recordAiAuditLog({
      ctx,
      method: 'GET',
      path: '/summary',
      statusCode: 200,
      summary: `Summary KPIs requested (projectCode=${qParse.data.projectCode || 'ALL'})`,
    });

    res.status(200).json(summary);
  } catch (err: any) {
    res.status(500).json({ error: 'SUMMARY_ERROR', message: err?.message || 'Error building summary' });
  }
}

/**
 * GET /api/v1/ai/diagnostics
 * Automated Integrity & Closed-Loop Highway Diagnostic Checks
 */
export async function getDiagnosticsController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  try {
    const report = await runErpIntegrityDiagnostics();

    await recordAiAuditLog({
      ctx,
      method: 'GET',
      path: '/diagnostics',
      statusCode: 200,
      summary: `Diagnostics executed: ${report.totalIssues} findings (healthy=${report.healthy})`,
    });

    res.status(200).json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'DIAGNOSTICS_ERROR', message: err?.message || 'Error running diagnostics' });
  }
}

/**
 * POST /api/v1/ai/action
 * Validated mutations with Idempotency-Key, Pre-Write Backup in Prod, and Non-Destructive Deep Merge
 */
export async function postActionController(req: Request, res: Response): Promise<void> {
  const ctx = req.aiContext!;
  const idempotencyKey = req.header('Idempotency-Key');

  // Verify write scope for current environment
  if (ctx.environment === 'prod' && !ctx.scopes.includes('write_prod_safe')) {
    res.status(403).json({
      error: 'FORBIDDEN_PROD_WRITE',
      message: "Writing to production requires scope 'write_prod_safe'.",
    });
    return;
  }

  if (ctx.environment === 'sandbox' && !ctx.scopes.includes('write_sandbox') && !ctx.scopes.includes('write_prod_safe')) {
    res.status(403).json({
      error: 'FORBIDDEN_SANDBOX_WRITE',
      message: "Writing to sandbox requires scope 'write_sandbox'.",
    });
    return;
  }

  // Check Idempotency-Key
  const idemCheck = await checkIdempotencyKey(idempotencyKey, ctx.keyId);
  if (idemCheck.hit) {
    res.setHeader('X-Idempotent-Replay', 'true');
    res.status(200).json(idemCheck.cachedResponse);
    return;
  }

  const parsed = AiActionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    await recordAiAuditLog({
      ctx,
      method: 'POST',
      path: '/action',
      statusCode: 400,
      idempotencyKey,
      summary: 'Zod validation failed on POST /action',
    });
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Payload failed strict Zod schema validation.',
      details: parsed.error.flatten(),
    });
    return;
  }

  try {
    const executionResult = await executeAiAction(parsed.data, ctx);

    await saveIdempotencyKey(idempotencyKey, ctx.keyId, executionResult);

    await recordAiAuditLog({
      ctx,
      method: 'POST',
      path: '/action',
      action: parsed.data.action,
      idempotencyKey,
      backupId: executionResult.backupId,
      statusCode: 200,
      summary: `Executed ${parsed.data.action} on ${executionResult.entityId}`,
    });

    res.status(200).json(executionResult);
  } catch (err: any) {
    const code = err?.statusCode || 500;
    await recordAiAuditLog({
      ctx,
      method: 'POST',
      path: '/action',
      action: parsed.data.action,
      idempotencyKey,
      statusCode: code,
      summary: `Failed ${parsed.data.action}: ${err?.message || 'Error'}`,
    });
    res.status(code).json({
      error: err?.error || 'ACTION_EXECUTION_ERROR',
      message: err?.message || 'Failed to execute action',
    });
  }
}
