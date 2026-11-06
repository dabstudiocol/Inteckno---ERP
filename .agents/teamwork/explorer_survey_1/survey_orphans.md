# Comprehensive Survey & Audit: Orphan Files, Dead Components & Empty Directories
**Project:** Inteckno ERP (`inteckno-erp`)  
**Investigator:** Explorer 1 (`teamwork_explorer`)  
**Date:** 2026-11-06  
**Project Root:** `C:\Users\david\OneDrive\Documents\inteckno-erp`  

---

## 1. Executive Summary

A full repository static and architectural analysis was performed across all directories and files of Inteckno ERP to identify dead components, orphan files, unreferenced static assets, duplicate artifacts, and empty directories.

Key metrics:
- **Total Files in `src/`**: 139 files
- **Reachable Active Files in `src/`**: 133 files (100% active, essential production code)
- **Dead / Orphan Code Files in `src/`**: 6 files (70,892 bytes)
- **Dead / Duplicate Assets in `public/`**: 2 files (5,666 bytes)
- **Dead / Corrupted Root Files**: 1 file (`users.json`, 13 bytes)
- **Total Candidate Files for Deletion**: 9 files (76,571 bytes / ~76.6 KB)
- **Empty Directories Identified**: 3 existing empty folders in `external_skills/` + 3 folders in `src/` that will become empty upon deleting orphan files.
- **Dynamic Imports (`import(...)`) in `src/`**: 0 (all imports are explicit static ES modules)
- **Build Status**: Verified `npm run build` (`tsc -b && vite build`) executes cleanly in 2.46s.

---

## 2. Entry Point Mapping & Navigation Architecture

### 2.1 Entry Points
1. **HTML Entry Point:** `index.html`
   - Mounts `#root` container.
   - Loads `/src/main.tsx` via `<script type="module">`.
   - References PWA manifest `/manifest.json`, favicons (`/icon-192.png`, `/apple-touch-icon.png`), and official typography SF Pro Display (`https://fonts.cdnfonts.com/css/sf-pro-display`).
2. **TypeScript / React Entry Point:** `src/main.tsx`
   - Renders `<App />` wrapped in `<React.StrictMode>`.
   - Imports and injects global styles: `src/index.css` (Tailwind CSS v4 & custom styles).
   - Registers PWA Service Worker via `/sw.js` in production.
3. **Application Routing & Orchestration:** `src/App.tsx`
   - Top-level providers: `ErrorBoundary` -> `ErpProvider` (`src/core/storage/erpStore.tsx`).
   - Authentication Guard: When `!isAuthenticated`, conditionally renders `LoginView` (`src/components/auth/LoginView.tsx`).
   - Layout Frame: Wrapped in `AppShell` (`src/components/layout/AppShell.tsx`), providing the collapsible navigation sidebar, live TRM status badge, notifications dropdown, isolated user undo/redo triggers, and quick shortcuts.
   - Deterministic Module Router (`activeModuleId`): Switches across all 20 business modules.

