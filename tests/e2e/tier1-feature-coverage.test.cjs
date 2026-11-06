/**
 * Tier 1: Feature Coverage E2E Test Suite (Inteckno ERP)
 * Covers primary behavior and positive contracts for all 5 project features.
 * Total Tests: 25 (5 tests per feature).
 */

const {
  PROJECT_ROOT,
  fileExists,
  dirExists,
  readFile,
  listFiles,
  searchInFiles,
  extractImports,
  runCommand,
  assert,
  assertEqual,
  assertIncludes,
  assertMatch,
  assertFileExists,
  assertFileDoesNotExist,
  assertDirDoesNotExist,
  TestSuite
} = require('./helpers/test-utils.cjs');

const suite = new TestSuite('Tier 1: Feature Coverage');

// =========================================================================
// FEATURE 1: Orphan Files, Components & Empty Folders Removal (5 Tests)
// =========================================================================

suite.register('T1-F1-01', 'Absence of 6 orphan source files in src/', {
  tier: 1,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies that RecordChatter, DocumentFlowBar, GanttChart, moduleRegistry, ProjectSTCSchema, and rfqOptimizer are removed'
}, () => {
  const orphanFiles = [
    'src/components/chat/RecordChatter.tsx',
    'src/components/common/DocumentFlowBar.tsx',
    'src/components/ui/GanttChart.tsx',
    'src/core/registry/moduleRegistry.ts',
    'src/modules/projects/types/ProjectSTCSchema.ts',
    'src/utils/rfqOptimizer.ts'
  ];

  for (const file of orphanFiles) {
    assertFileDoesNotExist(file, `Orphan file must be deleted: ${file}`);
  }
});

suite.register('T1-F1-02', 'Absence of 2 unreferenced assets in public/', {
  tier: 1,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies that public/inteckno-logo.jpg and public/manifest.webmanifest duplicate are removed'
}, () => {
  assertFileDoesNotExist('public/inteckno-logo.jpg', 'Unreferenced jpg asset must be deleted');
  assertFileDoesNotExist('public/manifest.webmanifest', 'Duplicate webmanifest must be deleted in favor of manifest.json');
  assertFileExists('public/manifest.json', 'Canonical public/manifest.json must be preserved');
});

suite.register('T1-F1-03', 'Absence of corrupted users.json in project root', {
  tier: 1,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies that truncated 13-byte users.json is removed from repository root'
}, () => {
  assertFileDoesNotExist('users.json', 'Corrupted users.json must be deleted');
});

suite.register('T1-F1-04', 'Absence of 3 pruned empty directories', {
  tier: 1,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies that empty directories in components/chat, core/registry, and projects/types are pruned'
}, () => {
  assertDirDoesNotExist('src/components/chat', 'Empty directory src/components/chat/ must be pruned');
  assertDirDoesNotExist('src/core/registry', 'Empty directory src/core/registry/ must be pruned');
  assertDirDoesNotExist('src/modules/projects/types', 'Empty directory src/modules/projects/types/ must be pruned');
});

suite.register('T1-F1-05', 'Presence and reachability of all 20 business modules', {
  tier: 1,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies that all 20 active business modules and entry points are present and non-empty'
}, () => {
  const essentialFiles = [
    'src/main.tsx',
    'src/App.tsx',
    'src/components/layout/AppShell.tsx',
    'src/core/storage/erpStore.tsx',
    'src/modules/commercial/CrmModule.tsx',
    'src/modules/projects/ProjectsModule.tsx',
    'src/modules/procurement/ProcurementModule.tsx',
    'src/modules/inventory/InventoryModule.tsx',
    'src/modules/requisitions/RequisitionsModule.tsx',
    'src/modules/billing/BillingModule.tsx',
    'src/modules/expenses/ExpensesModule.tsx',
    'src/modules/timesheet/TimesheetModule.tsx',
    'src/modules/hr/TalentoHumanoModule.tsx',
    'src/modules/operations/OperacionesAvanzadasModule.tsx',
    'src/modules/dashboard/DashboardModule.tsx',
    'src/modules/international/InternationalModule.tsx',
    'src/modules/inteckno/ConversacionesModule.tsx',
    'src/modules/inteckno/DocumentosModule.tsx',
    'src/modules/inteckno/CalendarioModule.tsx',
    'src/modules/inteckno/ActividadesModule.tsx',
    'src/modules/inteckno/ArticulosModule.tsx',
    'src/modules/inteckno/UserProfileModule.tsx',
    'src/modules/inteckno/UserManagementModule.tsx',
    'src/modules/inteckno/CargosModule.tsx'
  ];

  for (const file of essentialFiles) {
    assertFileExists(file, `Essential ERP file must exist: ${file}`);
    const content = readFile(file);
    assert(content && content.length > 50, `File must contain substantial code: ${file}`);
  }
});

