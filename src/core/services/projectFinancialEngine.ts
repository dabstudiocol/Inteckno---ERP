/**
 * Motor Matemático y Financiero Centralizado de Proyectos STC (EVM & Control Presupuestal)
 * INTECKNO S.A.S. - Fuente Única de Verdad (Single Source of Truth)
 * 
 * Regla 15 & Plan 5: Consistencia matemática universal entre Dashboard, KPIs, Matriz de Costos,
 * Facturación y WBS. Cero datos arbitrarios o valores por defecto del 50% o 100%.
 */

import { Project, WBSTask, PurchaseOrder, ExpenseEntry, TimesheetEntry, DispatchRemission } from '../../types';

export interface ProjectFinancialMetrics {
  // Avance
  physicalProgressPct: number;
  expectedProgressPct: number;
  scheduleVariancePct: number; // physicalProgressPct - expectedProgressPct

  // Valores EVM Monetarios (COP)
  contractValue: number;
  plannedCostPV: number; // Planned Value (Costos Planificados)
  committedCostCOP: number; // Costo Comprometido (OC en tránsito / Remisiones en custodia)
  actualCostAC: number;  // Actual Cost (Costo Real Ejecutado)
  earnedValueEV: number; // Earned Value (Valor Ganado Contractual)
  costVarianceCV: number; // EV - AC
  
  // Índices de Desempeño
  cpi: number; // EV / AC (Eficiencia de Costo: >1 excelente, <1 sobrecosto)
  spi: number; // Físico / Esperado (Eficiencia de Cronograma: >1 adelantado, <1 atrasado)

  // Estimación a la Conclusión y Rentabilidad
  eac: number; // Estimate at Completion: max(AC + committedCostCOP, plannedCostPV)
  projectedProfitCOP: number; // contractValue - eac
  projectedMarginPct: number | null; // (contractValue - eac) / contractValue. null si no hay costos registrados.
  hasRegisteredCosts: boolean;
}

/**
 * Calcula todas las métricas financieras y de EVM de un proyecto de forma determinista y unificada.
 */
