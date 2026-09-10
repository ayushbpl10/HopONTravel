/**
 * =====================================================
 * PLATFORM PAYMENT SERVICE
 * =====================================================
 * 
 * Purpose: Ab Toh Ghoom Le charges VENDORS for platform services
 * Money flows: Vendor → Ab Toh Ghoom Le's Razorpay Account
 * 
 * Uses: PLATFORM's Razorpay Key (configured in app.config.js)
 * 
 * Current charges:
 * - Export fee: ₹10 per trip data export
 * 
 * This is SEPARATE from vendor payments (trip bookings).
 * =====================================================
 */

import Constants from 'expo-constants';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { openRazorpayCheckout, RazorpayCheckoutResult } from './razorpayCheckout';

// =====================================================
// PLATFORM'S RAZORPAY KEY & PRICING
// =====================================================
// Dynamic Key fetched from Firestore doc 'config/platform' -> field 'platformRazorpayKey'
const DEFAULT_PLATFORM_RAZORPAY_KEY = Constants.expoConfig?.extra?.platformRazorpayKey || 'rzp_test_TWSNTBjCjlxWVy';
export const EXPORT_CHARGE = 10; // ₹10 per trip export

export const getPlatformRazorpayKey = async (): Promise<string> => {
  try {
    const configSnap = await getDoc(doc(db, 'config', 'platform'));
    if (configSnap.exists() && configSnap.data()?.platformRazorpayKey) {
      return configSnap.data().platformRazorpayKey;
    }
  } catch (e) {
    console.log('Failed to fetch platform Razorpay key from Firestore, using default fallback', e);
  }
  return DEFAULT_PLATFORM_RAZORPAY_KEY;
};

// =====================================================
// TYPES
// =====================================================
export interface PlatformPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface PaidExport {
  tripId: string;
  paymentId: string;
  paidAt: number;
  amount: number;
}

// =====================================================
// EXPORT FEE PAYMENT
// =====================================================

/**
 * Charge vendor for exporting trip data
 * Uses PLATFORM's Razorpay Key - money goes to Ab Toh Ghoom Le
 */
export const chargeExportFee = async (
  tripId: string,
  tripTitle: string,
  vendorEmail: string,
  vendorPhone: string,
  vendorName: string
): Promise<PlatformPaymentResult> => {
  const activeKey = await getPlatformRazorpayKey();

  // Validate platform key
  if (!activeKey || !activeKey.startsWith('rzp_')) {
    if (__DEV__) {
      console.log('[DEV] Platform key not configured, allowing free export');
      return { success: true, paymentId: `dev_${Date.now()}` };
    }
    return { success: false, error: 'Platform payment not configured' };
  }

  // Open Razorpay checkout with PLATFORM's key
  const result: RazorpayCheckoutResult = await openRazorpayCheckout({
    razorpayKey: activeKey,
    amount: EXPORT_CHARGE,
    name: 'Ab Toh Ghoom Le',
    description: `Export: ${tripTitle}`,
    prefill: {
      name: vendorName,
      email: vendorEmail,
      contact: vendorPhone,
    },
    notes: {
      type: 'export_fee',
      trip_id: tripId,
    },
    theme: { color: '#8b5cf6' },
  });

  return {
    success: result.success,
    paymentId: result.paymentId,
    error: result.error,
  };
};

// =====================================================
// EXPORT ACCESS TRACKING (Firestore)
// =====================================================

/**
 * Check if vendor has already paid for exporting a trip
 */
export const hasExportAccess = async (
  vendorId: string,
  tripId: string
): Promise<boolean> => {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) return false;

    const paidExports: PaidExport[] = vendorSnap.data()?.paidExports || [];
    return paidExports.some((exp) => exp.tripId === tripId);
  } catch (error) {
    console.error('Error checking export access:', error);
    return false;
  }
};

/**
 * Record successful export payment
 */
export const recordExportPayment = async (
  vendorId: string,
  tripId: string,
  paymentId: string
): Promise<void> => {
  try {
    const vendorRef = doc(db, 'vendors', vendorId);
    const paidExport: PaidExport = {
      tripId,
      paymentId,
      paidAt: Date.now(),
      amount: EXPORT_CHARGE,
    };

    await updateDoc(vendorRef, {
      paidExports: arrayUnion(paidExport),
    });
  } catch (error) {
    console.error('Error recording export payment:', error);
    // Don't throw - payment was successful, just logging failed
  }
};

// =====================================================
// LEGACY EXPORT (for backward compatibility)
// =====================================================
export const initiateExportPayment = chargeExportFee;
