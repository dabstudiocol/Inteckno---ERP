/**
 * E2E Test Suite Utilities and Harness for Inteckno ERP
 * Standardized CommonJS helper providing file system inspection, AST/regex parsing,
 * execution oracles, assertions, and test registration for all 4 tiers.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

/**
 * Normalizes relative path to project root
 */
function toAbsPath(relPath) {
  if (path.isAbsolute(relPath)) return relPath;
  return path.join(PROJECT_ROOT, relPath);
}

/**
 * Checks if a file exists
 */
function fileExists(relPath) {
  const p = toAbsPath(relPath);
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * Checks if a directory exists
 */
function dirExists(relPath) {
  const p = toAbsPath(relPath);
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Reads file contents safely
 */
function readFile(relPath) {
  const p = toAbsPath(relPath);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

/**
 * Recursively scans directory for files matching extensions
 */
function listFiles(dirRel, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html'], ignoreDirs = ['node_modules', '.git', '.agents']) {
  const results = [];
  const baseDir = toAbsPath(dirRel);
  if (!fs.existsSync(baseDir)) return results;

  // Only ignore 'dist' if we are NOT scanning inside 'dist'
  const activeIgnore = dirRel.startsWith('dist') ? ignoreDirs : [...ignoreDirs, 'dist'];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!activeIgnore.includes(entry.name)) {
          walk(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
          results.push(relPath);
        }
      }
    }
  }

  walk(baseDir);
  return results;
}

/**
 * Searches for a pattern across multiple files
 */
function searchInFiles(pattern, fileList, isRegex = false) {
  const matches = [];
  const regex = isRegex ? (pattern instanceof RegExp ? pattern : new RegExp(pattern, 'g')) : null;

  for (const relFile of fileList) {
    const content = readFile(relFile);
    if (!content) continue;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let matched = false;
      if (regex) {
        regex.lastIndex = 0;
        matched = regex.test(line);
      } else {
        matched = line.includes(pattern);
      }

      if (matched) {
        matches.push({
          file: relFile,
          line: i + 1,
          content: line.trim()
        });
      }
    }
  }
  return matches;
}

/**
 * Extracts import source paths from a file
 */
function extractImports(relFile) {
  const content = readFile(relFile);
  if (!content) return [];
  const imports = [];

  // Match: import ... from '...' or import '...'
  const staticImportRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = staticImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // Match: import('...')
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Executes a shell command synchronously
 */
function runCommand(command, cwd = PROJECT_ROOT, env = {}) {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status || 1,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : err.message
    };
  }
}

// Custom Assertions
class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new AssertionError(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(`${message || 'Values not equal'} — Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual, unexpected, message) {
  if (actual === unexpected) {
    throw new AssertionError(`${message || 'Values must not equal'} — Both are: ${JSON.stringify(actual)}`);
  }
}

function assertMatch(actual, regex, message) {
  if (!regex.test(actual)) {
    throw new AssertionError(`${message || 'String does not match pattern'} — Actual: "${actual}", Pattern: ${regex}`);
  }
}

function assertIncludes(actual, item, message) {
  if (!actual || !actual.includes(item)) {
    throw new AssertionError(`${message || 'Item not found in collection'} — Looking for: ${JSON.stringify(item)}`);
  }
}

function assertFileExists(relPath, message) {
  if (!fileExists(relPath)) {
    throw new AssertionError(`${message || 'Expected file to exist'}: ${relPath}`);
  }
}

function assertFileDoesNotExist(relPath, message) {
  if (fileExists(relPath)) {
    throw new AssertionError(`${message || 'Expected file NOT to exist'}: ${relPath}`);
  }
}

function assertDirDoesNotExist(relPath, message) {
  if (dirExists(relPath)) {
    throw new AssertionError(`${message || 'Expected directory NOT to exist'}: ${relPath}`);
  }
}

/**
 * Test Registry & Runner Engine
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  register(id, name, meta, fn) {
    this.tests.push({
      id,
      name,
      tier: meta.tier || 1,
      feature: meta.feature || 'F1',
      milestone: meta.milestone || 'M1',
      description: meta.description || '',
      fn
    });
  }

  async run(options = {}) {
    const results = [];
    const filterMilestone = options.milestone ? options.milestone.toUpperCase() : null;
    const filterTier = options.tier ? parseInt(options.tier, 10) : null;
    const filterFeature = options.feature ? options.feature.toUpperCase() : null;
    const strictMode = !!options.strict;

    for (const t of this.tests) {
      if (filterTier && t.tier !== filterTier) continue;
      if (filterFeature && t.feature.toUpperCase() !== filterFeature) continue;
      if (filterMilestone && filterMilestone !== 'ALL') {
        const milestoneNum = parseInt(t.milestone.replace('M', ''), 10) || 1;
        const targetNum = parseInt(filterMilestone.replace('M', ''), 10) || 5;
        if (milestoneNum > targetNum) continue;
      }

      const start = Date.now();
      let status = 'PASSED';
      let error = null;

      try {
        await t.fn({
          strictMode,
          options
        });
      } catch (err) {
        status = 'FAILED';
        error = err;
      }

      const durationMs = Date.now() - start;
      results.push({
        id: t.id,
        name: t.name,
        tier: t.tier,
        feature: t.feature,
        milestone: t.milestone,
        status,
        durationMs,
        error: error ? (error.message || String(error)) : null,
        stack: error && error.stack ? error.stack : null
      });
    }

    return results;
  }
}

module.exports = {
  PROJECT_ROOT,
  toAbsPath,
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
  assertMatch,
  assertIncludes,
  assertFileExists,
  assertFileDoesNotExist,
  assertDirDoesNotExist,
  TestSuite
};
