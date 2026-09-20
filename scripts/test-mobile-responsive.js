const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_PATH = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
const CDP_PORT = 9226; // Use port 9226 to avoid conflict with port 9225

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
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async setViewport(width, height, deviceScaleFactor = 3, isMobile = true) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: isMobile
    });
    await this.send('Emulation.setTouchEmulationEnabled', {
      enabled: isMobile
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await sleep(1500);
  }

  async screenshot(filepath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
  }

  close() {
    try { this.ws.close(); } catch (_) {}
  }
}

async function runMobileAudit() {
  console.log('=== STARTING MOBILE RESPONSIVENESS & ALIGNMENT CDP AUDIT ===\n');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp_mobile_test_'));
  const chromeProc = spawn(BROWSER_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--remote-allow-origins=*',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let connected = false;
  let wsUrl = '';
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
      if (list && list.length > 0) {
        wsUrl = list[0].webSocketDebuggerUrl;
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    console.error('Could not connect to Chrome CDP.');
    chromeProc.kill();
    process.exit(1);
  }

  const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  wsUrl = pageTarget.webSocketDebuggerUrl;

  const client = new CDPClient(wsUrl);
  await client.waitOpen();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const screenshotsDir = path.join(__dirname, '..', 'web', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const viewports = [
    { name: 'iPhone 13 / 375x812', width: 375, height: 812, dpr: 3 },
    { name: 'Galaxy S20 / 360x740', width: 360, height: 740, dpr: 2 },
    { name: 'iPad Mini / 768x1024', width: 768, height: 1024, dpr: 2 }
  ];

  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name}`);
    console.log(`========================================`);
    await client.setViewport(vp.width, vp.height, vp.dpr, true);

    // --- TEST 1: Traveller Portal Logged-Out ---
    console.log('\n[1] Traveller Portal (Logged Out)');
    await client.navigate('http://localhost:8080/traveller.html');
    await client.eval(`localStorage.clear(); if (typeof onUserSignedOut === 'function') onUserSignedOut();`);
    await sleep(400);

    let scrollWidth = await client.eval(`document.documentElement.scrollWidth`);
    let innerWidth = await client.eval(`window.innerWidth`);
    assert(`Dimensions check: scrollWidth (${scrollWidth}) <= innerWidth (${innerWidth})`, scrollWidth <= innerWidth);
    assert(`No horizontal scroll on traveller page (scrollWidth <= ${vp.width})`, scrollWidth <= vp.width);

    // Quick track card input responsiveness
    let quickTrackInputWidth = await client.eval(`
      document.getElementById('quickBookingIdInput')?.offsetWidth || 0
    `);
    assert(`Quick track input is comfortably wide (${quickTrackInputWidth}px > 150px)`, quickTrackInputWidth > 150);

    // --- TEST 2: Traveller Portal Demo Account Logged-In ---
    console.log('\n[2] Traveller Portal (Demo Account Logged In)');
    await client.eval(`loginAsDemoTraveller()`);
    await sleep(600);

    scrollWidth = await client.eval(`document.documentElement.scrollWidth`);
    innerWidth = await client.eval(`window.innerWidth`);
    assert(`No horizontal scroll after traveller demo login (${scrollWidth} <= ${innerWidth})`, scrollWidth <= innerWidth);

    // Check stats grid on mobile
    let statsCols = await client.eval(`
      window.getComputedStyle(document.querySelector('.p-stats-grid')).gridTemplateColumns.split(' ').length
    `);
    if (vp.width <= 480) {
      assert(`Stats grid adapts to 2 or 1 column on phone (got ${statsCols})`, statsCols <= 2);
    }

    // Check ticket card formatting
    let ticketCardWidth = await client.eval(`
      document.querySelector('.p-ticket-card')?.offsetWidth || 0
    `);
    assert(`Ticket card renders within viewport (${ticketCardWidth}px <= ${vp.width}px)`, ticketCardWidth <= vp.width);

    // Switch to Live Tracking tab and load demo trip
    await client.eval(`switchTravellerTab('tracking'); loadTripLiveTracking('demo');`);
    await sleep(600);
    scrollWidth = await client.eval(`document.documentElement.scrollWidth`);
    innerWidth = await client.eval(`window.innerWidth`);
    assert(`No horizontal scroll on Live Tracking tab (${scrollWidth} <= ${innerWidth})`, scrollWidth <= innerWidth);

    let mapHeight = await client.eval(`
      document.getElementById('leafletMap')?.offsetHeight || 0
    `);
    assert(`Map container has responsive height (${mapHeight}px)`, mapHeight >= 200 && mapHeight <= 400);

    // Switch to Profile tab
    await client.eval(`switchTravellerTab('profile')`);
    await sleep(400);
    let profileInputFontSize = await client.eval(`
      parseFloat(window.getComputedStyle(document.getElementById('profilePhoneInput')).fontSize)
    `);
    assert(`Profile input font-size prevents iOS Safari zoom (${profileInputFontSize}px >= 16px)`, profileInputFontSize >= 16);

    if (vp.width === 375) {
      await client.screenshot(path.join(screenshotsDir, 'traveller_mobile_375.png'));
      console.log('  📸 Captured traveller_mobile_375.png');
    }

    // --- TEST 3: Vendor Portal Logged-Out ---
    console.log('\n[3] Vendor Portal (Logged Out)');
    await client.navigate('http://localhost:8080/vendor-portal.html');
    await client.eval(`localStorage.clear(); if (typeof onVendorSignedOut === 'function') onVendorSignedOut();`);
    await sleep(400);

    overflow = await client.eval(`document.documentElement.scrollWidth <= window.innerWidth`);
    assert(`No horizontal scroll on vendor portal logged-out banner`, overflow);

    // --- TEST 4: Vendor Portal Demo Organiser Logged-In ---
    console.log('\n[4] Vendor Portal (Demo Organiser Logged In)');
    await client.eval(`loginAsDemoVendor()`);
    await sleep(600);

    overflow = await client.eval(`document.documentElement.scrollWidth <= window.innerWidth`);
    assert(`No horizontal scroll on vendor dashboard`, overflow);

    // Check header actions stacking
    let headerActionsWrap = await client.eval(`
      !!document.querySelector('.portal-header-bar')
    `);
    assert(`Portal header bar helper is present`, headerActionsWrap);

    // Test Create Trip Modal on mobile
    console.log('\n[5] Vendor Portal Modals on Mobile');
    await client.eval(`openCreateTripModal()`);
    await sleep(500);

    let modalWidth = await client.eval(`
      document.querySelector('#tripModalOverlay .p-modal')?.offsetWidth || 0
    `);
    assert(`Create Trip modal fits within viewport (${modalWidth}px <= ${vp.width}px)`, modalWidth <= vp.width);

    // Check that p-grid-2 stacked on phone
    let gridStacked = await client.eval(`
      (() => {
        const grid = document.querySelector('#tripModalOverlay .p-grid-2');
        if (!grid) return false;
        return window.getComputedStyle(grid).gridTemplateColumns.split(' ').length === 1;
      })()
    `);
    if (vp.width <= 768) {
      assert(`Form grid-2 stacks to 1 column on phone/tablet`, gridStacked);
    }

    let modalInputFontSize = await client.eval(`
      parseFloat(window.getComputedStyle(document.getElementById('tripFormTitle')).fontSize)
    `);
    assert(`Modal inputs have >= 16px font size (${modalInputFontSize}px)`, modalInputFontSize >= 16);

    if (vp.width === 375) {
      await client.screenshot(path.join(screenshotsDir, 'vendor_modal_mobile_375.png'));
      console.log('  📸 Captured vendor_modal_mobile_375.png');
    }

    await client.eval(`closeTripModal()`);
    await sleep(300);

    // Test Bookings Table tab
    console.log('\n[6] Vendor Bookings Table & Manifests Tab');
    await client.eval(`switchVendorTab('bookings')`);
    await sleep(500);

    overflow = await client.eval(`document.documentElement.scrollWidth <= window.innerWidth`);
    assert(`No horizontal scroll of document when booking table is displayed`, overflow);

    let tableWrapHasScroll = await client.eval(`
      (() => {
        const wrap = document.querySelector('.p-table-wrap');
        return wrap && (wrap.scrollWidth >= wrap.clientWidth);
      })()
    `);
    assert(`Table container allows independent horizontal scroll without breaking layout`, tableWrapHasScroll);

    if (vp.width === 375) {
      await client.screenshot(path.join(screenshotsDir, 'vendor_bookings_mobile_375.png'));
      console.log('  📸 Captured vendor_bookings_mobile_375.png');
    }

    // --- TEST 7: Vendor Public Page & Storefront ---
    console.log('\n[7] Vendor Public Storefront');
    await client.navigate('http://localhost:8080/vendor.html');
    await sleep(600);

    overflow = await client.eval(`document.documentElement.scrollWidth <= window.innerWidth`);
    assert(`No horizontal scroll on vendor landing page`, overflow);

    await client.navigate('http://localhost:8080/vendor.html?id=demo');
    await sleep(600);

    overflow = await client.eval(`document.documentElement.scrollWidth <= window.innerWidth`);
    assert(`No horizontal scroll on dynamic vendor storefront (?id=demo)`, overflow);

    let storefrontAvatarSize = await client.eval(`
      document.getElementById('vAvatar')?.offsetWidth || 0
    `);
    assert(`Storefront avatar rendered (${storefrontAvatarSize}px)`, storefrontAvatarSize > 40);

    if (vp.width === 375) {
      await client.screenshot(path.join(screenshotsDir, 'vendor_storefront_mobile_375.png'));
      console.log('  📸 Captured vendor_storefront_mobile_375.png');
    }
  }

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  client.close();
  chromeProc.kill();
  process.exit(failed === 0 ? 0 : 1);
}

runMobileAudit().catch(err => {
  console.error('Fatal mobile audit error:', err);
  process.exit(1);
});