### 2.2 Active Functional Modules (20 Modules, All Reachable & Active)
| Category | Module ID(s) in Router | Component File |
| :--- | :--- | :--- |
| **Transversal / ITK** | `conversaciones`, `chat`, `mensajes` | `src/modules/inteckno/ConversacionesModule.tsx` |
| | `documentos`, `documents`, `archivos` | `src/modules/inteckno/DocumentosModule.tsx` |
| | `calendario`, `calendar` | `src/modules/inteckno/CalendarioModule.tsx` |
| | `actividades`, `tasks`, `todos` | `src/modules/inteckno/ActividadesModule.tsx` |
| | `articulos`, `wiki` | `src/modules/inteckno/ArticulosModule.tsx` |
| | `cargos`, `positions` | `src/modules/inteckno/CargosModule.tsx` |
| | `perfil`, `profile` | `src/modules/inteckno/UserProfileModule.tsx` |
| | `requisiciones`, `requisitions`, `solped` | `src/modules/requisitions/RequisitionsModule.tsx` |
| | `usuarios-ti`, `users`, `usuarios` | `src/modules/inteckno/UserManagementModule.tsx` |
| **Comercial** | `crm`, `commercial`, `pipeline`, `contactos`, `ventas` | `src/modules/commercial/CrmModule.tsx` |
| **Ingeniería & Operaciones**| `proyectos`, `projects`, `planeacion`, `gantt`, `wbs` | `src/modules/projects/ProjectsModule.tsx` |
| | `registro-horas`, `timesheet`, `horas` | `src/modules/timesheet/TimesheetModule.tsx` |
| | `mantenimiento`, `reparacion`, `manufactura`, `taller`, `plm` | `src/modules/operations/OperacionesAvanzadasModule.tsx` |
| **Abastecimiento** | `compras`, `procurement`, `orders` | `src/modules/procurement/ProcurementModule.tsx` |
| | `inventario`, `stock`, `codigo-barras`, `barcode` | `src/modules/inventory/InventoryModule.tsx` |
| **Talento Humano & SST** | `empleados`, `vacaciones`, `encuestas`, `sst`, `nomina` | `src/modules/hr/TalentoHumanoModule.tsx` |
| **Finanzas & Administración**| `contabilidad`, `facturacion`, `firma-electronica`, `actas` | `src/modules/billing/BillingModule.tsx` |
| | `gastos`, `viaticos`, `caja-menor` | `src/modules/expenses/ExpensesModule.tsx` |
| | `tableros`, `dashboard`, `kpis` | `src/modules/dashboard/DashboardModule.tsx` |
| **Internacional** | `calculadora-precios`, `international`, `radar-oportunidades` | `src/modules/international/InternationalModule.tsx` |

---

## 3. Candidate Orphan Files Audit (Detailed Inventory)

Every file in `src/` and the project root was scanned using dependency graph resolution and AST/regex inspection. The following 9 files have **zero** incoming imports, **zero** dynamic imports, and are not referenced by any configuration, test, or build script.

### 3.1 Files in `src/` (6 Files — 70,892 Bytes)

#### 1. `src/components/chat/RecordChatter.tsx`
- **Size:** 19,049 bytes (479 lines)
- **Exports:** `RecordChatter`, `RecordChatterProps`
- **Incoming References:** 0 across all files in repository.
- **Analysis:** This component was designed as an inline per-record chat widget (`recordType: 'project' | 'task' | 'equipment' | 'expense' | 'hseq'`). The actual application architecture uses `ConversacionesModule.tsx` (`src/modules/inteckno/ConversacionesModule.tsx`) for all internal communication and channels, and floating AI widget `LucianaFloatingWidget.tsx`. `RecordChatter.tsx` was never integrated into any drawer, modal, or module view.
- **Verdict:** Dead / Unreferenced. Safe to delete.
- **Directory Impact:** Removing this file leaves `src/components/chat/` empty.

#### 2. `src/components/common/DocumentFlowBar.tsx`
- **Size:** 16,946 bytes (369 lines)
- **Exports:** `DocumentFlowBar`, `DocumentFlowBarProps`
- **Incoming References:** 0 across all files in repository.
- **Analysis:** A horizontal progress bar displaying document stages (Opportunity -> Project -> SOLPED -> PO -> Timesheet -> Invoices). The ERP instead implements this information directly inside the modular tab headers (`TabDashboard.tsx`, `TabCostosPresupuesto.tsx`, `ProcurementModule.tsx`) and via the closed-loop navigation system (`navigateWithContext`). `DocumentFlowBar` is completely unused.
- **Verdict:** Dead / Unreferenced. Safe to delete.

#### 3. `src/components/ui/GanttChart.tsx`
- **Size:** 18,955 bytes (401 lines)
- **Exports:** `GanttChart`, `GanttChartProps`
- **Incoming References:** 0 imports. (A string match on `GanttChart` in `ProjectsModule.tsx` was verified to be the Lucide icon `GanttChartSquare`, not this component).
- **Analysis:** This was an early, simplified mock Gantt chart component with a static 8-week timeline (`timelineWeeks`). The actual production Gantt and Critical Path Method (CPM) engine is implemented with full fidelity in `TabWbsGantt.tsx` (`src/modules/projects/components/tabs/TabWbsGantt.tsx`, 2,049 lines, 94 KB), which handles dependencies, Luciana AI generation, dates, and WBS editing. `src/components/ui/GanttChart.tsx` is completely superseded and unreferenced.
- **Verdict:** Superseded / Legacy Duplicate. Safe to delete.