// =========================================================================
// FEATURE 2: Dead Code, Unused Imports & Rule 4 / Rule 6 (5 Tests)
// =========================================================================

suite.register('T1-F2-01', 'Unused dependencies (clsx, tailwind-merge, scheduler) have 0 imports in src/', {
  tier: 1,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies that clsx, tailwind-merge, and scheduler are never imported in any source file'
}, () => {
  const srcFiles = listFiles('src');
  const clsxMatches = searchInFiles("from 'clsx'", srcFiles);
  const tmMatches = searchInFiles("from 'tailwind-merge'", srcFiles);
  const schedMatches = searchInFiles("from 'scheduler'", srcFiles);

  assertEqual(clsxMatches.length, 0, 'clsx must have 0 imports in src/');
  assertEqual(tmMatches.length, 0, 'tailwind-merge must have 0 imports in src/');
  assertEqual(schedMatches.length, 0, 'scheduler must have 0 imports in src/');
});

suite.register('T1-F2-02', 'Essential dependencies preservation in package.json', {
  tier: 1,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies that essential runtime dependencies are declared in package.json'
}, () => {
  const pkgContent = readFile('package.json');
  assert(pkgContent, 'package.json must be readable');
  const pkg = JSON.parse(pkgContent);

  const expectedDeps = [
    'react',
    'react-dom',
    'firebase',
    'lucide-react',
    'recharts',
    'xlsx',
    '@zxing/browser',
    '@zxing/library'
  ];

  for (const dep of expectedDeps) {
    assert(
      (pkg.dependencies && pkg.dependencies[dep]) || (pkg.devDependencies && pkg.devDependencies[dep]),
      `Essential package dependency must be present: ${dep}`
    );
  }
});

suite.register('T1-F2-03', 'Rule 4 compliance: SAMPLE_RECEIPTS isolation / absence', {
  tier: 1,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies that SAMPLE_RECEIPTS mock data is not imported or consumed by active business modules'
}, () => {
  const srcFiles = listFiles('src').filter(f => !f.includes('aiVisionExpenseService.ts'));
  const matches = searchInFiles('SAMPLE_RECEIPTS', srcFiles);
  assertEqual(matches.length, 0, 'SAMPLE_RECEIPTS must have 0 consumers across all active modules');
});

suite.register('T1-F2-04', 'Rule 6 compliance: Dropdown standard and clearable select audit', {
  tier: 1,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies dropdown standard compliance. In strict mode asserts 0 instances of isClearable={false}'
}, ({ strictMode }) => {
  const srcFiles = listFiles('src');
  const matches = searchInFiles('isClearable={false}', srcFiles);
  if (strictMode) {
    assertEqual(matches.length, 0, 'Rule 6 violation: isClearable={false} is strictly prohibited in all dropdowns');
  } else {
    // Progressive baseline check: verify matches are tracked and isolated to known candidate
    assert(matches.length <= 1, 'isClearable={false} occurrences must be strictly isolated (<= 1 before M2 cleanup)');
  }
});

suite.register('T1-F2-05', 'Rule 12 & 15: Canonical currency formatting export formatCOP', {
  tier: 1,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies formatCOP is exported from trmService.ts and produces valid Colombian currency format'
}, () => {
  const trmServiceContent = readFile('src/core/services/trmService.ts');
  assert(trmServiceContent, 'trmService.ts must exist');
  assertIncludes(trmServiceContent, 'export function formatCOP', 'formatCOP must be exported');
  assertIncludes(trmServiceContent, "'es-CO'", 'formatCOP must use Colombian locale es-CO');
  assertIncludes(trmServiceContent, "'COP'", 'formatCOP must use COP currency');
});

// =========================================================================
// FEATURE 3: Performance, Code-Splitting & Bundle Chunking (5 Tests)
// =========================================================================

suite.register('T1-F3-01', 'Vite configuration syntax and plugins validation', {
  tier: 1,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies vite.config.ts configures React and Tailwind plugins correctly'
}, () => {
  const viteConfig = readFile('vite.config.ts');
  assert(viteConfig, 'vite.config.ts must be readable');
  assertIncludes(viteConfig, 'defineConfig', 'Must use Vite defineConfig');
  assertIncludes(viteConfig, '@vitejs/plugin-react', 'Must import Vite React plugin');
  assertIncludes(viteConfig, '@tailwindcss/vite', 'Must import Tailwind Vite plugin');
});

