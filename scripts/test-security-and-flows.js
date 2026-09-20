/**
 * Comprehensive Automated Security, Functional Flow & UI/UX Test Suite
 * Tests:
 * 1. Firestore Security Rules (Static & Logical Analysis)
 * 2. Web Security Headers & Content Security Policy (CSP)
 * 3. Client-Side Concurrency & Defensive Coding (Locks, Honeypots, XSS sanitizers)
 * 4. Headless Chrome CDP Live Flows (XSS resistance, bot honeypot, double-click lock, portal auth gates, a11y)
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const vm = require('vm');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const CDP_PORT = 9228;
const BASE_URL = 'http://localhost:8080';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
    this.events = [];
    this.errors = [];

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Page.javascriptDialogOpening') {
        this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      } else if (data.method === 'Runtime.exceptionThrown') {
        const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
        this.errors.push(desc);
      }
    };
  }

  waitOpen() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const trimmed = expression.trim();
    const needsWrap = trimmed.includes('return ') && !trimmed.startsWith('(');
    const code = needsWrap ? `(() => {\n${expression}\n})()` : expression;
    const res = await this.send('Runtime.evaluate', {
      expression: code,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${details ? '- ' + details : ''}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: FIRESTORE SECURITY RULES VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
function verifyFirestoreRules() {
  console.log('\n[1/4] AUDITING FIRESTORE SECURITY RULES (firestore.rules)...');
  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  assert(fs.existsSync(rulesPath), 'firestore.rules file exists');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Check Helper Functions
  assert(rules.includes('function isAuthenticated()'), 'Rules define isAuthenticated helper');
  assert(rules.includes('function isOwner(uid)'), 'Rules define isOwner helper');
  assert(rules.includes('function isValidNewBooking()'), 'Rules define isValidNewBooking validator');
  assert(rules.includes('function isValidBookingUpdate()'), 'Rules define isValidBookingUpdate validator');
  assert(rules.includes('function isValidTripData()'), 'Rules define isValidTripData validator');
  assert(rules.includes('function isSeatCountIncrementOnly()'), 'Rules define isSeatCountIncrementOnly validator');
  assert(rules.includes('function isValidLiveCoordinates()'), 'Rules define isValidLiveCoordinates validator');

  // Check Collection Boundaries
  // 1. Trips
  assert(rules.includes('match /trips/{tripId}'), 'Trips collection match exists');
  assert(rules.includes('resource.data.vendorId == request.auth.uid'), 'Trips update/delete restricted to vendorId owner');
  assert(rules.includes('isSeatCountIncrementOnly()'), 'Guest seat count increment explicitly isolated');

  // 2. Bookings
  assert(rules.includes('match /bookings/{bookingId}'), 'Bookings collection match exists');
  assert(rules.includes('allow get: if true;'), 'Bookings split get: if true for single-ticket lookup');
  assert(rules.includes('allow list: if isAuthenticated() && ('), 'Bookings collection list strictly restricted against PII harvesting');
  assert(rules.includes('resource.data.vendorId == request.auth.uid'), 'Bookings list allows owning vendor');
  assert(rules.includes('resource.data.travelerEmail == request.auth.token.email'), 'Bookings list allows verified traveler email');
  assert(rules.includes('allow delete: if false;'), 'Bookings client-side deletion permanently blocked');

  // 3. Immutability checks in isValidBookingUpdate
  assert(rules.includes("!diff.affectedKeys().hasAny(['tripId', 'bookingId', 'createdAt', 'totalPrice'])"), 
    'Booking update prevents tampering with tripId, bookingId, createdAt, and totalPrice');

  // 4. Users & Vendors
  assert(rules.includes('match /users/{userId}'), 'Users collection match exists');
  assert(rules.includes('allow create, update: if isOwner(userId)'), 'User updates restricted to owner UID');
  assert(rules.includes('match /vendors/{vendorId}'), 'Vendors collection match exists');
  assert(rules.includes('allow create, update: if isOwner(vendorId)'), 'Vendor updates restricted to vendor UID');

  // 5. Live Trips & Coordinates
  assert(rules.includes('match /live_trips/{tripId}'), 'Live trips collection match exists');
  assert(rules.includes('data.latitude >= -90 && data.latitude <= 90'), 'Live GPS validates latitude boundaries [-90, 90]');
  assert(rules.includes('data.longitude >= -180 && data.longitude <= 180'), 'Live GPS validates longitude boundaries [-180, 180]');

  // 6. Error Logs
  assert(rules.includes('match /error_logs/{logId}'), 'Error logs collection match exists');
  assert(rules.includes('allow read, update, delete: if false;'), 'Error logs read/update/delete completely blocked');

  // Logical Simulation of Validation Predicates
  console.log('  Testing rule validator logic simulation...');
  // Simulate isValidNewBooking logic
  const validateBooking = (data) => {
    return data.travelerName && data.travelerName.length >= 2 && data.travelerName.length <= 100
      && data.travelerPhone && data.travelerPhone.length >= 8 && data.travelerPhone.length <= 20
      && ['pending', 'confirmed'].includes(data.status)
      && typeof data.totalPrice === 'number' && data.totalPrice >= 0
      && (!data.seats || (data.seats >= 1 && data.seats <= 50))
      && typeof data.bookingId === 'string' && data.bookingId.length >= 5;
  };

  assert(validateBooking({
    travelerName: 'Aarav Sharma',
    travelerPhone: '9876543210',
    status: 'pending',
    totalPrice: 2499,
    seats: 2,
    bookingId: 'ATGL-55441'
  }), 'Valid booking data passes validation');

  assert(!validateBooking({
    travelerName: 'A', // Too short
    travelerPhone: '9876543210',
    status: 'pending',
    totalPrice: 2499,
    bookingId: 'ATGL-55441'
  }), 'Invalid short traveler name is rejected');

  assert(!validateBooking({
    travelerName: 'Aarav Sharma',
    travelerPhone: '123', // Too short
    status: 'pending',
    totalPrice: 2499,
    bookingId: 'ATGL-55441'
  }), 'Invalid short phone is rejected');

  assert(!validateBooking({
    travelerName: 'Aarav Sharma',
    travelerPhone: '9876543210',
    status: 'pending',
    totalPrice: -500, // Negative price attack
    bookingId: 'ATGL-55441'
  }), 'Negative totalPrice attack is rejected');

  assert(!validateBooking({
    travelerName: 'Aarav Sharma',
    travelerPhone: '9876543210',
    status: 'pending',
    totalPrice: 2499,
    seats: 999, // Overflow seats
    bookingId: 'ATGL-55441'
  }), 'Excessive seat count (>50) is rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: WEB SECURITY HEADERS & CSP VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
function verifySecurityHeadersAndCSP() {
  console.log('\n[2/4] AUDITING WEB SECURITY HEADERS & CONTENT SECURITY POLICY...');
  const webDir = path.join(__dirname, '..', 'web');
  const pages = ['index.html', 'trip.html', 'traveller.html', 'vendor-portal.html', 'vendor.html'];

  pages.forEach(page => {
    const filePath = path.join(webDir, page);
    assert(fs.existsSync(filePath), `${page} exists`);
    const html = fs.readFileSync(filePath, 'utf8');

    // 1. CSP Meta Tag
    assert(html.includes('http-equiv="Content-Security-Policy"'), `${page} contains Content-Security-Policy meta tag`);
    
    // Check specific directives in CSP
    const cspMatch = html.match(/content="default-src 'self';([^"]+)"/);
    assert(!!cspMatch, `${page} CSP defines default-src 'self'`);
    if (cspMatch) {
      const csp = cspMatch[0];
      assert(csp.includes('https://www.gstatic.com'), `${page} CSP allows Firebase CDN (gstatic.com)`);
      assert(csp.includes('https://fonts.googleapis.com'), `${page} CSP allows Google Fonts`);
      assert(csp.includes('https://*.firebaseio.com'), `${page} CSP allows Firebase database connection`);
      assert(!csp.includes("'unsafe-eval'"), `${page} CSP does NOT allow unsafe-eval`);
    }

    // 2. Nosniff
    assert(html.includes('http-equiv="X-Content-Type-Options" content="nosniff"'), 
      `${page} contains X-Content-Type-Options: nosniff`);

    // 3. Frame Options
    assert(html.includes('http-equiv="X-Frame-Options" content="SAMEORIGIN"'), 
      `${page} contains X-Frame-Options: SAMEORIGIN`);

    // 4. Referrer Policy
    assert(html.includes('name="referrer" content="strict-origin-when-cross-origin"'), 
      `${page} contains strict-origin-when-cross-origin referrer policy`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: CLIENT-SIDE CONCURRENCY & DEFENSIVE CODING
// ─────────────────────────────────────────────────────────────────────────────
function verifyClientSideDefenses() {
  console.log('\n[3/4] AUDITING CLIENT-SIDE DEFENSIVE CHECKS & CONCURRENCY LOCKS...');
  const webDir = path.join(__dirname, '..', 'web');

  // 1. web/script.js
  const scriptJs = fs.readFileSync(path.join(webDir, 'script.js'), 'utf8');
  assert(scriptJs.includes('let _isSubmittingBooking = false;'), 'script.js defines _isSubmittingBooking lock');
  assert(scriptJs.includes('if (_isSubmittingBooking) return;'), 'submitWebBooking checks submission lock');
  assert(scriptJs.includes('const hpField = document.getElementById(\'hp_field\');'), 'script.js checks honeypot hp_field');
  assert(scriptJs.includes('checkBookingRateLimit()'), 'script.js checks booking rate limits');
  assert(scriptJs.includes('function sanitizeInput('), 'script.js implements sanitizeInput function');

  // 2. web/trip.js
  const tripJs = fs.readFileSync(path.join(webDir, 'trip.js'), 'utf8');
  assert(tripJs.includes('let _isSubmittingBooking = false;'), 'trip.js defines _isSubmittingBooking lock');
  assert(tripJs.includes('if (_isSubmittingBooking) return;'), 'submitTripPageBooking checks submission lock');
  assert(tripJs.includes('const hpField = document.getElementById(\'tb_hp_field\');'), 'trip.js checks honeypot tb_hp_field');
  assert(tripJs.includes('checkTripRateLimit()'), 'trip.js checks trip rate limits');
  assert(tripJs.includes('function sanitizeTripInput('), 'trip.js implements sanitizeTripInput');

  // 3. web/vendor-portal.js
  const vendorJs = fs.readFileSync(path.join(webDir, 'vendor-portal.js'), 'utf8');
  assert(vendorJs.includes('let _isSavingTrip = false;'), 'vendor-portal.js defines _isSavingTrip lock');
  assert(vendorJs.includes('if (_isSavingTrip) return;'), 'handleSaveTrip checks _isSavingTrip lock');
  assert(vendorJs.includes('if (isDemoAccount())'), 'vendor-portal.js checks isDemoAccount() to block demo mutations');
  assert(vendorJs.includes('showDemoAuthModal('), 'vendor-portal.js invokes showDemoAuthModal to prompt Google Sign-In');
  assert(vendorJs.includes("const allowedStatuses = ['confirmed', 'cancelled', 'pending', 'completed'];"), 
    'vendor-portal.js validates allowed status transitions');

  // 4. web/traveller.js
  const travellerJs = fs.readFileSync(path.join(webDir, 'traveller.js'), 'utf8');
  assert(travellerJs.includes('if (isDemoTraveller())'), 'traveller.js checks isDemoTraveller() to block demo profile mutations');
  assert(travellerJs.includes('showDemoAuthModal('), 'traveller.js invokes showDemoAuthModal to prompt Google Sign-In');

  // 5. context/AppContext.tsx
  const appContextTsx = fs.readFileSync(path.join(__dirname, '..', 'context', 'AppContext.tsx'), 'utf8');
  assert(appContextTsx.includes('const bookingSubmissionLockRef = useRef(false);'), 
    'AppContext.tsx implements bookingSubmissionLockRef concurrency lock');
  assert(appContextTsx.includes('if (bookingSubmissionLockRef.current)'), 
    'AppContext.tsx checks booking submission lock ref');
  assert(appContextTsx.includes('class AppSecurityAttackThrottler'), 
    'AppContext.tsx implements AppSecurityAttackThrottler');
  assert(appContextTsx.includes('requireRealGoogleAccount('), 
    'AppContext.tsx enforces requireRealGoogleAccount for demo users');

  // 6. HTML Modals & Honeypot Inputs
  const vendorHtml = fs.readFileSync(path.join(webDir, 'vendor-portal.html'), 'utf8');
  assert(vendorHtml.includes('id="demoAuthModalOverlay"'), 'vendor-portal.html contains #demoAuthModalOverlay');
  assert(vendorHtml.includes('id="demoAuthModalGoogleBtn"'), 'vendor-portal.html contains Google Sign-In button in demo modal');

  const travellerHtml = fs.readFileSync(path.join(webDir, 'traveller.html'), 'utf8');
  assert(travellerHtml.includes('id="demoAuthModalOverlay"'), 'traveller.html contains #demoAuthModalOverlay');
  assert(travellerHtml.includes('id="demoAuthModalGoogleBtn"'), 'traveller.html contains Google Sign-In button in demo modal');

  const indexHtml = fs.readFileSync(path.join(webDir, 'index.html'), 'utf8');
  assert(indexHtml.includes('id="hp_field"'), 'index.html contains hidden honeypot input');
  const tripHtml = fs.readFileSync(path.join(webDir, 'trip.html'), 'utf8');
  assert(tripHtml.includes('id="tb_hp_field"'), 'trip.html contains hidden honeypot input');

  // 7. Security Throttler Logic Verification
  console.log('  Testing SecurityThrottler attack detection & escalating lockout...');
  const SecurityThrottler = require('../web/security-throttler.js');
  SecurityThrottler.reset();
  assert(!SecurityThrottler.isLockedOut(), 'SecurityThrottler initialized in unlocked state');
  assert(SecurityThrottler.checkAndEnforce('test_op', { maxBurst: 3, lockoutMs: 30000 }), '1st operation allowed');
  assert(SecurityThrottler.checkAndEnforce('test_op', { maxBurst: 3, lockoutMs: 30000 }), '2nd operation allowed');
  assert(SecurityThrottler.checkAndEnforce('test_op', { maxBurst: 3, lockoutMs: 30000 }), '3rd operation allowed');
  assert(!SecurityThrottler.checkAndEnforce('test_op', { maxBurst: 3, lockoutMs: 30000 }), '4th operation triggers attack lockout');
  assert(SecurityThrottler.isLockedOut(), 'SecurityThrottler is in active lockout mode');
  assert(SecurityThrottler.getRemainingLockoutSeconds() > 0, 'Remaining lockout seconds is positive');
  SecurityThrottler.reset();
  assert(!SecurityThrottler.isLockedOut(), 'SecurityThrottler reset clears lockout');

  // 8. Server-side Attack Throttling in serve-web.js
  const serveWebJs = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'serve-web.js'), 'utf8');
  assert(serveWebJs.includes('ipLockouts'), 'serve-web.js maintains ipLockouts map');
  assert(serveWebJs.includes('Blocked-Attack-Lockout'), 'serve-web.js sends Blocked-Attack-Lockout header during lockout');
  assert(serveWebJs.includes('Attack-Protection-Triggered'), 'serve-web.js sends Attack-Protection-Triggered header on burst breach');

  // 9. Test XSS sanitization logic
  console.log('  Testing XSS sanitization and entity escaping...');
  const testSandbox = {};
  vm.createContext(testSandbox);

  const extractFunction = (code, name) => {
    const idx = code.indexOf(`function ${name}(`);
    if (idx === -1) return '';
    let depth = 0;
    let started = false;
    for (let i = idx; i < code.length; i++) {
      if (code[i] === '{') {
        depth++;
        started = true;
      } else if (code[i] === '}') {
        depth--;
        if (started && depth === 0) {
          return code.slice(idx, i + 1);
        }
      }
    }
    return '';
  };

  const escapeHtmlCode = extractFunction(scriptJs, 'escapeHtml');
  const sanitizeInputCode = extractFunction(scriptJs, 'sanitizeInput');

  assert(escapeHtmlCode.length > 0, 'escapeHtml function successfully extracted');
  assert(sanitizeInputCode.length > 0, 'sanitizeInput function successfully extracted');

  const fns = vm.runInContext(`
    ${escapeHtmlCode}
    ${sanitizeInputCode}
    ({ escapeHtml, sanitizeInput });
  `, testSandbox);

  const xssPayload = '<script>alert("XSS")</script>';
  const escaped = fns.escapeHtml(xssPayload);
  assert(!escaped.includes('<script>'), 'escapeHtml neutralizes script tags');
  assert(escaped.includes('&lt;script&gt;'), 'escapeHtml converts < to &lt;');

  const quotePayload = '" onmouseover="alert(1)';
  const quoteEscaped = fns.escapeHtml(quotePayload);
  assert(!quoteEscaped.includes('"'), 'escapeHtml neutralizes double quotes');
  assert(quoteEscaped.includes('&quot;'), 'escapeHtml converts " to &quot;');

  const sanitized = fns.sanitizeInput(xssPayload);
  assert(!sanitized.includes('<') && !sanitized.includes('>'), 'sanitizeInput strips angle brackets');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: HEADLESS CHROME CDP LIVE FLOWS & UI/UX TESTS
// ─────────────────────────────────────────────────────────────────────────────
async function runLiveBrowserTests() {
  console.log('\n[4/4] RUNNING LIVE BROWSER END-TO-END SECURITY & UX TESTS (CDP)...');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-security-test-'));

  const chromeProc = spawn(BROWSER_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions'
  ], { stdio: 'ignore' });

  try {
    // Wait for Chrome debugging endpoint
    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      try {
        const versionData = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
        if (versionData && versionData.webSocketDebuggerUrl) {
          wsUrl = versionData.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
    }

    if (!wsUrl) {
      throw new Error(`Could not connect to Chrome CDP on port ${CDP_PORT}`);
    }

    // Connect to browser target
    const browserClient = new CDPClient(wsUrl);
    await browserClient.waitOpen();

    // Create a new tab
    const { targetId } = await browserClient.send('Target.createTarget', { url: 'about:blank' });
    const targetWsUrl = `ws://127.0.0.1:${CDP_PORT}/devtools/page/${targetId}`;
    const pageClient = new CDPClient(targetWsUrl);
    await pageClient.waitOpen();

    await pageClient.send('Page.enable');
    await pageClient.send('Runtime.enable');
    await pageClient.send('DOM.enable');

    // TEST FLOW 1: Verify CSP active in browser DOM on Homepage
    console.log('  Flow 1: Checking CSP DOM presence on Homepage...');
    await pageClient.send('Page.navigate', { url: `${BASE_URL}/index.html` });
    await sleep(1500);

    const cspMetaExists = await pageClient.eval(`
      !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    `);
    assert(cspMetaExists, 'Homepage active DOM has Content-Security-Policy meta tag');

    const nosniffMetaExists = await pageClient.eval(`
      !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')
    `);
    assert(nosniffMetaExists, 'Homepage active DOM has X-Content-Type-Options: nosniff');

    // TEST FLOW 2: Anti-Bot Honeypot Trapping in Booking Modal
    console.log('  Flow 2: Testing Anti-Bot Honeypot Trapping in Booking Form...');
    // Open booking modal for first trip
    await pageClient.eval(`
      const card = document.querySelector('.trip-card');
      if (card) {
        const btn = card.querySelector('button, .cta-btn, [onclick*="openBookingModal"]');
        if (btn) btn.click();
        else if (typeof openBookingModal === 'function') openBookingModal('demo');
      }
    `);
    await sleep(800);

    // Verify honeypot field is invisible to human users
    const hpVisibility = await pageClient.eval(`
      const hp = document.getElementById('hp_field');
      if (!hp) return { exists: false };
      const style = window.getComputedStyle(hp);
      const parent = hp.parentElement;
      const parentStyle = parent ? window.getComputedStyle(parent) : {};
      return {
        exists: true,
        display: style.display,
        visibility: style.visibility,
        parentDisplay: parentStyle.display,
        parentOpacity: parentStyle.opacity
      };
    `);
    assert(hpVisibility.exists, 'Honeypot field #hp_field exists in booking form');

    // Simulate bot filling the honeypot
    const botTrapped = await pageClient.eval(`
      const hp = document.getElementById('hp_field');
      hp.value = 'spam-bot-payload';
      // Attempt submitWebBooking
      let blocked = false;
      const originalWarn = console.warn;
      console.warn = function(...args) {
        if (args.join(' ').includes('honeypot')) blocked = true;
        originalWarn.apply(console, args);
      };
      submitWebBooking();
      console.warn = originalWarn;
      hp.value = ''; // Clean up
      return blocked;
    `);
    assert(botTrapped, 'Bot submission with populated honeypot is silently trapped and blocked');

    // TEST FLOW 3: Form Input Validation Bounds
    console.log('  Flow 3: Testing Client-Side Input Validation Bounds...');
    const validationResult = await pageClient.eval(`
      // Reset honeypot
      document.getElementById('hp_field').value = '';
      // Fill invalid inputs
      document.getElementById('travelerName').value = '';
      document.getElementById('travelerPhone').value = '123';
      document.getElementById('travelerEmail').value = 'not-an-email';
      document.getElementById('consentCheck').checked = false;

      let alertMessage = '';
      const origAlert = window.alert;
      window.alert = (msg) => { alertMessage = msg; };
      
      submitWebBooking();
      window.alert = origAlert;
      return alertMessage;
    `);
    assert(validationResult.length > 0, 'Incomplete / invalid booking form triggers validation rejection');

    // TEST FLOW 4: Concurrency / Double-Click Lock
    console.log('  Flow 4: Testing Concurrency Double-Submit Lock...');
    const concurrencyTest = await pageClient.eval(`
      let firstInvoked = false;
      let secondBlocked = false;
      _isSubmittingBooking = true; // Simulate active request in flight
      
      const origAlert = window.alert;
      let alertFired = false;
      window.alert = () => { alertFired = true; };
      
      // Attempt another submission
      submitWebBooking();
      
      window.alert = origAlert;
      const wasBlocked = _isSubmittingBooking === true && !alertFired;
      _isSubmittingBooking = false; // Release
      return wasBlocked;
    `);
    assert(concurrencyTest, 'Concurrent / rapid double-click while booking in flight is prevented');

    // TEST FLOW 5: XSS Rendering Resilience
    console.log('  Flow 5: Testing XSS Payload Neutralization in Dynamic Trip Rendering...');
    const xssNeutralized = await pageClient.eval(`
      window._xssTriggered = false;
      const testContainer = document.createElement('div');
      testContainer.id = 'xss-test-target';
      document.body.appendChild(testContainer);

      const payloadTitle = 'Trek <img src=invalid-img onerror="window._xssTriggered=true">';
      testContainer.innerHTML = '<h3>' + escapeHtml(payloadTitle) + '</h3>';
      
      return !window._xssTriggered && testContainer.innerHTML.includes('&lt;img');
    `);
    assert(xssNeutralized, 'escapeHtml prevents malicious image error handler execution');

    // TEST FLOW 6: Vendor Portal Auth Gate & Session Protection
    console.log('  Flow 6: Testing Vendor Portal Auth Gate & Access Control...');
    await pageClient.send('Page.navigate', { url: `${BASE_URL}/vendor-portal.html` });
    await sleep(1500);

    const vendorAuthGate = await pageClient.eval(`
      const banner = document.getElementById('vendorLoggedOutBanner');
      const loggedInView = document.getElementById('vendorLoggedInView');
      const isBannerVisible = banner && window.getComputedStyle(banner).display !== 'none';
      const isProtectedHidden = loggedInView && window.getComputedStyle(loggedInView).display === 'none';
      return { hasBanner: !!banner, isBannerVisible, isProtectedHidden };
    `);
    assert(vendorAuthGate.hasBanner && vendorAuthGate.isBannerVisible && vendorAuthGate.isProtectedHidden, 
      'Vendor Portal restricts dashboard access and shows unauthenticated login banner');

    // Test Demo Vendor Authentication
    const vendorDemoAccess = await pageClient.eval(`
      if (typeof loginAsDemoVendor === 'function') {
        loginAsDemoVendor();
        const banner = document.getElementById('vendorLoggedOutBanner');
        const loggedInView = document.getElementById('vendorLoggedInView');
        const isBannerHidden = banner && window.getComputedStyle(banner).display === 'none';
        const isLoggedInVisible = loggedInView && window.getComputedStyle(loggedInView).display !== 'none';
        const greeting = document.getElementById('vendorGreetingTitle')?.textContent || '';
        return { success: isBannerHidden && isLoggedInVisible, greeting };
      }
      return { success: false };
    `);
    assert(vendorDemoAccess.success, 'Vendor Portal allows verified demo login session and reveals dashboard');

    // Verify vendor trip save lock
    const vendorSaveLock = await pageClient.eval(`
      _isSavingTrip = true;
      let blocked = false;
      const origAlert = window.alert;
      window.alert = () => { blocked = true; };
      handleSaveTrip();
      window.alert = origAlert;
      _isSavingTrip = false;
      return !blocked; // Blocked without alert because it returned early
    `);
    assert(vendorSaveLock, 'Vendor Portal handleSaveTrip honors concurrency lock');

    // TEST FLOW 6B: Demo Account Write Operations Rejection & Google Login Prompt Modal
    console.log('  Flow 6B: Testing Demo Account Write Blocking & Google Login Prompt Modal...');
    const demoTripSaveBlocked = await pageClient.eval(`
      closeDemoAuthModal();
      handleSaveTrip();
      const modal = document.getElementById('demoAuthModalOverlay');
      const isOpen = modal && modal.classList.contains('open');
      const hasGoogleBtn = !!document.getElementById('demoAuthModalGoogleBtn');
      const text = modal ? modal.textContent : '';
      closeDemoAuthModal();
      return { isOpen, hasGoogleBtn, hasPrompt: text.includes('Google Sign-In Required') };
    `);
    assert(demoTripSaveBlocked.isOpen, 'Demo Vendor save trip is blocked and opens #demoAuthModalOverlay');
    assert(demoTripSaveBlocked.hasGoogleBtn, '#demoAuthModalOverlay contains Google Sign-In button');
    assert(demoTripSaveBlocked.hasPrompt, '#demoAuthModalOverlay instructs demo user to sign in with Google');

    const demoBookingStatusBlocked = await pageClient.eval(`
      closeDemoAuthModal();
      updateBookingStatus('demo_vb_1', 'confirmed');
      const modal = document.getElementById('demoAuthModalOverlay');
      const isOpen = modal && modal.classList.contains('open');
      closeDemoAuthModal();
      return isOpen;
    `);
    assert(demoBookingStatusBlocked, 'Demo Vendor booking status update is blocked and prompts Google login');

    // TEST FLOW 6C: In-Browser Attack Throttling & Lockout Verification
    console.log('  Flow 6C: Testing SecurityThrottler Attack Burst Lockout in Live DOM...');
    const attackThrottleResult = await pageClient.eval(`
      if (!window.SecurityThrottler) return { loaded: false };
      SecurityThrottler.reset();
      let blockedCount = 0;
      const origAlert = window.alert;
      window.alert = () => {};
      for (let i = 0; i < 7; i++) {
        const allowed = SecurityThrottler.checkAndEnforce('attack_test', { maxBurst: 4, lockoutMs: 30000 });
        if (!allowed) blockedCount++;
      }
      window.alert = origAlert;
      const locked = SecurityThrottler.isLockedOut();
      const rem = SecurityThrottler.getRemainingLockoutSeconds();
      SecurityThrottler.reset();
      return { loaded: true, blockedCount, locked, rem };
    `);
    assert(attackThrottleResult.loaded, 'SecurityThrottler is loaded in Vendor Portal');
    assert(attackThrottleResult.blockedCount >= 3, 'Rapid burst attack operations are blocked by SecurityThrottler');
    assert(attackThrottleResult.locked, 'Attack pattern triggers active security lockout');
    assert(attackThrottleResult.rem > 0, 'Attack lockout has active remaining duration countdown');

    // TEST FLOW 7: Traveller Portal Single Ticket Lookup Safety
    console.log('  Flow 7: Testing Traveller Portal Single Ticket Lookup...');
    await pageClient.send('Page.navigate', { url: `${BASE_URL}/traveller.html?bookingId=ATGL-55441` });
    await sleep(1500);

    // Test Demo Traveller Profile Save Blocking
    const demoTravellerSaveBlocked = await pageClient.eval(`
      if (typeof loginAsDemoTraveller === 'function') loginAsDemoTraveller();
      closeDemoAuthModal();
      saveTravellerProfile();
      const modal = document.getElementById('demoAuthModalOverlay');
      const isOpen = modal && modal.classList.contains('open');
      const text = modal ? modal.textContent : '';
      closeDemoAuthModal();
      return { isOpen, hasPrompt: text.includes('Google Sign-In Required') };
    `);
    assert(demoTravellerSaveBlocked.isOpen, 'Demo Traveller profile save is blocked and triggers #demoAuthModalOverlay');
    assert(demoTravellerSaveBlocked.hasPrompt, 'Traveller demo modal instructs user to sign in with Google');

    const travellerLookup = await pageClient.eval(`
      const input = document.getElementById('quickBookingIdInput');
      return {
        hasInput: !!input,
        inputValue: input ? input.value : ''
      };
    `);
    assert(travellerLookup.hasInput, 'Traveller Portal contains single ticket lookup interface');

    // TEST FLOW 8: UI & UX Accessibility Verification
    console.log('  Flow 8: Testing UI/UX Accessibility (a11y) & Interactive States...');
    const a11yChecks = await pageClient.eval(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const buttonsWithText = buttons.filter(b => b.textContent.trim().length > 0 || b.getAttribute('aria-label'));
      
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      const inputsWithLabels = inputs.filter(i => i.placeholder || i.getAttribute('aria-label') || document.querySelector('label[for="' + i.id + '"]'));
      
      return {
        totalButtons: buttons.length,
        accessibleButtons: buttonsWithText.length,
        totalInputs: inputs.length,
        accessibleInputs: inputsWithLabels.length
      };
    `);
    assert(a11yChecks.accessibleButtons === a11yChecks.totalButtons, 
      `All buttons have accessible names (${a11yChecks.accessibleButtons}/${a11yChecks.totalButtons})`);
    assert(a11yChecks.accessibleInputs === a11yChecks.totalInputs, 
      `All visible inputs have accessible labels or placeholders (${a11yChecks.accessibleInputs}/${a11yChecks.totalInputs})`);

    pageClient.close();
    browserClient.close();
  } finally {
    try {
      chromeProc.kill();
    } catch (e) {}
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
async function runAllTests() {
  console.log('================================================================');
  console.log('  STRICT SECURITY & FUNCTIONAL FLOW VERIFICATION SUITE');
  console.log('================================================================');

  try {
    verifyFirestoreRules();
    verifySecurityHeadersAndCSP();
    verifyClientSideDefenses();
    await runLiveBrowserTests();

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    if (failedTests > 0) {
      console.error(`FAILED TESTS: ${failedTests}`);
      console.log('================================================================');
      process.exit(1);
    } else {
      console.log('ALL SECURITY, FUNCTIONAL FLOW & UI/UX CHECKS PASSED PERFECTLY!');
      console.log('================================================================\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('\nUNEXPECTED TEST RUNNER ERROR:', err);
    process.exit(1);
  }
}

runAllTests();
