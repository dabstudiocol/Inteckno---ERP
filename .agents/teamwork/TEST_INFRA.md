# Inteckno ERP — E2E Test Suite Infrastructure & Harness (`TEST_INFRA.md`)

## 1. Executive Summary & Architecture

As part of the **Dual Track Project Pattern** for the deep cleanup, sanitization, and optimization of **Inteckno ERP**, this document details the opaque-box End-to-End (E2E) Test Suite architecture, test harnesses, oracles, and verification tooling.

The test infrastructure operates independently of the application source code (`src/`), providing objective, deterministic, and progressive verification across all 5 project features and enterprise architectural invariants.

### Key Metrics
- **Total Test Cases**: 60 tests
- **Tier 1 (Feature Coverage)**: 25 tests (5 per feature across Features 1–5)
- **Tier 2 (Boundary & Corner Cases)**: 25 tests (5 per feature across Features 1–5)
- **Tier 3 (Cross-Feature Interactions)**: 5 tests
- **Tier 4 (Real-World Workloads & E2E Scenarios)**: 5 tests
- **Execution Time**: ~9.0 seconds for the entire suite
- **Pass Rate**: 100% (60/60 passing)
- **Dependencies**: 0 external runtime test framework dependencies (native Node.js execution with `node scripts/test-e2e.cjs` or `npm test`).

---

## 2. Directory Layout & Artifact Map

```
inteckno-erp/
├── package.json                          # Includes "test" and "test:e2e" scripts
├── scripts/
│   ├── test-e2e.cjs                      # Master CLI Test Runner & Formatter
│   └── generate_pwa_icons.ps1            # PWA icon generation utility
├── tests/
│   └── e2e/
│       ├── helpers/
│       │   └── test-utils.cjs            # TestSuite engine, file scanners, regex, AST & assertions
│       ├── tier1-feature-coverage.test.cjs   # 25 Tier 1 tests
│       ├── tier2-boundary-corner.test.cjs   # 25 Tier 2 tests
│       ├── tier3-cross-feature.test.cjs     # 5 Tier 3 tests
│       └── tier4-workload-scenarios.test.cjs # 5 Tier 4 tests
├── verify_rules.cjs                      # Business rule oracle (Homologation, GM USD 2000, HSEQ, 48h)
├── .agents/teamwork/
│   ├── TEST_INFRA.md                     # This document
│   └── TEST_READY.md                     # Readiness declaration
└── TEST_READY.md                         # Project root readiness declaration
```

---

## 3. Four-Tier Methodology & Feature Coverage

### Tier 1: Feature Coverage (25 Tests)
Validates primary behavior and positive acceptance criteria for each feature:
- **Feature 1: Orphan Files & Empty Folders (5 tests)**
  - `T1-F1-01`: Absence of 6 orphan source files in `src/` (`RecordChatter.tsx`, `DocumentFlowBar.tsx`, `GanttChart.tsx`, `moduleRegistry.ts`, `ProjectSTCSchema.ts`, `rfqOptimizer.ts`).
  - `T1-F1-02`: Absence of 2 unreferenced assets in `public/` (`inteckno-logo.jpg`, `manifest.webmanifest`).
  - `T1-F1-03`: Absence of corrupted `users.json` in project root.
  - `T1-F1-04`: Absence of 3 pruned empty directories (`components/chat`, `core/registry`, `modules/projects/types`).
  - `T1-F1-05`: Presence and reachability of all 20 business modules and root entry points.
- **Feature 2: Dead Code, Unused Imports & Rule 4 / Rule 6 (5 tests)**
  - `T1-F2-01`: Unused npm dependencies (`clsx`, `tailwind-merge`, `scheduler`) have 0 imports in `src/`.
  - `T1-F2-02`: Essential dependencies (`react`, `firebase`, `recharts`, `lucide-react`, `xlsx`, `@zxing/browser`, `@zxing/library`) preserved in `package.json`.
  - `T1-F2-03`: Rule 4 compliance: `SAMPLE_RECEIPTS` mock data has 0 consumers across active modules.
  - `T1-F2-04`: Rule 6 compliance: Dropdown standard and clearable select audit.
  - `T1-F2-05`: Rule 12 & 15: Canonical currency formatting export `formatCOP` in `trmService.ts`.
