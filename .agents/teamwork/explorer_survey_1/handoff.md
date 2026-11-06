# Handoff Report: Explorer 1 — Orphan Files & Dead Code Survey

**Date:** 2026-11-06  
**Agent:** Explorer 1 (`teamwork_explorer`)  
**Parent Orchestrator:** `0d3fc292-4a95-4000-b905-f57f7d512468`  
**Working Directory:** `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_1`  
**Target Path of Full Survey:** `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_1\survey_orphans.md`  

---

## 1. Observation

1. **Repository & Build baseline:**
   - Ran `npm run build` (`tsc -b && vite build`) from project root:
     ```
     > inteckno-erp@1.0.0 build
     > tsc -b && vite build
     ✓ 2840 modules transformed.
     dist/index.html                     1.82 kB │ gzip:     0.75 kB
     dist/assets/index-JBAUDsov.css    179.13 kB │ gzip:    26.12 kB
     dist/assets/index-DHOUJ3vD.js   4,971.61 kB │ gzip: 1,232.98 kB
     ✓ built in 2.46s
     ```
   - Total source files in `src/`: 139 files.
   - Total active reachable files from entry points: 133 files.
   - Total unreachable files in `src/`: 6 files.

2. **Unreachable Code Files in `src/`:**
   - `src/components/chat/RecordChatter.tsx` (19,049 bytes, 479 lines): 0 incoming imports.
   - `src/components/common/DocumentFlowBar.tsx` (16,946 bytes, 369 lines): 0 incoming imports.
   - `src/components/ui/GanttChart.tsx` (18,955 bytes, 401 lines): 0 incoming imports.
   - `src/core/registry/moduleRegistry.ts` (1,731 bytes, 68 lines): 0 incoming imports.
   - `src/modules/projects/types/ProjectSTCSchema.ts` (7,871 bytes, 203 lines): 0 incoming imports.
   - `src/utils/rfqOptimizer.ts` (4,120 bytes, 111 lines): 0 incoming imports.

3. **Symbol & String Reference Audit:**
   - Evaluated regex word boundaries (`\b<symbol>\b`) across all 139 source files for every exported identifier in the 6 candidate files:
     - `RecordChatter`, `RecordChatterProps`: 0 occurrences outside file.
     - `DocumentFlowBar`, `DocumentFlowBarProps`: 0 occurrences outside file.
     - `GanttChart`, `GanttChartProps`: 0 occurrences outside file. (The only appearance of `GanttChart` was `GanttChartSquare` from `lucide-react` in `ProjectsModule.tsx:8`).
     - `moduleRegistry`, `ModuleRegistry`, `ModuleWidget`, `ModuleConfig`: 0 occurrences outside file.
     - `STCProjectType`, `PipingDynamicData`, `StructuresDynamicData`, `TanksDynamicData`, etc.: 0 occurrences outside file.
     - `groupRequisitionsForVolumePurchasing`, `detectPriceInflation`: 0 occurrences outside file.
   - Dynamic imports scan: 0 occurrences of `import(` or `require(` in the entire `src/` directory.

4. **Assets in `public/`:**
   - `public/inteckno-logo.jpg` (4,859 bytes): 0 references in `index.html`, `src/`, `scripts/`, `public/manifest.json`, `public/sw.js`.
   - `public/manifest.webmanifest` (807 bytes): 0 references; exact duplicate of `public/manifest.json` (which is the one referenced by `index.html:10` and cached by `public/sw.js:6`).

5. **Root Files & Empty Folders:**
   - `users.json` (13 bytes): Content is truncated `{"users": [\n`. 0 references in code, configs, or build scripts.
   - Three existing empty folders in `external_skills/`:
     - `external_skills\auditor-skill\vendor\trailofbits`
     - `external_skills\kevinpatrickrobbins-codebase-audit\skills\codebase-audit\codebase-audit-skill`
     - `external_skills\kevinpatrickrobbins-codebase-audit\skills\design-audit`
   - Three directories in `src/` will become empty when orphan files are deleted:
     - `src/components/chat/`
     - `src/core/registry/`
     - `src/modules/projects/types/`

---

## 2. Logic Chain

1. **Step 1 — Entry Point Identification:**
   `index.html` loads `src/main.tsx`, which renders `src/App.tsx`. `App.tsx` routes to 20 functional modules based on `activeModuleId` and wraps them in `AppShell.tsx`.
   *(Supported by Observation 1)*

