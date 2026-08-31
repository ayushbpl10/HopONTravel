/**
 * Payment Service Tests
 * Tests for vendor payment flows (traveller → vendor)
 */

import { Alert, Platform } from 'react-native';

// Mock react-native
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'web',
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      platformRazorpayKey: 'rzp_test_TWSNTBjCjlxWVy',
    },
  },
}));

// Mock razorpayCheckout
jest.mock('../services/razorpayCheckout', () => ({
  openRazorpayCheckout: jest.fn(),
}));

import {
  initiateVendorPayment,
  isVendorPaymentEnabled,
  getGatewayInfo,
  PaymentGateway,
  VendorPaymentConfig,
} from '../services/paymentService';
import { openRazorpayCheckout } from '../services/razorpayCheckout';

describe('Payment Service - Vendor Payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateVendorPayment', () => {
    const baseOptions = {
      amount: 1500,
      orderId: 'ATGL-12345678',
      description: 'Booking for Manali Trip - Standard Package',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      customerPhone: '+919876543210',
      vendorName: 'Mountain Tours',
    };

    it('should return MANUAL_PAYMENT when vendor has not enabled payments', async () => {
      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: false,
          gateway: 'manual' as PaymentGateway,
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MANUAL_PAYMENT');
      expect(result.gateway).toBe('manual');
    });

    it('should return MANUAL_PAYMENT when gateway is set to manual', async () => {
      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'manual' as PaymentGateway,
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MANUAL_PAYMENT');
      expect(result.gateway).toBe('manual');
    });

    it('should return error when vendor Razorpay key is missing', async () => {
      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'razorpay' as PaymentGateway,
          razorpayKeyId: undefined,
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Vendor has not configured Razorpay');
      expect(result.gateway).toBe('razorpay');
    });

    it('should return error when vendor Razorpay key is invalid', async () => {
      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'razorpay' as PaymentGateway,
          razorpayKeyId: 'invalid_key',
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Vendor has not configured Razorpay');
    });

    it('should call openRazorpayCheckout with vendor key when properly configured', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: true,
        paymentId: 'pay_test_123',
        orderId: 'order_test_123',
      });

      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'razorpay' as PaymentGateway,
          razorpayKeyId: 'rzp_test_vendor_key',
        },
      };

      const result = await initiateVendorPayment(options);

      expect(openRazorpayCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpayKey: 'rzp_test_vendor_key',
          amount: 1500,
          name: 'Mountain Tours',
          description: 'Booking for Manali Trip - Standard Package',
        })
      );
      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay_test_123');
      expect(result.gateway).toBe('razorpay');
    });

    it('should handle payment failure from Razorpay', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Payment cancelled by user',
      });

      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'razorpay' as PaymentGateway,
          razorpayKeyId: 'rzp_test_vendor_key',
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment cancelled by user');
    });

    it('should return error for Cashfree gateway (not implemented)', async () => {
      const options = {
        ...baseOptions,
        vendorPaymentConfig: {
          enabled: true,
          gateway: 'cashfree' as PaymentGateway,
          cashfreeAppId: 'test_app_id',
        },
      };

      const result = await initiateVendorPayment(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cashfree integration coming soon');
      expect(result.gateway).toBe('cashfree');
    });
  });

  describe('isVendorPaymentEnabled', () => {
    it('should return false when config is undefined', () => {
      expect(isVendorPaymentEnabled(undefined)).toBe(false);
    });

    it('should return false when not enabled', () => {
      const config: VendorPaymentConfig = {
        enabled: false,
        gateway: 'razorpay',
        razorpayKeyId: 'rzp_test_key',
      };
      expect(isVendorPaymentEnabled(config)).toBe(false);
    });

    it('should return false when gateway is manual', () => {
      const config: VendorPaymentConfig = {
        enabled: true,
        gateway: 'manual',
      };
      expect(isVendorPaymentEnabled(config)).toBe(false);
    });

    it('should return false when no payment key is provided', () => {
      const config: VendorPaymentConfig = {
        enabled: true,
        gateway: 'razorpay',
      };
      expect(isVendorPaymentEnabled(config)).toBe(false);
    });

    it('should return true when Razorpay is properly configured', () => {
      const config: VendorPaymentConfig = {
        enabled: true,
        gateway: 'razorpay',
        razorpayKeyId: 'rzp_test_vendor_key',
      };
      expect(isVendorPaymentEnabled(config)).toBe(true);
    });

    it('should return true when Cashfree is properly configured', () => {
      const config: VendorPaymentConfig = {
        enabled: true,
        gateway: 'cashfree',
        cashfreeAppId: 'test_app_id',
      };
      expect(isVendorPaymentEnabled(config)).toBe(true);
    });
  });

  describe('getGatewayInfo', () => {
    it('should return Razorpay info', () => {
      const info = getGatewayInfo('razorpay');
      expect(info.name).toBe('Razorpay');
      expect(info.supportedMethods).toContain('UPI');
      expect(info.supportedMethods).toContain('Cards');
    });

    it('should return Cashfree info', () => {
      const info = getGatewayInfo('cashfree');
      expect(info.name).toBe('Cashfree');
      expect(info.mdr).toContain('1.9%');
    });

    it('should return Manual payment info', () => {
      const info = getGatewayInfo('manual');
      expect(info.name).toBe('Manual Payment');
      expect(info.mdr).toBe('0%');
      expect(info.supportedMethods).toContain('Cash');
    });
  });
});
