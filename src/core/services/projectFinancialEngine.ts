/**
 * Motor Matemático y Financiero Centralizado de Proyectos STC (EVM & Control Presupuestal)
 * INTECKNO S.A.S. - Fuente Única de Verdad (Single Source of Truth)
 * 
 * Regla 15 & Plan 5: Consistencia matemática universal entre Dashboard, KPIs, Matriz de Costos,
 * Facturación y WBS. Cero datos arbitrarios o valores por defecto del 50% o 100%.
 */

import { Project, WBSTask } from '../../types';

export interface ProjectFinancialMetrics {
  // Avance
  physicalProgressPct: number;
  expectedProgressPct: number;
  scheduleVariancePct: number; // physicalProgressPct - expectedProgressPct

  // Valores EVM Monetarios (COP)
  contractValue: number;
  plannedCostPV: number; // Planned Value (Costos Planificados)
  actualCostAC: number;  // Actual Cost (Costo Real Ejecutado)
  earnedValueEV: number; // Earned Value (Valor Ganado Contractual)
  costVarianceCV: number; // EV - AC
  
  // Índices de Desempeño
  cpi: number; // EV / AC (Eficiencia de Costo: >1 excelente, <1 sobrecosto)
  spi: number; // Físico / Esperado (Eficiencia de Cronograma: >1 adelantado, <1 atrasado)

  // Estimación a la Conclusión y Rentabilidad
  eac: number; // Estimate at Completion: max(AC, plannedCostPV)
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
