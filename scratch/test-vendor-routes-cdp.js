const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9228;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browserProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  try {
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
        break;
      } catch (e) {}
    }

    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        const handler = (data) => {
          const res = JSON.parse(data.toString());
          if (res.id === msgId) {
            ws.off('message', handler);
            if (res.error) reject(new Error(res.error.message));
            else resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    async function navigateAndWait(url) {
      const loadPromise = new Promise(resolve => {
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.method === 'Page.loadEventFired') {
            ws.off('message', handler);
            resolve();
          }
        };
        ws.on('message', handler);
      });
      await send('Page.navigate', { url });
      await loadPromise;
      await sleep(600); // Allow DOM painting & initial async scripts
    }

    async function evalCode(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return res.result ? res.result.value : undefined;
    }

    // 1. Test /vendor/sahyadri-trekkers
    console.log('Testing dedicated route: /vendor/sahyadri-trekkers');
    await navigateAndWait('http://127.0.0.1:8080/vendor/sahyadri-trekkers');

    const v1Title = await evalCode('document.title');
    const v1Name = await evalCode('document.getElementById("vName") ? document.getElementById("vName").textContent.trim() : ""');
    const v1Route = await evalCode('document.getElementById("vRouteDisplay") ? document.getElementById("vRouteDisplay").textContent.trim() : ""');
    const v1Trips = await evalCode('document.querySelectorAll("#vendorTripsGrid .vbento-card").length');
    console.log('  Title:', v1Title);
    console.log('  Name:', v1Name);
    console.log('  Route badge:', v1Route);
    console.log('  Listed Trips Count:', v1Trips);

    // 2. Test /vendor/camp-wanderers
    console.log('\nTesting dedicated route: /vendor/camp-wanderers');
    await navigateAndWait('http://127.0.0.1:8080/vendor/camp-wanderers');

    const v2Title = await evalCode('document.title');
    const v2Name = await evalCode('document.getElementById("vName") ? document.getElementById("vName").textContent.trim() : ""');
    const v2Trips = await evalCode('document.querySelectorAll("#vendorTripsGrid .vbento-card").length');
    console.log('  Title:', v2Title);
    console.log('  Name:', v2Name);
    console.log('  Listed Trips Count:', v2Trips);

    // 3. Test /v/demo
    console.log('\nTesting short dedicated route: /v/demo');
    await navigateAndWait('http://127.0.0.1:8080/v/demo');

    const v3Name = await evalCode('document.getElementById("vName") ? document.getElementById("vName").textContent.trim() : ""');
    const v3Trips = await evalCode('document.querySelectorAll("#vendorTripsGrid .vbento-card").length');
    console.log('  Name:', v3Name);
    console.log('  Listed Trips Count:', v3Trips);

    // 4. Test /vendor.html?id=demo (Backwards-compatibility)
    console.log('\nTesting query param route: /vendor.html?id=demo');
    await navigateAndWait('http://127.0.0.1:8080/vendor.html?id=demo');

    const v4Name = await evalCode('document.getElementById("vName") ? document.getElementById("vName").textContent.trim() : ""');
    const v4Trips = await evalCode('document.querySelectorAll("#vendorTripsGrid .vbento-card").length');
    console.log('  Name:', v4Name);
    console.log('  Listed Trips Count:', v4Trips);

    // 5. Test /vendor (Partner landing page without ID/slug)
    console.log('\nTesting general partner page: /vendor');
    await navigateAndWait('http://127.0.0.1:8080/vendor');

    const isHeroVisible = await evalCode('document.querySelector(".vhero") && document.querySelector(".vhero").style.display !== "none"');
    console.log('  Partner Landing Hero Visible:', isHeroVisible);

    ws.close();
  } finally {
    browserProc.kill();
  }
})();
