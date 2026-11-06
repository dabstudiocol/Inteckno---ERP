# BRIEFING — 2026-11-06T14:05:00Z

## Mission
Execute Milestone 2 (M2): Dependencies, Mock Data & Business Rules Sanitization in Inteckno ERP.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\worker_m2
- Original parent: 0d3fc292-4a95-4000-b905-f57f7d512468
- Milestone: M2 (Dependencies, Mock Data & Business Rules Sanitization)

## 🔒 Key Constraints
- Follow Inteckno ERP rules: C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md
- Rule 1: Zero manual sync buttons.
- Rule 4: Zero mock data, zero pre-written form state strings.
- Rule 6: No `isClearable={false}` in dropdowns.
- Rule 12 & 15: Canonical `formatCOP` from `trmService.ts`.
- DO NOT remove `@zxing/library` from package.json (needed by `@zxing/browser`).
- Only modify assigned files for M2.
- No dummy/facade implementations or hardcoded results.

## Current Parent
- Conversation ID: 0d3fc292-4a95-4000-b905-f57f7d512468
- Updated: 2026-11-06T14:05:00Z

## Task Summary
- **What to build**: 
  1. Remove `clsx`, `tailwind-merge`, `scheduler` from `package.json`.
  2. Remove `SAMPLE_RECEIPTS` from `src/core/services/aiVisionExpenseService.ts`.
  3. Clear mock string literals in `OperacionesAvanzadasModule.tsx` to `useState('')`.
  4. Clear mock string literal in `BillingModule.tsx` to `useState('')`.
  5. Remove 18 unused `SEED_*` imports from `src/seed/intecknoData.ts` in `src/core/storage/erpStore.tsx`.
  6. Fix Rule 6 in `OpticalBarcodeScannerTab.tsx:788` (`isClearable={true}`).
  7. Replace local `formatCOP` in `TabWbsGantt.tsx` with canonical import from `trmService.ts`.
  8. Remove mid-file re-export of `getProjectTaxRate` in `TabCostosPresupuesto.tsx`.
  9. Remove dead `handleManualSync` in `TabHseqOffline.tsx`.
- **Success criteria**:
  - `npm run build` succeeds with 0 errors.
  - `node verify_rules.cjs` passes 4/4.
  - `node scripts/test-e2e.cjs` passes 60/60 (including `--strict`).
- **Interface contracts**: PROJECT.md
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Confirmed `@zxing/library` must be kept in `package.json` as peer dependency of `@zxing/browser`.
- Confirmed `isClearable={false}` must become `isClearable={true}` in `OpticalBarcodeScannerTab.tsx`.

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `progress.md` — Execution progress and heartbeat
- `handoff.md` — Final 5-component handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Initial build passes; E2E strict mode had 1 failure on Rule 6 (isClearable={false}) which will be fixed in M2
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (baseline); E2E strict 59/60 (pending M2 fix)
- **Lint status**: 0 blockers
- **Tests added/modified**: Using comprehensive E2E test suite

## Loaded Skills
- None explicitly requested.
