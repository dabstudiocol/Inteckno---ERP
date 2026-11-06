#!/usr/bin/env node
/**
 * Master E2E Test Runner for Inteckno ERP
 * Dual-Track Quality Engineering Test Harness
 * 
 * Executes all 4 tiers of opaque-box E2E tests:
 * - Tier 1: Feature Coverage (25 tests)
 * - Tier 2: Boundary & Corner Cases (25 tests)
 * - Tier 3: Cross-Feature Interactions (5 tests)
 * - Tier 4: Real-world Workload / End-to-End Scenarios (5 tests)
 * Total: 60 tests across 5 features.
 * 
 * Usage:
 *   node scripts/test-e2e.cjs [options]
 * 
 * Options:
 *   --tier <1|2|3|4>            Run only a specific tier
 *   --feature <F1..F5|CROSS|E2E> Run only a specific feature
 *   --milestone <M1..M5|ALL>    Run tests up to the specified milestone
 *   --strict, --target          Enable strict post-cleanup target assertions
 *   --json                      Output machine-readable JSON summary
 *   --help                      Display help message
 */

const path = require('path');
const tier1Suite = require('../tests/e2e/tier1-feature-coverage.test.cjs');
const tier2Suite = require('../tests/e2e/tier2-boundary-corner.test.cjs');
const tier3Suite = require('../tests/e2e/tier3-cross-feature.test.cjs');
const tier4Suite = require('../tests/e2e/tier4-workload-scenarios.test.cjs');

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null,
    feature: null,
    milestone: null,
    strict: false,
    json: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tier' && args[i + 1]) {
      options.tier = args[++i];
    } else if (arg === '--feature' && args[i + 1]) {
      options.feature = args[++i];
    } else if (arg === '--milestone' && args[i + 1]) {
      options.milestone = args[++i];
    } else if (arg === '--strict' || arg === '--target') {
      options.strict = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
${BOLD}Inteckno ERP E2E Test Suite Runner${RESET}

Usage:
  node scripts/test-e2e.cjs [options]

Options:
  --tier <1|2|3|4>            Run only a specific tier
  --feature <F1..F5|CROSS|E2E> Run only a specific feature
  --milestone <M1..M5|ALL>    Run tests up to the specified milestone
  --strict, --target          Enable strict post-cleanup target assertions
  --json                      Output machine-readable JSON summary
  --help, -h                  Display this help message
`);
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  const suites = [
    tier1Suite,
    tier2Suite,
    tier3Suite,
    tier4Suite
  ];

  const startTime = Date.now();
  const allResults = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  if (!options.json) {
    console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD}${CYAN}   INTECKNO ERP — DUAL-TRACK E2E VERIFICATION TEST SUITE            ${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${GRAY}Node.js:${RESET} ${process.version} | ${GRAY}Platform:${RESET} ${process.platform} | ${GRAY}Strict Mode:${RESET} ${options.strict ? 'YES' : 'NO'}`);
    if (options.milestone) console.log(`${GRAY}Milestone Filter:${RESET} ${options.milestone}`);
    if (options.tier) console.log(`${GRAY}Tier Filter:${RESET} Tier ${options.tier}`);
    if (options.feature) console.log(`${GRAY}Feature Filter:${RESET} Feature ${options.feature}`);
    console.log('');
  }

  for (const suite of suites) {
    if (options.tier && suite.tests[0] && suite.tests[0].tier !== parseInt(options.tier, 10)) {
      continue;
    }

    if (!options.json) {
      console.log(`${BOLD}${BLUE}--- ${suite.name} ---${RESET}`);
    }

    const suiteResults = await suite.run(options);

    for (const r of suiteResults) {
      totalTests++;
      allResults.push(r);

      if (r.status === 'PASSED') {
        passedTests++;
        if (!options.json) {
          console.log(`  ${GREEN}✓ PASS${RESET} [${r.id}] ${r.name} ${GRAY}(${r.milestone}, ${r.durationMs}ms)${RESET}`);
        }
      } else {
        failedTests++;
        if (!options.json) {
          console.log(`  ${RED}✗ FAIL${RESET} [${r.id}] ${r.name} ${GRAY}(${r.milestone}, ${r.durationMs}ms)${RESET}`);
          console.log(`     ${RED}${r.error}${RESET}`);
        }
      }
    }

    if (!options.json) {
      console.log('');
    }
  }

  const totalDuration = Date.now() - startTime;

  if (options.json) {
    console.log(JSON.stringify({
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      durationMs: totalDuration,
      results: allResults
    }, null, 2));
  } else {
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD}TEST RUN SUMMARY${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`Total Executed: ${BOLD}${totalTests}${RESET}`);
    console.log(`Passed:         ${GREEN}${BOLD}${passedTests}${RESET}`);
    console.log(`Failed:         ${failedTests > 0 ? RED + BOLD + failedTests : GREEN + '0'}${RESET}`);
    console.log(`Total Time:     ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

    if (failedTests === 0) {
      console.log(`\n${GREEN}${BOLD}✔ ALL ${totalTests} TESTS PASSED SUCCESSFULLY! (100% SUCCESS RATE)${RESET}\n`);
    } else {
      console.log(`\n${RED}${BOLD}✖ ${failedTests} TEST(S) FAILED.${RESET}\n`);
    }
  }

  process.exit(failedTests === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