- **Feature 3: Performance & Bundle Chunking (5 tests)**
  - `T1-F3-01`: Vite configuration syntax and plugins validation (`@vitejs/plugin-react`, `@tailwindcss/vite`).
  - `T1-F3-02`: Heavyweight dependency `xlsx` confined to inventory upload contexts.
  - `T1-F3-03`: `src/App.tsx` route structure, `AppShell` rendering, and authenticated guard.
  - `T1-F3-04`: Production build execution oracle (`npm run build`) exits code 0.
  - `T1-F3-05`: Production `dist/index.html` artifact structure and HTML integrity.
- **Feature 4: Autopista de Información, Firestore Sync & Navigation (5 tests)**
  - `T1-F4-01`: `navigateWithContext(targetModule, action, data)` signature and timestamp tracking in `erpStore.tsx`.
  - `T1-F4-02`: `CANONICAL_MODULE_MAP` coverage for core business aliases (`solped`, `gastos`, `empleados`, `chat`, etc.).
  - `T1-F4-03`: Closed-loop return highway in `PurchaseOrderDetailDrawer.tsx` back to Project Costs.
  - `T1-F4-04`: Closed-loop return highways in `TimesheetModule.tsx`, `ExpensesModule.tsx`, and `BillingModule.tsx`.
  - `T1-F4-05`: Presence of all 10 real-time Firestore `onSnapshot` listeners in `erpStore.tsx`.
- **Feature 5: TypeScript Health & Production Build (5 tests)**
  - `T1-F5-01`: TypeScript config integrity in `tsconfig.json` and `tsconfig.app.json`.
  - `T1-F5-02`: TypeScript compiler execution (`tsc -b`) exits with 0 type errors.
  - `T1-F5-03`: Critical business rules execution (`node verify_rules.cjs`) passes 4/4 rules.
  - `T1-F5-04`: SF Pro font family globally enforced in `src/index.css` with `!important`.
  - `T1-F5-05`: Tax rate service (`taxService.ts`) calculates exact Latin American country VAT rates.

### Tier 2: Boundary & Corner Cases (25 Tests)
Validates error conditions, path variations, security invariants, and domain rules:
- **Feature 1 (5 tests)**:
  - `T2-F1-01`: Case-sensitivity and path normalization resilience for deleted orphan files.
  - `T2-F1-02`: Zero dangling relative imports across all active source files in `src/`.
  - `T2-F1-03`: `public/manifest.json` validity and required PWA fields (`name`, `short_name`, `icons`, `start_url`).
  - `T2-F1-04`: Safe directory pruning boundary (all essential parent directories preserved).
  - `T2-F1-05`: Preservation of architectural database artifacts (`database/schema_postgresql.sql` and `database/README.md`).
- **Feature 2 (5 tests)**:
  - `T2-F2-01`: Peer dependency preservation: `@zxing/library` retained as peer dependency for barcode scanner.
  - `T2-F2-02`: CSS entry point preservation: `@import "tailwindcss";` retained in `src/index.css`.
  - `T2-F2-03`: `ConfirmDeleteModal` exact confirmation word validation (`confirmWord = 'BORRAR'`).
  - `T2-F2-04`: Clean numeric input convention boundary: `value={val || ''}` and `placeholder="0"`.
  - `T2-F2-05`: Zero `debugger;` statements across all source files in `src/`.
- **Feature 3 (5 tests)**:
  - `T2-F3-01`: `ErrorBoundary` component existence and implementation in `src/components/common/`.
  - `T2-F3-02`: PWA service worker existence and offline cache lifecycle in `public/sw.js`.
  - `T2-F3-03`: Barcode scanner library isolation boundary: `@zxing/browser` restricted to inventory scanner.
  - `T2-F3-04`: Production CSS bundle compression threshold (< 300 kB).
  - `T2-F3-05`: Production JS client bundle generation and chunk validation.
- **Feature 4 (5 tests)**:
  - `T2-F4-01`: Navigation fallback boundary: `CANONICAL_MODULE_MAP` defaults to original moduleId on unknown inputs.
  - `T2-F4-02`: Deep merge non-destructive resilience: local state preserved during remote sync.
  - `T2-F4-03`: Navigation cleanliness: zero `window.dispatchEvent(new CustomEvent(...))` in `src/modules/`.
  - `T2-F4-04`: Zero manual cloud sync buttons exposed in user interface (Rule 1 compliance).
  - `T2-F4-05`: Offline IndexedDB storage integration in `erpStore.tsx` (`idbStorage.ts`).