#### 4. `src/core/registry/moduleRegistry.ts`
- **Size:** 1,731 bytes (68 lines)
- **Exports:** `moduleRegistry`, `ModuleRegistry`, `ModuleWidget`, `ModuleConfig`
- **Incoming References:** 0 across all files in repository.
- **Analysis:** An abandoned prototype of an object-oriented registry class (`class ModuleRegistry`). The ERP’s official architecture defines all module access, permissions, and hub groupings declaratively in `src/core/auth/rbac.ts` (`ALL_AREAS`, `getUserAccessibleAreas`, `SYSTEM_HUBS`) and configures catalogs via `src/core/services/moduleConfigService.ts`.
- **Verdict:** Dead Architecture Prototype. Safe to delete.
- **Directory Impact:** Removing this file leaves `src/core/registry/` empty.

#### 5. `src/modules/projects/types/ProjectSTCSchema.ts`
- **Size:** 7,871 bytes (203 lines)
- **Exports:** `STCProjectType`, `PipingDynamicData`, `StructuresDynamicData`, `TanksDynamicData`, `STCDynamicData`, `MillTestCertificate`, `SpoolJointInspection`, etc.
- **Incoming References:** 0 across all files in repository.
- **Analysis:** An outdated draft schema for industrial piping, tanks (API 650), and metal structures. Inteckno ERP is strictly specialized in Cable Transport Systems (Teleféricos: MRT, cables, UNE EN 12927, mordazas, balancines). The official, active schemas are in `src/types/ProjectSchema.ts` (re-exported via `src/types/index.ts`). No component or store imports `ProjectSTCSchema.ts`.
- **Verdict:** Obsolete / Dead Domain Schema. Safe to delete.
- **Directory Impact:** Removing this file leaves `src/modules/projects/types/` empty.

#### 6. `src/utils/rfqOptimizer.ts`
- **Size:** 4,120 bytes (111 lines)
- **Exports:** `groupRequisitionsForVolumePurchasing`, `detectPriceInflation`
- **Incoming References:** 0 across all files in repository.
- **Analysis:** Contains two standalone utility functions for grouping volume purchases and checking price inflation against historical POs. Procurement and quoting workflows in `ProcurementModule.tsx` and `QuoteComparisonModal.tsx` perform comparative analysis with their own contextual state. Neither function is imported or called anywhere.
- **Verdict:** Dead Utility. Safe to delete.

---

### 3.2 Assets in `public/` (2 Files — 5,666 Bytes)

#### 7. `public/inteckno-logo.jpg`
- **Size:** 4,859 bytes
- **Incoming References:** 0 across all files in repository.
- **Analysis:** Legacy JPEG version of the company logo. The application officially uses `public/inteckno-icon.png` (referenced in `LoginView.tsx`, `AppShell.tsx`, and `scripts/generate_pwa_icons.ps1`). `inteckno-logo.jpg` is neither referenced by HTML, CSS, JS, manifest, nor service worker.
- **Verdict:** Dead Asset. Safe to delete.

#### 8. `public/manifest.webmanifest`
- **Size:** 807 bytes
- **Incoming References:** 0 across all files in repository.
- **Analysis:** Exact byte-for-byte duplicate of `public/manifest.json`. `index.html` references `/manifest.json`, and `public/sw.js` caches `/manifest.json`. `manifest.webmanifest` is redundant and never loaded.
- **Verdict:** Redundant Duplicate Asset. Safe to delete.

---

### 3.3 Root Artifacts (1 File — 13 Bytes)

#### 9. `users.json`
- **Size:** 13 bytes
- **Content:** `{"users": [\n` (corrupted / truncated JSON)
- **Incoming References:** 0 in application code.
- **Analysis:** A 13-byte partial JSON snippet left in the repository root. Not referenced by `package.json`, `firebase.json`, or any source file. (Real user accounts and RBAC reside in `src/core/auth/rbac.ts` and Firestore `users` collection).
- **Verdict:** Abandoned / Corrupted Snippet. Safe to delete.

---

## 4. Empty and Deprecated Directories Audit

