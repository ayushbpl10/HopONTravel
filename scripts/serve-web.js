const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WEB_DIR = path.join(__dirname, '..', 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Rate Limiting & Attack Mitigation Per Client IP
const ipRequests = new Map(); // ip -> [timestamps]
const ipLockouts = new Map(); // ip -> lockoutTimestamp
const WINDOW_MS = 10000;      // 10s sliding window
const MAX_REQUESTS = 120;     // Max 120 requests per 10s per IP (generous for asset loading, stops bots/scrapers)
const LOCKOUT_MS = 60000;     // 60s attack lockout

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
  const now = Date.now();

  // 1. Check active attack lockout
  const lockoutUntil = ipLockouts.get(clientIp) || 0;
  if (now < lockoutUntil) {
    const retryAfter = Math.ceil((lockoutUntil - now) / 1000);
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': retryAfter,
      'X-Security-Action': 'Blocked-Attack-Lockout'
    });
    return res.end(JSON.stringify({
      error: 'Security Alert: Rate limit exceeded. Temporarily locked out.',
      retryAfterSeconds: retryAfter
    }));
  }

  // 2. Sliding window request tracking
  let history = ipRequests.get(clientIp) || [];
  history = history.filter(ts => now - ts < WINDOW_MS);

  if (history.length >= MAX_REQUESTS) {
    // Attack threshold breached -> lock out client
    ipLockouts.set(clientIp, now + LOCKOUT_MS);
    ipRequests.set(clientIp, history);
    console.warn(`[SECURITY] Attack pattern detected from IP: ${clientIp}. Locked out for ${LOCKOUT_MS / 1000}s.`);
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': LOCKOUT_MS / 1000,
      'X-Security-Action': 'Attack-Protection-Triggered'
    });
    return res.end(JSON.stringify({
      error: 'Security Alert: Too many rapid requests detected. Your IP is temporarily blocked.',
      retryAfterSeconds: LOCKOUT_MS / 1000
    }));
  }

  history.push(now);
  ipRequests.set(clientIp, history);

  // 3. Static file handling
  const urlPath = req.url.split('?')[0];
  let relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  let filePath = path.join(WEB_DIR, relativePath);

  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`HopONTravel Web Server running at http://localhost:${PORT}/`);
});
