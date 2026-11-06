# Project: Inteckno ERP Deep Cleanup, Sanitization and Optimization

## Architecture
- Single-page enterprise ERP application built with React 19, TypeScript, Vite, Tailwind CSS v4, and Google Cloud Firestore.
- Central state and data distribution layer: `src/core/storage/erpStore.tsx` (`ErpProvider`), providing unified reactive state, 10 `onSnapshot` real-time Firestore synchronization listeners, offline IndexedDB resilience, and non-destructive deep merge.
- Deterministic navigation and closed-loop data highways: `navigateWithContext(targetModule, action, data)` routing to 20 business modules in `src/modules/*` wrapped by `AppShell.tsx`.
- Strict Inteckno business rules: SF Pro typography, `formatCOP` currency standard, clean numeric inputs (`value={val || ''}`), `ConfirmDeleteModal` with 'BORRAR', zero mock data, zero manual sync buttons.

## Feature Inventory
| # | Feature / Work Item | Description | Milestone | Source |
|---|---------------------|-------------|-----------|--------|
| 1 | Delete 6 orphan source files | Remove unreferenced `RecordChatter.tsx`, `DocumentFlowBar.tsx`, `GanttChart.tsx`, `moduleRegistry.ts`, `ProjectSTCSchema.ts`, `rfqOptimizer.ts` | M1 (DONE) | survey (Explorers 1, 2) |
| 2 | Delete 2 unreferenced assets | Remove `public/inteckno-logo.jpg` and duplicate `public/manifest.webmanifest` | M1 (DONE) | survey (Explorer 1) |
| 3 | Remove corrupted root file | Delete truncated `users.json` (13 bytes) | M1 (DONE) | survey (Explorer 1) |
| 4 | Prune empty directories | Clean `src/components/chat/`, `src/core/registry/`, `src/modules/projects/types/` | M1 (DONE) | survey (Explorer 1) |
| 5 | Remove unused dependencies | Uninstall `clsx`, `tailwind-merge`, `scheduler` from `package.json` | M2 | survey (Explorer 2) |
| 6 | Eradicate Rule 4 Mock Data | Purge `SAMPLE_RECEIPTS` from `aiVisionExpenseService.ts`, clear `useState` pre-fills in `OperacionesAvanzadasModule.tsx` and `BillingModule.tsx`, remove unused `SEED_*` imports in `erpStore.tsx` | M2 | survey (Explorer 2) |
| 7 | Correct Rule 6 violation | Replace `isClearable={false}` with `isClearable={true}` in `OpticalBarcodeScannerTab.tsx:788` | M2 | survey (Explorer 2) |
| 8 | Code hygiene & duplicate logic | Standardize `formatCOP` in `TabWbsGantt.tsx:92` to `trmService.ts`, clean mid-file re-export in `TabCostosPresupuesto.tsx`, remove dead `handleManualSync` in `TabHseqOffline.tsx` | M2 | survey (Explorers 2, 3) |
| 9 | Purge 720 unused imports & locals | Eliminate 447 unrendered Lucide icons, 74 unused types, 54 dead variables/setters, 18 dead handlers, 109 dead helpers across 86 files | M3 | survey (Explorer 2) |
| 10 | Rollup Vendor Chunking | Configure `manualChunks` in `vite.config.ts` (`vendor-react`, `vendor-firebase`, `vendor-icons`, `vendor-charts`, `vendor-xlsx`, `vendor-zxing`) | M4 | survey (Explorer 3) |
| 11 | Dynamic import for XLSX | Dynamic `await import('xlsx')` in `InventoryExcelUploadModal.tsx` | M4 | survey (Explorers 2, 3) |
| 12 | App Route Code-Splitting | Convert static module imports in `src/App.tsx` to `React.lazy()` with `<Suspense>` wrapper and SF Pro skeleton | M4 | survey (Explorer 3) |
| 13 | Return Highway Enhancement | Add interactive return highway button to `RequisitionDetailModal.tsx:295-306` back to Project Cost Matrix | M4 | survey (Explorer 3) |
| 14 | TypeScript Hardening & Verification | Set `noUnusedLocals: true` and `noUnusedParameters: true` in `tsconfig.app.json`, verify 0 errors with `tsc --noEmit` and clean production build with `npm run build` | M5 | survey (Explorers 2, 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Orphan Files & Empty Folders Deletion | Remove 6 dead files in `src/`, 2 unreferenced assets in `public/`, `users.json`, prune 3 empty folders | none | DONE |
| M2 | Dependencies, Mock Data & Business Rules Sanitization | Uninstall `clsx`, `tailwind-merge`, `scheduler`; remove `SAMPLE_RECEIPTS` & `useState` mock strings; fix `isClearable={false}`; clean duplicate `formatCOP` & dead handlers | M1 | IN_PROGRESS |
| M3 | Unused Imports & Dead Locals Purgation | Clean 720 dead imports and unused variables across 86 files | M1, M2 | PLANNED |
| M4 | Performance, Code-Splitting & Navigation Return Highways | Configure `manualChunks` in `vite.config.ts`, dynamic `xlsx`, `React.lazy` in `App.tsx`, return highway in `RequisitionDetailModal` | M1, M2, M3 | PLANNED |
| M5 | TypeScript Strictness & Clean Production Build Verification | Enable `noUnusedLocals` & `noUnusedParameters`, run `npm run build`, verify <600 KB main chunk and 0 errors | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
- `src/core/storage/erpStore.tsx`: Must preserve all 10 `onSnapshot` subscriptions and `navigateWithContext(targetModule, action, data)` signature.
- `src/App.tsx`: Must seamlessly load all 20 modules via `React.lazy()` without changing activeModuleId resolution or navigation parameters.
- `src/core/services/trmService.ts`: Exports canonical `formatCOP(amount: number): string`.

## Code Layout
- `src/components/common/`: Shared UI components (`ConfirmDeleteModal.tsx`, etc.).
- `src/components/layout/`: Application shell, header, sidebar navigation.
- `src/core/`: Central store, RBAC, domain services, and Firestore sync.
- `src/modules/*`: 20 isolated business modules.
- `public/`: Public web assets and PWA manifest.
