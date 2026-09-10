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
});