### 4.1 Directories that Will Become Empty Post-Cleanup
When the 6 orphan files in `src/` are deleted, the following 3 folders contain no other files and should be removed:
1. `src/components/chat/` (held only `RecordChatter.tsx`)
2. `src/core/registry/` (held only `moduleRegistry.ts`)
3. `src/modules/projects/types/` (held only `ProjectSTCSchema.ts`)

### 4.2 Existing Empty Directories in Repository
The following 3 directories are currently empty in `external_skills/` (which is git-ignored per `.gitignore`):
1. `external_skills/auditor-skill/vendor/trailofbits`
2. `external_skills/kevinpatrickrobbins-codebase-audit/skills/codebase-audit/codebase-audit-skill`
3. `external_skills/kevinpatrickrobbins-codebase-audit/skills/design-audit`

---

## 5. Duplicate and Legacy Component Audit

A pattern scan for `*Old*`, `*Backup*`, `*Copy*`, `*v1*`, `*temp*`, `*draft*` across `src/` yielded the following:

| Path | Pattern Match | Classification | Action Required |
| :--- | :--- | :--- | :--- |
| `src/components/common/DataGuardianBackupsModal.tsx` | `Backups` | **ESSENTIAL (Rule 14)** | **KEEP** — Active modal for restoring cloud/IndexedDB backups |
| `src/core/services/backupService.ts` | `backup` | **ESSENTIAL (Rule 14)** | **KEEP** — Active backup service for data guardian |
| `src/components/common/TemplateManagerModal.tsx` | `Template` | **ESSENTIAL** | **KEEP** — Active template manager modal for WBS & Projects |
| `src/core/services/templateManagerService.ts` | `template` | **ESSENTIAL** | **KEEP** — Active template service for WBS templates |
| `src/components/ui/GanttChart.tsx` | Conceptual Duplicate | **DEAD CODE** | **DELETE** — Superseded by `TabWbsGantt.tsx` |
| `src/modules/projects/types/ProjectSTCSchema.ts` | Conceptual Duplicate | **DEAD CODE** | **DELETE** — Superseded by `ProjectSchema.ts` |
| `public/manifest.webmanifest` | File Duplicate | **DEAD ASSET** | **DELETE** — Duplicate of `manifest.json` |

---

## 6. Essential Inventory: Files that MUST NOT Be Deleted

The following modules, stores, services, and components form the core operational fabric of Inteckno ERP and must be strictly protected:

### 6.1 State Management, Storage & Sync
- `src/core/storage/erpStore.tsx` — Central Zustand/React Context store (54 importers). Controls auth, real-time sync, `navigateWithContext`, and undo/redo stacks.
- `src/core/storage/idbStorage.ts` — IndexedDB local durable storage for offline capability.
- `src/core/services/firebaseClient.ts` — Firebase client SDK initialization.
- `src/core/services/firestoreSyncService.ts` — Reactive Firestore listeners (`onSnapshot`) and automatic cloud hydration.
- `src/core/services/backupService.ts` — Data Guardian automated cloud & local backup snapshots (`erp_backups`).
- `src/core/events/eventBus.ts` — Event bus for synchronous inter-component notifications.

### 6.2 Security, RBAC & Business Rules
- `src/core/auth/rbac.ts` — Complete role-based access control (24 official roles), permission checking, and hub categorization.
- `src/core/rules/businessRules.ts` — Core business rule thresholds (e.g. GM approval > USD 2,000, 48-hour invoice window, HSEQ gate).
- `verify_rules.cjs` — Automated test suite verifying Inteckno business rules.
- `firestore.rules` & `firestore.indexes.json` — Production security rules and composite indexes.

### 6.3 Financial & Domain Calculation Engines
- `src/core/services/trmService.ts` — Official live TRM exchange rate calculation (28 importers).
- `src/core/services/taxService.ts` — Multi-country dynamic VAT/tax calculation.
- `src/core/services/projectFinancialEngine.ts` — EVM, CPI, SPI, EAC calculations.
- `src/core/config/intecknoDomainCatalog.ts` — 5-family WBS templates, normative catalogs (EN 1709, EN 12929, UNE EN 12927).
- `src/core/config/portfolioCatalog.ts` — Inteckno commercial catalog and portfolio lines.
- `src/core/services/moduleConfigService.ts` — Dynamic module configuration and dropdown catalog service.

