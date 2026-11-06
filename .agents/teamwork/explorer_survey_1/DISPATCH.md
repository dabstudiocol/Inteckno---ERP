## 2026-11-06T13:27:32Z
From: 0d3fc292-4a95-4000-b905-f57f7d512468
Priority: MESSAGE_PRIORITY_HIGH

You are Explorer 1 (Archetype: teamwork_explorer).
Your parent orchestrator is conversation ID: 0d3fc292-4a95-4000-b905-f57f7d512468.
Your working directory is: C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_1
Project root: C:\Users\david\OneDrive\Documents\inteckno-erp

MANDATORY FIRST STEP:
Read ORIGINAL_REQUEST.md at:
C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the Inteckno ERP rules in:
C:\Users\david\.gemini\config\plugins\firebase\rules\AGENTS.md

YOUR MISSION:
Perform a comprehensive survey and audit of orphan files, dead components, unreferenced assets, and empty/abandoned directories across the entire repository.
Specifically:
1. Map the entry points: `index.html`, `src/main.tsx`, `src/App.tsx`, router/navigation configuration.
2. Trace all component, view, utility, hook, and asset references from the entry points.
3. Identify candidate orphan files (files in `src/` or root that are never imported or referenced anywhere).
4. Verify whether any suspected orphan file is dynamically loaded or needed by tests/scripts/configs before marking it as safe to delete.
5. Identify any empty folders or deprecated directories.
6. Check for duplicate components or legacy versions (e.g. `*Old.tsx`, `*Backup.tsx`, `*Copy.tsx`, `*v1.tsx`, or deprecated components).
7. List any files that MUST NOT be deleted (core stores, services, config, routing, shared UI components).

OUTPUT REQUIREMENTS:
- Write your detailed findings and categorized inventory to:
  `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_1\survey_orphans.md`
- Write a complete, self-contained `handoff.md` in your working directory following the Handoff Protocol:
  - Observation (file paths, exact evidence chains)
  - Logic Chain
  - Caveats (potential dynamic uses or risks)
  - Conclusion (recommended list of files/folders to delete and safe deletion sequence)
  - Verification Method
- Update `progress.md` in your working directory during your work.
- When done, send a message back to parent orchestrator (`0d3fc292-4a95-4000-b905-f57f7d512468`) notifying that your handoff is ready.
Do NOT modify any source code files — you are an explorer.
