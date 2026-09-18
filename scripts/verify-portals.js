const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== VERIFYING WEB ASSETS AND SCRIPTS ===\n');

// 1. Check HTML files exist and contain key elements
const webDir = path.join(__dirname, '..', 'web');
const filesToCheck = [
  { file: 'index.html', required: ['traveller.html', 'vendor-portal.html', 'id="navbar"'] },
  { file: 'traveller.html', required: ['tab-bookings', 'tab-tracking', 'tab-wishlist', 'tab-profile', 'quickBookingIdInput', 'leafletMap'] },
  { file: 'vendor-portal.html', required: ['vtab-trips', 'vtab-bookings', 'vtab-settings', 'tripModalOverlay', 'aiModalOverlay', 'broadcastModalOverlay'] },
  { file: 'trip.html', required: ['tbBatchSelect', 'tbPackageSelect', 'tbSeatsInput', 'tbPriceDisplay', 'traveller.html'] },
  { file: 'vendor.html', required: ['vendor-portal.html'] }
];

let allPassed = true;

filesToCheck.forEach(({ file, required }) => {
  const filePath = path.join(webDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`FAIL: ${file} does not exist.`);
    allPassed = false;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = required.filter(term => !content.includes(term));
  if (missing.length > 0) {
    console.error(`FAIL: ${file} is missing required terms: ${missing.join(', ')}`);
    allPassed = false;
  } else {
    console.log(`PASS: ${file} contains all required markup and elements.`);
  }
});

// 2. Syntax validation on JS files
const jsFiles = ['script.js', 'trip.js', 'vendor.js', 'traveller.js', 'vendor-portal.js'];

jsFiles.forEach(file => {
  const filePath = path.join(webDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    new vm.Script(code);
    console.log(`PASS: ${file} JavaScript syntax is valid.`);
  } catch (err) {
    console.error(`FAIL: ${file} JavaScript syntax error: ${err.message}`);
    allPassed = false;
  }
});

// 3. Test WhatsApp Parser Function logic from vendor-portal.js
try {
  const vpCode = fs.readFileSync(path.join(webDir, 'vendor-portal.js'), 'utf8');
  // Test local parser heuristic with sample message
  const sampleMsg = `
    *Harishchandragad Trek*
    Destination: Ahmednagar
    Dates: 25-26 Oct
    Cost: 1399/- with transport
    Pickup points: Swargate - 10:00 PM
    Includes: Bus transport, breakfast, trek leader
    Excludes: Dinner
  `;
  // Extract and evaluate parseWhatsAppLocal
  const parseMatch = vpCode.match(/function parseWhatsAppLocal\(text\) \{([\s\S]*?)\n\}/);
  if (parseMatch) {
    const fn = new Function('text', parseMatch[1]);
    const res = fn(sampleMsg);
    if (res && res.title && res.price === 1399 && res.category === 'Trekking') {
      console.log('PASS: parseWhatsAppLocal successfully extracted title, price (1399), and category (Trekking).');
    } else {
      console.error('FAIL: parseWhatsAppLocal unexpected output:', res);
      allPassed = false;
    }
  }
} catch (e) {
  console.error('FAIL: WhatsApp parser test error:', e.message);
  allPassed = false;
}

console.log('\n=== ALL VERIFICATION CHECKS COMPLETE: ' + (allPassed ? 'ALL PASSED!' : 'FAILED') + ' ===');
process.exit(allPassed ? 0 : 1);
