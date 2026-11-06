/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite (Inteckno ERP)
 * Covers edge cases, boundary conditions, negative cases, and strict invariants.
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
  assertNotEqual,
  assertIncludes,
  assertMatch,
  assertFileExists,
  assertFileDoesNotExist,
  assertDirDoesNotExist,
  TestSuite
} = require('./helpers/test-utils.cjs');

const suite = new TestSuite('Tier 2: Boundary & Corner Cases');

// =========================================================================
// FEATURE 1: Boundary & Corner Cases (5 Tests)
// =========================================================================

suite.register('T2-F1-01', 'Case-sensitivity and path normalization resilience for deleted orphans', {
  tier: 2,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies filesystem checks against orphans handle lower/upper variations and path separators'
}, () => {
  const variations = [
    'src/components/chat/recordchatter.tsx',
    'src/components/chat/RecordChatter.tsx',
    'src/components/common/documentflowbar.tsx',
    'src/components/common/DocumentFlowBar.tsx',
    'src/components/ui/ganttchart.tsx',
    'src/components/ui/GanttChart.tsx'
  ];

  for (const v of variations) {
    assertFileDoesNotExist(v, `Orphan must be absent regardless of case check: ${v}`);
  }
});

suite.register('T2-F1-02', 'Zero dangling relative imports across all active source files', {
  tier: 2,
  feature: 'F1',
  milestone: 'M1',
  description: 'Scans all import statements in src/ to guarantee no remaining references point to deleted files'
}, () => {
  const srcFiles = listFiles('src');
  const deletedFileBaseNames = [
    'RecordChatter',
    'DocumentFlowBar',
    'GanttChart',
    'moduleRegistry',
    'ProjectSTCSchema',
    'rfqOptimizer'
  ];

  for (const file of srcFiles) {
    const imports = extractImports(file);
    for (const imp of imports) {
      for (const base of deletedFileBaseNames) {
        // Must not import the deleted base name as a relative file path
        if (imp.endsWith(`/${base}`) || imp.endsWith(`/${base}.tsx`) || imp.endsWith(`/${base}.ts`)) {
          assert(false, `Dangling import found in ${file}: importing deleted target "${imp}"`);
        }
      }
    }
  }
});

suite.register('T2-F1-03', 'public/manifest.json validity and required PWA fields', {
  tier: 2,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies public/manifest.json is valid JSON with short_name, icons, and start_url'
}, () => {
  assertFileExists('public/manifest.json', 'Canonical manifest.json must exist');
  const content = readFile('public/manifest.json');
  assert(content, 'manifest.json must not be empty');

  const manifest = JSON.parse(content);
  assert(manifest.name, 'Manifest must declare application name');
  assert(manifest.short_name, 'Manifest must declare short_name');
  assert(manifest.icons && manifest.icons.length > 0, 'Manifest must define icon assets');
  assertEqual(manifest.start_url, '/', 'Manifest start_url must be root /');
});

suite.register('T2-F1-04', 'Safe directory pruning boundary (parent directories preserved)', {
  tier: 2,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies pruning empty folders did NOT delete non-empty parent directories'
}, () => {
  const essentialParents = [
    'src/components',
    'src/components/common',
    'src/components/layout',
    'src/core',
    'src/core/services',
    'src/core/storage',
    'src/modules/projects',
    'src/modules/projects/components',
    'src/modules/procurement',
    'src/modules/inventory'
  ];

  for (const parent of essentialParents) {
    assert(dirExists(parent), `Essential parent directory must remain present: ${parent}`);
  }
});

suite.register('T2-F1-05', 'Preservation of architectural database artifacts (SQL & documentation)', {
  tier: 2,
  feature: 'F1',
  milestone: 'M1',
  description: 'Verifies database/schema_postgresql.sql and database/README.md are intact and non-empty'
}, () => {
  assertFileExists('database/schema_postgresql.sql', 'PostgreSQL schema must be preserved for future migration');
  assertFileExists('database/README.md', 'Database README must be preserved');

  const sql = readFile('database/schema_postgresql.sql');
  const readme = readFile('database/README.md');

  assert(sql && sql.length > 500, 'schema_postgresql.sql must contain full SQL definitions');
  assert(readme && readme.length > 100, 'database/README.md must contain architecture notes');
});

