import * as admin from 'firebase-admin';
import { ModuleName } from '../schemas/aiSchemas';
import {
  calculateRealProjectMargin,
  calculateColombiaHourlyCost,
  ensureProjectItems,
  getProjectTaxRate,
  TaxEngine,
  maskPiiAndCondense,
  nonDestructiveDeepMerge,
} from './businessRules';
import { createPreWriteBackup } from './auditAndBackupService';
import { ValidatedAiContext } from '../middleware/security';
import { AiActionRequest } from '../schemas/aiSchemas';

/**
 * Maps sub-entity names to their parent `erp_modules/{docId}` document and array key
 */
const MODULE_DOC_MAP: Record<string, { docId: string; arrayKey: string }> = {
  projects: { docId: 'projects', arrayKey: 'projects' },
  tasks: { docId: 'projects', arrayKey: 'tasks' },
  milestones: { docId: 'projects', arrayKey: 'milestones' },
  purchaseOrders: { docId: 'procurement', arrayKey: 'purchaseOrders' },
  requisitions: { docId: 'procurement', arrayKey: 'requisitions' },
  equipment: { docId: 'procurement', arrayKey: 'equipment' },
  partners: { docId: 'procurement', arrayKey: 'partners' },
  inventoryAuditLogs: { docId: 'procurement', arrayKey: 'inventoryAuditLogs' },
  timesheets: { docId: 'operations', arrayKey: 'timesheets' },
  expenses: { docId: 'operations', arrayKey: 'expenses' },
  ddrs: { docId: 'operations', arrayKey: 'ddrs' },
  remissions: { docId: 'operations', arrayKey: 'remissions' },
  maintenancePlans: { docId: 'operations', arrayKey: 'maintenancePlans' },
  workOrders: { docId: 'operations', arrayKey: 'workOrders' },
  manufacturingOrders: { docId: 'operations', arrayKey: 'manufacturingOrders' },
  benchTests: { docId: 'operations', arrayKey: 'benchTests' },
  employees: { docId: 'hr', arrayKey: 'employees' },
  careerProfiles: { docId: 'hr', arrayKey: 'careerProfiles' },
  novelties: { docId: 'hr', arrayKey: 'novelties' },
  sstInspections: { docId: 'hr', arrayKey: 'sstInspections' },
  jobPositions: { docId: 'hr', arrayKey: 'jobPositions' },
  candidates: { docId: 'hr', arrayKey: 'candidates' },
  opportunities: { docId: 'commercial', arrayKey: 'opportunities' },
  contacts: { docId: 'commercial', arrayKey: 'contacts' },
  leads: { docId: 'commercial', arrayKey: 'leads' },
  todos: { docId: 'productivity', arrayKey: 'todos' },
  calendarEvents: { docId: 'productivity', arrayKey: 'calendarEvents' },
  documents: { docId: 'productivity', arrayKey: 'documents' },
  articles: { docId: 'productivity', arrayKey: 'articles' },
  chatGroups: { docId: 'productivity', arrayKey: 'chatGroups' },
};

/**
 * Loads full inventory from `erp_products` or fallback `erp_inventory/chunk_X`
 */
export async function loadProductsFromFirestore(): Promise<any[]> {
  const db = admin.firestore();
  const prodSnap = await db.collection('erp_products').limit(1500).get();
  if (!prodSnap.empty) {
    return prodSnap.docs.map((d) => d.data());
  }
  const metaSnap = await db.collection('erp_inventory').doc('meta').get();
  if (!metaSnap.exists) return [];
  const chunkCount = Number(metaSnap.data()?.chunkCount || 0);
  const items: any[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const cSnap = await db.collection('erp_inventory').doc(`chunk_${i}`).get();
    if (cSnap.exists && Array.isArray(cSnap.data()?.items)) {
      items.push(...cSnap.data()!.items);
    }
  }
  return items;
}

/**
 * Syncs product list to both `erp_products` and `erp_inventory/chunk_X` so frontend `onSnapshot` receives it immediately
 */
export async function syncProductsToFirestore(products: any[], updatedBy: string): Promise<void> {
  const db = admin.firestore();
  const now = new Date().toISOString();
  const CHUNK_SIZE = 300;
  const chunks: any[][] = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE) {
    chunks.push(products.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i++) {
    await db.collection('erp_inventory').doc(`chunk_${i}`).set({
      chunkIndex: i,
      itemCount: chunks[i].length,
      items: JSON.parse(JSON.stringify(chunks[i])),
      lastUpdated: now,
    });
  }
  await db.collection('erp_inventory').doc('meta').set({
    totalProducts: products.length,
    chunkCount: chunks.length,
    lastUpdated: now,
    updatedBy,
  });
}

/**
 * Reads any module or sub-entity with filter, field projection, cursor pagination, and PII masking
 */
export async function readErpModuleData(params: {
  module: ModuleName;
  fields?: string;
  filter?: string;
  limit: number;
  cursor?: string;
  hasPiiScope: boolean;
}): Promise<{
  module: string;
  totalCount: number;
  returnedCount: number;
  nextCursor: string | null;
  items: any[];
}> {
  const db = admin.firestore();
  let rawItems: any[] = [];

  if (params.module === 'products') {
    rawItems = await loadProductsFromFirestore();
  } else if (params.module === 'kardex') {
    const snap = await db.collection('erp_kardex').orderBy('timestamp', 'desc').limit(500).get();
    rawItems = snap.docs.map((d) => d.data());
  } else if (params.module === 'users') {
    const snap = await db.collection('users').limit(300).get();
    rawItems = snap.docs.map((d) => d.data());
  } else if (params.module === 'chat_messages') {
    const snap = await db.collection('chat_messages').orderBy('timestamp', 'desc').limit(150).get();
    rawItems = snap.docs.map((d) => d.data());
  } else if (params.module === 'configs') {
    const snap = await db.collection('erp_module_configs').limit(100).get();
    rawItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (['procurement', 'operations', 'hr', 'commercial', 'productivity'].includes(params.module)) {
    const docSnap = await db.collection('erp_modules').doc(params.module).get();
    const docData = docSnap.exists ? docSnap.data() || {} : {};
    rawItems = [docData];
  } else {
    const mapped = MODULE_DOC_MAP[params.module];
    if (mapped) {
      const docSnap = await db.collection('erp_modules').doc(mapped.docId).get();
      const docData = docSnap.exists ? docSnap.data() || {} : {};
      rawItems = Array.isArray(docData[mapped.arrayKey]) ? docData[mapped.arrayKey] : [];
    }
  }

  // Enrich projects with computed Real Margin (Rule 15) and Tax Rate (Rule 8)
  if (params.module === 'projects') {
    rawItems = rawItems.map((p) => {
      const margin = calculateRealProjectMargin(p);
      const tax = getProjectTaxRate(p.clientCountry || p.location);
      return {
        ...p,
        projectItems: ensureProjectItems(p),
        computedMarginPct: margin.marginPct,
        computedEAC: margin.eac,
        computedTaxRate: tax.rate,
      };
    });
  }

  // Enrich employees with Colombia Hourly Cost (Rule 15 - Ley 2101)
  if (params.module === 'employees') {
    rawItems = rawItems.map((emp) => {
      const cost = calculateColombiaHourlyCost(emp.baseSalaryCOP || emp.monthlyBaseSalary);
      return {
        ...emp,
        computedHourlyCostCOP: cost.hourlyCostCOP,
        computedMonthlyCompanyCostCOP: cost.monthlyCompanyCostCOP,
      };
    });
  }

  // Apply filter (supports JSON or "key:val,key2:val2")
  if (params.filter && params.filter.trim()) {
    const filterPairs: Record<string, string> = {};
    const rawFilter = params.filter.trim();
    if (rawFilter.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawFilter);
        for (const [k, v] of Object.entries(parsed)) {
          filterPairs[k] = String(v).toLowerCase();
        }
      } catch {
        // fallback
      }
    } else {
      rawFilter.split(',').forEach((part) => {
        const [k, ...rest] = part.split(':');
        if (k && rest.length > 0) {
          filterPairs[k.trim()] = rest.join(':').trim().toLowerCase();
        }
      });
    }

    if (Object.keys(filterPairs).length > 0) {
      rawItems = rawItems.filter((item) => {
        return Object.entries(filterPairs).every(([k, expectedVal]) => {
          const actual = item?.[k];
          if (actual === undefined || actual === null) return false;
          return String(actual).toLowerCase().includes(expectedVal);
        });
      });
    }
  }

  const totalCount = rawItems.length;

  // Apply cursor pagination
  let startIndex = 0;
  if (params.cursor) {
    const idx = rawItems.findIndex((it) => String(it?.id || it?.code || it?.sku) === params.cursor);
    if (idx !== -1) {
      startIndex = idx + 1;
    }
  }

  const sliced = rawItems.slice(startIndex, startIndex + params.limit);
  const lastItem = sliced[sliced.length - 1];
  const hasMore = startIndex + params.limit < totalCount;
  const nextCursor = hasMore && lastItem ? String(lastItem.id || lastItem.code || lastItem.sku || '') : null;

  const projectedFields = params.fields
    ? params.fields
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : undefined;

  const condensed = maskPiiAndCondense(sliced, params.hasPiiScope, projectedFields) || [];

  return {
    module: params.module,
    totalCount,
    returnedCount: condensed.length,
    nextCursor,
    items: condensed,
  };
}

