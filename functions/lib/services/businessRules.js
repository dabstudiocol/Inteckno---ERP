"use strict";
/**
 * INTECKNO ERP - CORE BUSINESS RULES FOR AI API GATEWAY
 * Enforces Rules 4, 8, 11, 13, 14, 15:
 * - Dynamic Tax Rate by Country (getProjectTaxRate)
 * - Real Projected Margin = (Contract - EAC) / Contract, EAC = max(AC, PV), "N/D" if no costs
 * - Labor Hourly Cost (Colombia Ley 2101/2021): (baseSalary * 1.52) / 210
 * - Non-Destructive Deep Merge (never overwrite existing content with empty/null)
 * - Token-Efficient Condensation & PII Masking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxEngine = exports.TAX_REGISTRY = void 0;
exports.getProjectTaxRate = getProjectTaxRate;
exports.calculateRealProjectMargin = calculateRealProjectMargin;
exports.calculateColombiaHourlyCost = calculateColombiaHourlyCost;
exports.ensureProjectItems = ensureProjectItems;
exports.nonDestructiveDeepMerge = nonDestructiveDeepMerge;
exports.maskPiiAndCondense = maskPiiAndCondense;
const normalize = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
exports.TAX_REGISTRY = {
    CO: { countryCode: 'CO', countryName: 'Colombia', taxName: 'IVA', rate: 0.19, label: '19%', authority: 'DIAN' },
    MX: { countryCode: 'MX', countryName: 'México', taxName: 'IVA', rate: 0.16, label: '16%', authority: 'SAT' },
    PA: { countryCode: 'PA', countryName: 'Panamá', taxName: 'ITBMS', rate: 0.07, label: '7%', authority: 'DGI' },
    CL: { countryCode: 'CL', countryName: 'Chile', taxName: 'IVA', rate: 0.19, label: '19%', authority: 'SII' },
    PE: { countryCode: 'PE', countryName: 'Perú', taxName: 'IGV', rate: 0.18, label: '18%', authority: 'SUNAT' },
    BO: { countryCode: 'BO', countryName: 'Bolivia', taxName: 'IVA', rate: 0.13, label: '13%', authority: 'SIN' },
    EC: { countryCode: 'EC', countryName: 'Ecuador', taxName: 'IVA', rate: 0.15, label: '15%', authority: 'SRI' },
    ES: { countryCode: 'ES', countryName: 'España', taxName: 'IVA', rate: 0.21, label: '21%', authority: 'AEAT' },
    DO: { countryCode: 'DO', countryName: 'Rep. Dominicana', taxName: 'ITBIS', rate: 0.18, label: '18%', authority: 'DGII' },
    CR: { countryCode: 'CR', countryName: 'Costa Rica', taxName: 'IVA', rate: 0.13, label: '13%', authority: 'Hacienda' },
    GT: { countryCode: 'GT', countryName: 'Guatemala', taxName: 'IVA', rate: 0.12, label: '12%', authority: 'SAT' },
    AR: { countryCode: 'AR', countryName: 'Argentina', taxName: 'IVA', rate: 0.21, label: '21%', authority: 'AFIP' },
};
function getProjectTaxRate(country) {
    const upper = (country || '').trim().toUpperCase();
    if (exports.TAX_REGISTRY[upper]) {
        const r = exports.TAX_REGISTRY[upper];
        return {
            rate: r.rate,
            label: r.label,
            countryName: r.countryName,
            countryCode: r.countryCode,
            taxName: r.taxName,
            taxAppliedCode: `${r.countryCode}_${r.taxName}`,
        };
    }
    const norm = normalize(country || '');
    const matchEntry = Object.values(exports.TAX_REGISTRY).find((r) => {
        const normName = normalize(r.countryName);
        return norm.includes(normName) || (r.countryCode === 'DO' && norm.includes('dominicana'));
    });
    const resolved = matchEntry || exports.TAX_REGISTRY.CO;
    return {
        rate: resolved.rate,
        label: resolved.label,
        countryName: resolved.countryName,
        countryCode: resolved.countryCode,
        taxName: resolved.taxName,
        taxAppliedCode: `${resolved.countryCode}_${resolved.taxName}`,
    };
}
class TaxEngine {
    static calculateProjectFinancials(countryOrCode, costMatrix) {
        const taxRule = getProjectTaxRate(countryOrCode);
        let subtotal = 0;
        let taxableAmount = 0;
        for (const item of costMatrix || []) {
            const base = Number(item.baseCost ?? item.actualTotal ?? item.actualAmount ?? item.plannedTotal ?? item.plannedAmount ?? 0);
            const isTaxable = item.taxable !== undefined ? Boolean(item.taxable) : item.hasIva !== false;
            subtotal += base;
            if (isTaxable) {
                taxableAmount += base;
            }
        }
        const calculatedTaxTotal = Math.round(taxableAmount * taxRule.rate);
        const grandTotal = subtotal + calculatedTaxTotal;
        return {
            subtotal,
            taxableAmount,
            taxAppliedCode: taxRule.taxAppliedCode,
            effectiveTaxRate: taxRule.rate,
            calculatedTaxTotal,
            grandTotal,
        };
    }
}
exports.TaxEngine = TaxEngine;
/**
 * Rule 15: Margen Proyectado Real = (Contrato - EAC) / Contrato
 * EAC = max(costo real, costo planeado). Sin costos registrados -> "N/D".
 */