export function calculateProjectFinancials(
  project: Project,
  tasks: WBSTask[] = []
): ProjectFinancialMetrics {
  // 1. Matriz de Costos como fuente primaria de AC y PV
  const costMatrix = (project.costMatrix || []) as any[];
  
  let plannedCostPV = 0;
  let actualCostAC = 0;

  const matrixPlanned = costMatrix.reduce((sum, item) => sum + (Number(item.plannedTotal) || (Number(item.plannedQuantity) * Number(item.plannedUnitCost)) || 0), 0);
  const matrixActual = costMatrix.reduce((sum, item) => sum + (Number(item.actualTotal) || (Number(item.actualQuantity) * Number(item.actualUnitCost)) || 0), 0);

  if (matrixPlanned > 0) {
    plannedCostPV = matrixPlanned;
  } else {
    // Si la matriz no está formulada, recurrir al presupuesto de oferta o campo explícito
    const offerItems = Array.isArray(project.offerBudget) 
      ? project.offerBudget 
      : ((project.offerBudget as any)?.items || []);
    
    if (offerItems.length > 0) {
      plannedCostPV = offerItems.reduce((sum: number, it: any) => sum + (Number(it.budgetPlanned) || 0), 0);
    } else {
      plannedCostPV = Number(project.budgetPV) || 0;
    }
  }

  // Costo Real Ejecutado (AC): Mayor entre el consolidado de matriz y el acumulador contable del proyecto
  actualCostAC = Math.max(matrixActual, Number(project.actualCostAC) || 0);
  const matrixCommitted = costMatrix.reduce((sum, item) => sum + (Number(item.committedAmount) || 0), 0);
  const committedCostCOP = Math.max(matrixCommitted, Number(project.committedCostPO) || 0);

  // 2. Valor Contractual
  const contractValue = Number(project.contractAmount) || Number(project.budgetPV) || 0;

  // 3. Avance Físico Ponderado (desde WBS o tareas con fallback a progreso registrado)
  let physicalProgressPct = 0;
  if (tasks.length > 0) {
    const totalPlannedHours = tasks.reduce((sum, t) => sum + (Number(t.plannedHours) || 0), 0);
    if (totalPlannedHours > 0) {
      const earnedHours = tasks.reduce(
        (sum, t) => sum + ((Number(t.plannedHours) || 0) * (Number(t.progressPct) || 0)) / 100,
        0
      );
      physicalProgressPct = Math.min(100, Math.max(0, Math.round((earnedHours / totalPlannedHours) * 100)));
    } else {
      // Promedio aritmético simple de progreso de tareas si no se registraron horas WBS
      const totalProgress = tasks.reduce((sum, t) => sum + (Number(t.progressPct) || 0), 0);
      physicalProgressPct = Math.min(100, Math.max(0, Math.round(totalProgress / tasks.length)));
    }
  } else {
    const fromEV = project.budgetPV > 0 ? Math.round(((project.earnedValueEV || 0) / project.budgetPV) * 100) : 0;
    physicalProgressPct = Math.min(100, Math.max(0, Number((project as any).progressPct) || Number((project as any).progress) || fromEV));
  }

  // 4. Avance Esperado / Programado en el Tiempo
  let expectedProgressPct = 0;
  if (project.startDate && project.endDate) {
    const startMs = new Date(project.startDate).getTime();
    const endMs = new Date(project.endDate).getTime();
    const nowMs = Date.now();

    if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
      if (nowMs < startMs) {
        expectedProgressPct = 0;
      } else if (nowMs >= endMs) {
        expectedProgressPct = 100;
      } else {
        expectedProgressPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));
      }
    }
  }

  // 5. Valor Ganado (EV)
  const evBase = contractValue > 0 ? contractValue : plannedCostPV;
  const earnedValueEV = Math.round((evBase * physicalProgressPct) / 100);

  // 6. Índices SPI y CPI
  const spi = expectedProgressPct > 0 
    ? Number((physicalProgressPct / expectedProgressPct).toFixed(2)) 
    : (physicalProgressPct > 0 ? 1.0 : 1.0);

  const cpi = actualCostAC > 0 
    ? Number((earnedValueEV / actualCostAC).toFixed(2)) 
    : 1.0;

  const costVarianceCV = earnedValueEV - actualCostAC;
  const scheduleVariancePct = physicalProgressPct - expectedProgressPct;

  // 7. EAC y Margen Proyectado Real
  const eac = Math.max(actualCostAC, plannedCostPV);
  const projectedProfitCOP = contractValue > 0 ? contractValue - eac : 0;
  
  const hasRegisteredCosts = actualCostAC > 0;
  
  let projectedMarginPct: number | null = null;
  if (contractValue > 0 && hasRegisteredCosts) {
    projectedMarginPct = Number((((contractValue - eac) / contractValue) * 100).toFixed(1));
  }

  return {
    physicalProgressPct,
    expectedProgressPct,
    scheduleVariancePct,
    contractValue,
    plannedCostPV,
    committedCostCOP,
    actualCostAC,
    earnedValueEV,
    costVarianceCV,
    cpi,
    spi,
    eac,
    projectedProfitCOP,
    projectedMarginPct,
    hasRegisteredCosts,
  };
}

/**
 * Reconcilia el Libro Mayor Analítico (costMatrix) de un proyecto contra las transacciones
 * aprobadas/activas de Órdenes de Compra, Gastos, Hojas de Horas y Remisiones de Almacén.
 * Garantiza Cero Módulos Isla y trazabilidad determinista por ID sin doble conteo.
 */
