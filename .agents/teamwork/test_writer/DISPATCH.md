# Test Writer Dispatch

## Mission
Design and implement the E2E test suite for Inteckno ERP Cleanup and Optimization per the Dual Track Project Pattern. Publish `TEST_INFRA.md` and `TEST_READY.md`.

## Scope
Derive opaque-box verification tests across all 5 features from `ORIGINAL_REQUEST.md` and `PROJECT.md`:
1. Orphan files, dead components, and empty folders removal (verify absence of 6 dead files, 2 unused assets, users.json, and presence/reachability of all 133 active modules).
2. Dead code & unused imports cleanup (verify absence of mock data SAMPLE_RECEIPTS, zero `isClearable={false}`, and 0 unused locals).
3. Performance & bundle optimization (verify code-splitting, manualChunks vendor separation, and entry bundle size < 600 kB).
4. Autopista de Información, Firestore sync & navigation (verify `navigateWithContext`, return highways in Requisitions/PO/Expenses/Billing, cloud-first loading, 0 custom events).
5. TypeScript & production build (verify `npm run build` exits 0 with 0 errors).

Methodology: 4-Tier Test Suite
- Tier 1: Feature Coverage (>=5 per feature = >=25 tests)
- Tier 2: Boundary & Corner Cases (>=5 per feature = >=25 tests)
- Tier 3: Cross-Feature Interactions
- Tier 4: Real-world Workload / End-to-End Scenarios

Deliverables:
- Test runner and test cases in project workspace (e.g. `tests/e2e/` or root verification scripts).
- `TEST_INFRA.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_INFRA.md`
- `TEST_READY.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_READY.md`

## Mandatory Inputs
- ORIGINAL_REQUEST.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
- PROJECT.md: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\PROJECT.md
- Inteckno ERP Rules: C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

Working Directory: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\test_writer
Parent Orchestrator ID: 0d3fc292-4a95-4000-b905-f57f7d512468

## 2026-11-06T13:45:55Z
You are the E2E Test Writer (Archetype: teamwork_test_writer).
Parent Orchestrator ID: 0d3fc292-4a95-4000-b905-f57f7d512468
Working Directory: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\test_writer
Project Root: C:\Users\david\OneDrive\Documents\inteckno-erp

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
Read PROJECT.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\PROJECT.md
Read DISPATCH.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\test_writer\DISPATCH.md
Read Inteckno ERP rules at:
C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

YOUR MISSION:
Design and build a comprehensive, opaque-box E2E test suite for Inteckno ERP Cleanup and Optimization per the Dual Track Project Pattern:
1. Requirements derivation:
   - Feature 1: Orphan files, components, and empty folders removal.
   - Feature 2: Dead code, unused imports, and Rule 4 / Rule 6 compliance.
   - Feature 3: Performance, code splitting, and bundle chunking.
   - Feature 4: Autopista de Información, Firestore sync, and deterministic navigation.
   - Feature 5: TypeScript health and production build (`npm run build`).
2. Implement test harness & test cases following the 4-tier methodology:
   - Tier 1: Feature Coverage (>=5 per feature)
   - Tier 2: Boundary & Corner Cases (>=5 per feature)
   - Tier 3: Cross-Feature Interactions
   - Tier 4: Real-world Workload / End-to-End Scenarios
3. Build the test runner (e.g. Node test script `scripts/test-e2e.cjs` or equivalent) that executes all test cases and exits with code 0 on pass.
4. Publish:
   - `TEST_INFRA.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_INFRA.md`
   - `TEST_READY.md` at `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\TEST_READY.md` (and a copy at project root `C:\Users\david\OneDrive\Documents\inteckno-erp\TEST_READY.md`)
5. Deliver handoff.md in your working directory and notify parent orchestrator (`0d3fc292-4a95-4000-b905-f57f7d512468`). Do NOT modify application source code in `src/`.