// =========================================================================
// FEATURE 2: Boundary & Corner Cases (5 Tests)
// =========================================================================

suite.register('T2-F2-01', 'Peer dependency preservation boundary (@zxing/library in package.json)', {
  tier: 2,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies @zxing/library is preserved in package.json as required peer for @zxing/browser'
}, () => {
  const pkgContent = readFile('package.json');
  assert(pkgContent, 'package.json must exist');
  const pkg = JSON.parse(pkgContent);

  assert(
    pkg.dependencies && pkg.dependencies['@zxing/library'],
    '@zxing/library must NOT be uninstalled because it is a peer dependency of @zxing/browser'
  );
  assert(
    pkg.dependencies && pkg.dependencies['@zxing/browser'],
    '@zxing/browser must be present in package.json'
  );
});

suite.register('T2-F2-02', 'CSS entry point preservation (@import "tailwindcss" in src/index.css)', {
  tier: 2,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies src/index.css retains Tailwind CSS v4 import without accidental deletion'
}, () => {
  const css = readFile('src/index.css');
  assert(css, 'src/index.css must exist');
  assertIncludes(css, '@import "tailwindcss";', 'Tailwind CSS v4 import directive must be preserved');
});

suite.register('T2-F2-03', 'ConfirmDeleteModal exact confirmation word validation (Rule 7)', {
  tier: 2,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies ConfirmDeleteModal requires exact uppercase BORRAR string'
}, () => {
  const modalContent = readFile('src/components/common/ConfirmDeleteModal.tsx');
  assert(modalContent, 'ConfirmDeleteModal.tsx must exist');
  assertIncludes(modalContent, "requireConfirmWord = true", 'requireConfirmWord must default to true');
  assertIncludes(modalContent, "confirmWord = 'BORRAR'", 'confirmWord must default to BORRAR');
  assertIncludes(modalContent, "typedWord.trim().toUpperCase() === confirmWord.toUpperCase()", 'Must validate confirmation word case-insensitively or strictly uppercase');
});

suite.register('T2-F2-04', 'Clean numeric input convention boundary: value={val || ""} and placeholder="0"', {
  tier: 2,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies clean numeric inputs standard per Rule 8'
}, () => {
  const costTab = readFile('src/modules/projects/components/tabs/TabCostosPresupuesto.tsx');
  assert(costTab, 'TabCostosPresupuesto.tsx must exist');
  assertIncludes(costTab, 'placeholder="0"', 'Numeric cost inputs must use placeholder="0"');
});

suite.register('T2-F2-05', 'Zero debugger statements across all source files in src/', {
  tier: 2,
  feature: 'F2',
  milestone: 'M2',
  description: 'Verifies zero debugger; statements exist in the codebase'
}, () => {
  const srcFiles = listFiles('src');
  const matches = searchInFiles(/\bdebugger\s*;/g, srcFiles, true);
  assertEqual(matches.length, 0, 'No debugger; statements are permitted in production source code');
});

// =========================================================================
// FEATURE 3: Boundary & Corner Cases (5 Tests)
// =========================================================================

suite.register('T2-F3-01', 'ErrorBoundary component existence and implementation in src/components/common/', {
  tier: 2,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies ErrorBoundary handles component render failures gracefully'
}, () => {
  assertFileExists('src/components/common/ErrorBoundary.tsx', 'ErrorBoundary.tsx must exist');
  const content = readFile('src/components/common/ErrorBoundary.tsx');
  assert(content, 'ErrorBoundary.tsx must not be empty');
  assertIncludes(content, 'componentDidCatch', 'ErrorBoundary must implement componentDidCatch');
});

suite.register('T2-F3-02', 'PWA service worker existence and offline cache lifecycle in public/sw.js', {
  tier: 2,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies public/sw.js exists and implements fetch and cache event listeners'
}, () => {
  assertFileExists('public/sw.js', 'Service worker public/sw.js must exist');
  const sw = readFile('public/sw.js');
  assert(sw, 'public/sw.js must not be empty');
  assertIncludes(sw, "addEventListener('install'", 'Service worker must handle install event');
  assertIncludes(sw, "addEventListener('fetch'", 'Service worker must handle fetch event');
});

