import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import BookingConfirmationScreen from '../app/booking-confirmation';

// Mock router
const mockRouterReplace = jest.fn();
let mockParams = {
  tripTitle: 'Kalsubai Sunrise Trek',
  tripDate: '20-21 Sep',
  seats: '2',
  totalPrice: '2400',
  bookingId: 'ATGL-12345678',
  packageName: 'Standard Package',
  paymentStatus: 'confirmed',
  paymentId: 'pay_test_999',
  vendorName: 'Sahyadri Adventures',
  vendorWhatsApp: '+919876543210',
  vendorUPI: 'sahyadri@upi',
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: () => mockParams,
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
    push: jest.fn(),
    back: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: 'success',
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

describe('Booking Confirmation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    jest.spyOn(Linking, 'canOpenURL').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(Share, 'share').mockImplementation(() => Promise.resolve({ action: Share.sharedAction }));
    
    // Default to confirmed payment
    mockParams = {
      tripTitle: 'Kalsubai Sunrise Trek',
      tripDate: '20-21 Sep',
      seats: '2',
      totalPrice: '2400',
      bookingId: 'ATGL-12345678',
      packageName: 'Standard Package',
      paymentStatus: 'confirmed',
      paymentId: 'pay_test_999',
      vendorName: 'Sahyadri Adventures',
      vendorWhatsApp: '+919876543210',
      vendorUPI: 'sahyadri@upi',
    };
  });

  it('renders confirmed booking receipt with full details', async () => {
    await render(<BookingConfirmationScreen />);

    expect(screen.getByText('Booking Confirmed!')).toBeTruthy();
    expect(screen.getByText('CONFIRMED')).toBeTruthy();
    expect(screen.getByText('Kalsubai Sunrise Trek')).toBeTruthy();
    expect(screen.getByText('20-21 Sep')).toBeTruthy();
    expect(screen.getByText('Standard Package')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('₹2400')).toBeTruthy();
    expect(screen.getByText('ATGL-12345678')).toBeTruthy();
    expect(screen.getByText('Payment ID: pay_test_999')).toBeTruthy();
    expect(screen.getByText(/Show this booking ID to your trip captain/i)).toBeTruthy();
  });

  it('renders pending payment mode with UPI and WhatsApp actions', async () => {
    mockParams.paymentStatus = 'pending';
    mockParams.paymentId = '';

    await render(<BookingConfirmationScreen />);

    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText('Total Amount')).toBeTruthy();
    expect(screen.getByText(/Your payment is pending manual verification/i)).toBeTruthy();
    expect(screen.getByText('Complete Your Payment')).toBeTruthy();
    expect(screen.getByText('Pay via UPI')).toBeTruthy();
    expect(screen.getByText('WhatsApp')).toBeTruthy();
  });

  it('triggers WhatsApp booking confirmation message when pressed', async () => {
    mockParams.paymentStatus = 'pending';
    await render(<BookingConfirmationScreen />);

    const waBtn = screen.getByText('WhatsApp');
    await act(async () => {
      fireEvent.press(waBtn);
    });

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalledWith(expect.stringContaining('whatsapp://'));
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('ATGL-12345678'));
    });
  });

  it('triggers UPI payment intent link when Pay via UPI is pressed', async () => {
    mockParams.paymentStatus = 'pending';
    await render(<BookingConfirmationScreen />);

    const upiBtn = screen.getByText('Pay via UPI');
    await act(async () => {
      fireEvent.press(upiBtn);
    });

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('upi://pay?pa=sahyadri@upi'));
    });
  });

  it('shares booking details when Share Trip button is pressed', async () => {
    await render(<BookingConfirmationScreen />);

    const shareBtn = screen.getByText('Share Trip');
    await act(async () => {
      fireEvent.press(shareBtn);
    });

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('ATGL-12345678'),
        })
      );
    });
  });

  it('navigates back to home when Back to Home is pressed', async () => {
    await render(<BookingConfirmationScreen />);

    const homeBtn = screen.getByText('Back to Home');
    await act(async () => {
      fireEvent.press(homeBtn);
    });

    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });
});