suite.register('T1-F3-02', 'Heavyweight dependency xlsx confined to inventory upload', {
  tier: 1,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies xlsx is imported only in inventory upload component, preventing bundle pollution'
}, () => {
  const srcFiles = listFiles('src');
  const xlsxMatches = searchInFiles("from 'xlsx'", srcFiles);
  for (const m of xlsxMatches) {
    assert(
      m.file.includes('InventoryExcelUploadModal.tsx') || m.file.includes('inventory'),
      `xlsx must only be imported in inventory upload components: found in ${m.file}`
    );
  }
});

suite.register('T1-F3-03', 'App.tsx route structure and AppShell rendering', {
  tier: 1,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies App.tsx renders the main shell with ErpProvider and authentication guarding'
}, () => {
  const appContent = readFile('src/App.tsx');
  assert(appContent, 'src/App.tsx must exist');
  assertIncludes(appContent, 'AppShell', 'App.tsx must render AppShell component');
  assertIncludes(appContent, 'useErp', 'App.tsx must use central ERP store');
  assertIncludes(appContent, 'LoginView', 'App.tsx must handle unauthenticated state with LoginView');
});

suite.register('T1-F3-04', 'Production build execution completes with exit code 0', {
  tier: 1,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies npm run build executes successfully and produces dist assets'
}, () => {
  const result = runCommand('npm run build');
  assertEqual(result.exitCode, 0, `Build command must exit with 0. Stderr: ${result.stderr}`);
  assertFileExists('dist/index.html', 'Production build must generate dist/index.html');
});

suite.register('T1-F3-05', 'Production dist artifact structure and HTML integrity', {
  tier: 1,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies dist/index.html contains expected viewport, scripts, and CSS assets'
}, () => {
  const html = readFile('dist/index.html');
  assert(html, 'dist/index.html must exist and have content');
  assertIncludes(html, '<!doctype html>', 'Must have valid HTML doctype');
  assertIncludes(html, '<meta name="viewport"', 'Must have responsive viewport meta');
  assertIncludes(html, 'assets/', 'Must link to compiled bundle assets');
});

// =========================================================================
// FEATURE 4: Autopista de Información, Firestore Sync & Navigation (5 Tests)
// =========================================================================

suite.register('T1-F4-01', 'navigateWithContext contract signature in erpStore.tsx', {
  tier: 1,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies navigateWithContext accepts targetModule, action, and optional data'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');
  assertMatch(
    erpStore,
    /navigateWithContext\s*=\s*useCallback\(\s*\(\s*targetModule:\s*string,\s*action:\s*string,\s*data\?:/m,
    'navigateWithContext must conform to standard signature'
  );
  assertIncludes(erpStore, 'timestamp: Date.now()', 'Navigation context must record freshness timestamp');
});

suite.register('T1-F4-02', 'CANONICAL_MODULE_MAP coverage for all core business aliases', {
  tier: 1,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies CANONICAL_MODULE_MAP routes aliases (solped, requisiciones, gastos, proyectos, etc.)'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');

  const requiredMappings = [
    "solped: 'requisiciones'",
    "requisiciones: 'requisiciones'",
    "gastos: 'gastos'",
    "viaticos: 'gastos'",
    "empleados: 'empleados'",
    "chat: 'conversaciones'",
    "conversaciones: 'conversaciones'"
  ];

  for (const mapping of requiredMappings) {
    assertIncludes(erpStore, mapping, `CANONICAL_MODULE_MAP must contain mapping: ${mapping}`);
  }
});

suite.register('T1-F4-03', 'Return highway in PurchaseOrderDetailDrawer to Project Costs', {
  tier: 1,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies PurchaseOrderDetailDrawer contains return button back to Project Cost Matrix'
}, () => {
  const drawerContent = readFile('src/modules/procurement/components/PurchaseOrderDetailDrawer.tsx');
  assert(drawerContent, 'PurchaseOrderDetailDrawer.tsx must exist');
  assertIncludes(drawerContent, 'navigateWithContext', 'Must use navigateWithContext for closed-loop return');
  assertIncludes(drawerContent, "'proyectos'", 'Target module must be proyectos');
  assertIncludes(drawerContent, "'costs'", 'Target tab must be costs');
});

suite.register('T1-F4-04', 'Return highways in Timesheet, Expenses, and Billing modules', {
  tier: 1,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies Timesheet, Expenses, and Billing modules provide return links to project tabs'
}, () => {
  const timesheet = readFile('src/modules/timesheet/TimesheetModule.tsx');
  const expenses = readFile('src/modules/expenses/ExpensesModule.tsx');
  const billing = readFile('src/modules/billing/BillingModule.tsx');

  assert(timesheet, 'TimesheetModule.tsx must exist');
  assert(expenses, 'ExpensesModule.tsx must exist');
  assert(billing, 'BillingModule.tsx must exist');

  assertIncludes(timesheet, "navigateWithContext('proyectos'", 'Timesheet must support return highway to proyectos');
  assertIncludes(expenses, "navigateWithContext('proyectos'", 'Expenses must support return highway to proyectos');
  assertIncludes(billing, "navigateWithContext('proyectos'", 'Billing must support return highway to proyectos');
});

