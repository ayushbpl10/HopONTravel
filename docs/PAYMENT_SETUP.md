# Payment Integration Guide

## Two Separate Payment Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                     PAYMENT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FLOW 1: TRIP BOOKINGS (Traveller → Vendor)                    │
│  ─────────────────────────────────────────                     │
│  • Traveller pays for trip booking                              │
│  • Uses VENDOR's Razorpay account                               │
│  • Money goes to VENDOR's bank                                  │
│  • Service: paymentService.ts                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FLOW 2: PLATFORM CHARGES (Vendor → Ab Toh Ghoom Le)           │
│  ───────────────────────────────────────────────────           │
│  • Vendor pays for export fees (₹10/trip)                       │
│  • Uses PLATFORM's Razorpay account                             │
│  • Money goes to AB TOH GHOOM LE's bank                         │
│  • Service: platformPaymentService.ts                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

# Flow 1: Vendor Collects from Travellers

## Overview

Vendors can connect their **own Razorpay account** to receive payments directly from travellers.

```
Traveller ──₹──▶ Razorpay (Vendor's A/C) ──▶ Vendor's Bank
```

## For Vendors: Setup Guide

### Step 1: Create Razorpay Account

1. Go to [Razorpay Signup](https://dashboard.razorpay.com/signup)
2. Complete KYC verification
3. Wait for account activation (1-2 days)

### Step 2: Get Your API Key

1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to **Settings** → **API Keys**
3. Click **Generate Key**
4. Copy the **Key ID** (starts with `rzp_live_` or `rzp_test_`)

### Step 3: Enable in App

1. Open **Vendor Dashboard**
2. Go to **Payment Gateway** section
3. Toggle **Enable Online Payments** ON
4. Select **Razorpay**
5. Paste your **Razorpay Key ID**
6. Save

### Transaction Charges (MDR)

| Payment Method | Charge |
|----------------|--------|
| UPI | **0%** (Free!) |
| Debit Cards | ~2% + GST |
| Credit Cards | ~2% + GST |
| NetBanking | ~2% + GST |

---

# Flow 2: Platform Charges Vendors

## Overview

Ab Toh Ghoom Le charges vendors for premium features like data export.

```
Vendor ──₹10──▶ Razorpay (Platform's A/C) ──▶ Ab Toh Ghoom Le's Bank
```

## Current Charges

| Feature | Price |
|---------|-------|
| Export trip data (CSV/PDF) | ₹10 per trip |

## Platform Razorpay Setup

The platform's Razorpay key is configured in `app.config.js`:

```javascript
platformRazorpayKey: process.env.PLATFORM_RAZORPAY_KEY || 'rzp_test_TWSNTBjCjlxWVy'
```

For production:
```bash
eas secret:create --name PLATFORM_RAZORPAY_KEY --value "rzp_live_xxxxxxxxxxxx"
```

---

# Technical Reference

## Files

| File | Purpose | Razorpay Key Used |
|------|---------|-------------------|
| `services/paymentService.ts` | Traveller → Vendor | Vendor's key |
| `services/platformPaymentService.ts` | Vendor → Platform | Platform's key |
| `services/razorpayCheckout.ts` | Low-level checkout utility | Passed as param |

## Code Examples

### Vendor Payment (Trip Booking)
```typescript
import { initiateVendorPayment } from '../services/paymentService';

const result = await initiateVendorPayment({
  amount: 1500,
  orderId: 'BOOK_123',
  description: 'Manali Trip Booking',
  customerName: 'John',
  customerEmail: 'john@example.com',
  customerPhone: '9876543210',
  vendorName: 'Mountain Tours',
  vendorPaymentConfig: {
    enabled: true,
    gateway: 'razorpay',
    razorpayKeyId: 'rzp_live_VENDOR_KEY', // Vendor's key
  },
});
```

### Platform Payment (Export Fee)
```typescript
import { chargeExportFee } from '../services/platformPaymentService';

const result = await chargeExportFee(
  'trip_123',
  'Manali Trip',
  'vendor@example.com',
  '9876543210',
  'Mountain Tours'
);
// Uses platform's key automatically
```

---

# Testing

## Test Credentials

Platform test key (pre-configured):
```
rzp_test_TWSNTBjCjlxWVy
```

## Test Cards

| Card Number | Result |
|-------------|--------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Failure |

## Test UPI

| UPI ID | Result |
|--------|--------|
| success@razorpay | Success |
| failure@razorpay | Failure |

---

# FAQ

### Q: Does the platform take commission on trip bookings?
**A**: No. Trip payments go 100% to the vendor. Platform only charges for export (₹10/trip).

### Q: Can vendors use different payment gateways?
**A**: Currently Razorpay only. Cashfree support planned.

### Q: What if vendor doesn't set up Razorpay?
**A**: Travellers pay manually via UPI/WhatsApp.
