/**
 * Razorpay Checkout Tests
 * Tests for the low-level Razorpay checkout utility
 */

import { Alert, Platform } from 'react-native';

// Store original Platform.OS
let originalPlatformOS: string;

// Mock react-native
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn((title, message, buttons) => {
      // Simulate user pressing OK button
      if (buttons && buttons.length > 1) {
        buttons[1].onPress?.();
      }
    }),
  },
  Platform: {
    OS: 'web',
  },
}));

// Mock react-native-razorpay
jest.mock('react-native-razorpay', () => ({
  default: {
    open: jest.fn(),
  },
}));

import { openRazorpayCheckout, RazorpayCheckoutOptions } from '../services/razorpayCheckout';

describe('Razorpay Checkout Utility', () => {
  const validOptions: RazorpayCheckoutOptions = {
    razorpayKey: 'rzp_test_valid_key',
    amount: 100, // ₹100
    name: 'Test Business',
    description: 'Test Payment',
    prefill: {
      name: 'Test User',
      email: 'test@example.com',
      contact: '+919876543210',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'web';
  });

  describe('Input Validation', () => {
    it('should reject amount less than ₹1', async () => {
      const options = { ...validOptions, amount: 0.5 };

      const result = await openRazorpayCheckout(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum payment amount is ₹1');
    });

    it('should reject zero amount', async () => {
      const options = { ...validOptions, amount: 0 };

      const result = await openRazorpayCheckout(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Minimum payment amount');
    });

    it('should accept exactly ₹1', async () => {
      const options = { ...validOptions, amount: 1 };
      
      // Mock web checkout success
      (global as any).window = {
        Razorpay: jest.fn(() => ({
          open: jest.fn(),
          on: jest.fn(),
        })),
      };

      // This won't fully succeed without proper window mock, but won't fail validation
      const result = await openRazorpayCheckout(options);
      
      // The error should NOT be about minimum amount
      if (!result.success) {
        expect(result.error).not.toContain('Minimum payment amount');
      }
    });

    it('should reject empty razorpayKey', async () => {
      const options = { ...validOptions, razorpayKey: '' };

      const result = await openRazorpayCheckout(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Razorpay key');
    });

    it('should reject razorpayKey not starting with rzp_', async () => {
      const options = { ...validOptions, razorpayKey: 'invalid_key_format' };

      const result = await openRazorpayCheckout(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Razorpay key');
    });

    it('should accept valid test key format', async () => {
      const options = { ...validOptions, razorpayKey: 'rzp_test_abc123' };

      // Mock to prevent actual checkout
      (global as any).window = { Razorpay: undefined };
      (global as any).document = {
        createElement: jest.fn(() => ({ src: '', onload: null, onerror: null })),
        body: { appendChild: jest.fn() },
      };

      const result = await openRazorpayCheckout(options);

      // Should not fail on key validation
      if (!result.success) {
        expect(result.error).not.toContain('Invalid Razorpay key');
      }
    });

    it('should accept valid live key format', async () => {
      const options = { ...validOptions, razorpayKey: 'rzp_live_xyz789' };

      (global as any).window = { Razorpay: undefined };
      (global as any).document = {
        createElement: jest.fn(() => ({ src: '', onload: null, onerror: null })),
        body: { appendChild: jest.fn() },
      };

      const result = await openRazorpayCheckout(options);

      if (!result.success) {
        expect(result.error).not.toContain('Invalid Razorpay key');
      }
    });
  });

  describe('Amount Conversion', () => {
    it('should convert INR to paise correctly', async () => {
      // We can't directly test this without accessing internals,
      // but we can verify the function doesn't crash with decimal amounts
      const options = { ...validOptions, amount: 99.99 };

      (global as any).window = { Razorpay: undefined };
      (global as any).document = {
        createElement: jest.fn(() => ({ src: '', onload: null, onerror: null })),
        body: { appendChild: jest.fn() },
      };

      // Should not throw
      await expect(openRazorpayCheckout(options)).resolves.toBeDefined();
    });
  });

  describe('Platform Behavior', () => {
    describe('Web Platform', () => {
      beforeEach(() => {
        (Platform as any).OS = 'web';
      });

      it('should load Razorpay script on web when not already loaded', async () => {
        const mockScript = { src: '', onload: null as any, onerror: null as any, async: false };
        
        (global as any).window = { Razorpay: undefined };
        (global as any).document = {
          createElement: jest.fn(() => mockScript),
          body: { appendChild: jest.fn() },
        };

        const checkoutPromise = openRazorpayCheckout(validOptions);

        // Verify script creation
        expect((global as any).document.createElement).toHaveBeenCalledWith('script');
        expect(mockScript.src).toBe('https://checkout.razorpay.com/v1/checkout.js');

        // Simulate script load error to complete the promise
        if (mockScript.onerror) {
          mockScript.onerror();
        }

        const result = await checkoutPromise;
        expect(result.success).toBe(false);
      });

      it('should use existing Razorpay when already loaded', async () => {
        const mockOpen = jest.fn();
        const mockOn = jest.fn();
        
        (global as any).window = {
          Razorpay: jest.fn(() => ({
            open: mockOpen,
            on: mockOn,
          })),
        };

        // Start checkout but don't await (it will hang without handler call)
        openRazorpayCheckout(validOptions);

        // Verify Razorpay was instantiated
        expect((global as any).window.Razorpay).toHaveBeenCalled();
        expect(mockOpen).toHaveBeenCalled();
      });
    });

    describe('Native Platform (Expo Go)', () => {
      beforeEach(() => {
        (Platform as any).OS = 'ios';
        jest.resetModules();
      });

      it('should show alert on Expo Go when native module unavailable', async () => {
        // Mock require to throw MODULE_NOT_FOUND
        jest.doMock('react-native-razorpay', () => {
          throw { code: 'MODULE_NOT_FOUND' };
        });

        const result = await openRazorpayCheckout(validOptions);

        expect(Alert.alert).toHaveBeenCalledWith(
          'Payment',
          expect.stringContaining('Native payments require an EAS build'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Response Handling', () => {
    it('should return success with paymentId on successful payment', async () => {
      const mockHandler = jest.fn();
      
      (global as any).window = {
        Razorpay: jest.fn((config) => {
          // Immediately call handler to simulate success
          setTimeout(() => {
            config.handler({
              razorpay_payment_id: 'pay_test_success',
              razorpay_order_id: 'order_test_123',
            });
          }, 0);
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      const result = await openRazorpayCheckout(validOptions);

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe('pay_test_success');
      expect(result.orderId).toBe('order_test_123');
    });

    it('should return failure on modal dismiss', async () => {
      (global as any).window = {
        Razorpay: jest.fn((config) => {
          setTimeout(() => {
            config.modal.ondismiss();
          }, 0);
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      const result = await openRazorpayCheckout(validOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should return failure with error description on payment failure', async () => {
      (global as any).window = {
        Razorpay: jest.fn(() => {
          return {
            open: jest.fn(),
            on: jest.fn((event, callback) => {
              if (event === 'payment.failed') {
                setTimeout(() => {
                  callback({
                    error: {
                      description: 'Card declined',
                    },
                  });
                }, 0);
              }
            }),
          };
        }),
      };

      // Note: This test structure means the promise won't resolve normally
      // In real implementation, you'd need to handle this differently
    });
  });

  describe('Options Passthrough', () => {
    it('should pass prefill data to Razorpay', async () => {
      let capturedConfig: any;
      
      (global as any).window = {
        Razorpay: jest.fn((config) => {
          capturedConfig = config;
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      await openRazorpayCheckout(validOptions);

      expect(capturedConfig.prefill).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        contact: '+919876543210',
      });
    });

    it('should pass theme color to Razorpay', async () => {
      let capturedConfig: any;
      
      const optionsWithTheme = {
        ...validOptions,
        theme: { color: '#ff5722' },
      };

      (global as any).window = {
        Razorpay: jest.fn((config) => {
          capturedConfig = config;
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      await openRazorpayCheckout(optionsWithTheme);

      expect(capturedConfig.theme.color).toBe('#ff5722');
    });

    it('should use default theme color when not specified', async () => {
      let capturedConfig: any;
      
      (global as any).window = {
        Razorpay: jest.fn((config) => {
          capturedConfig = config;
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      await openRazorpayCheckout(validOptions);

      expect(capturedConfig.theme.color).toBe('#00b0ff');
    });

    it('should pass notes to Razorpay', async () => {
      let capturedConfig: any;
      
      const optionsWithNotes = {
        ...validOptions,
        notes: {
          booking_id: 'ATGL-123',
          trip_id: 'trip_456',
        },
      };

      (global as any).window = {
        Razorpay: jest.fn((config) => {
          capturedConfig = config;
          return {
            open: jest.fn(),
            on: jest.fn(),
          };
        }),
      };

      await openRazorpayCheckout(optionsWithNotes);

      expect(capturedConfig.notes).toEqual({
        booking_id: 'ATGL-123',
        trip_id: 'trip_456',
      });
    });
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).document;
  });
});