suite.register('T1-F4-05', 'Firestore 10 reactive onSnapshot listeners in erpStore.tsx', {
  tier: 1,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies erpStore.tsx establishes 10 real-time Firestore listeners'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');

  const requiredListeners = [
    'subscribeToCloudUsers',
    'subscribeToCloudChatMessages',
    "subscribeToCloudModule('projects'",
    "subscribeToCloudModule('procurement'",
    'subscribeToCloudInventory',
    'subscribeToCloudKardex',
    "subscribeToCloudModule('hr'",
    "subscribeToCloudModule('operations'",
    "subscribeToCloudModule('commercial'",
    "subscribeToCloudModule('productivity'"
  ];

  for (const listener of requiredListeners) {
    assertIncludes(erpStore, listener, `erpStore must register listener: ${listener}`);
  }
});

// =========================================================================
// FEATURE 5: TypeScript Health & Production Build Verification (5 Tests)
// =========================================================================

suite.register('T1-F5-01', 'TypeScript config integrity (tsconfig.json & tsconfig.app.json)', {
  tier: 1,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies tsconfig.json and tsconfig.app.json exist with valid JSON and compilerOptions'
}, () => {
  const tsconfig = readFile('tsconfig.json');
  const tsconfigApp = readFile('tsconfig.app.json');

  assert(tsconfig, 'tsconfig.json must exist');
  assert(tsconfigApp, 'tsconfig.app.json must exist');

  const parsedRoot = JSON.parse(tsconfig);
  const parsedApp = JSON.parse(tsconfigApp);

  assert(parsedRoot.references, 'tsconfig.json must have project references');
  assert(parsedApp.compilerOptions, 'tsconfig.app.json must specify compilerOptions');
  assertEqual(parsedApp.compilerOptions.noEmit, true, 'noEmit must be true in tsconfig.app.json');
});

suite.register('T1-F5-02', 'TypeScript compiler execution (tsc -b) exits with code 0', {
  tier: 1,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies tsc -b completes with 0 type errors'
}, () => {
  const result = runCommand('npx tsc -b');
  assertEqual(result.exitCode, 0, `TypeScript compiler tsc -b failed: ${result.stdout} ${result.stderr}`);
});

suite.register('T1-F5-03', 'Inteckno business rules execution (node verify_rules.cjs) passes 4/4', {
  tier: 1,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies verify_rules.cjs passes supplier homologation, GM USD 2000 threshold, HSEQ gate, and 48h countdown'
}, () => {
  assertFileExists('verify_rules.cjs', 'verify_rules.cjs must exist in project root');
  const result = runCommand('node verify_rules.cjs');
  assertEqual(result.exitCode, 0, `verify_rules.cjs failed: ${result.stderr}`);
  assertIncludes(result.stdout, '¡TODAS LAS PRUEBAS DE REGLAS DE NEGOCIO PASARON (4/4)!', 'All 4 business rules must pass');
});

suite.register('T1-F5-04', 'SF Pro font family enforced in src/index.css', {
  tier: 1,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies index.css enforces SF Pro Display / SF Pro Text typography globally with !important'
}, () => {
  const css = readFile('src/index.css');
  assert(css, 'src/index.css must exist');
  assertIncludes(css, 'SF Pro Display', 'Must enforce SF Pro Display font');
  assertIncludes(css, 'SF Pro Text', 'Must enforce SF Pro Text font');
  assertIncludes(css, '!important', 'Must enforce typography with !important per Rule 15');
});

suite.register('T1-F5-05', 'Tax rate calculation service (taxService.ts) returns correct VAT rates', {
  tier: 1,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies getProjectTaxRate provides correct country tax rates per Rule 8'
}, () => {
  const taxServiceContent = readFile('src/core/services/taxService.ts');
  assert(taxServiceContent, 'taxService.ts must exist');

  assertIncludes(taxServiceContent, "['colombia', 0.19, 'Colombia']", 'Colombia tax rate must be 19%');
  assertIncludes(taxServiceContent, "['mexico', 0.16, 'México']", 'Mexico tax rate must be 16%');
  assertIncludes(taxServiceContent, "['chile', 0.19, 'Chile']", 'Chile tax rate must be 19%');
  assertIncludes(taxServiceContent, "['peru', 0.18, 'Perú']", 'Peru tax rate must be 18%');
});

module.exports = suite;