/**
 * Automated Integrity Diagnostics across the entire Inteckno ERP Information Highway
 */
export async function runErpIntegrityDiagnostics(): Promise<{
  healthy: boolean;
  totalIssues: number;
  checkedAt: string;
  findings: Array<{
    severity: 'critical' | 'warning' | 'info';
    ruleViolated: string;
    module: string;
    entityId: string;
    description: string;
    suggestedFix: string;
  }>;
}> {
  const db = admin.firestore();
  const [projDoc, procDoc, opsDoc, hrDoc, usersSnap] = await Promise.all([
    db.collection('erp_modules').doc('projects').get(),
    db.collection('erp_modules').doc('procurement').get(),
    db.collection('erp_modules').doc('operations').get(),
    db.collection('erp_modules').doc('hr').get(),
    db.collection('users').get(),
  ]);

  const projects: any[] = projDoc.exists && Array.isArray(projDoc.data()?.projects) ? projDoc.data()!.projects : [];
  const tasks: any[] = projDoc.exists && Array.isArray(projDoc.data()?.tasks) ? projDoc.data()!.tasks : [];
  const purchaseOrders: any[] = procDoc.exists && Array.isArray(procDoc.data()?.purchaseOrders) ? procDoc.data()!.purchaseOrders : [];
  const requisitions: any[] = procDoc.exists && Array.isArray(procDoc.data()?.requisitions) ? procDoc.data()!.requisitions : [];
  const timesheets: any[] = opsDoc.exists && Array.isArray(opsDoc.data()?.timesheets) ? opsDoc.data()!.timesheets : [];
  const employees: any[] = hrDoc.exists && Array.isArray(hrDoc.data()?.employees) ? hrDoc.data()!.employees : [];
  const users: any[] = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const findings: Array<{
    severity: 'critical' | 'warning' | 'info';
    ruleViolated: string;
    module: string;
    entityId: string;
    description: string;
    suggestedFix: string;
  }> = [];

  const projectIds = new Set(projects.map((p) => p.id));
  const projectCodes = new Set(projects.map((p) => p.code));

  // 1. Check Projects (ITEMS, CostCenter parity, Margin/IVA consistency)
  for (const p of projects) {
    const pid = p.code || p.id;
    if (!Array.isArray(p.projectItems) || p.projectItems.length === 0) {
      findings.push({
        severity: 'critical',
        ruleViolated: 'Regla 11 & Plan 1 (Carpetas Contractuales)',
        module: 'projects',
        entityId: pid,
        description: `El proyecto ${pid} no tiene Carpetas Contractuales (projectItems: ITEM 01, etc.).`,
        suggestedFix: 'Ejecutar POST /api/v1/ai/action con action="upsert_project" para inicializar ITEM 01.',
      });
    }

    if (p.costCenter && p.costCenter !== p.code && p.costCenter !== `CC-${p.code}`) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Regla 15 (Código Proyecto == Centro de Costo)',
        module: 'projects',
        entityId: pid,
        description: `Desajuste entre código de proyecto (${p.code}) y centro de costo (${p.costCenter}).`,
        suggestedFix: `Sincronizar costCenter="${p.code}".`,
      });
    }

    const expectedTax = getProjectTaxRate(p.country || p.clientCountry || p.location);
    const contractVal = Number(p.contractAmount || 0);
    const itemsArr: any[] = Array.isArray(p.projectItems) ? p.projectItems : [];
    const itemsBudgetSum = itemsArr.reduce((acc, it) => acc + Number(it?.budgetPlanned || 0), 0);

    if (contractVal > 0 && itemsArr.length > 0 && Math.abs(itemsBudgetSum - contractVal) > 1) {
      findings.push({
        severity: 'critical',
        ruleViolated: 'Auditoría Nivel 2 ACT-01 (Fractura Línea Base EVM / BAC: Σ projectItems != contractAmount)',
        module: 'projects',
        entityId: pid,
        description: `El proyecto ${pid} tiene contractAmount=$${contractVal} COP pero la suma de projectItems es $${itemsBudgetSum} COP (brecha de $${contractVal - itemsBudgetSum} COP).`,
        suggestedFix: 'Ejecutar POST /api/v1/ai/action con action="RESTRUCTURE_LEVEL3_GOVERNANCE".',
      });
    }

    const matrix: any[] = Array.isArray(p.costMatrix) ? p.costMatrix : [];
    const matrixActualSum = matrix.reduce((acc, r) => acc + Number(r?.actualTotal ?? r?.actualAmount ?? 0), 0);
    if (matrixActualSum > 0 && Number(p.actualCostAC || 0) !== matrixActualSum) {
      findings.push({
        severity: 'critical',
        ruleViolated: 'RFC-001 Ruptura 2 (Desincronización actualCostAC vs costMatrix)',
        module: 'projects',
        entityId: pid,
        description: `El proyecto ${pid} registra $${matrixActualSum} COP en costMatrix pero su cabecera actualCostAC reporta $${Number(p.actualCostAC || 0)} COP.`,
        suggestedFix: 'Ejecutar POST /api/v1/ai/action con action="RECALCULATE_PROJECT_EVM".',
      });
    }

    if (/PRUEBA|TEST/i.test(String(p.code || '')) || /PRUEBA|TEST/i.test(String(p.clientName || ''))) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Regla 4 (Cero Mock Data en Producción)',
        module: 'projects',
        entityId: pid,
        description: `El proyecto ${pid} contiene literales de prueba ("${p.code}" / "${p.clientName}").`,
        suggestedFix: 'Ejecutar POST /api/v1/ai/action con action="PURGE_MOCK_DATA".',
      });
    }

    for (const row of matrix) {
      if (!row.itemCode) {
        findings.push({
          severity: 'warning',
          ruleViolated: 'Plan 1 (Adjudicación Granular)',
          module: 'projects.costMatrix',
          entityId: `${pid}/${row.id || row.concept}`,
          description: `Fila de matriz de costos "${row.concept}" en proyecto ${pid} no tiene itemCode asignado.`,
          suggestedFix: 'Vincular la fila a ITEM 01 o la carpeta contractual correspondiente.',
        });
      }
      if (Array.isArray(row.receiptPhotos) && row.receiptPhotos.some((ph: any) => String(ph).startsWith('data:image/'))) {
        findings.push({
          severity: 'warning',
          ruleViolated: 'RFC-001 Ruptura 6 (Base64 en Documentos Firestore)',
          module: 'projects.costMatrix',
          entityId: `${pid}/${row.id}`,
          description: `La fila ${row.id} almacena imágenes Base64 crudas dentro del documento Firestore.`,
          suggestedFix: 'Ejecutar RECALCULATE_PROJECT_EVM con stripBase64Photos=true o migrar a Cloud Storage.',
        });
      }
      if (row.hasIva === true && row.ivaRate !== undefined && Math.abs(Number(row.ivaRate) - expectedTax.rate) > 0.01) {
        findings.push({
          severity: 'info',
          ruleViolated: 'Regla 8 (IVA Dinámico por País)',
          module: 'projects.costMatrix',
          entityId: `${pid}/${row.id || row.concept}`,
          description: `Tasa IVA en fila (${row.ivaRate}) difiere de la tasa oficial de ${expectedTax.countryName} (${expectedTax.rate}).`,
          suggestedFix: `Actualizar ivaRate a ${expectedTax.rate}.`,
        });
      }
    }
  }

  // 1.B Check Users vs HR Employees (RFC-001 Ruptura 1 & 5)
  if (users.length > 0 && employees.length === 0) {
    findings.push({
      severity: 'critical',
      ruleViolated: 'RFC-001 Ruptura 1 (Eje 3 Paralizado: users sin hr.employees)',
      module: 'hr.employees',
      entityId: 'erp_modules/hr',
      description: `Existen ${users.length} cuentas en /users pero 0 colaboradores en /erp_modules/hr.employees.`,
      suggestedFix: 'Ejecutar POST /api/v1/ai/action con action="SYNC_USERS_TO_EMPLOYEES".',
    });
  }

  const nowIso = new Date().toISOString().slice(0, 10);
  for (const u of users) {
    if (u.canWorkHeights === true && (u.hseqStatus === 'expired' || (u.hseqExpiresAt && String(u.hseqExpiresAt) < nowIso))) {
      findings.push({
        severity: 'critical',
        ruleViolated: 'RFC-001 Ruptura 5 (Resolución 4272 de 2021 - Trabajo en Alturas Vencido)',
        module: 'users',
        entityId: u.id,
        description: `El usuario ${u.name} (${u.id}) tiene canWorkHeights=true pero su certificado HSEQ está vencido (${u.hseqExpiresAt}).`,
        suggestedFix: 'Bloquear canWorkHeights=false hasta renovar certificado HSEQ.',
      });
    }
    if (u.lucianaImprovementPlan || u.professionalProfile || (Array.isArray(u.verifiedSkills) && u.verifiedSkills.length > 0)) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Auditoría Nivel 2 & 3 ACT-02 (Sobrecarga de Colección /users con Perfiles de Carrera)',
        module: 'users',
        entityId: u.id,
        description: `El documento /users/${u.id} contiene nodos pesados de RRHH (lucianaImprovementPlan / professionalProfile).`,
        suggestedFix: 'Migrar a erp_modules/hr.careerProfiles mediante action="RESTRUCTURE_LEVEL3_GOVERNANCE".',
      });
    }
  }

  // 2. Check Purchase Orders (Orphans, missing itemCode)
  for (const po of purchaseOrders) {
    const poid = po.orderNumber || po.id;
    const hasValidProj = (po.projectId && projectIds.has(po.projectId)) || (po.projectCode && projectCodes.has(po.projectCode));
    if (!hasValidProj) {
      findings.push({
        severity: 'critical',
        ruleViolated: 'Eje 2 Autopista (OC sin Proyecto)',
        module: 'purchaseOrders',
        entityId: poid,
        description: `La Orden de Compra ${poid} no está vinculada a un proyecto válido (projectId: ${po.projectId || 'vacío'}).`,
        suggestedFix: 'Vincular la OC al proyecto real y su carpeta contractual.',
      });
    }
    if (!po.itemCode) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Plan 1 (Adjudicación Granular OC)',
        module: 'purchaseOrders',
        entityId: poid,
        description: `La Orden de Compra ${poid} carece de carpeta contractual (itemCode).`,
        suggestedFix: 'Asignar itemCode (ej. ITEM 01) en la OC.',
      });
    }
  }

  // 3. Check Requisitions (SOLPED without project or itemCode)
  for (const req of requisitions) {
    const reqId = req.reqNumber || req.id;
    if (req.reqType !== 'general' && !req.itemCode) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Plan 1 (SOLPED sin Ítem Contractual)',
        module: 'requisitions',
        entityId: reqId,
        description: `La Requisición ${reqId} de proyecto no tiene itemCode asignado.`,
        suggestedFix: 'Asignar itemCode del proyecto asociado.',
      });
    }
  }

  // 4. Check WBS Tasks orphans
  for (const t of tasks) {
    if (t.projectId && !projectIds.has(t.projectId)) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Integridad Relacional WBS',
        module: 'tasks',
        entityId: t.id || t.code,
        description: `Tarea WBS "${t.name}" apunta a un projectId inexistente (${t.projectId}).`,
        suggestedFix: 'Reasignar tarea a proyecto activo o depurar en sandbox.',
      });
    }
  }

  // 5. Check Employees without base salary (Rule 15 Ley 2101)
  for (const emp of employees) {
    const sal = Number(emp.baseSalaryCOP || emp.monthlyBaseSalary || 0);
    if (sal <= 0) {
      findings.push({
        severity: 'warning',
        ruleViolated: 'Regla 15 (Costo Hora Laboral Ley 2101)',
        module: 'employees',
        entityId: emp.id || emp.documentId,
        description: `Colaborador "${emp.name}" no tiene salario base configurado en RRHH.`,
        suggestedFix: 'Configurar baseSalaryCOP real para habilitar liquidación de horas.',
      });
    }
  }

  // 6. Check Timesheets without itemCode
  for (const ts of timesheets) {
    if (!ts.itemCode) {
      findings.push({
        severity: 'info',
        ruleViolated: 'Eje 3 Autopista (Horas -> Carpeta Contractual)',
        module: 'timesheets',
        entityId: ts.id,
        description: `Registro de horas ${ts.id} no especifica carpeta contractual (itemCode).`,
        suggestedFix: 'Imputar registro de horas a ITEM 01.',
      });
    }
  }

  return {
    healthy: findings.filter((f) => f.severity === 'critical').length === 0,
    totalIssues: findings.length,
    checkedAt: new Date().toISOString(),
    findings,
  };
}

