const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9227;

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

    ws.on('message', (d) => {
      const msg = JSON.parse(d.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER ERROR]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://127.0.0.1:8080/vendor/sahyadri-trekkers');
    await send('Page.navigate', { url: 'http://127.0.0.1:8080/vendor/sahyadri-trekkers' });
    await sleep(2500);

    const pathname = (await send('Runtime.evaluate', { expression: 'window.location.pathname', returnByValue: true })).result.value;
    const vendorId = (await send('Runtime.evaluate', { expression: 'getVendorIdentifier()', returnByValue: true })).result.value;
    const vName = (await send('Runtime.evaluate', { expression: 'document.getElementById("vName") ? document.getElementById("vName").textContent : "NO vName"', returnByValue: true })).result.value;
    const tripsCount = (await send('Runtime.evaluate', { expression: 'document.querySelectorAll("#vendorTripsGrid .vbento-card").length', returnByValue: true })).result.value;

    console.log('Results:');
    console.log('  pathname:', pathname);
    console.log('  getVendorIdentifier():', vendorId);
    console.log('  vName:', vName);
    console.log('  tripsCount:', tripsCount);

    ws.close();
  } finally {
    browserProc.kill();
  }
})();