function calculateRealProjectMargin(project) {
    const contractAmount = Number(project.contractAmount || project.budgetPV || 0);
    const costMatrix = Array.isArray(project.costMatrix) ? project.costMatrix : [];
    const matrixPlanned = costMatrix.reduce((acc, r) => acc + Number(r?.plannedTotal ?? r?.plannedAmount ?? 0), 0);
    const matrixActual = costMatrix.reduce((acc, r) => acc + Number(r?.actualTotal ?? r?.actualAmount ?? 0), 0);
    const plannedCost = matrixPlanned;
    const actualCost = Math.max(Number(project.actualCostAC || 0), matrixActual);
    const eac = Math.max(actualCost, plannedCost);
    if (eac <= 0 || contractAmount <= 0) {
        return {
            contractAmount,
            plannedCost,
            actualCost,
            eac,
            marginPct: 'N/D',
            marginLabel: 'N/D (Sin costos registrados)',
        };
    }
    const rawPct = ((contractAmount - eac) / contractAmount) * 100;
    const rounded = Number(rawPct.toFixed(2));
    return {
        contractAmount,
        plannedCost,
        actualCost,
        eac,
        marginPct: rounded,
        marginLabel: `${rounded}%`,
    };
}
/**
 * Rule 15: Costo Hora Laboral Colombia (Ley 2101/2021)
 * (salario base * 1.52) / 210 h. Sin salario en RRHH no se inventa tarifa (retorna 0).
 */
function calculateColombiaHourlyCost(baseSalaryCOP, factorPrestacional = 1.52, divisorMensual = 210) {
    const sal = Number(baseSalaryCOP || 0);
    if (sal <= 0) {
        return { hourlyCostCOP: 0, monthlyCompanyCostCOP: 0 };
    }
    const monthlyCompanyCostCOP = Math.round(sal * factorPrestacional);
    const hourlyCostCOP = Math.round(monthlyCompanyCostCOP / divisorMensual);
    return { hourlyCostCOP, monthlyCompanyCostCOP };
}
/**
 * Ensures every project has at least ITEM 01 contractual folder (Rule 11 & Plan 1)
 */
function ensureProjectItems(project) {
    const existing = Array.isArray(project.projectItems) ? project.projectItems : [];
    if (existing.length > 0) {
        return existing.map((it, idx) => ({
            id: it.id || `item-${project.id}-${idx + 1}`,
            code: it.code || `ITEM ${String(idx + 1).padStart(2, '0')}`,
            name: it.name || `Alcance Contractual ${idx + 1}`,
            budgetPlanned: Number(it.budgetPlanned || 0),
            status: it.status || 'activo',
            createdAt: it.createdAt || new Date().toISOString(),
        }));
    }
    return [
        {
            id: `item-${project.id || Date.now()}-1`,
            code: 'ITEM 01',
            name: project.name || 'Alcance Contractual Principal',
            budgetPlanned: Number(project.budgetPV || project.contractAmount || 0),
            status: 'activo',
            createdAt: new Date().toISOString(),
        },
    ];
}
/**
 * Rule 14: Non-Destructive Deep Merge
 * Existing non-empty values and non-empty arrays are NEVER overwritten by null, undefined, '', or [].
 * Rule 13: Preserves explicit boolean states like `hasIva: false`.
 */
function nonDestructiveDeepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
        const srcVal = source[key];
        const tgtVal = target[key];
        // Never overwrite with undefined or null
        if (srcVal === undefined || srcVal === null)
            continue;
        // Never overwrite existing non-empty string with empty string
        if (typeof srcVal === 'string' && srcVal.trim() === '' && typeof tgtVal === 'string' && tgtVal.trim() !== '') {
            continue;
        }
        // Never overwrite existing non-empty array with empty array
        if (Array.isArray(srcVal)) {
            if (srcVal.length === 0 && Array.isArray(tgtVal) && tgtVal.length > 0) {
                continue;
            }
            // Merge array items by `id` or `code` if objects
            if (Array.isArray(tgtVal) && tgtVal.length > 0 && typeof srcVal[0] === 'object' && srcVal[0] !== null) {
                const mergedMap = new Map();
                for (const item of tgtVal) {
                    const itemKey = item?.id || item?.code || JSON.stringify(item);
                    mergedMap.set(String(itemKey), item);
                }
                for (const item of srcVal) {
                    const itemKey = item?.id || item?.code || JSON.stringify(item);
                    const prev = mergedMap.get(String(itemKey));
                    mergedMap.set(String(itemKey), prev ? nonDestructiveDeepMerge(prev, item) : item);
                }
                output[key] = Array.from(mergedMap.values());
            }
            else {
                output[key] = srcVal;
            }
            continue;
        }
        // Recurse on plain objects
        if (typeof srcVal === 'object' && !Array.isArray(srcVal) && typeof tgtVal === 'object' && tgtVal !== null && !Array.isArray(tgtVal)) {
            output[key] = nonDestructiveDeepMerge(tgtVal, srcVal);
            continue;
        }
        output[key] = srcVal;
    }
    return output;
}
/**
 * Masks sensitive PII fields (salaries, national IDs, passwords, bank accounts, emergency phones)
 * unless the API Key has explicit `pii` scope.
 */
const SENSITIVE_SUBSTRINGS = [
    'salary',
    'salario',
    'password',
    'nationalid',
    'documentid',
    'cedula',
    'bank',
    'cuenta',
    'emergencyphone',
    'photoUrl',
];
function maskPiiAndCondense(data, hasPiiScope, projectedFields) {
    if (data === null || data === undefined)
        return undefined;
    if (Array.isArray(data)) {
        return data
            .map((item) => maskPiiAndCondense(item, hasPiiScope, projectedFields))
            .filter((v) => v !== undefined);
    }
    if (typeof data === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(data)) {
            if (v === null || v === undefined || v === '')
                continue;
            if (Array.isArray(v) && v.length === 0)
                continue;
            // Always strip passwords and huge base64 blobs to save tokens and protect credentials
            if (k.toLowerCase() === 'password' || k === 'photoUrl' || k === 'audioData')
                continue;
            // Field projection filter at top level
            if (projectedFields && projectedFields.length > 0 && !projectedFields.includes(k)) {
                continue;
            }
            const lowerKey = k.toLowerCase();
            const isSensitive = SENSITIVE_SUBSTRINGS.some((sub) => lowerKey.includes(sub));
            if (isSensitive && !hasPiiScope) {
                out[k] = typeof v === 'number' ? '[MASKED_PII_NUM]' : '[MASKED_PII]';
            }
            else {
                const cleaned = maskPiiAndCondense(v, hasPiiScope, undefined);
                if (cleaned !== undefined) {
                    out[k] = cleaned;
                }
            }
        }
        return Object.keys(out).length > 0 ? out : undefined;
    }
    return data;
}
//# sourceMappingURL=businessRules.js.map