### 6.4 AI & Operational Services
- `src/core/services/lucianaService.ts` — LUC-IA-NA intelligent assistant (WBS creation, CV parsing, executive summaries).
- `src/core/services/geminiChatService.ts` — Audio transcription, OCR, chat completions.
- `src/core/services/aiVisionExpenseService.ts` — Receipt photo OCR legalizations.
- `src/core/services/aiDocumentService.ts` — Technical PDF/document analyzer.
- `src/core/services/aiCalendarService.ts` — Calendar scheduling intelligence.
- `src/core/services/m365Sync.ts` — Microsoft 365 / Outlook calendar and email integration.
- `src/core/services/undoRedoService.ts` — Isolated user undo/redo transaction engine.
- `src/core/services/auditService.ts` — Traceability and audit logging.
- `src/core/services/hseqOfflineService.ts` — Offline SST/HSEQ inspection capture.

### 6.5 Mandatory UI Standards & Modals
- `src/components/common/CreatableSelect.tsx` — Universal dropdown selector with dynamic search and 'X' clear button (48 importers).
- `src/components/common/ConfirmDeleteModal.tsx` — Mandatory written confirmation requiring 'BORRAR' (24 importers).
- `src/components/common/UniversalModuleConfigModal.tsx` — Universal module configuration modal (19 importers).
- `src/components/common/DataGuardianBackupsModal.tsx` — Backup restore UI.
- `src/components/common/UndoRedoConfirmModal.tsx` — Undo/redo preview & confirm modal.
- `src/components/common/UserLoginAlertsModal.tsx` — Login notification and pending actions pop-up.
- `src/components/common/DetailModal.tsx` & `src/components/common/TemplateManagerModal.tsx`.
- `src/components/ui/LightTable.tsx` — Standard pixel-perfect data table.
- `src/components/ui/PastelMetricCard.tsx` & `src/components/ui/DarkActionCard.tsx`.
- `src/components/ui/SpotlightModal.tsx` — Command palette / global spotlight search.
- `src/components/ui/AiDocumentUploader.tsx` — AI document uploader.
- `src/components/ai/LucianaFloatingWidget.tsx` — Floating conversational AI widget.

### 6.6 All 20 Functional Modules in `src/modules/`
All 77 sub-components, drawers, and tabs inside `src/modules/` are active and must be preserved intact.

### 6.7 Data Types, Seeds, Scripts & Documentation
- `src/types/index.ts`, `src/types/ProjectSchema.ts`, `src/types/InventorySchema.ts`.
- `src/seed/intecknoData.ts`, `src/seed/officialSuppliersData.ts`.
- `database/README.md`, `database/schema_postgresql.sql` (PostgreSQL Dual-Stack architecture reference).
- `scripts/generate_pwa_icons.ps1` (PWA icon generator).
- `public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/inteckno-icon.png`, `public/manifest.json`, `public/sw.js`.

---

## 7. Recommended Safe Deletion Plan

For the subsequent implementation agent, the deletion of candidate files should follow this sequential phase to ensure 0 disruptions:

### Phase 1: Delete Standalone Orphan Root & Public Files
1. `users.json` (root)
2. `public/inteckno-logo.jpg`
3. `public/manifest.webmanifest`

### Phase 2: Delete Unreferenced Code Files in `src/`
4. `src/utils/rfqOptimizer.ts`
5. `src/modules/projects/types/ProjectSTCSchema.ts`
6. `src/core/registry/moduleRegistry.ts`
7. `src/components/ui/GanttChart.tsx`
8. `src/components/common/DocumentFlowBar.tsx`
9. `src/components/chat/RecordChatter.tsx`

### Phase 3: Remove Empty Directories
10. Remove `src/components/chat/`
11. Remove `src/core/registry/`
12. Remove `src/modules/projects/types/`
13. (Optional) Remove empty vendor subdirectories in `external_skills/`

### Phase 4: Verification & Compilation
- Run `npm run build` (`tsc -b && vite build`) to confirm 0 TypeScript errors and a clean build.
- Run `node verify_rules.cjs` to confirm 4/4 business rules pass.