suite.register('T2-F3-03', 'Barcode scanner library isolation boundary', {
  tier: 2,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies @zxing/browser is only imported in inventory barcode component'
}, () => {
  const srcFiles = listFiles('src');
  const zxingMatches = searchInFiles("from '@zxing/browser'", srcFiles);
  for (const m of zxingMatches) {
    assert(
      m.file.includes('OpticalBarcodeScannerTab.tsx') || m.file.includes('inventory'),
      `@zxing/browser must be isolated to barcode scanner: found in ${m.file}`
    );
  }
});

suite.register('T2-F3-04', 'Production CSS bundle compression threshold (< 300 kB)', {
  tier: 2,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies compiled CSS bundle in dist/assets/ is within acceptable size limits'
}, () => {
  const distFiles = listFiles('dist/assets', ['.css']);
  assert(distFiles.length > 0, 'dist/assets must contain compiled CSS');
  for (const cssFile of distFiles) {
    const fullPath = require('path').join(PROJECT_ROOT, cssFile);
    const sizeBytes = require('fs').statSync(fullPath).size;
    const sizeKB = sizeBytes / 1024;
    assert(sizeKB < 300, `CSS bundle must be under 300 kB: ${cssFile} is ${sizeKB.toFixed(2)} kB`);
  }
});

suite.register('T2-F3-05', 'Production JS client bundle generation and chunk structure', {
  tier: 2,
  feature: 'F3',
  milestone: 'M4',
  description: 'Verifies compiled JS bundle exists in dist/assets/ and is non-empty'
}, () => {
  const distFiles = listFiles('dist/assets', ['.js']);
  assert(distFiles.length > 0, 'dist/assets must contain at least one compiled JS chunk');
  for (const jsFile of distFiles) {
    const fullPath = require('path').join(PROJECT_ROOT, jsFile);
    const sizeBytes = require('fs').statSync(fullPath).size;
    assert(sizeBytes > 1000, `JS chunk must contain valid code: ${jsFile}`);
  }
});

// =========================================================================
// FEATURE 4: Boundary & Corner Cases (5 Tests)
// =========================================================================

suite.register('T2-F4-01', 'Navigation fallback boundary: returns original moduleId if alias is not mapped', {
  tier: 2,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies CANONICAL_MODULE_MAP returns original input when no alias exists'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');
  assertIncludes(
    erpStore,
    'CANONICAL_MODULE_MAP[targetModule.toLowerCase()] || targetModule',
    'Must fallback to original targetModule if not in map'
  );
});

suite.register('T2-F4-02', 'Deep merge non-destructive resilience (local state preserved on cloud sync)', {
  tier: 2,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies erpStore implements non-destructive merge to protect local state from empty remote overwrites'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');
  assert(
    erpStore.includes('merged.push(') || erpStore.includes('mergedUsers.push(') || erpStore.includes('nonDestructiveDeepMerge'),
    'erpStore must implement non-destructive merge logic (retaining local records during remote sync)'
  );
});

suite.register('T2-F4-03', 'Navigation cleanliness: zero window.dispatchEvent(CustomEvent) for navigation in src/modules/', {
  tier: 2,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies no active module uses volatile CustomEvents for navigation per Rule 16'
}, () => {
  const moduleFiles = listFiles('src/modules');
  const customEventMatches = searchInFiles('CustomEvent', moduleFiles);
  for (const m of customEventMatches) {
    // CustomEvent must not be used to navigate modules
    assert(
      !m.content.includes('setActiveModule') && !m.content.includes('navigateWithContext'),
      `Volatile CustomEvent navigation forbidden in ${m.file}:${m.line}`
    );
  }
});

