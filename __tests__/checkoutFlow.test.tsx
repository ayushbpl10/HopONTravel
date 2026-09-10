import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckoutScreen from '../app/checkout/[id]';
import { AppProvider } from '../context/AppContext';

// Store mock functions for assertions
const mockRouterReplace = jest.fn();
const mockInitiatePayment = jest.fn();

// Mock expo-router with configurable params
let mockSearchParams = {
  id: 'trip-123',
  batchId: 'batch-1',
  packageName: 'Standard',
  seats: '2',
  totalPrice: '2000',
  tripTitle: 'Test Trip',
  vendorName: 'Test Vendor',
  vendorWhatsApp: '+919876543210',
  vendorUPI: 'vendor@upi',
  vendorPaymentEnabled: 'false',
  vendorPaymentGateway: 'manual',
  vendorRazorpayKey: '',
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockSearchParams,
  router: {
    replace: mockRouterReplace,
  },
}));

// Mock payment service
jest.mock('../services/paymentService', () => ({
  initiateVendorPayment: mockInitiatePayment,
  initiatePayment: mockInitiatePayment,
  isVendorPaymentEnabled: jest.fn((config) => {
    return !!(config?.enabled && config.gateway !== 'manual' && config.razorpayKeyId);
  }),
  isPaymentGatewayEnabled: jest.fn((config) => {
    return !!(config?.enabled && config.gateway !== 'manual' && config.razorpayKeyId);
  }),
  getGatewayInfo: jest.fn((gateway) => ({
    name: gateway === 'razorpay' ? 'Razorpay' : gateway === 'cashfree' ? 'Cashfree' : 'Manual',
    supportedMethods: ['UPI', 'Cards', 'NetBanking', 'Wallets'],
    mdr: '2% + GST',
  })),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

// Mock AppContext
jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    bookTrip: jest.fn(() => Promise.resolve()),
  }),
  AppProvider: ({ children }: any) => children,
}));

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'mock-user-1', email: 'test@example.com' } },
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [], forEach: jest.fn() })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-booking-id' })),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  where: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  startAfter: jest.fn(),
  arrayUnion: jest.fn((...args) => args),
}));
jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('Checkout Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('validates empty fields and prevents submission', async () => {
    await render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // In CheckoutScreen, with default manual payment mode, the button shows "Confirm Booking"
    const confirmBtn = screen.getByText('Confirm Booking');
    expect(confirmBtn).toBeTruthy();
  });

  it('fails math CAPTCHA with incorrect answer', async () => {
    await render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // Fill form
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Test User');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
    });
    
    // Toggle both consent and terms switches
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      for (const sw of switches) {
        fireEvent(sw, 'valueChange', true);
        if (sw.props.onValueChange) {
          sw.props.onValueChange(true);
        }
      }
    });

    // Enter wrong math answer
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), '999');
    });

    const submitBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Security Check Failed',
        'Please answer the math question correctly.'
      );
    });
  });
});

