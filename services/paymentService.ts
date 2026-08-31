/**
 * =====================================================
 * VENDOR PAYMENT SERVICE
 * =====================================================
 * 
 * Purpose: Travellers pay VENDORS for trip bookings
 * Money flows: Traveller → Vendor's Razorpay Account
 * 
 * Uses: VENDOR's own Razorpay Key (configured in Vendor Dashboard)
 * 
 * This is SEPARATE from platform payments (export fees).
 * =====================================================
 */

import { openRazorpayCheckout, RazorpayCheckoutResult } from './razorpayCheckout';

// Payment gateway types
export type PaymentGateway = 'razorpay' | 'cashfree' | 'manual';

export interface VendorPaymentConfig {
  enabled: boolean;
  gateway: PaymentGateway;
  razorpayKeyId?: string; // Vendor's own Razorpay Key
  cashfreeAppId?: string;
}

export interface PaymentOptions {
  amount: number; // Amount in INR
  orderId: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vendorName: string;
  vendorPaymentConfig: VendorPaymentConfig;
  notes?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
  gateway: PaymentGateway;
}

/**
 * Initiate payment from Traveller to Vendor
 * Uses VENDOR's Razorpay account - money goes directly to vendor
 */
export const initiateVendorPayment = async (
  options: PaymentOptions
): Promise<PaymentResult> => {
  const vendorConfig = options.vendorPaymentConfig;

  // Check if vendor has enabled online payments
  if (!vendorConfig?.enabled || vendorConfig.gateway === 'manual') {
    return {
      success: false,
      error: 'MANUAL_PAYMENT',
      gateway: 'manual',
    };
  }

  // Route to appropriate gateway
  switch (vendorConfig.gateway) {
    case 'razorpay':
      return payViaRazorpay(options);
    case 'cashfree':
      return payViaCashfree(options);
    default:
      return {
        success: false,
        error: 'Unknown payment gateway',
        gateway: vendorConfig.gateway,
      };
  }
};

/**
 * Pay vendor via Razorpay
 * Uses VENDOR's Razorpay Key - payment goes to vendor's bank account
 */
const payViaRazorpay = async (options: PaymentOptions): Promise<PaymentResult> => {
  const vendorRazorpayKey = options.vendorPaymentConfig.razorpayKeyId;

  // Validate vendor has configured Razorpay
  if (!vendorRazorpayKey || !vendorRazorpayKey.startsWith('rzp_')) {
    return {
      success: false,
      error: 'Vendor has not configured Razorpay. Please pay manually via UPI/WhatsApp.',
      gateway: 'razorpay',
    };
  }

  // Open Razorpay checkout with VENDOR's key
  const result: RazorpayCheckoutResult = await openRazorpayCheckout({
    razorpayKey: vendorRazorpayKey, // <-- VENDOR's key, NOT platform's
    amount: options.amount,
    name: options.vendorName, // Show vendor name
    description: options.description,
    prefill: {
      name: options.customerName,
      email: options.customerEmail,
      contact: options.customerPhone,
    },
    notes: {
      booking_id: options.orderId,
      vendor_name: options.vendorName,
      ...options.notes,
    },
    theme: { color: '#00b0ff' },
  });

  return {
    success: result.success,
    paymentId: result.paymentId,
    orderId: result.orderId,
    error: result.error,
    gateway: 'razorpay',
  };
};

/**
 * Pay vendor via Cashfree (placeholder)
 */
const payViaCashfree = async (options: PaymentOptions): Promise<PaymentResult> => {
  // TODO: Implement Cashfree integration
  return {
    success: false,
    error: 'Cashfree integration coming soon',
    gateway: 'cashfree',
  };
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if vendor has online payment enabled
 */
export const isVendorPaymentEnabled = (config?: VendorPaymentConfig): boolean => {
  return !!(
    config?.enabled &&
    config.gateway !== 'manual' &&
    (config.razorpayKeyId || config.cashfreeAppId)
  );
};

/**
 * Get gateway info for display
 */
export const getGatewayInfo = (gateway: PaymentGateway) => {
  const info: Record<PaymentGateway, any> = {
    razorpay: {
      name: 'Razorpay',
      supportedMethods: ['UPI', 'Cards', 'NetBanking', 'Wallets'],
      mdr: '2% + GST (0% for UPI)',
    },
    cashfree: {
      name: 'Cashfree',
      supportedMethods: ['UPI', 'Cards', 'NetBanking', 'Wallets'],
      mdr: '1.9% + GST',
    },
    manual: {
      name: 'Manual Payment',
      supportedMethods: ['UPI', 'Bank Transfer', 'Cash'],
      mdr: '0%',
    },
  };
  return info[gateway];
};

// Legacy exports for backward compatibility
export const initiateRazorpayPayment = initiateVendorPayment;
export const initiatePayment = initiateVendorPayment;
export const isPaymentGatewayEnabled = isVendorPaymentEnabled;
