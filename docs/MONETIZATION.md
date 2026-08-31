# Ab Toh Ghoom Le - Monetization Guide

## Revenue Model

Ab Toh Ghoom Le generates revenue through **data export fees**, not transaction commissions.

### Export Fee: ₹10 per trip

When vendors want to export booking data for a trip, they pay ₹10 to:
- Download traveller data as Excel (CSV)
- Download booking report as PDF
- Get contact details for offline use

### Why This Model?

| Feature | Our Approach | Traditional Approach |
|---------|--------------|---------------------|
| Transaction Fee | 0% | 5-15% per booking |
| Export Fee | ₹10/trip | Often free |
| Vendor Acceptance | High (no hidden costs) | Low (feels like tax) |
| Revenue Predictability | Per-trip | Per-booking (variable) |

## Screenshot Prevention

To protect the export revenue model, the app prevents screenshots in the Vendor Dashboard:

### Android
- Uses `FLAG_SECURE` to prevent screenshots and screen recording
- System screenshot function returns black screen

### iOS  
- Detects screenshot attempts and shows warning
- Uses screen capture notification API

### Web
- Disables right-click context menu
- Prevents Ctrl+P (print)
- Disables text selection on sensitive data

## Technical Implementation

### Platform Payment Service

Located at `services/platformPaymentService.ts`:

```typescript
// Export charge
export const EXPORT_CHARGE = 10; // ₹10

// Check if vendor has paid for export
export const hasExportAccess = async (vendorId, tripId) => { ... }

// Process export payment
export const initiateExportPayment = async (tripId, tripTitle, ...) => { ... }
```

### Export Data Service

Located at `utils/exportData.ts`:

- `exportToCSV()` - Generates Excel-compatible CSV
- `exportToPDF()` - Generates formatted PDF report
- `showExportDialog()` - Shows format selection

### Screenshot Prevention

Located at `utils/screenshotPrevention.ts`:

```typescript
// Hook for components
useScreenshotPrevention(enabled: boolean)

// Manual control
enableScreenshotPrevention()
disableScreenshotPrevention()
```

## Platform Razorpay Setup

The platform needs its own Razorpay account to receive export fees.

### 1. Create Razorpay Account

Create a Razorpay account for Ab Toh Ghoom Le (the platform).

### 2. Set EAS Secret

```bash
eas secret:create --name PLATFORM_RAZORPAY_KEY --value "rzp_live_xxxxxxxxxxxx"
```

### 3. Key Configuration

The key is loaded in `app.config.js`:
```javascript
platformRazorpayKey: process.env.PLATFORM_RAZORPAY_KEY || '',
```

## Revenue Tracking

Export payments are tracked in Firestore:

```
vendors/{vendorId}/
  paidExports: [
    {
      tripId: "trip_123",
      paymentId: "pay_xxxx",
      paidAt: 1234567890,
      amount: 10
    }
  ]
```

## Future Revenue Opportunities

### Premium Features (Planned)
- Advanced analytics dashboard
- Bulk export (all trips)
- Custom branding on PDFs
- Priority support

### Pricing Ideas
| Feature | Price |
|---------|-------|
| Single trip export | ₹10 |
| Monthly unlimited exports | ₹99/month |
| Bulk export (all trips) | ₹49 |
| White-label PDF reports | ₹199/month |

## FAQ

### Q: Why charge for exports?
**A**: This creates sustainable revenue without burdening travellers or taking commissions from vendors.

### Q: Can vendors screenshot booking data?
**A**: No. Screenshots are blocked in the Vendor Dashboard. This protects the export fee model.

### Q: What if a vendor pays but export fails?
**A**: Payment is recorded permanently. They can retry export anytime without paying again.

### Q: Do travellers pay anything?
**A**: No. All platform fees are charged to vendors only.