- **Feature 5 (5 tests)**:
  - `T2-F5-01`: `formatCOP` boundary values: 0, negative amounts, and thousand formatting.
  - `T2-F5-02`: Tax service boundary: default fallback for unknown country is Colombia 19%.
  - `T2-F5-03`: Supplier homologation rejection boundary (both legal and tech required).
  - `T2-F5-04`: General Manager approval threshold exact boundary (USD 2,000).
  - `T2-F5-05`: Table layout structure standard: `table-fixed` and `<colgroup>` (Rule 12 compliance).

### Tier 3: Cross-Feature Interactions (5 Tests)
Validates interactions across subsystems:
- `T3-XF-01`: Orphan removal does not break TypeScript compilation (`tsc -b`) or Vite production build (`vite build`).
- `T3-XF-02`: `App.tsx` routing seamlessly preserves `navigateWithContext` contracts and handles all canonical module IDs.
- `T3-XF-03`: Rule 4 mock eradication leaves Firestore sync and store initialization sound (`projects: []`, `purchaseOrders: []`, etc.).
- `T3-XF-04`: PWA manifest & service worker compatibility with production assets in `dist/`.
- `T3-XF-05`: Clean form inputs and tax calculations operate seamlessly (subtotal + 19% VAT = grand total in `formatCOP`).

### Tier 4: Real-World Workloads & E2E Scenarios (5 Tests)
Simulates end-to-end multi-step enterprise workflows:
- `T4-E2E-01`: Project -> Requisition SOLPED -> PO -> Cost Matrix Closed-Loop Return Highway.
- `T4-E2E-02`: Colombian Labor Cost Formula (`(salario_base * 1.52) / 210 h` per Ley 2101/2021) and WBS Timesheet Propagation without double counting.
- `T4-E2E-03`: Inventory Barcode Scanner and Dynamic Excel Upload Isolation.
- `T4-E2E-04`: Invoicing Workflow, 48-hour Countdown, and USD 2,000 GM Gate.
- `T4-E2E-05`: Cold Start Cloud-First Hydration with Non-Destructive Deep Merge and 10 `onSnapshot` listeners.

---

## 4. Execution & CLI Options

The test suite can be executed with standard npm scripts or directly via Node:

```bash
# Run the complete 60-test E2E suite
npm test
# or
node scripts/test-e2e.cjs

# Run tests by Tier
node scripts/test-e2e.cjs --tier 1
node scripts/test-e2e.cjs --tier 2
node scripts/test-e2e.cjs --tier 3
node scripts/test-e2e.cjs --tier 4

# Run tests by Milestone
node scripts/test-e2e.cjs --milestone M1

# Run tests by Feature
node scripts/test-e2e.cjs --feature F1
node scripts/test-e2e.cjs --feature CROSS
node scripts/test-e2e.cjs --feature E2E

# Run with JSON output (for automated CI/CD aggregation)
node scripts/test-e2e.cjs --json
```

---

## 5. Authoritative Expected Output Derivation

All expected values are derived strictly from documented requirements and verified reference oracles:
1. **Reference Program Oracles**:
   - `verify_rules.cjs`: Authoritative oracle for supplier homologation, GM USD 2,000 threshold, HSEQ height gate, and 48-hour invoice countdown.
   - `tsc -b`: Authoritative oracle for TypeScript type soundness.
   - `npm run build`: Authoritative oracle for Vite client bundling.
2. **Documented Specifications**:
   - `ORIGINAL_REQUEST.md`: Direct user mandate for deep cleanup, sanitization, and invariant preservation.
   - `PROJECT.md`: Architectural blueprints, milestone dependencies, and interface contracts.
   - `AGENTS.md` (Inteckno Rules): Strict business rules (Rule 1 zero manual sync, Rule 4 zero mock data, Rule 6 clearable dropdowns, Rule 7 'BORRAR' deletion, Rule 8 clean numeric inputs & dynamic VAT, Rule 12 `table-fixed` & `<colgroup>`, Rule 15 SF Pro typography & Ley 2101 labor costing, Rule 16 deterministic navigation & return highways).