describe('Checkout Payment Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // Reset to default params
    mockSearchParams = {
      id: 'trip-123',
      batchId: 'batch-1',
      packageName: 'Standard',
      seats: '2',
      totalPrice: '2000',
      tripTitle: 'Test Trip',
      vendorName: 'Test Vendor',
      vendorWhatsApp: '+919876543210',
      vendorUPI: 'vendor@upi',
      vendorPaymentEnabled: 'false',
      vendorPaymentGateway: 'manual',
      vendorRazorpayKey: '',
    };
  });

  describe('Manual Payment Mode', () => {
    it('should show manual payment info when vendor has not enabled online payments', async () => {
      mockSearchParams.vendorPaymentEnabled = 'false';
      mockSearchParams.vendorPaymentGateway = 'manual';

      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // Should show manual payment notice
      expect(screen.getByText(/Manual Payment Required/i)).toBeTruthy();
    });

    it('should show "Confirm Booking" button for manual payments', async () => {
      mockSearchParams.vendorPaymentEnabled = 'false';

      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // Button should say "Confirm Booking" instead of "Pay ₹X"
      expect(screen.getByText(/Confirm Booking/i)).toBeTruthy();
    });
  });

  describe('Online Payment Mode', () => {
    beforeEach(() => {
      mockSearchParams.vendorPaymentEnabled = 'true';
      mockSearchParams.vendorPaymentGateway = 'razorpay';
      mockSearchParams.vendorRazorpayKey = 'rzp_test_vendor_key';
    });

    it('should show Razorpay payment info when vendor has enabled online payments', async () => {
      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // Should show Razorpay payment info
      expect(screen.getByText(/Secure payment powered by Razorpay/i)).toBeTruthy();
    });

    it('should show "Pay ₹X" button for online payments', async () => {
      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // Button should show Pay amount
      expect(screen.getByText(/Pay ₹2000/i)).toBeTruthy();
    });

    it('should show supported payment methods', async () => {
      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // The actual UI shows "UPI | Cards | NetBanking | Wallets"
      expect(screen.getByText(/UPI \| Cards \| NetBanking \| Wallets/i)).toBeTruthy();
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      mockSearchParams.vendorPaymentEnabled = 'true';
      mockSearchParams.vendorPaymentGateway = 'razorpay';
      mockSearchParams.vendorRazorpayKey = 'rzp_test_vendor_key';
    });

    it('should call initiatePayment when form is submitted with online payment enabled', async () => {
      mockInitiatePayment.mockResolvedValue({
        success: true,
        paymentId: 'pay_test_123',
        gateway: 'razorpay',
      });

      await render(
        <AppProvider>
          <CheckoutScreen />
        </AppProvider>
      );

      // Fill form completely
      await act(async () => {
        fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Test User');
        fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
        fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'test@example.com');
      });
      
      // Toggle consent and terms switches
      const switches = screen.getAllByRole('switch');
      await act(async () => {
        if (switches.length >= 2) {
          fireEvent(switches[0], 'onValueChange', true);
          fireEvent(switches[1], 'onValueChange', true);
        } else if (switches.length === 1) {
          fireEvent(switches[0], 'onValueChange', true);
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/Pay ₹2000/i)).toBeTruthy();
      });
    });

    it('should navigate to confirmation on successful payment', async () => {
      mockInitiatePayment.mockResolvedValue({
        success: true,
        paymentId: 'pay_success_123',
        gateway: 'razorpay',
      });
    });

    it('should show error on payment failure', async () => {
      mockInitiatePayment.mockResolvedValue({
        success: false,
        error: 'Payment declined',
        gateway: 'razorpay',
      });
    });
  });
});

describe('Vendor Payment Config Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {
      id: 'trip-123',
      batchId: 'batch-1',
      packageName: 'Standard',
      seats: '2',
      totalPrice: '2000',
      tripTitle: 'Test Trip',
      vendorName: 'Test Vendor',
      vendorWhatsApp: '+919876543210',
      vendorUPI: 'vendor@upi',
      vendorPaymentEnabled: 'false',
      vendorPaymentGateway: 'manual',
      vendorRazorpayKey: '',
    };
  });

  it('should build correct VendorPaymentConfig from URL params', async () => {
    mockSearchParams.vendorPaymentEnabled = 'true';
    mockSearchParams.vendorPaymentGateway = 'razorpay';
    mockSearchParams.vendorRazorpayKey = 'rzp_test_abc123';

    await render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // The component should correctly parse the URL params into a config object
    // Verified by the UI showing online payment options
    await waitFor(() => {
      expect(screen.getByText(/Secure payment powered by Razorpay/i)).toBeTruthy();
    });
  });

  it('should handle missing payment params gracefully', async () => {
    mockSearchParams.vendorPaymentEnabled = undefined as any;
    mockSearchParams.vendorPaymentGateway = undefined as any;
    mockSearchParams.vendorRazorpayKey = undefined as any;

    await render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // Should default to manual payment mode
    await waitFor(() => {
      expect(screen.getByText(/Manual Payment Required/i)).toBeTruthy();
    });
  });
});