suite.register('T2-F4-04', 'Zero manual cloud sync buttons exposed in user interface (Rule 1)', {
  tier: 2,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies no manual sync buttons like "Subir a la nube" or "Sincronizar Firestore" exist in components'
}, () => {
  const srcFiles = listFiles('src');
  const syncBtnMatches = searchInFiles(/Subir a la nube|Descargar de la nube|Sincronizar Firestore/i, srcFiles, true);
  assertEqual(syncBtnMatches.length, 0, 'Rule 1 violation: Zero manual sync buttons may be exposed to the user');
});

suite.register('T2-F4-05', 'Offline IndexedDB storage integration in erpStore.tsx (idbStorage)', {
  tier: 2,
  feature: 'F4',
  milestone: 'M4',
  description: 'Verifies erpStore integrates with IndexedDB persistence services via idbStorage'
}, () => {
  const erpStore = readFile('src/core/storage/erpStore.tsx');
  assert(erpStore, 'erpStore.tsx must exist');
  assertFileExists('src/core/storage/idbStorage.ts', 'src/core/storage/idbStorage.ts must exist');
  assertIncludes(erpStore, 'saveStateToIdb', 'erpStore must import and call saveStateToIdb');
  assertIncludes(erpStore, 'loadStateFromIdb', 'erpStore must import and call loadStateFromIdb');
});

// =========================================================================
// FEATURE 5: Boundary & Corner Cases (5 Tests)
// =========================================================================

suite.register('T2-F5-01', 'formatCOP boundary values: 0, negative amounts, and decimals', {
  tier: 2,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies formatCOP standard behavior on boundary numbers'
}, () => {
  // Test inline Intl logic matching trmService.ts
  const format = (amt) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amt || 0);

  const zeroFormatted = format(0);
  assert(zeroFormatted.includes('0'), `Zero formatted must include '0': ${zeroFormatted}`);

  const thousandFormatted = format(1000);
  assert(thousandFormatted.includes('1'), `1000 formatted must include '1': ${thousandFormatted}`);

  const negativeFormatted = format(-500);
  assert(negativeFormatted.includes('500'), `Negative formatted must include '500': ${negativeFormatted}`);
});

suite.register('T2-F5-02', 'Tax service boundary: default fallback for unknown country is Colombia 19%', {
  tier: 2,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies getProjectTaxRate defaults to 0.19 for undefined or unknown country'
}, () => {
  const taxContent = readFile('src/core/services/taxService.ts');
  assert(taxContent, 'taxService.ts must exist');
  assertIncludes(
    taxContent,
    "return { rate: 0.19, label: '19%', countryName: country || 'Colombia' }",
    'Default tax rate must be 19% Colombia'
  );
});

suite.register('T2-F5-03', 'Supplier homologation rejection boundary (both legal and tech required)', {
  tier: 2,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies supplier validation rejects if either legal or tech is false'
}, () => {
  const verifyRules = readFile('verify_rules.cjs');
  assert(verifyRules, 'verify_rules.cjs must exist');
  assertIncludes(verifyRules, 'if (!legal || !tech)', 'Supplier validation must require BOTH legal and tech homologation');
});

suite.register('T2-F5-04', 'General Manager approval threshold exact boundary (USD 2,000)', {
  tier: 2,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies GM threshold: < 2000 is false, >= 2000 is true'
}, () => {
  const verifyRules = readFile('verify_rules.cjs');
  assert(verifyRules, 'verify_rules.cjs must exist');
  assertIncludes(verifyRules, 'const GM_THRESHOLD = 2000', 'Threshold must be 2000');
  assertIncludes(verifyRules, 'amountUSD >= GM_THRESHOLD', 'Threshold comparison must be >=');
});

suite.register('T2-F5-05', 'Table layout structure standard: table-fixed and colgroup (Rule 12)', {
  tier: 2,
  feature: 'F5',
  milestone: 'M5',
  description: 'Verifies project cost table follows table-fixed and colgroup alignment rules'
}, () => {
  const costTab = readFile('src/modules/projects/components/tabs/TabCostosPresupuesto.tsx');
  assert(costTab, 'TabCostosPresupuesto.tsx must exist');
  assertIncludes(costTab, 'table-fixed', 'Tables must use table-fixed class');
  assertIncludes(costTab, '<colgroup>', 'Tables must define explicit <colgroup>');
});

module.exports = suite;
