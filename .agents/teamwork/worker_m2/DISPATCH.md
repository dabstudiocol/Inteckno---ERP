# Worker M2 Dispatch

## Mission
Execute Milestone 2 (M2): Dependencies, Mock Data & Business Rules Sanitization.

## Exclusive Write Ownership
Files you own for editing:
1. `package.json`: Remove `clsx`, `tailwind-merge`, `scheduler` from dependencies. (DO NOT remove `@zxing/library` as it is peer dependency of `@zxing/browser`).
2. `src/core/services/aiVisionExpenseService.ts`: Remove `SAMPLE_RECEIPTS` mock receipt collection (lines 78-228).
3. `src/modules/operations/OperacionesAvanzadasModule.tsx`: Replace pre-written mock `useState('...')` values with `useState('')` on lines 124, 126, 175, 202.
4. `src/modules/billing/BillingModule.tsx`: Replace pre-written mock `useState('...')` value with `useState('')` on line 162.
5. `src/core/storage/erpStore.tsx`: Remove the 18 unused `SEED_*` imports from `src/seed/intecknoData.ts` (lines 75-98).
6. `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx`: Fix Rule 6 violation by changing `isClearable={false}` to `isClearable={true}` on line 788.
7. `src/modules/projects/components/tabs/TabWbsGantt.tsx`: Remove duplicate local `formatCOP` function on line 92 and use canonical `import { formatCOP } from '../../../../core/services/trmService'`.
8. `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx`: Remove anomalous mid-file re-export of `getProjectTaxRate` on lines 290-291.
9. `src/modules/projects/components/tabs/TabHseqOffline.tsx`: Remove dead uncalled handler `handleManualSync` on lines 117-127.

## Mandatory Inputs
- ORIGINAL_REQUEST.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\PROJECT.md
- Explorer 2 Survey: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_2\survey_deadcode_build.md
- Inteckno ERP Rules: C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

Working Directory: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\worker_m2
Parent Orchestrator ID: 0d3fc292-4a95-4000-b905-f57f7d512468

## 2026-11-06T14:03:32Z
You are Worker 2 (Archetype: teamwork_worker) executing Milestone 2 (M2).
Parent Orchestrator ID: 0d3fc292-4a95-4000-b905-f57f7d512468
Working Directory: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\worker_m2
Project Root: C:\Users\david\OneDrive\Documents\inteckno-erp

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
Read PROJECT.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\PROJECT.md
Read DISPATCH.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\worker_m2\DISPATCH.md
Read Inteckno ERP rules at:
C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP & TASKS:
You own exclusively the following changes for Milestone 2:
1. `package.json`: Remove `clsx`, `tailwind-merge`, and `scheduler` from dependencies. (DO NOT remove `@zxing/library`).
2. `src/core/services/aiVisionExpenseService.ts`: Remove the mock data collection `SAMPLE_RECEIPTS` (lines 78-228).
3. `src/modules/operations/OperacionesAvanzadasModule.tsx`: Clear pre-written mock strings in `useState` (lines 124, 126, 175, 202) so they start empty (`useState('')`), respecting Rule 4.
4. `src/modules/billing/BillingModule.tsx`: Clear pre-written mock string in `useState` (line 162) to `useState('')`, respecting Rule 4.
5. `src/core/storage/erpStore.tsx`: Remove the 18 unused `SEED_*` imports from `src/seed/intecknoData.ts` (lines 75-98).
6. `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx`: Fix Rule 6 violation by changing `isClearable={false}` to `isClearable={true}` on line 788.
7. `src/modules/projects/components/tabs/TabWbsGantt.tsx`: Remove local duplicate `formatCOP` function on line 92 and import canonical `formatCOP` from `../../../../core/services/trmService`.
8. `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx`: Remove the anomalous mid-file re-export of `getProjectTaxRate` on lines 290-291.
9. `src/modules/projects/components/tabs/TabHseqOffline.tsx`: Remove the dead handler `handleManualSync` on lines 117-127.

VERIFICATION:
- Run `npm run build` (`tsc -b && vite build`) and confirm 0 errors.
- Run `node verify_rules.cjs` and confirm 4/4 passed.
- Run `node scripts/test-e2e.cjs` and confirm 60/60 passed.

OUTPUT REQUIREMENTS:
- Write a complete `handoff.md` in your working directory following the Handoff Protocol.
- Update `progress.md` in your working directory.
- Send a completion message via `send_message` back to parent orchestrator (`0d3fc292-4a95-4000-b905-f57f7d512468`).