export function reconcileProjectAnalyticalCosts(
  project: Project,
  sources: {
    purchaseOrders?: PurchaseOrder[];
    expenses?: ExpenseEntry[];
    timesheets?: TimesheetEntry[];
    remissions?: DispatchRemission[];
    trm?: number;
  }
): Project {
  const trm = sources.trm || 4150;
  const existingMatrix: any[] = Array.isArray(project.costMatrix) ? [...project.costMatrix] : [];
  const items = Array.isArray(project.projectItems) ? project.projectItems : [];
  const defaultItemCode = items[0]?.code || 'ITEM 01';
  const defaultItemId = items[0]?.id;

  const resolveItemFolder = (codeOrId?: string) => {
    if (!codeOrId) return { itemCode: defaultItemCode, projectItemId: defaultItemId };
    const matched = items.find((it) => it.id === codeOrId || it.code === codeOrId);
    return {
      itemCode: matched?.code || codeOrId,
      projectItemId: matched?.id || defaultItemId,
    };
  };

  // 1. Reconciliar Órdenes de Compra vinculadas al proyecto
  const projectPOs = (sources.purchaseOrders || []).filter(
    (po) => !po.isDeleted && po.status !== 'rejected' && (po.projectId === project.id || (po.projectCode && po.projectCode === project.code))
  );
  let totalCommittedPO = 0;

  projectPOs.forEach((po) => {
    const costCOP = po.totalAmountCOP || (po.currency === 'USD' ? Math.round((po.totalAmountUSD || 0) * trm) : 0);
    const isReceived = po.status === 'received';
    if (!isReceived) {
      totalCommittedPO += costCOP;
    }

    const rowId = `cost-po-${po.id}`;
    const hasLinkedRow = existingMatrix.some(
      (r) =>
        r.id === rowId ||
        r.sourceId === po.id ||
        (po.costMatrixItemId && r.id === po.costMatrixItemId) ||
        (r.concept && po.orderNumber && r.concept.includes(`OC ${po.orderNumber}`))
    );

    if (!hasLinkedRow && costCOP > 0) {
      const folder = resolveItemFolder(po.itemCode);
      const poCategory = (po.costCategory as any) || 'repuestos_fabricacion';
      existingMatrix.push({
        id: rowId,
        sourceType: 'purchase_order',
        sourceId: po.id,
        sourceCode: po.orderNumber,
        projectItemId: folder.projectItemId,
        itemCode: folder.itemCode,
        category: poCategory,
        concept: `OC ${po.orderNumber} - ${po.supplierName || 'Proveedor'}`,
        unit: 'unid',
        plannedQuantity: 1,
        plannedUnitCost: costCOP,
        plannedTotal: costCOP,
        committedAmount: isReceived ? 0 : costCOP,
        actualQuantity: isReceived ? 1 : 0,
        actualUnitCost: isReceived ? costCOP : 0,
        actualTotal: isReceived ? costCOP : 0,
        variance: isReceived ? 0 : costCOP,
        costType: po.costType || 'directo',
        date: po.date || new Date().toISOString().split('T')[0],
        observations: isReceived
          ? `Imputado por OC ${po.orderNumber} (Recibida en Almacén).`
          : `[Comprometido] Orden de compra ${po.orderNumber} en tránsito (${po.supplierName || 'Proveedor'}).`,
      });
    }
  });

  // 2. Reconciliar Gastos Aprobados / Legalizados vinculados al proyecto
  const projectExpenses = (sources.expenses || []).filter(
    (exp) =>
      (exp.status === 'approved' || exp.status === 'legalized') &&
      exp.movementType !== 'deposito' &&
      (exp.projectId === project.id || (exp.projectCode && exp.projectCode === project.code))
  );

  projectExpenses.forEach((exp) => {
    const rowId = `cost-exp-${exp.id}`;
    const hasLinkedRow = existingMatrix.some(
      (r) => r.id === rowId || r.sourceId === exp.id || (exp.costMatrixItemId && r.id === exp.costMatrixItemId)
    );
    if (!hasLinkedRow) {
      const amountCOP =
        exp.currency === 'USD'
          ? Math.round((exp.amount || 0) * trm)
          : exp.currency === 'EUR'
          ? Math.round((exp.amount || 0) * trm * 1.08)
          : exp.amount || 0;
      if (amountCOP > 0) {
        const folder = resolveItemFolder(exp.itemCode);
        const mappedCategory = (
          ['viaticos_alimentacion', 'tiquetes_transporte', 'alojamiento', 'transporte_urbano'].includes(exp.category)
            ? 'viaticos_transporte'
            : ['materiales_urgentes', 'materiales_obra'].includes(exp.category)
            ? 'repuestos_fabricacion'
            : exp.category === 'herramientas'
            ? 'consumibles_taller'
            : exp.category === 'servicios_tecnicos'
            ? 'subcontratos_gruas'
            : 'imprevistos_contingencia'
        ) as any;

        existingMatrix.push({
          id: rowId,
          sourceType: 'expense',
          sourceId: exp.id,
          sourceCode: exp.invoiceNumber || exp.id,
          projectItemId: folder.projectItemId,
          itemCode: folder.itemCode,
          category: mappedCategory,
          concept: `${exp.isPettyCash ? '[Caja Menor] ' : '[Gasto Legalizado] '}${exp.description}${exp.supplierName ? ` - ${exp.supplierName}` : ''}`,
          unit: 'Global',
          plannedQuantity: 0,
          plannedUnitCost: 0,
          plannedTotal: 0,
          actualQuantity: 1,
          actualUnitCost: amountCOP,
          actualTotal: amountCOP,
          variance: -amountCOP,
          spendingNature: 'PRESUPUESTO',
          costType: 'directo',
          date: exp.date || new Date().toISOString().split('T')[0],
          invoiceNumber: exp.invoiceNumber || '',
          receiptPhotos: exp.receiptPhotoUrl ? [exp.receiptPhotoUrl] : [],
          observations: `Radicado por ${exp.userName}. Aprobado por ${exp.approvedByName || 'Contabilidad'}.`,
        });
      }
    }
  });

  // 3. Reconciliar Hojas de Horas Aprobadas vinculadas al proyecto
  const projectTimesheets = (sources.timesheets || []).filter(
    (ts) =>
      !ts.isDeleted &&
      ts.status === 'approved' &&
      (ts.projectId === project.id || (ts.projectCode && ts.projectCode === project.code))
  );

  projectTimesheets.forEach((ts) => {
    const rowId = `cost-ts-${ts.id}`;
    const hasLinkedRow = existingMatrix.some(
      (r) => r.id === rowId || r.sourceId === ts.id || (ts.costMatrixItemId && r.id === ts.costMatrixItemId)
    );
    if (!hasLinkedRow) {
      const rate = ts.hourlyRateCOP || 0;
      const laborCOP = ts.totalCostCOP || Math.round((ts.hours || 0) * rate);
      if (laborCOP > 0) {
        const folder = resolveItemFolder(ts.itemCode);
        existingMatrix.push({
          id: rowId,
          sourceType: 'timesheet',
          sourceId: ts.id,
          sourceCode: ts.id,
          projectItemId: folder.projectItemId,
          itemCode: folder.itemCode,
          category: 'mano_obra_itk',
          concept: `Mano de Obra ITK - ${ts.userName} (${ts.hours}h @ $${rate.toLocaleString('es-CO')}/h - ${ts.taskName || 'Labores'})`,
          unit: 'Horas',
          plannedQuantity: ts.hours || 0,
          plannedUnitCost: rate,
          plannedTotal: laborCOP,
          actualQuantity: ts.hours || 0,
          actualUnitCost: rate,
          actualTotal: laborCOP,
          variance: 0,
          spendingNature: 'PRESUPUESTO',
          costType: 'directo',
          date: ts.date || new Date().toISOString().split('T')[0],
          observations: `Hoja de horas aprobada (${ts.hours}h).`,
        });
      }
    }
  });

  const matrixActual = existingMatrix.reduce(
    (sum, row) => sum + Number(row?.actualTotal ?? row?.actualAmount ?? 0),
    0
  );

  return {
    ...project,
    costMatrix: existingMatrix,
    committedCostPO: Math.max(Number(project.committedCostPO || 0), totalCommittedPO),
    actualCostAC: Math.max(Number(project.actualCostAC || 0), matrixActual),
  };
}