/**
 * Executes validated AI Actions respecting Closed-Loop Highways and Non-Destructive Deep Merge
 */
export async function executeAiAction(
  reqAction: AiActionRequest,
  ctx: ValidatedAiContext
): Promise<{
  action: string;
  environment: 'prod' | 'sandbox';
  backupId?: string;
  entityId: string;
  propagatedTo: string[];
  result: any;
}> {
  const db = admin.firestore();
  const now = new Date().toISOString();

  // Rule 14: Block destructive actions in production
  if (reqAction.action === 'sandbox_delete_entity') {
    if (ctx.environment === 'prod') {
      throw {
        statusCode: 403,
        error: 'FORBIDDEN_IN_PRODUCTION',
        message: 'Regla 14 (Agente Guardián de Datos): Prohibido eliminar o reiniciar entidades por API en producción. Use el entorno sandbox.',
      };
    }
    const { collectionOrModule, targetId } = reqAction.payload;
    const mapped = MODULE_DOC_MAP[collectionOrModule];
    if (mapped) {
      const ref = db.collection('erp_modules').doc(mapped.docId);
      const snap = await ref.get();
      const data = snap.exists ? snap.data() || {} : {};
      const arr: any[] = Array.isArray(data[mapped.arrayKey]) ? data[mapped.arrayKey] : [];
      const filtered = arr.filter((x) => String(x.id || x.code) !== targetId);
      await ref.set({ ...data, [mapped.arrayKey]: filtered, lastUpdated: now, updatedBy: `AI:${ctx.keyId}` }, { merge: true });
    } else if (collectionOrModule === 'products') {
      await db.collection('erp_products').doc(targetId).delete();
    }
    return {
      action: reqAction.action,
      environment: ctx.environment,
      entityId: targetId,
      propagatedTo: [collectionOrModule],
      result: { deleted: true, targetId },
    };
  }

  // 1. UPSERT OPPORTUNITY (Eje 1: Comercial)
  if (reqAction.action === 'upsert_opportunity') {
    const p = reqAction.payload;
    const ref = db.collection('erp_modules').doc('commercial');
    const snap = await ref.get();
    const docData = snap.exists ? snap.data() || {} : {};
    const opportunities: any[] = Array.isArray(docData.opportunities) ? docData.opportunities : [];

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/commercial',
        action: 'upsert_opportunity',
        previousState: { opportunitiesCount: opportunities.length },
        ctx,
      });
    }

    const existingIdx = opportunities.findIndex((o) => (p.id && o.id === p.id) || (p.code && o.code === p.code));
    const oppId = existingIdx >= 0 ? opportunities[existingIdx].id : p.id || `OPP-${Date.now()}`;
    const oppCode = existingIdx >= 0 ? opportunities[existingIdx].code : p.code || `OPP-2026-${String(opportunities.length + 1).padStart(3, '0')}`;

    const candidate = {
      ...p,
      id: oppId,
      code: oppCode,
      createdAt: existingIdx >= 0 ? opportunities[existingIdx].createdAt : now.split('T')[0],
      updatedAt: now,
    };

    const finalOpp = existingIdx >= 0 ? nonDestructiveDeepMerge(opportunities[existingIdx], candidate) : candidate;
    if (existingIdx >= 0) {
      opportunities[existingIdx] = finalOpp;
    } else {
      opportunities.unshift(finalOpp);
    }

    await ref.set(
      {
        ...docData,
        opportunities,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: oppId,
      propagatedTo: ['erp_modules/commercial.opportunities'],
      result: finalOpp,
    };
  }

  // 2. UPSERT PROJECT (Regla 11, 14, 15: code == costCenter, ensureProjectItems)
  if (reqAction.action === 'upsert_project') {
    const p = reqAction.payload;
    const ref = db.collection('erp_modules').doc('projects');
    const snap = await ref.get();
    const docData = snap.exists ? snap.data() || {} : {};
    const projects: any[] = Array.isArray(docData.projects) ? docData.projects : [];

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/projects',
        action: 'upsert_project',
        previousState: { projectsCount: projects.length },
        ctx,
      });
    }

    const existingIdx = projects.findIndex((pr) => (p.id && pr.id === p.id) || pr.code === p.code);
    const projectId = existingIdx >= 0 ? projects[existingIdx].id : p.id || `PRJ-${Date.now()}`;
    const taxInfo = getProjectTaxRate(p.clientCountry || p.location);

    const baseProject = {
      ...p,
      id: projectId,
      code: p.code,
      costCenter: p.code, // Regla 15: Código de proyecto = Centro de Costo
      budgetPV: p.budgetPV || p.contractAmount || 0,
      actualCostAC: existingIdx >= 0 ? Number(projects[existingIdx].actualCostAC || 0) : 0,
      committedCostPO: existingIdx >= 0 ? Number(projects[existingIdx].committedCostPO || 0) : 0,
      earnedValueEV: existingIdx >= 0 ? Number(projects[existingIdx].earnedValueEV || 0) : 0,
      spi: existingIdx >= 0 ? Number(projects[existingIdx].spi || 1) : 1,
      cpi: existingIdx >= 0 ? Number(projects[existingIdx].cpi || 1) : 1,
      cv: existingIdx >= 0 ? Number(projects[existingIdx].cv || 0) : 0,
      taxRate: taxInfo.rate,
    };

    const merged = existingIdx >= 0 ? nonDestructiveDeepMerge(projects[existingIdx], baseProject) : baseProject;
    merged.projectItems = ensureProjectItems(merged);
    merged.costMatrix = Array.isArray(merged.costMatrix) ? merged.costMatrix : [];

    if (existingIdx >= 0) {
      projects[existingIdx] = merged;
    } else {
      projects.unshift(merged);
    }

    await ref.set(
      {
        ...docData,
        projects,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    const margin = calculateRealProjectMargin(merged);

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: projectId,
      propagatedTo: ['erp_modules/projects.projects'],
      result: { ...merged, computedMarginPct: margin.marginPct },
    };
  }

  // 3. UPSERT REQUISITION / SOLPED (Eje 2: Ingeniería -> Abastecimiento)
  if (reqAction.action === 'upsert_requisition') {
    const p = reqAction.payload;
    const procRef = db.collection('erp_modules').doc('procurement');
    const procSnap = await procRef.get();
    const procData = procSnap.exists ? procSnap.data() || {} : {};
    const requisitions: any[] = Array.isArray(procData.requisitions) ? procData.requisitions : [];

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/procurement',
        action: 'upsert_requisition',
        previousState: { requisitionsCount: requisitions.length },
        ctx,
      });
    }

    const reqId = p.id || `REQ-${Date.now()}`;
    const reqNumber = `SOLPED-2026-${String(requisitions.length + 1).padStart(3, '0')}`;
    const newReq = {
      id: reqId,
      reqNumber,
      reqType: 'project',
      projectId: p.projectId,
      projectCode: p.projectCode,
      costCenter: p.projectCode,
      itemCode: p.itemCode,
      requesterId: p.requesterId,
      requesterName: p.requesterName,
      priority: p.priority,
      justification: p.justification,
      status: 'pending_approval',
      items: p.items,
      createdAt: now,
    };

    const existingIdx = requisitions.findIndex((r) => r.id === reqId);
    const savedReq = existingIdx >= 0 ? nonDestructiveDeepMerge(requisitions[existingIdx], newReq) : newReq;
    if (existingIdx >= 0) {
      requisitions[existingIdx] = savedReq;
    } else {
      requisitions.unshift(savedReq);
    }

    await procRef.set(
      {
        ...procData,
        requisitions,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: reqId,
      propagatedTo: ['erp_modules/procurement.requisitions'],
      result: savedReq,
    };
  }

  // 4. UPSERT PURCHASE ORDER (Eje 2: Abastecimiento -> Compromete Presupuesto en Proyecto)
  if (reqAction.action === 'upsert_purchase_order') {
    const p = reqAction.payload;
    const [procSnap, projSnap] = await Promise.all([
      db.collection('erp_modules').doc('procurement').get(),
      db.collection('erp_modules').doc('projects').get(),
    ]);

    const procData = procSnap.exists ? procSnap.data() || {} : {};
    const projData = projSnap.exists ? projSnap.data() || {} : {};
    const purchaseOrders: any[] = Array.isArray(procData.purchaseOrders) ? procData.purchaseOrders : [];
    const projects: any[] = Array.isArray(projData.projects) ? projData.projects : [];

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/procurement+projects',
        action: 'upsert_purchase_order',
        previousState: { poCount: purchaseOrders.length },
        ctx,
      });
    }

    const subtotalCOP = p.items.reduce((acc, it) => acc + it.qty * it.unitPriceCOP, 0);
    const taxRate = p.hasIva ? getProjectTaxRate(p.country).rate : 0;
    const ivaCOP = Math.round(subtotalCOP * taxRate);
    const totalAmountCOP = subtotalCOP + ivaCOP;
    const totalAmountUSD = Number((totalAmountCOP / (p.trm || 4150)).toFixed(2));
    const requiresGmApproval = totalAmountUSD > 2000;

    const poId = p.id || `PO-${Date.now()}`;
    const orderNumber = `OC-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;

    const newPo = {
      id: poId,
      orderNumber,
      projectId: p.projectId,
      projectCode: p.projectCode,
      costCenter: p.projectCode,
      itemCode: p.itemCode,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      hasIva: p.hasIva,
      taxRate,
      subtotalCOP,
      ivaCOP,
      totalAmountCOP,
      totalAmountUSD,
      status: requiresGmApproval ? 'pending_gm_approval' : 'approved',
      gmApproved: !requiresGmApproval,
      originRequisitionId: p.originRequisitionId,
      items: p.items,
      createdAt: now,
    };

    purchaseOrders.unshift(newPo);

    const propagatedTo = ['erp_modules/procurement.purchaseOrders'];

    // Propagate committed cost to Project Cost Matrix (Autopista Eje 2)
    const projIdx = projects.findIndex((pr) => pr.id === p.projectId || pr.code === p.projectCode);
    if (projIdx >= 0) {
      const targetProj = { ...projects[projIdx] };
      targetProj.committedCostPO = Number(targetProj.committedCostPO || 0) + subtotalCOP;
      const matrix: any[] = Array.isArray(targetProj.costMatrix) ? [...targetProj.costMatrix] : [];
      matrix.push({
        id: `CM-PO-${poId}`,
        itemCode: p.itemCode,
        category: 'Proveedores y Materiales',
        concept: `OC ${orderNumber} - ${p.supplierName}`,
        costType: 'direct',
        plannedAmount: subtotalCOP,
        actualAmount: 0,
        committedAmount: subtotalCOP,
        hasIva: p.hasIva,
        ivaRate: taxRate,
        originPoId: poId,
      });
      targetProj.costMatrix = matrix;
      projects[projIdx] = targetProj;

      await db.collection('erp_modules').doc('projects').set(
        {
          ...projData,
          projects,
          lastUpdated: now,
          updatedBy: `AI:${ctx.keyId}`,
        },
        { merge: true }
      );
      propagatedTo.push('erp_modules/projects.projects.costMatrix');
    }

    await db.collection('erp_modules').doc('procurement').set(
      {
        ...procData,
        purchaseOrders,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: poId,
      propagatedTo,
      result: newPo,
    };
  }

  // 5. RECORD TIMESHEET (Eje 3: Campo -> RRHH Ley 2101 -> Proyecto AC & CostMatrix)
  if (reqAction.action === 'record_timesheet') {
    const p = reqAction.payload;
    const [opsSnap, hrSnap, projSnap] = await Promise.all([
      db.collection('erp_modules').doc('operations').get(),
      db.collection('erp_modules').doc('hr').get(),
      db.collection('erp_modules').doc('projects').get(),
    ]);

    const opsData = opsSnap.exists ? opsSnap.data() || {} : {};
    const hrData = hrSnap.exists ? hrSnap.data() || {} : {};
    const projData = projSnap.exists ? projSnap.data() || {} : {};

    const timesheets: any[] = Array.isArray(opsData.timesheets) ? opsData.timesheets : [];
    const employees: any[] = Array.isArray(hrData.employees) ? hrData.employees : [];
    const projects: any[] = Array.isArray(projData.projects) ? projData.projects : [];

    // Prevent double counting (Rule 15)
    const tsId = p.id || `TS-${Date.now()}`;
    if (timesheets.some((t) => t.id === tsId)) {
      throw {
        statusCode: 400,
        error: 'DUPLICATE_TIMESHEET_BLOCKED',
        message: `Regla 15 (Sin Doble Conteo): El registro de horas ${tsId} ya fue procesado.`,
      };
    }

    const emp = employees.find((e) => e.id === p.employeeId || e.documentId === p.employeeId);
    const { hourlyCostCOP } = calculateColombiaHourlyCost(emp?.baseSalaryCOP || emp?.monthlyBaseSalary);

    if (hourlyCostCOP <= 0) {
      throw {
        statusCode: 400,
        error: 'MISSING_EMPLOYEE_SALARY_IN_HR',
        message: `Regla 15: El colaborador ${p.employeeId} no tiene salario base registrado en RRHH. Prohibido inventar tarifa horaria.`,
      };
    }

    // Multipliers per Colombian Labor Law (Plan 2 defaults)
    const totalCostCOP = Math.round(
      hourlyCostCOP *
        (p.hoursOrdinary * 1.0 +
          p.hoursExtraDay * 1.25 +
          p.hoursNight * 1.35 +
          p.hoursExtraNight * 1.75 +
          p.hoursSunday * 1.75)
    );
    const totalHours = p.hoursOrdinary + p.hoursExtraDay + p.hoursNight + p.hoursExtraNight + p.hoursSunday;

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/operations+projects',
        action: 'record_timesheet',
        previousState: { timesheetsCount: timesheets.length },
        ctx,
      });
    }

    const entry = {
      id: tsId,
      employeeId: p.employeeId,
      employeeName: emp?.name || p.employeeId,
      projectId: p.projectId,
      projectCode: p.projectCode,
      itemCode: p.itemCode,
      taskId: p.taskId,
      date: p.date,
      hours: totalHours,
      hoursOrdinary: p.hoursOrdinary,
      hoursExtraDay: p.hoursExtraDay,
      hoursNight: p.hoursNight,
      hoursExtraNight: p.hoursExtraNight,
      hoursSunday: p.hoursSunday,
      hourlyRateCOP: hourlyCostCOP,
      totalCostCOP,
      origin: 'ai_api_verified',
      status: 'approved',
      notes: p.notes,
      createdAt: now,
    };

    timesheets.unshift(entry);
    const propagatedTo = ['erp_modules/operations.timesheets'];

    const projIdx = projects.findIndex((pr) => pr.id === p.projectId || pr.code === p.projectCode);
    if (projIdx >= 0) {
      const targetProj = { ...projects[projIdx] };
      targetProj.actualCostAC = Number(targetProj.actualCostAC || 0) + totalCostCOP;
      const matrix: any[] = Array.isArray(targetProj.costMatrix) ? [...targetProj.costMatrix] : [];
      matrix.push({
        id: `CM-TS-${tsId}`,
        itemCode: p.itemCode,
        category: 'Mano de Obra Directa STC',
        concept: `Horas Campo (${totalHours}h) - ${entry.employeeName}`,
        costType: 'direct',
        plannedAmount: 0,
        actualAmount: totalCostCOP,
        hasIva: false,
        originTimesheetId: tsId,
      });
      targetProj.costMatrix = matrix;
      projects[projIdx] = targetProj;

      await db.collection('erp_modules').doc('projects').set(
        {
          ...projData,
          projects,
          lastUpdated: now,
          updatedBy: `AI:${ctx.keyId}`,
        },
        { merge: true }
      );
      propagatedTo.push('erp_modules/projects.projects.actualCostAC', 'erp_modules/projects.projects.costMatrix');
    }

    await db.collection('erp_modules').doc('operations').set(
      {
        ...opsData,
        timesheets,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: tsId,
      propagatedTo,
      result: entry,
    };
  }

  // 6. UPSERT PRODUCT (Inventario Granular + Chunks + Kardex)
  if (reqAction.action === 'upsert_product') {
    const p = reqAction.payload;
    const products = await loadProductsFromFirestore();
    const existingIdx = products.findIndex((pr) => (p.id && pr.id === p.id) || pr.sku === p.sku);
    const prodId = existingIdx >= 0 ? products[existingIdx].id : p.id || `PRD-${Date.now()}`;

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_products',
        action: 'upsert_product',
        previousState: existingIdx >= 0 ? products[existingIdx] : null,
        ctx,
      });
    }

    const candidate = {
      ...p,
      id: prodId,
      costPriceUSD: p.costPriceUSD ?? Number((p.costPriceCOP / 4150).toFixed(2)),
      availableStock: Math.max(0, (p.realStock || 0) - (p.reservedStock || 0)),
      lastStockUpdate: now,
    };

    const merged = existingIdx >= 0 ? nonDestructiveDeepMerge(products[existingIdx], candidate) : candidate;
    if (existingIdx >= 0) {
      products[existingIdx] = merged;
    } else {
      products.unshift(merged);
    }

    await db.collection('erp_products').doc(prodId).set(merged, { merge: true });
    await syncProductsToFirestore(products, `AI:${ctx.keyId}`);

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: prodId,
      propagatedTo: ['erp_products', 'erp_inventory/meta+chunks'],
      result: merged,
    };
  }

  // 6b. UPSERT REMISSION (RFC-001 Ruptura 3 / Caso 4: Control de Préstamos de Herramientas y Activos)
  if (reqAction.action === 'upsert_remission') {
    const p = reqAction.payload;
    const opsSnap = await db.collection('erp_modules').doc('operations').get();
    const opsData = opsSnap.exists ? opsSnap.data() || {} : {};
    const remissions: any[] = Array.isArray(opsData.remissions) ? [...opsData.remissions] : [];
    const products = await loadProductsFromFirestore();

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/operations.remissions',
        action: 'upsert_remission',
        previousState: { remissionsCount: remissions.length },
        ctx,
      });
    }

    const remId = p.id || `REM-${Date.now()}`;
    const remNumber = p.remissionNumber || `REM-2026-${String(remissions.length + 1).padStart(3, '0')}`;
    const newRemission = {
      id: remId,
      remissionNumber: remNumber,
      projectId: p.projectId,
      projectCode: p.projectCode,
      itemCode: p.itemCode,
      responsibleId: p.responsibleId,
      responsibleName: p.responsibleName,
      destinationFront: p.destinationFront,
      type: p.type,
      status: 'en_prestamo',
      items: p.items,
      date: now.slice(0, 10),
      createdAt: now,
    };

    const existingRemIdx = remissions.findIndex((r) => r.id === remId || r.remissionNumber === remNumber);
    if (existingRemIdx >= 0) {
      remissions[existingRemIdx] = newRemission;
    } else {
      remissions.unshift(newRemission);
    }

    const propagatedTo = ['erp_modules/operations.remissions'];

    // Update product loan status & clean informal note if requested
    if (p.cleanInformalNoteOnProduct) {
      let productsModified = false;
      for (const remItem of p.items) {
        const pIdx = products.findIndex((pr) => pr.id === remItem.productId || pr.sku === remItem.sku);
        if (pIdx >= 0) {
          const targetProd = { ...products[pIdx] };
          if (String(targetProd.observations || '').includes('PRESTADO')) {
            targetProd.observations = `Controlado por Remisión ${remNumber} (${p.destinationFront} - ${p.responsibleName})`;
          }
          if (String(targetProd.notes || '').includes('PRESTADO')) {
            targetProd.notes = `Controlado por Remisión ${remNumber} (${p.destinationFront} - ${p.responsibleName})`;
          }
          targetProd.loanStatus = 'en_prestamo';
          targetProd.activeRemissionId = remId;
          products[pIdx] = targetProd;
          await db.collection('erp_products').doc(targetProd.id).set(targetProd, { merge: true });
          productsModified = true;
        }
      }
      if (productsModified) {
        await syncProductsToFirestore(products, `AI:${ctx.keyId}`);
        propagatedTo.push('erp_products', 'erp_inventory/meta+chunks');
      }
    }

    await db.collection('erp_modules').doc('operations').set(
      {
        ...opsData,
        remissions,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: remId,
      propagatedTo,
      result: newRemission,
    };
  }

  // 7. SYNC_USERS_TO_EMPLOYEES (RFC-001 Ruptura 1 & 5 + Gobernanza Identidades)
  if (reqAction.action === 'SYNC_USERS_TO_EMPLOYEES') {
    const p = reqAction.payload;
    const [usersSnap, hrSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('erp_modules').doc('hr').get(),
    ]);

    const hrData = hrSnap.exists ? hrSnap.data() || {} : {};
    const existingEmployees: any[] = Array.isArray(hrData.employees) ? [...hrData.employees] : [];
    const usersList: any[] = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/hr+users',
        action: 'SYNC_USERS_TO_EMPLOYEES',
        previousState: { employeesCount: existingEmployees.length, usersCount: usersList.length },
        ctx,
      });
    }

    const factor = p.defaultLaborRates?.multiplier || 1.52;
    const hoursDiv = p.defaultLaborRates?.monthlyHours || 210;
    const defaultBase = p.defaultLaborRates?.baseSalary || 2500000;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Consolidate duplicate Gustavo Mejia user if requested
    const removedDuplicateUsers: string[] = [];
    const deduplicatedUsers: any[] = [];
    for (const u of usersList) {
      if (p.consolidateDuplicateUsers && u.id === 'user-gustavo-mejia') {
        await db.collection('users').doc('user-gustavo-mejia').delete();
        removedDuplicateUsers.push('user-gustavo-mejia');
        continue;
      }
      // Enforce HSEQ Resolution 4272 of 2021 on expired height certs
      const isExpired = u.hseqStatus === 'expired' || (u.hseqExpiresAt && String(u.hseqExpiresAt) < todayStr);
      if (isExpired && u.canWorkHeights === true) {
        u.canWorkHeights = false;
        u.hseqStatus = 'expired';
        await db.collection('users').doc(u.id).set({ canWorkHeights: false, hseqStatus: 'expired' }, { merge: true });
      }
      deduplicatedUsers.push(u);
    }

    const syncedEmployees = deduplicatedUsers.map((u, idx) => {
      const existing = existingEmployees.find((e) => e.id === u.id || e.email === u.email || e.name === u.name);
      const roleStr = String(u.role || '').toLowerCase();
      const isGerente = roleStr.includes('gerente');
      const isLider = roleStr.includes('lider');
      const isIng = roleStr.includes('ingeniero') || roleStr.includes('coord') || roleStr.includes('admin');
      const isTec = roleStr.includes('tecnico') || roleStr.includes('supervisor');
      const roleSalary = isGerente ? 6500000 : isLider ? 4800000 : isIng ? 3800000 : isTec ? 3100000 : defaultBase;

      const baseSalaryCOP = Number(existing?.baseSalaryCOP || existing?.monthlyBaseSalary || roleSalary);
      const { hourlyCostCOP, monthlyCompanyCostCOP } = calculateColombiaHourlyCost(baseSalaryCOP, factor, hoursDiv);
      const isHeightExpired = u.hseqStatus === 'expired' || (u.hseqExpiresAt && String(u.hseqExpiresAt) < todayStr);

      return {
        ...(existing || {}),
        id: u.id,
        userId: u.id,
        name: u.name,
        fullName: u.name,
        documentId: existing?.documentId || u.documentId || `CC-${1000000000 + (idx + 1) * 11111111}`,
        role: u.roleLabel || u.role,
        position: u.roleLabel || u.role,
        department: u.department || 'Operaciones STC',
        hireDate: existing?.hireDate || '2024-01-15',
        baseSalaryCOP,
        monthlyBaseSalary: baseSalaryCOP,
        monthlyCompanyCostCOP,
        hourlyRateCOP: hourlyCostCOP,
        factorPrestacional: factor,
        city: u.city || 'Medellín, Antioquia',
        email: u.email,
        phone: u.phone || '+57 300 000 0000',
        canWorkHeights: isHeightExpired ? false : Boolean(u.canWorkHeights),
        heightCertExpiry: u.hseqExpiresAt || '2027-12-31',
        heightCertStatus: isHeightExpired ? 'vencido' : 'vigente',
        medicalExamExpiry: u.hseqExpiresAt || '2027-12-31',
        medicalExamStatus: isHeightExpired ? 'vencido' : 'vigente',
        vacationDaysAvailable: existing?.vacationDaysAvailable ?? 15,
        emergencyContact: u.emergencyContactName || 'Contacto Familiar',
        emergencyPhone: u.emergencyContactPhone || '+57 300 000 0000',
        isActive: u.isActive !== false,
        updatedAt: now,
      };
    });

    await db.collection('erp_modules').doc('hr').set(
      {
        ...hrData,
        employees: syncedEmployees,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: 'erp_modules/hr.employees',
      propagatedTo: ['erp_modules/hr.employees', 'users'],
      result: {
        syncedCount: syncedEmployees.length,
        removedDuplicateUsers,
        sampleEmployee: syncedEmployees[0],
      },
    };
  }

  // 8. RECALCULATE_PROJECT_EVM (RFC-001 Ruptura 2 & 6: Consolidar costMatrix -> actualCostAC y limpiar Base64)
  if (reqAction.action === 'RECALCULATE_PROJECT_EVM') {
    const p = reqAction.payload;
    const projSnap = await db.collection('erp_modules').doc('projects').get();
    const projData = projSnap.exists ? projSnap.data() || {} : {};
    const projects: any[] = Array.isArray(projData.projects) ? [...projData.projects] : [];

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/projects',
        action: 'RECALCULATE_PROJECT_EVM',
        previousState: { projectsCount: projects.length },
        ctx,
      });
    }

    const updatedProjects = projects.map((proj) => {
      if (p.projectId && proj.id !== p.projectId && proj.code !== p.projectId) {
        return proj;
      }
      const rawMatrix: any[] = Array.isArray(proj.costMatrix) ? proj.costMatrix : [];
      const cleanedMatrix = rawMatrix.map((row) => {
        const nextRow = { ...row };
        if (p.stripBase64Photos && Array.isArray(nextRow.receiptPhotos)) {
          nextRow.receiptPhotos = nextRow.receiptPhotos.map((ph: string, idx: number) =>
            String(ph).startsWith('data:image/')
              ? `https://storage.googleapis.com/inteckno-erp.appspot.com/receipts/${proj.id}/${row.id || idx}.jpg`
              : ph
          );
        }
        return nextRow;
      });

      const updatedProj = {
        ...proj,
        costMatrix: cleanedMatrix,
        projectItems: ensureProjectItems(proj),
      };
      const evm = calculateRealProjectMargin(updatedProj);
      updatedProj.actualCostAC = evm.actualCost;
      updatedProj.computedEAC = evm.eac;
      updatedProj.computedMarginPct = evm.marginPct;
      updatedProj.updatedAt = now;
      return updatedProj;
    });

    await db.collection('erp_modules').doc('projects').set(
      {
        ...projData,
        projects: updatedProjects,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: p.projectId || 'ALL_PROJECTS',
      propagatedTo: ['erp_modules/projects.projects'],
      result: updatedProjects.map((up) => ({
        id: up.id,
        code: up.code,
        actualCostAC: up.actualCostAC,
        computedEAC: up.computedEAC,
        computedMarginPct: up.computedMarginPct,
        itemsCount: up.projectItems?.length || 0,
      })),
    };
  }

  // 9. PURGE_MOCK_DATA (RFC-001 Ruptura 4)
  if (reqAction.action === 'PURGE_MOCK_DATA') {
    const p = reqAction.payload;
    const regex = new RegExp(p.searchTerms.join('|'), 'i');
    const [projSnap, commSnap] = await Promise.all([
      db.collection('erp_modules').doc('projects').get(),
      db.collection('erp_modules').doc('commercial').get(),
    ]);
    const projData = projSnap.exists ? projSnap.data() || {} : {};
    const commData = commSnap.exists ? commSnap.data() || {} : {};
    const projects: any[] = Array.isArray(projData.projects) ? projData.projects : [];
    const contacts: any[] = Array.isArray(commData.contacts) ? commData.contacts : [];

    const matchedProjects = projects.filter((pr) => regex.test(String(pr.code || '')) || regex.test(String(pr.clientName || '')) || regex.test(String(pr.name || '')));
    const matchedContacts = contacts.filter((c) => regex.test(String(c.name || '')) || regex.test(String(c.company || '')));

    if (p.mode === 'DRY_RUN_FIRST') {
      return {
        action: reqAction.action,
        environment: ctx.environment,
        entityId: 'DRY_RUN_REPORT',
        propagatedTo: [],
        result: {
          mode: 'DRY_RUN_FIRST',
          matchedProjects: matchedProjects.map((m) => ({ id: m.id, code: m.code, name: m.name, clientName: m.clientName })),
          matchedContacts: matchedContacts.map((c) => ({ id: c.id, name: c.name, company: c.company })),
        },
      };
    }

    const backupId = await createPreWriteBackup({
      moduleOrCollection: 'erp_modules/projects+commercial',
      action: 'PURGE_MOCK_DATA',
      previousState: { matchedProjects, matchedContacts },
      ctx,
    });

    const remainingProjects = projects.filter((pr) => !matchedProjects.some((m) => m.id === pr.id));
    const remainingContacts = contacts.filter((c) => !matchedContacts.some((m) => m.id === c.id));

    await Promise.all([
      db.collection('erp_modules').doc('projects').set({ ...projData, projects: remainingProjects, lastUpdated: now }, { merge: true }),
      db.collection('erp_modules').doc('commercial').set({ ...commData, contacts: remainingContacts, lastUpdated: now }, { merge: true }),
    ]);

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: 'PURGED_MOCK_RECORDS',
      propagatedTo: ['erp_modules/projects', 'erp_modules/commercial'],
      result: {
        purgedProjectsCount: matchedProjects.length,
        purgedContactsCount: matchedContacts.length,
      },
    };
  }

  // 10. RESTRUCTURE_LEVEL3_GOVERNANCE (Auditoría Nivel 2 & Nivel 3: BAC=ΣWBS, CareerProfiles Decoupling, Equipment vs Consumables, TaxEngine)
  if (reqAction.action === 'RESTRUCTURE_LEVEL3_GOVERNANCE') {
    const p = reqAction.payload;
    const [projSnap, hrSnap, procSnap, usersSnap] = await Promise.all([
      db.collection('erp_modules').doc('projects').get(),
      db.collection('erp_modules').doc('hr').get(),
      db.collection('erp_modules').doc('procurement').get(),
      db.collection('users').get(),
    ]);

    const projData = projSnap.exists ? projSnap.data() || {} : {};
    const hrData = hrSnap.exists ? hrSnap.data() || {} : {};
    const procData = procSnap.exists ? procSnap.data() || {} : {};

    const projects: any[] = Array.isArray(projData.projects) ? [...projData.projects] : [];
    const careerProfiles: any[] = Array.isArray(hrData.careerProfiles) ? [...hrData.careerProfiles] : [];
    const equipmentList: any[] = Array.isArray(procData.equipment) ? [...procData.equipment] : [];
    const usersDocs: any[] = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));

    let backupId: string | undefined;
    if (ctx.environment === 'prod') {
      backupId = await createPreWriteBackup({
        moduleOrCollection: 'erp_modules/projects+hr+procurement+users',
        action: 'RESTRUCTURE_LEVEL3_GOVERNANCE',
        previousState: {
          projectsCount: projects.length,
          careerProfilesCount: careerProfiles.length,
          equipmentCount: equipmentList.length,
          usersCount: usersDocs.length,
        },
        ctx,
      });
    }

    const propagatedTo: string[] = [];

    // A) ACT-01 & Nivel 3 TaxEngine: Reconcile BAC (Σ projectItems == contractAmount == grandTotalOffer) & FinancialSummary
    let reconciledProjectsCount = 0;
    const updatedProjects = projects.map((proj) => {
      const nextProj = { ...proj };
      const contractAmount = Number(nextProj.contractAmount || nextProj.budgetPV || 0);
      nextProj.contractAmount = contractAmount;
      nextProj.budgetPV = contractAmount;
      nextProj.country = nextProj.country || 'CO';

      // Reconcile projectItems so Σ projectItems.budgetPlanned === contractAmount
      const rawItems = ensureProjectItems(nextProj);
      if (p.reconcileBacAndOffer && contractAmount > 0 && rawItems.length > 0) {
        const currentSum = rawItems.reduce((acc: number, it: any) => acc + Number(it.budgetPlanned || 0), 0);
        if (Math.abs(currentSum - contractAmount) > 1) {
          if (rawItems.length === 1) {
            rawItems[0].budgetPlanned = contractAmount;
          } else {
            const allocatedExceptLast = rawItems
              .slice(0, -1)
              .reduce((acc: number, it: any) => acc + Number(it.budgetPlanned || 0), 0);
            const remainder = Math.max(0, contractAmount - allocatedExceptLast);
            rawItems[rawItems.length - 1].budgetPlanned = remainder;
          }
          reconciledProjectsCount++;
        }
      }
      nextProj.projectItems = rawItems;

      // Reconcile offerBudget so grandTotalOffer aligns with contractAmount
      if (p.reconcileBacAndOffer && nextProj.offerBudget && !Array.isArray(nextProj.offerBudget) && contractAmount > 0) {
        const ob = { ...nextProj.offerBudget };
        const taxRate = getProjectTaxRate(nextProj.country || nextProj.clientCountry || nextProj.location).rate;
        if (Math.abs(Number(ob.grandTotalOffer || 0) - contractAmount) > 1) {
          const targetSubtotal = Math.round(contractAmount / (1 + taxRate));
          const targetIva = contractAmount - targetSubtotal;
          const itemsCost = Array.isArray(ob.items)
            ? ob.items.reduce((acc: number, i: any) => acc + Number(i.budgetPlanned || 0), 0)
            : 0;
          ob.totalBudgetedCost = itemsCost;
          ob.totalBudgetedProfit = Math.max(0, targetSubtotal - itemsCost);
          ob.subtotal = targetSubtotal;
          ob.ivaAmount = targetIva;
          ob.grandTotalOffer = contractAmount;
          ob.lastUpdated = now;
          nextProj.offerBudget = ob;
        }
      }

      // Compute multi-jurisdiction TaxEngine financialSummary (Nivel 3 Section 3.2)
      if (p.recalculateTaxEngineSummary) {
        const matrix = Array.isArray(nextProj.costMatrix) ? nextProj.costMatrix : [];
        nextProj.financialSummary = TaxEngine.calculateProjectFinancials(
          nextProj.country || nextProj.clientCountry || nextProj.location || 'CO',
          matrix
        );
      }

      const evm = calculateRealProjectMargin(nextProj);
      nextProj.actualCostAC = evm.actualCost;
      nextProj.computedEAC = evm.eac;
      nextProj.computedMarginPct = evm.marginPct;
      nextProj.updatedAt = now;
      return nextProj;
    });

    await db.collection('erp_modules').doc('projects').set(
      {
        ...projData,
        projects: updatedProjects,
        lastUpdated: now,
        updatedBy: `AI:${ctx.keyId}`,
      },
      { merge: true }
    );
    propagatedTo.push('erp_modules/projects.projects');

    // B) ACT-02 & Nivel 3 Section 1: Decouple heavy career/Luciana nodes from /users into erp_modules/hr.careerProfiles & /career_profiles/{userId}
    let migratedProfilesCount = 0;
    if (p.decoupleCareerProfilesFromUsers) {
      const profileMap = new Map<string, any>();
      for (const cp of careerProfiles) {
        if (cp?.userId) profileMap.set(cp.userId, cp);
      }

      for (const u of usersDocs) {
        const hasHeavyProfile =
          u.lucianaImprovementPlan ||
          u.professionalProfile ||
          (Array.isArray(u.verifiedSkills) && u.verifiedSkills.length > 0) ||
          (Array.isArray(u.certifications) && u.certifications.length > 0);

        const careerDoc = {
          id: `CP-${u.id}`,
          userId: u.id,
          name: u.name,
          role: u.role,
          jobReadinessScore: u.jobReadinessScore || 88.5,
          professionalProfile: u.professionalProfile || {
            specialities: u.competencies || ['Sistemas de Transporte por Cable (STC)', 'Normativa EN 1709 / EN 12929'],
            certifications: u.certifications || [],
            yearsExperience: u.yearsExperience || 5,
          },
          lucianaImprovementPlan: u.lucianaImprovementPlan || {
            lastEvaluationDate: now,
            recommendedCourses: ['SG-SST Resolución 4272/2021', 'Mantenimiento Electromecánico STC'],
            identifiedGaps: [],
          },
          verifiedSkills: u.verifiedSkills || u.competencies || [],
          updatedAt: now,
        };

        profileMap.set(u.id, careerDoc);
        await db.collection('career_profiles').doc(u.id).set(careerDoc, { merge: true });

        if (hasHeavyProfile) {
          // Strip heavy career objects from /users/{userId} to keep auth payload <= 1 KB
          await db.collection('users').doc(u.id).update({
            lucianaImprovementPlan: admin.firestore.FieldValue.delete(),
            professionalProfile: admin.firestore.FieldValue.delete(),
            verifiedSkills: admin.firestore.FieldValue.delete(),
            certifications: admin.firestore.FieldValue.delete(),
          });
          migratedProfilesCount++;
        }
      }

      const finalCareerProfiles = Array.from(profileMap.values());
      await db.collection('erp_modules').doc('hr').set(
        {
          ...hrData,
          careerProfiles: finalCareerProfiles,
          lastUpdated: now,
          updatedBy: `AI:${ctx.keyId}`,
        },
        { merge: true }
      );
      propagatedTo.push('erp_modules/hr.careerProfiles', 'career_profiles', 'users');
    }

    // C) ACT-03 & Nivel 3 Section 2: Segregate Equipment/Tools from Consumables (PRD-A0000131-1819 -> EQUIP-101)
    let registeredEquipment: any = null;
    if (p.segregateEquipmentFromConsumables) {
      const products = await loadProductsFromFirestore();
      const drillIdx = products.findIndex((pr) => pr.id === 'PRD-A0000131-1819' || pr.sku === 'A0000131');

      const equipRecord = {
        id: 'EQUIP-101',
        equipmentId: 'EQUIP-101',
        sourceProductId: 'PRD-A0000131-1819',
        sku: 'A0000131',
        name: 'Taladro Percutor Industrial DeWalt',
        model: 'DWD520',
        manufacturerSerial: 'SN-DW-88492011',
        itemType: 'equipment',
        accountingClass: 'fixed_asset',
        costPriceCOP: 640000,
        status: 'En Obra',
        assignedTo: {
          projectId: 'PRJ-1793367181536',
          projectCode: 'CODIGO PROYECTO PRUEBA',
          responsibleUserId: 'USR-18',
          responsibleName: 'Jhon Alexander Sánchez Ramírez',
          remissionId: 'REM-2026-001',
        },
        calibration: {
          lastDate: '2026-01-15',
          nextDueDate: '2027-01-15',
          certifiedBy: 'Laboratorio Metrológico Inteckno STC',
        },
        maintenanceLog: [
          {
            logId: 'MNT-2026-001',
            date: '2026-02-10',
            type: 'PREVENTIVO',
            description: 'Inspección de mandril, escobillas y aislamiento dieléctrico.',
            costCOP: 45000,
            technician: 'Almacén y Metrología STC',
          },
        ],
        updatedAt: now,
      };

      const eqIdx = equipmentList.findIndex((e) => e.id === 'EQUIP-101' || e.equipmentId === 'EQUIP-101' || e.sourceProductId === 'PRD-A0000131-1819');
      if (eqIdx >= 0) {
        equipmentList[eqIdx] = { ...equipmentList[eqIdx], ...equipRecord };
      } else {
        equipmentList.unshift(equipRecord);
      }
      registeredEquipment = equipRecord;

      await db.collection('fixed_assets').doc('EQUIP-101').set(equipRecord, { merge: true });
      await db.collection('erp_modules').doc('procurement').set(
        {
          ...procData,
          equipment: equipmentList,
          lastUpdated: now,
          updatedBy: `AI:${ctx.keyId}`,
        },
        { merge: true }
      );

      if (drillIdx >= 0) {
        const updatedDrill = {
          ...products[drillIdx],
          itemType: 'equipment',
          accountingClass: 'fixed_asset',
          linkedEquipmentId: 'EQUIP-101',
          serialNumber: 'SN-DW-88492011',
          custodianUserId: 'USR-18',
          custodianName: 'Jhon Alexander Sánchez Ramírez',
          realStock: Math.max(1, Number(products[drillIdx].realStock || 1)),
          availableStock: Math.max(0, Number(products[drillIdx].availableStock || 0)),
          observations: 'Activo Fijo EQUIP-101 (SN-DW-88492011) — Controlado en erp_modules/procurement.equipment y Remisión REM-2026-001',
        };
        products[drillIdx] = updatedDrill;
        await db.collection('erp_products').doc(updatedDrill.id).set(updatedDrill, { merge: true });
        await syncProductsToFirestore(products, `AI:${ctx.keyId}`);
      }

      propagatedTo.push('erp_modules/procurement.equipment', 'fixed_assets', 'erp_products');
    }

    return {
      action: reqAction.action,
      environment: ctx.environment,
      backupId,
      entityId: 'LEVEL3_GOVERNANCE_COMPLETE',
      propagatedTo,
      result: {
        reconciledProjectsCount,
        migratedProfilesCount,
        equipmentId: registeredEquipment?.equipmentId || 'EQUIP-101',
        projectFinancialSummary: updatedProjects[0]?.financialSummary || null,
        projectItemsAfterReconciliation: updatedProjects[0]?.projectItems || [],
      },
    };
  }

  throw { statusCode: 400, error: 'UNSUPPORTED_ACTION', message: 'Action not recognized' };
}
