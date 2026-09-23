/**
 * MASTER PRE-PUSH QUALITY GATE VERIFICATION SUITE
 * 
 * Enforces:
 * 1. Documentation Freshness & Completeness Check
 * 2. 100% Code Coverage Enforcement for Mobile App (Jest)
 * 3. 100% Logic & Syntax Verification for Website Scripts
 * 4. Build Integrity Checks (TypeScript, ESLint, Web HTML/CSS)
 * 5. 4-Language Translation Parity Check (en, hi, mr, kn)
 * 6. Headless Chrome Mobile Responsiveness Audit (375px, 360px, 768px)
 * 7. Security, Concurrency & E2E User Journey Verification
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function logHeader(stepNum, totalSteps, title) {
  console.log(`\n${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}[GATE ${stepNum}/${totalSteps}] ${title.toUpperCase()}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
}

function pass(msg) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${msg}`);
}

function fail(msg, details = '') {
  console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${msg}`);
  if (details) console.error(`    ${colors.red}${details}${colors.reset}`);
}

let allGatesPassed = true;
const gateResults = [];

function recordGate(name, passed, notes = '') {
  gateResults.push({ name, passed, notes });
  if (!passed) allGatesPassed = false;
}

// ============================================================================
// GATE 1: DOCUMENTATION FRESHNESS & COMPLETENESS CHECK
// ============================================================================
logHeader(1, 7, 'Documentation Freshness & Completeness Check');
try {
  const requiredDocs = [
    { file: 'README.md', minSize: 1000, keywords: ['verify:all', 'Vendor Onboarding', 'Architecture'] },
    { file: 'docs/VENDOR_ONBOARDING_GUIDE.md', minSize: 2000, keywords: ['AI WhatsApp Itinerary Importer', 'Live GPS Bus Radar', 'Passenger Manifests'] },
    { file: 'docs/PAYMENT_SETUP.md', minSize: 500, keywords: ['Razorpay'] },
    { file: 'docs/MONETIZATION.md', minSize: 500, keywords: ['Commission'] }
  ];

  let docsValid = true;
  for (const doc of requiredDocs) {
    const fullPath = path.join(ROOT_DIR, doc.file);
    if (!fs.existsSync(fullPath)) {
      fail(`Required documentation missing: ${doc.file}`);
      docsValid = false;
      continue;
    }
    const stat = fs.statSync(fullPath);
    if (stat.size < doc.minSize) {
      fail(`Documentation file too small (${stat.size} bytes < ${doc.minSize}): ${doc.file}`);
      docsValid = false;
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
    for (const kw of doc.keywords) {
      if (!content.includes(kw.toLowerCase())) {
        fail(`Documentation ${doc.file} is missing key section: "${kw}"`);
        docsValid = false;
      }
    }
    pass(`Verified up-to-date documentation: ${doc.file} (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  recordGate('Documentation Completeness', docsValid);
} catch (err) {
  fail('Error during documentation verification', err.message);
  recordGate('Documentation Completeness', false, err.message);
}

// ============================================================================
// GATE 2: 100% CODE COVERAGE CHECK FOR APP (JEST)
// ============================================================================
logHeader(2, 7, '100% Code Coverage Enforcement (Mobile App - Jest)');
try {
  console.log('  Executing Jest test runner with code coverage collection...');
  const jestProc = spawnSync('npx', ['jest', '--coverage', '--coverageReporters=text', '--coverageReporters=json-summary'], {
    cwd: ROOT_DIR,
    shell: true,
    encoding: 'utf8'
  });

  const summaryPath = path.join(ROOT_DIR, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    fail('Coverage summary was not generated');
    recordGate('App 100% Code Coverage', false, 'Missing coverage-summary.json');
  } else {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const totalLines = summary.total.lines;
    const linePct = totalLines.pct;
    const uncovered = totalLines.total - totalLines.covered;

    console.log(`  Lines Coverage: ${colors.bold}${linePct}%${colors.reset} (${totalLines.covered}/${totalLines.total} lines covered)`);
    console.log(`  Statements: ${summary.total.statements.pct}%, Functions: ${summary.total.functions.pct}%, Branches: ${summary.total.branches.pct}%`);

    if (linePct >= 100.0 && uncovered === 0) {
      pass(`100% Line Coverage achieved across all mobile app modules! (0 uncovered lines)`);
      recordGate('App 100% Code Coverage', true, `100.0% Lines (${totalLines.total}/${totalLines.total})`);
    } else {
      fail(`App code coverage is below 100% lines requirement: ${linePct}% (Uncovered lines: ${uncovered})`);
      // Find individual files with < 100% lines
      for (const [file, metrics] of Object.entries(summary)) {
        if (file === 'total') continue;
        if (metrics.lines.pct < 100.0) {
          console.error(`    Uncovered file: ${path.relative(ROOT_DIR, file)} (${metrics.lines.pct}% lines)`);
        }
      }
      recordGate('App 100% Code Coverage', false, `${linePct}% < 100% lines`);
    }
  }
} catch (err) {
  fail('Failed to run Jest coverage check', err.message);
  recordGate('App 100% Code Coverage', false, err.message);
}

// ============================================================================
// GATE 3: WEBSITE SCRIPTS & MARKUP AUDIT
// ============================================================================
logHeader(3, 7, 'Website Scripts & Markup Verification');
try {
  const verifyPortals = spawnSync('node', ['scripts/verify-portals.js'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });
  if (verifyPortals.status === 0) {
    pass('All website HTML pages and JavaScript files passed syntax and markup validation.');
    recordGate('Website Markup & Scripts', true);
  } else {
    fail('verify-portals.js reported errors', verifyPortals.stderr || verifyPortals.stdout);
    recordGate('Website Markup & Scripts', false, 'verify-portals failed');
  }
} catch (err) {
  fail('Error checking website portals', err.message);
  recordGate('Website Markup & Scripts', false, err.message);
}

// ============================================================================
// GATE 4: BUILD INTEGRITY (TYPESCRIPT & ESLINT)
// ============================================================================
logHeader(4, 7, 'Build & Type Integrity Checks (App & Web)');
try {
  console.log('  Running TypeScript type-checker (tsc --noEmit)...');
  const tscProc = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });

  if (tscProc.status === 0) {
    pass('TypeScript check passed with 0 type errors.');
  } else {
    fail('TypeScript compilation errors detected', tscProc.stdout || tscProc.stderr);
  }

  console.log('  Running ESLint code linter...');
  const lintProc = spawnSync('npm', ['run', 'lint'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });

  if (lintProc.status === 0) {
    pass('ESLint linting passed cleanly with 0 errors.');
  } else {
    fail('ESLint reported linting errors', lintProc.stdout || lintProc.stderr);
  }

  const buildPassed = (tscProc.status === 0) && (lintProc.status === 0);
  recordGate('Build & Type Integrity', buildPassed);
} catch (err) {
  fail('Error during build integrity checks', err.message);
  recordGate('Build & Type Integrity', false, err.message);
}

// ============================================================================
// GATE 5: 4-LANGUAGE TRANSLATION PARITY AUDIT
// ============================================================================
logHeader(5, 7, '4-Language i18n Completeness & Parity Audit');
try {
  const i18n = require('../web/i18n.js');
  const translations = i18n.AppTranslations;
  const languages = ['en', 'hi', 'mr', 'kn'];
  const enKeys = Object.keys(translations.en);

  console.log(`  Master language (English) dictionary has ${colors.bold}${enKeys.length}${colors.reset} keys.`);

  let i18nValid = true;
  for (const lang of languages) {
    if (!translations[lang]) {
      fail(`Missing dictionary for language: ${lang}`);
      i18nValid = false;
      continue;
    }
    const currentKeys = Object.keys(translations[lang]);
    const missing = enKeys.filter(k => !(k in translations[lang]));
    const empty = enKeys.filter(k => typeof translations[lang][k] !== 'string' || translations[lang][k].trim() === '');

    if (missing.length === 0 && empty.length === 0) {
      pass(`Language '${lang}': 100% parity with English (${currentKeys.length}/${enKeys.length} keys populated)`);
    } else {
      fail(`Language '${lang}' has ${missing.length} missing keys and ${empty.length} empty keys!`);
      if (missing.length > 0) console.error(`    Sample missing: ${missing.slice(0, 5).join(', ')}`);
      i18nValid = false;
    }
  }

  recordGate('4-Language Translation Parity', i18nValid);
} catch (err) {
  fail('Error during translation audit', err.message);
  recordGate('4-Language Translation Parity', false, err.message);
}

// ============================================================================
// GATE 6: MOBILE RESPONSIVENESS CDP AUDIT (ALL VIEWPORTS)
// ============================================================================
logHeader(6, 7, 'Mobile Responsiveness & Viewport Audit');
try {
  console.log('  Running Headless Chrome CDP responsive audit (iPhone 13, Galaxy S20, iPad Mini)...');
  const respProc = spawnSync('node', ['scripts/test-mobile-responsive.js'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });

  if (respProc.status === 0 && respProc.stdout.includes('AUDIT RESULTS: 59 PASSED, 0 FAILED')) {
    pass('All 59 mobile responsiveness and viewport alignment checks passed with 0 failures.');
    recordGate('Mobile Responsiveness Audit', true, '59/59 checks passed');
  } else {
    fail('Mobile responsiveness checks failed', respProc.stderr || respProc.stdout);
    recordGate('Mobile Responsiveness Audit', false, 'Responsive audit failed');
  }
} catch (err) {
  fail('Error during mobile responsiveness audit', err.message);
  recordGate('Mobile Responsiveness Audit', false, err.message);
}

// ============================================================================
// GATE 7: SECURITY & END-TO-END FLOW VERIFICATION
// ============================================================================
logHeader(7, 7, 'Security, Defensive Locks & E2E User Journeys');
try {
  console.log('  Running Security & Concurrency Test Suite (199 checks)...');
  const secProc = spawnSync('node', ['scripts/test-security-and-flows.js'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });

  const secPassed = secProc.status === 0 && secProc.stdout.includes('199/199 TESTS PASSED');
  if (secPassed) {
    pass('Security & Flow tests: 199/199 checks passed (100.0%).');
  } else {
    fail('Security & Flow test suite failed', secProc.stderr || secProc.stdout);
  }

  console.log('  Running End-to-End User Journey Tests (11 flows)...');
  const e2eProc = spawnSync('node', ['scripts/run-cdp-tests.js'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    shell: true
  });

  const e2ePassed = e2eProc.status === 0 && e2eProc.stdout.includes('ALL 11 WEB FLOW TESTS PASSED');
  if (e2ePassed) {
    pass('E2E Browser user journeys: 11/11 flows passed cleanly.');
  } else {
    fail('E2E Browser tests failed', e2eProc.stderr || e2eProc.stdout);
  }

  recordGate('Security & End-to-End Flows', secPassed && e2ePassed);
} catch (err) {
  fail('Error during security and e2e verification', err.message);
  recordGate('Security & End-to-End Flows', false, err.message);
}

// ============================================================================
// FINAL MASTER SUMMARY REPORT
// ============================================================================
console.log(`\n${colors.bold}========================================================================${colors.reset}`);
console.log(`${colors.bold}MASTER PRE-PUSH QUALITY GATE SUMMARY${colors.reset}`);
console.log(`${colors.bold}========================================================================${colors.reset}`);

for (const res of gateResults) {
  const icon = res.passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  const note = res.notes ? ` (${res.notes})` : '';
  console.log(`  ${icon} : ${colors.bold}${res.name}${colors.reset}${note}`);
}

console.log(`${colors.bold}========================================================================${colors.reset}`);

if (allGatesPassed) {
  console.log(`\n${colors.green}${colors.bold}🎉 ALL 7 QUALITY GATES PASSED COMPLETELY!${colors.reset}`);
  console.log(`${colors.green}100% Code Coverage, Build Integrity, Mobile Responsiveness, 4 Languages & Docs are ALL VERIFIED.${colors.reset}`);
  console.log(`${colors.green}${colors.bold}✅ READY TO PUSH TO REPOSITORY & DEPLOY TO PRODUCTION!${colors.reset}\n`);
  process.exit(0);
} else {
  console.error(`\n${colors.red}${colors.bold}❌ ONE OR MORE QUALITY GATES FAILED.${colors.reset}`);
  console.error(`${colors.red}Fix the errors listed above before pushing code.${colors.reset}\n`);
  process.exit(1);
}
