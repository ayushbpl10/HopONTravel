import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking, Share } from 'react-native';
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
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
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

  it('falls back to wa.me when whatsapp:// cannot be opened', async () => {
    mockParams.paymentStatus = 'pending';
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValueOnce(false);
    await render(<BookingConfirmationScreen />);

    const waBtn = screen.getByText('WhatsApp');
    await act(async () => {
      fireEvent.press(waBtn);
    });

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/'));
    });
  });

  it('shows alert when WhatsApp opening fails', async () => {
    mockParams.paymentStatus = 'pending';
    jest.spyOn(Linking, 'canOpenURL').mockRejectedValueOnce(new Error('Linking failed'));
    await render(<BookingConfirmationScreen />);

    const waBtn = screen.getByText('WhatsApp');
    await act(async () => {
      fireEvent.press(waBtn);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not open WhatsApp.');
    });
  });

  it('shows notice when vendor UPI details are missing', async () => {
    mockParams.paymentStatus = 'pending';
    mockParams.vendorUPI = '';
    await render(<BookingConfirmationScreen />);

    const upiBtn = screen.getByText('Pay via UPI');
    await act(async () => {
      fireEvent.press(upiBtn);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Notice', 'UPI details not provided by the vendor. Please contact via WhatsApp.');
  });

  it('shows alert when UPI app is not installed or fails to open', async () => {
    mockParams.paymentStatus = 'pending';
    mockParams.vendorUPI = 'sahyadri@upi';
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('No UPI app'));
    await render(<BookingConfirmationScreen />);

    const upiBtn = screen.getByText('Pay via UPI');
    await act(async () => {
      fireEvent.press(upiBtn);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('UPI App Not Found', 'Could not open UPI App. Please ensure you have a UPI app installed.');
    });
  });
});
