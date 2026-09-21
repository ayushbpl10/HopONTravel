import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckoutScreen from '../app/checkout/[id]';

// Mock expo-router
const mockRouterReplace = jest.fn();
let mockCheckoutParams: Record<string, any> = {
  id: 'trip_100',
  batchId: 'batch_1',
  packageName: 'Standard Trek',
  seats: '1',
  totalPrice: '1500',
  tripTitle: 'Kalsubai Sunrise Trek',
  tripDate: '15 Oct - 16 Oct',
  vendorName: 'Summit Trekkers',
  vendorWhatsApp: '+919988776655',
  vendorUPI: 'summit@okaxis',
  vendorPaymentEnabled: 'false',
  vendorPaymentGateway: 'manual',
  vendorRazorpayKey: '',
  termsAndConditions: 'Custom Vendor T&C',
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: () => mockCheckoutParams,
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
    push: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

// Mock paymentService
const mockInitiatePayment = jest.fn();
jest.mock('../services/paymentService', () => {
  const actual = jest.requireActual('../services/paymentService');
  return {
    ...actual,
    initiatePayment: (...args: any[]) => mockInitiatePayment(...args),
  };
});

// Mock AppContext
const mockBookTrip = jest.fn().mockResolvedValue(undefined);
jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    bookTrip: (...args: any[]) => mockBookTrip(...args),
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('Checkout Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCheckoutParams = {
      id: 'trip_100',
      batchId: 'batch_1',
      packageName: 'Standard Trek',
      seats: '1',
      totalPrice: '1500',
      tripTitle: 'Kalsubai Sunrise Trek',
      tripDate: '15 Oct - 16 Oct',
      vendorName: 'Summit Trekkers',
      vendorWhatsApp: '+919988776655',
      vendorUPI: 'summit@okaxis',
      vendorPaymentEnabled: 'false',
      vendorPaymentGateway: 'manual',
      vendorRazorpayKey: '',
      termsAndConditions: 'Custom Vendor T&C',
    };
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders checkout screen with trip info and manual payment CTA', async () => {
    await render(<CheckoutScreen />);

    expect(screen.getByText('Traveller Details')).toBeTruthy();
    expect(screen.getByText(/Kalsubai Sunrise Trek/)).toBeTruthy();
    expect(screen.getByText('Confirm Booking')).toBeTruthy();
  });

  it('updates input fields when typed into', async () => {
    await render(<CheckoutScreen />);

    const nameInput = screen.getByPlaceholderText('John Doe');
    await act(async () => {
      fireEvent.changeText(nameInput, 'John Doe');
    });

    expect(screen.getByDisplayValue('John Doe')).toBeTruthy();
  });

  it('displays online payment CTA when vendor payment is enabled and dynamically updates price', async () => {
    mockCheckoutParams.vendorPaymentEnabled = 'true';
    mockCheckoutParams.vendorPaymentGateway = 'razorpay';
    mockCheckoutParams.vendorRazorpayKey = 'rzp_test_123';

    await render(<CheckoutScreen />);

    // Initial button text with 1 traveller @ 1500
    expect(screen.getByText('Pay ₹1500')).toBeTruthy();

    // Change travellers to 2
    const travellersInput = screen.getByDisplayValue('1');
    await act(async () => {
      fireEvent.changeText(travellersInput, '2');
    });

    // Button should now dynamically show ₹3000
    expect(screen.getByText('Pay ₹3000')).toBeTruthy();
  });

  it('completes manual booking and routes to booking-confirmation with tripDate and calculated amount', async () => {
    await render(<CheckoutScreen />);

    // Fill in valid details
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav Patel');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });

    // Get the captcha math from the screen
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const num1 = parseInt(match[1], 10);
    const num2 = parseInt(match[2], 10);
    const answer = (num1 + num2).toString();

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });

    // Toggle both consent switches
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });

    // Tap Confirm Booking
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    await waitFor(() => {
      expect(mockBookTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip_100',
          batchId: 'batch_1',
          packageName: 'Standard Trek',
          travelerName: 'Aarav Patel',
          travelerPhone: '9876543210',
          travelerEmail: 'aarav@example.com',
          seats: 1,
          totalPrice: 1500,
          status: 'pending',
        })
      );
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/booking-confirmation',
        params: expect.objectContaining({
          tripTitle: 'Kalsubai Sunrise Trek',
          tripDate: '15 Oct - 16 Oct',
          seats: '1',
          totalPrice: '1500',
          travelerName: 'Aarav Patel',
        }),
      })
    );
  });

  it('shows alert when required fields are missing', async () => {
    await render(<CheckoutScreen />);
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Required Fields', 'Please fill out all fields.');
  });

  it('shows alert when travellers count is invalid', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
      fireEvent.changeText(screen.getByDisplayValue('1'), '0');
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Invalid Travellers', 'Number of travellers must be at least 1.');
  });

  it('shows alert when consent switch is not accepted', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Consent Required', 'You must accept the risks involved.');
  });

  it('shows alert when terms are not accepted', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true); // Consent accepted, terms not accepted
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Terms & Conditions Required', 'You must accept the Terms & Conditions to proceed.');
  });

  it('shows alert when captcha security question is answered incorrectly', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
      fireEvent.changeText(screen.getByPlaceholderText('?'), '999');
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Security Check Failed', 'Please answer the math question correctly.');
  });

  it('shows alert when phone number is invalid', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '1234');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const answer = (parseInt(match[1], 10) + parseInt(match[2], 10)).toString();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Invalid Phone', 'Please enter a valid 10-digit phone number.');
  });

  it('shows alert when email address is invalid', async () => {
    await render(<CheckoutScreen />);
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'invalid-email');
    });
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const answer = (parseInt(match[1], 10) + parseInt(match[2], 10)).toString();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });
    expect(Alert.alert).toHaveBeenCalledWith('Invalid Email', 'Please enter a valid email address.');
  });

  it('handles terms and conditions modal view, close, and agreement', async () => {
    await render(<CheckoutScreen />);
    // 1. Click inline link to open modal
    const inlineTerms = screen.getByText('Terms & Conditions & Disclaimer');
    await act(async () => {
      fireEvent.press(inlineTerms);
    });
    expect(screen.getByText('Custom Vendor T&C')).toBeTruthy();

    // 2. Click close button
    const closeBtn = screen.getByText(''); // FontAwesome times-circle
    await act(async () => {
      fireEvent.press(closeBtn);
    });

    // 3. Re-open via View Full Terms & Conditions button and accept
    const readTermsBtn = screen.getByText(/View Full Terms & Conditions/);
    await act(async () => {
      fireEvent.press(readTermsBtn);
    });
    const acceptBtn = screen.getByText('I Accept Terms & Conditions');
    await act(async () => {
      fireEvent.press(acceptBtn);
    });
  });

  it('shows alert when amount is zero or negative', async () => {
    mockCheckoutParams.totalPrice = '0';
    await render(<CheckoutScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const answer = (parseInt(match[1], 10) + parseInt(match[2], 10)).toString();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid booking amount. Please go back and try again.');
  });

  it('executes online payment successfully with Razorpay', async () => {
    mockCheckoutParams.vendorPaymentEnabled = 'true';
    mockCheckoutParams.vendorPaymentGateway = 'razorpay';
    mockCheckoutParams.vendorRazorpayKey = 'rzp_test_123';
    mockInitiatePayment.mockResolvedValueOnce({
      success: true,
      paymentId: 'pay_rzp_999',
      gateway: 'razorpay',
    });

    await render(<CheckoutScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Pooja Sharma');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'pooja@example.com');
    });
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const answer = (parseInt(match[1], 10) + parseInt(match[2], 10)).toString();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });

    const payBtn = screen.getByText('Pay ₹1500');
    await act(async () => {
      fireEvent.press(payBtn);
    });

    await waitFor(() => {
      expect(mockInitiatePayment).toHaveBeenCalled();
      expect(mockBookTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'confirmed',
          paymentId: 'pay_rzp_999',
          paymentGateway: 'razorpay',
        })
      );
    });
  });

  it('handles booking exception and shows alert', async () => {
    mockBookTrip.mockRejectedValueOnce(new Error('Network failure'));
    await render(<CheckoutScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('John Doe'), 'Aarav');
      fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
      fireEvent.changeText(screen.getByPlaceholderText('john@example.com'), 'aarav@example.com');
    });
    const mathText = screen.getByText(/(\d+)\s*\+\s*(\d+)\s*=/);
    const match = mathText.props.children.join('').match(/(\d+)\s*\+\s*(\d+)/);
    const answer = (parseInt(match[1], 10) + parseInt(match[2], 10)).toString();
    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('?'), answer);
    });
    const switches = screen.getAllByRole('switch');
    await act(async () => {
      fireEvent(switches[0], 'valueChange', true);
      fireEvent(switches[1], 'valueChange', true);
    });
    const confirmBtn = screen.getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBtn);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network failure');
    });
  });
});
