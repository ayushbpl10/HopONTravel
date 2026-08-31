/**
 * Platform Payment Service Tests
 * Tests for platform fees (vendor → Ab Toh Ghoom Le)
 */

// Set __DEV__ before imports
(global as any).__DEV__ = false;

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock_doc_ref'),
  getDoc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  arrayUnion: jest.fn((val) => val),
}));

jest.mock('../config/firebase', () => ({
  db: {},
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        platformRazorpayKey: 'rzp_test_TWSNTBjCjlxWVy',
      },
    },
  },
}));

// Mock razorpayCheckout
jest.mock('../services/razorpayCheckout', () => ({
  openRazorpayCheckout: jest.fn(),
  RazorpayCheckoutResult: {},
}));

import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import {
    chargeExportFee,
    EXPORT_CHARGE,
    hasExportAccess,
    recordExportPayment,
} from '../services/platformPaymentService';
import { openRazorpayCheckout } from '../services/razorpayCheckout';

describe('Platform Payment Service - Export Fees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EXPORT_CHARGE constant', () => {
    it('should be ₹10', () => {
      expect(EXPORT_CHARGE).toBe(10);
    });
  });

  describe('chargeExportFee', () => {
    const tripId = 'trip_123';
    const tripTitle = 'Manali Adventure';
    const vendorEmail = 'vendor@example.com';
    const vendorPhone = '+919876543210';
    const vendorName = 'Test Vendor';

    it('should call openRazorpayCheckout with platform key and correct amount', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: true,
        paymentId: 'pay_export_123',
      });

      const result = await chargeExportFee(
        tripId,
        tripTitle,
        vendorEmail,
        vendorPhone,
        vendorName
      );

      expect(openRazorpayCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpayKey: 'rzp_test_TWSNTBjCjlxWVy', // Platform's key, NOT vendor's
          amount: EXPORT_CHARGE,
          name: 'Ab Toh Ghoom Le', // Platform name
          description: `Export: ${tripTitle}`,
          prefill: {
            name: vendorName,
            email: vendorEmail,
            contact: vendorPhone,
          },
        })
      );
      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay_export_123');
    });

    it('should handle payment success', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: true,
        paymentId: 'pay_success_456',
      });

      const result = await chargeExportFee(
        tripId,
        tripTitle,
        vendorEmail,
        vendorPhone,
        vendorName
      );

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay_success_456');
      expect(result.error).toBeUndefined();
    });

    it('should handle payment cancellation', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Payment cancelled',
      });

      const result = await chargeExportFee(
        tripId,
        tripTitle,
        vendorEmail,
        vendorPhone,
        vendorName
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment cancelled');
    });

    it('should handle payment failure', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Insufficient funds',
      });

      const result = await chargeExportFee(
        tripId,
        tripTitle,
        vendorEmail,
        vendorPhone,
        vendorName
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should use purple theme color for platform payments', async () => {
      (openRazorpayCheckout as jest.Mock).mockResolvedValue({
        success: true,
        paymentId: 'pay_123',
      });

      await chargeExportFee(tripId, tripTitle, vendorEmail, vendorPhone, vendorName);

      expect(openRazorpayCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: { color: '#8b5cf6' }, // Purple for platform
        })
      );
    });
  });

  describe('hasExportAccess', () => {
    it('should return false when vendor document does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const result = await hasExportAccess('vendor_123', 'trip_456');

      expect(result).toBe(false);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'vendors', 'vendor_123');
    });

    it('should return false when paidExports is empty', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ paidExports: [] }),
      });

      const result = await hasExportAccess('vendor_123', 'trip_456');

      expect(result).toBe(false);
    });

    it('should return false when trip is not in paidExports', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          paidExports: [
            { tripId: 'trip_111', paymentId: 'pay_111' },
            { tripId: 'trip_222', paymentId: 'pay_222' },
          ],
        }),
      });

      const result = await hasExportAccess('vendor_123', 'trip_456');

      expect(result).toBe(false);
    });

    it('should return true when trip is in paidExports', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          paidExports: [
            { tripId: 'trip_111', paymentId: 'pay_111' },
            { tripId: 'trip_456', paymentId: 'pay_456' },
          ],
        }),
      });

      const result = await hasExportAccess('vendor_123', 'trip_456');

      expect(result).toBe(true);
    });

    it('should handle errors gracefully and return false', async () => {
      (getDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await hasExportAccess('vendor_123', 'trip_456');

      expect(result).toBe(false);
    });
  });

  describe('recordExportPayment', () => {
    it('should update vendor document with payment record', async () => {
      const vendorId = 'vendor_123';
      const tripId = 'trip_456';
      const paymentId = 'pay_789';

      await recordExportPayment(vendorId, tripId, paymentId);

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'vendors', vendorId);
      expect(updateDoc).toHaveBeenCalledWith(
        'mock_doc_ref',
        expect.objectContaining({
          paidExports: expect.objectContaining({
            tripId,
            paymentId,
            amount: EXPORT_CHARGE,
          }),
        })
      );
    });

    it('should include timestamp in payment record', async () => {
      const beforeTime = Date.now();
      
      await recordExportPayment('vendor_123', 'trip_456', 'pay_789');
      
      const afterTime = Date.now();

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paidExports: expect.objectContaining({
            paidAt: expect.any(Number),
          }),
        })
      );

      // Verify timestamp is reasonable
      const call = (updateDoc as jest.Mock).mock.calls[0][1];
      expect(call.paidExports.paidAt).toBeGreaterThanOrEqual(beforeTime);
      expect(call.paidExports.paidAt).toBeLessThanOrEqual(afterTime);
    });

    it('should use arrayUnion to append payment', async () => {
      await recordExportPayment('vendor_123', 'trip_456', 'pay_789');

      expect(arrayUnion).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip_456',
          paymentId: 'pay_789',
        })
      );
    });
  });
});

describe('Platform vs Vendor Payment Separation', () => {
  it('platform payments should use PLATFORM key', async () => {
    (openRazorpayCheckout as jest.Mock).mockResolvedValue({ success: true, paymentId: 'pay_1' });

    await chargeExportFee('trip_1', 'Test', 'a@b.com', '1234567890', 'Vendor');

    const call = (openRazorpayCheckout as jest.Mock).mock.calls[0][0];
    expect(call.razorpayKey).toBe('rzp_test_TWSNTBjCjlxWVy'); // Platform key
    expect(call.name).toBe('Ab Toh Ghoom Le'); // Platform name
  });

  it('platform payments should show platform branding', async () => {
    (openRazorpayCheckout as jest.Mock).mockResolvedValue({ success: true, paymentId: 'pay_1' });

    await chargeExportFee('trip_1', 'Manali Trip', 'a@b.com', '1234567890', 'Test Vendor');

    const call = (openRazorpayCheckout as jest.Mock).mock.calls[0][0];
    expect(call.name).toBe('Ab Toh Ghoom Le');
    expect(call.description).toContain('Export');
    expect(call.description).toContain('Manali Trip');
  });
});
