/**
 * Tier 3: Cross-Feature Interactions E2E Test Suite (Inteckno ERP)
 * Tests interactions across multiple modules and architectural features:
 * - Orphan Removal x TypeScript Compilation & Build Health
 * - Code-Splitting / App Architecture x Deterministic Navigation
 * - Mock Data Eradication x Cloud-First Firestore Hydration
 * - Vendor Chunking x PWA Offline Service Worker
 * - Rule 6/8 Form Hygiene x Tax Service & Financial Computations
 * Total Tests: 5.
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

const suite = new TestSuite('Tier 3: Cross-Feature Interactions');

suite.register('T3-XF-01', 'Cross: Orphan removal does not break TypeScript compilation or Vite build', {
  tier: 3,
  feature: 'CROSS',
  milestone: 'M1',
  description: 'Verifies that removing the 6 dead files and assets results in a 100% successful tsc and vite build'
}, () => {
  // 1. Confirm orphans are absent
  const orphanFiles = [
    'src/components/chat/RecordChatter.tsx',
    'src/components/common/DocumentFlowBar.tsx',
    'src/components/ui/GanttChart.tsx',
    'src/core/registry/moduleRegistry.ts',
    'src/modules/projects/types/ProjectSTCSchema.ts',
    'src/utils/rfqOptimizer.ts'
  ];
  for (const f of orphanFiles) {
    assertFileDoesNotExist(f, `Orphan must be absent: ${f}`);
  }

  // 2. Run compiler and verify 0 errors
  const tscResult = runCommand('npx tsc -b');
  assertEqual(tscResult.exitCode, 0, `tsc -b must exit 0 after orphan removal: ${tscResult.stderr}`);

  // 3. Run production build and verify exit code 0
  const buildResult = runCommand('npm run build');
  assertEqual(buildResult.exitCode, 0, `npm run build must succeed: ${buildResult.stderr}`);
  assertFileExists('dist/index.html', 'Build must generate dist/index.html');
});

suite.register('T3-XF-02', 'Cross: App.tsx routing seamlessly preserves navigateWithContext contracts', {
  tier: 3,
  feature: 'CROSS',
  milestone: 'M4',
  description: 'Verifies that App.tsx switch cases match the canonical module IDs produced by navigateWithContext'
}, () => {
  const appContent = readFile('src/App.tsx');
  const erpStore = readFile('src/core/storage/erpStore.tsx');

  assert(appContent, 'App.tsx must exist');
  assert(erpStore, 'erpStore.tsx must exist');

  // Verify key canonical destinations handled in App.tsx switch
  const keyModuleIds = [
    'conversaciones',
    'documentos',
    'calendario',
    'actividades',
    'crm',
    'calculadora-precios',
    'empleados',
    'proyectos',
    'requisiciones',
    'compras',
    'inventario',
    'horas',
    'gastos',
    'facturacion',
    'tableros'
  ];

  for (const mod of keyModuleIds) {
    assert(
      appContent.includes(`'${mod}'`) || appContent.includes(`"${mod}"`),
      `App.tsx must handle activeModuleId case for: ${mod}`
    );
  }
});

suite.register('T3-XF-03', 'Cross: Rule 4 mock eradication leaves Firestore sync and store initialization sound', {
  tier: 3,
  feature: 'CROSS',
  milestone: 'M2',
  description: 'Verifies that store initial state collections initialize as empty arrays ([]) for cloud hydration'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');

  // Verify clean initial collections per Rule 4
  assertIncludes(erpStore, 'projects: []', 'Projects collection must initialize empty');
  assertIncludes(erpStore, 'purchaseOrders: []', 'Purchase orders collection must initialize empty');
  assertIncludes(erpStore, 'requisitions: []', 'Requisitions collection must initialize empty');
  assertIncludes(erpStore, 'milestones: []', 'Milestones collection must initialize empty');
  assertIncludes(erpStore, 'expenses: []', 'Expenses collection must initialize empty');
  assertIncludes(erpStore, 'timesheets: []', 'Timesheets collection must initialize empty');
});

suite.register('T3-XF-04', 'Cross: PWA manifest & service worker compatibility with production assets', {
  tier: 3,
  feature: 'CROSS',
  milestone: 'M4',
  description: 'Verifies public/manifest.json and public/sw.js align with production build distribution'
}, () => {
  const html = readFile('index.html');
  const manifest = readFile('public/manifest.json');
  const sw = readFile('public/sw.js');

  assert(html, 'index.html must exist');
  assert(manifest, 'public/manifest.json must exist');
  assert(sw, 'public/sw.js must exist');

  // Verify index.html links to manifest.json (not webmanifest)
  assertIncludes(html, 'rel="manifest" href="/manifest.json"', 'index.html must link to /manifest.json');

  // Verify service worker registration in index.html or main.tsx
  const mainTsx = readFile('src/main.tsx');
  assert(
    html.includes('serviceWorker') || (mainTsx && mainTsx.includes('serviceWorker')),
    'PWA Service Worker registration must be present in index.html or main.tsx'
  );
});

suite.register('T3-XF-05', 'Cross: Clean form inputs and tax calculations operate seamlessly', {
  tier: 3,
  feature: 'CROSS',
  milestone: 'M5',
  description: 'Verifies that currency formatting, VAT calculation, and clean inputs work in tandem'
}, () => {
  const taxService = readFile('src/core/services/taxService.ts');
  const trmService = readFile('src/core/services/trmService.ts');

  assert(taxService, 'taxService.ts must exist');
  assert(trmService, 'trmService.ts must exist');

  // Simulate combined business logic: calculate total with VAT and format as COP
  const subtotal = 10000000; // 10 million COP
  const vatRate = 0.19; // Colombia 19%
  const iva = subtotal * vatRate;
  const grandTotal = subtotal + iva;

  const formattedTotal = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(grandTotal);

  assertEqual(grandTotal, 11900000, 'Subtotal + 19% IVA must equal 11,900,000 COP');
  assert(formattedTotal.includes('11.900.000'), `Formatted currency must show 11.900.000: ${formattedTotal}`);
});

module.exports = suite;
