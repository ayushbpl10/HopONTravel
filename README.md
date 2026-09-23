# 🏕️ Ab Toh Ghoom Le (HopON Travel)

**Ab Toh Ghoom Le** is India's premier group travel, weekend trekking, and adventure booking ecosystem. It connects passionate travellers with verified local tour organisers and trek captains with **0% middleman commission**, live GPS radar bus tracking, AI-powered itinerary parsing, and multi-regional language support.

---

## 🏗️ Architecture Overview

The repository is built as a unified cross-platform mobile and web application:

- **Mobile App**: React Native (0.81.5), Expo (SDK 54), Expo Router v6, React 19, TypeScript.
- **Web Platform**: High-performance responsive web client (`web/`) with dark glassmorphic design system (`styles.css`), live CDP browser automation tests, and 4-language i18n support.
- **Backend & Security**: Google Cloud Firestore, Firebase Auth, Google Cloud App Check, reCAPTCHA v3 verification, rate-limiting attack throttler (`security-throttler.js`), and strictly enforced Firestore security rules (`firestore.rules`).
- **Payments**: Razorpay integration with double-booking prevention locks and transaction idempotency.
- **Languages**: 4-language support across **English**, **Hindi (हिन्दी)**, **Marathi (मराठी)**, and **Kannada (ಕನ್ನಡ)** with geo-location detection and 100% translation key parity.

---

## 📚 Documentation & Guides

- 📖 **[Vendor Onboarding & Organiser Guide](docs/VENDOR_ONBOARDING_GUIDE.md)**: Complete step-by-step handbook for tour operators and trek captains to list trips, use the AI WhatsApp importer, manage passenger manifests, and broadcast live GPS radar.
- 💳 **[Payment Gateway Setup](docs/PAYMENT_SETUP.md)**: Configuration guide for Razorpay payment credentials and webhooks.
- 💰 **[Monetization & Business Model](docs/MONETIZATION.md)**: Direct commission-free marketplace model details.

---

## ⚡ Master Quality Gate & Pre-Push Verification

Before pushing any code or deploying to production, run the master quality gate command:

```bash
npm run verify:all
```

This single command orchestrates **7 strict verification gates**:
1. **Docs Freshness**: Validates that all documentation and guides are present and updated.
2. **App 100% Coverage**: Executes Jest test suites and strictly enforces **100.0% line coverage** across every app module.
3. **Web Logic Verification**: Validates all client-side web scripts (`security-throttler.js`, `i18n.js`, `script.js`, `trip.js`, `traveller.js`, `vendor.js`, `vendor-portal.js`).
4. **Build & Type Integrity**: Runs `tsc --noEmit` (TypeScript zero errors), `npm run lint` (ESLint), and web markup audits.
5. **i18n Translation Parity**: Audits all 4 languages (en, hi, mr, kn) for 100% key completeness (zero missing keys).
6. **Mobile Responsiveness Audit**: Tests pages across iPhone 13 (375px), Galaxy S20 (360px), and iPad Mini (768px) with headless Chrome CDP.
7. **Security & E2E Flows**: Executes 199 security/XSS/honeypot tests and 11 browser end-to-end user journeys.

---

## 🧪 Testing Commands

| Command | Description |
| :--- | :--- |
| `npm run verify:all` | **Master Pre-Push Quality Gate** (Runs all 7 checks below) |
| `npm test` | Runs Jest test suite (255 unit & integration tests, 100% line coverage) |
| `npx jest --coverage` | Generates detailed line-by-line coverage report |
| `npm run test:security` | Runs 199 security, honeypot, XSS, i18n, and flow tests |
| `npm run test:responsive`| Audits mobile viewports for horizontal overflow and fluid alignment |
| `npm run test:e2e` | Runs 11 browser CDP end-to-end user flows |
| `npm run test:portals` | Validates web HTML markup, accessibility, and script syntax |

---

## 🚀 Running Locally

### Mobile App (Expo)
```bash
# Start Expo development server
npm start

# Run on Android emulator / physical device
npm run android

# Build production Android APK
npm run build:apk
```

### Web Platform
```bash
# Start local development server with reCAPTCHA & geo-language API
node scripts/serve-web.js
# Access in browser at: http://localhost:8080/
```

---

## 📱 Web Pages

- **Homepage / Discovery**: `index.html`
- **Trip Details & Booking**: `trip.html?id=<tripId>`
- **Traveller Portal & Ticket Lookup**: `traveller.html`
- **Vendor Operations Hub**: `vendor-portal.html`
- **Vendor Public Storefront**: `vendor.html?id=<vendorId>`
- **VIP Early App Access**: `download.html`
- **Privacy Policy**: `privacy.html`