2. **Step 2 — Reachability Graph:**
   Building a full dependency graph from `src/main.tsx`, `src/App.tsx`, `src/index.css`, and `src/vite-env.d.ts` traversed 133 files. Exactly 6 files in `src/` were not traversed.
   *(Supported by Observation 1 & 2)*

3. **Step 3 — Absence of Dynamic & String References:**
   Because Vite/Rollup allows dynamic string imports, all code files were searched for dynamic `import(...)` and symbol references. No dynamic imports exist, and all exported symbols from the 6 files have zero callers in the repository.
   *(Supported by Observation 3)*

4. **Step 4 — Domain & Architecture Verification:**
   - `TabWbsGantt.tsx` (2,049 lines) has fully superseded `src/components/ui/GanttChart.tsx` (401 lines).
   - `src/types/ProjectSchema.ts` (cable transport teleférico domain) has superseded the obsolete piping schema in `src/modules/projects/types/ProjectSTCSchema.ts`.
   - `src/core/auth/rbac.ts` and `src/core/services/moduleConfigService.ts` manage all modules and catalogs; `src/core/registry/moduleRegistry.ts` was an unintegrated prototype.
   - Per-record chatter was bypassed in favor of `ConversacionesModule.tsx` and `LucianaFloatingWidget.tsx`.
   *(Supported by Observation 2, 3)*

5. **Step 5 — Safe Deletion Consequence:**
   Deleting the 6 files in `src/`, the 2 unreferenced assets in `public/`, and `users.json` will not break any module, component, type definition, or runtime path, reclaiming ~76.6 KB of dead code and redundant assets.
   *(Supported by Observation 1, 2, 4, 5)*

---

## 3. Caveats

1. **Dual Lockfiles:** Both `package-lock.json` and `pnpm-lock.yaml` are present in the repository root. `package.json` scripts and `deploy.bat` use `npm`. `pnpm-lock.yaml` is harmless and not deleted in this pass, but could be consolidated if the team standardizes on npm.
2. **`external_skills/` directory:** Contains third-party security and audit skills (27 MB, 767 items) listed in `.gitignore`. It contains 3 empty subdirectories. We recommend deleting the empty directories; whether to keep `external_skills/` entirely depends on user preference, but it does not affect `npm run build` or Vite bundle size.
3. **Database Artifacts:** `database/README.md` and `database/schema_postgresql.sql` are not imported by the frontend TypeScript build, but they are essential architectural documentation for the planned PostgreSQL migration. They **must not** be deleted.

---

## 4. Conclusion

A total of **9 orphan/dead files** and **3 future-empty directories** have been conclusively identified as safe for immediate deletion:

### Files Recommended for Deletion (Total: 9 files, 76,571 bytes):
1. `users.json` (13 bytes)
2. `public/inteckno-logo.jpg` (4,859 bytes)
3. `public/manifest.webmanifest` (807 bytes)
4. `src/utils/rfqOptimizer.ts` (4,120 bytes)
5. `src/modules/projects/types/ProjectSTCSchema.ts` (7,871 bytes)
6. `src/core/registry/moduleRegistry.ts` (1,731 bytes)
7. `src/components/ui/GanttChart.tsx` (18,955 bytes)
8. `src/components/common/DocumentFlowBar.tsx` (16,946 bytes)
9. `src/components/chat/RecordChatter.tsx` (19,049 bytes)

### Directories to Prune Post-Deletion:
1. `src/components/chat/`
2. `src/core/registry/`
3. `src/modules/projects/types/`
4. (Optional) 3 empty directories in `external_skills/`

All other 133 files in `src/` (including all 20 modules, core stores, services, RBAC, domain catalogs, and shared UI components) are active, critical, and must be preserved intact.

---

## 5. Verification Method

To independently verify these findings:
1. **Re-run the reachability script:**
   Run `node C:\Users\david\.gemini\antigravity\scratch\survey_analyzer.cjs` to observe that exactly the 6 files in `src/` have 0 imports.
2. **Symbol presence check:**
   Run ripgrep or node text search across `src/` for `RecordChatter`, `DocumentFlowBar`, `\bGanttChart\b`, `moduleRegistry`, `ProjectSTCSchema`, `rfqOptimizer` — confirming 0 references outside their own declarations.
3. **Build verification command:**
   After any deletion of these files, run:
   ```bash
   npm run build
   node verify_rules.cjs
   ```
   Expected result: 0 TypeScript errors, successful Vite production build, and all 4/4 business rules pass.
4. **Invalidation condition:**
   If any file in `src/` imports any of the 6 files or symbols listed above, this conclusion would be invalidated. (Verified: zero callers exist).
