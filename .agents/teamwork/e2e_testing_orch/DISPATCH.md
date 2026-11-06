# Dispatch: E2E Testing Track Orchestrator

## Mission
Design and implement the comprehensive, opaque-box E2E test suite for Inteckno ERP Cleanup and Optimization per Dual Track Project Pattern. Publish `TEST_INFRA.md` and `TEST_READY.md`.

## Scope
- Derive opaque-box tests strictly from user requirements in `ORIGINAL_REQUEST.md` and feature inventory in `PROJECT.md`:
  1. Orphan & Dead File Elimination (verify absence of dead files and intactness of all 133 active modules).
  2. Dead Code & Unused Imports Cleanup (verify absence of mock data `SAMPLE_RECEIPTS`, zero `isClearable={false}`, and 0 unused locals).
  3. Performance & Bundle Optimization (verify code-splitting, manualChunks vendor separation, and entry bundle size < 600 kB).
  4. Autopista de Información, Firestore Sync & Navigation (verify `navigateWithContext`, return highways in Requisitions/PO/Expenses/Billing, cloud-first loading, 0 custom events).
  5. TypeScript & Production Build (verify `npm run build` exits 0 with 0 errors).
- 4-Tier Test Case Design:
  - Tier 1: Feature Coverage (>=5 per feature)
  - Tier 2: Boundary & Corner Cases (>=5 per feature)
  - Tier 3: Cross-Feature Interactions
  - Tier 4: Real-world Workload / End-to-End Scenarios
- Test Runner: Node.js / Playwright / TS verification script with exit code 0 on full pass.
- Deliverables:
  - `TEST_INFRA.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_INFRA.md`
  - `TEST_READY.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_READY.md`

## Authoritative Inputs
- ORIGINAL_REQUEST.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\PROJECT.md
- Inteckno ERP Rules: C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

## Working Directory
`C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\e2e_testing_orch`
Parent Orchestrator ID: `0d3fc292-4a95-4000-b905-f57f7d512468`
