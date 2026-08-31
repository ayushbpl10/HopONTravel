/**
 * Razorpay Standard Web Checkout - Low-level Utility
 * 
 * This is a generic Razorpay checkout utility.
 * DO NOT use directly - use the specific services instead:
 * 
 * - paymentService.ts → For traveller → vendor payments
 * - platformPaymentService.ts → For vendor → platform payments
 */

import { Alert, Platform } from 'react-native';

export interface RazorpayCheckoutOptions {
  razorpayKey: string; // REQUIRED: The Razorpay Key ID
  amount: number; // Amount in INR (will be converted to paise)
  currency?: string;
  name: string; // Business name shown in checkout
  description: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

export interface RazorpayCheckoutResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

/**
 * Open Razorpay Standard Checkout
 * Works on Web and Native (with react-native-razorpay in EAS builds)
 */
export const openRazorpayCheckout = async (
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> => {
  const amountInPaise = Math.round(options.amount * 100);

  // Validate minimum amount (₹1 = 100 paise)
  if (amountInPaise < 100) {
    return { success: false, error: 'Minimum payment amount is ₹1' };
  }

  // Validate key
  if (!options.razorpayKey || !options.razorpayKey.startsWith('rzp_')) {
    return { success: false, error: 'Invalid Razorpay key' };
  }

  // Try native SDK first (for EAS builds)
  if (Platform.OS !== 'web') {
    try {
      const RazorpayCheckout = require('react-native-razorpay').default;
      
      const data = await RazorpayCheckout.open({
        description: options.description,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: options.currency || 'INR',
        key: options.razorpayKey,
        amount: amountInPaise,
        name: options.name,
        prefill: {
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
          name: options.prefill?.name || '',
        },
        theme: { color: options.theme?.color || '#00b0ff' },
        notes: options.notes || {},
      });
      
      return {
        success: true,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
      };
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('native module')) {
        // Fall through to Expo Go fallback
      } else {
        return {
          success: false,
          error: error.description || error.message || 'Payment failed',
        };
      }
    }
  }

  // Web checkout
  if (Platform.OS === 'web') {
    return webCheckout(options.razorpayKey, amountInPaise, options);
  }

  // Expo Go fallback
  return new Promise((resolve) => {
    Alert.alert(
      'Payment',
      `Amount: ₹${options.amount}\n\nNative payments require an EAS build.`,
      [
        { text: 'Cancel', onPress: () => resolve({ success: false, error: 'Cancelled' }) },
        { text: 'OK', onPress: () => resolve({ success: false, error: 'Use EAS build' }) },
      ]
    );
  });
};

/**
 * Web checkout using Razorpay's checkout.js
 */
const webCheckout = (
  razorpayKey: string,
  amountInPaise: number,
  options: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutResult> => {
  return new Promise((resolve) => {
    const initCheckout = () => {
      try {
        const rzp = new (window as any).Razorpay({
          key: razorpayKey,
          amount: amountInPaise,
          currency: options.currency || 'INR',
          name: options.name,
          description: options.description,
          image: 'https://i.imgur.com/3g7nmJC.png',
          prefill: options.prefill || {},
          notes: options.notes || {},
          theme: { color: options.theme?.color || '#00b0ff' },
          handler: (response: any) => {
            resolve({
              success: true,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });
          },
          modal: {
            ondismiss: () => resolve({ success: false, error: 'Payment cancelled' }),
            escape: true,
          },
        });
        rzp.on('payment.failed', (response: any) => {
          resolve({ success: false, error: response.error?.description || 'Payment failed' });
        });
        rzp.open();
      } catch (error: any) {
        resolve({ success: false, error: error.message || 'Failed to initialize' });
      }
    };

    if ((window as any).Razorpay) {
      initCheckout();
    } else {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = initCheckout;
      script.onerror = () => resolve({ success: false, error: 'Failed to load Razorpay' });
      document.body.appendChild(script);
    }
  });
};
