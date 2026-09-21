import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { getDocs } from 'firebase/firestore';
import BookingStatusScreen from '../app/booking-status';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
}));

let mockUserProfile: any = null;
let mockLoginLoading = false;
const mockLoginWithGoogle = jest.fn();
const mockLogout = jest.fn();

// Mock AppContext
jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    userProfile: mockUserProfile,
    loginWithGoogle: mockLoginWithGoogle,
    logout: mockLogout,
    loginLoading: mockLoginLoading,
    isOnline: true,
  }),
}));

const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

// Mock expo-router
let mockBookingSearchParams: { bookingId?: string } = {};
jest.mock('expo-router', () => ({
  __esModule: true,
  useLocalSearchParams: () => mockBookingSearchParams,
  Stack: {
    Screen: () => null,
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('Booking Status Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error if booking ID is empty', async () => {
    await render(<BookingStatusScreen />);
    
    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid Booking ID.')).toBeTruthy();
    });
  });

  it('fetches and displays confirmed booking correctly', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: '123',
          data: () => ({
            bookingId: 'ORD-123',
            travelerName: 'Test Name',
            status: 'confirmed',
            totalPrice: 1500,
            packageName: 'Basic',
          }),
        },
      ],
    });

    await render(<BookingStatusScreen />);
    
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    await act(async () => {
      fireEvent.changeText(input, 'ORD-123');
    });

    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('BOOKING DETAILS')).toBeTruthy();
      expect(screen.getByText('Test Name')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
      expect(screen.getByText(/Booking Confirmed! Show this ID/)).toBeTruthy();
    });
  });

  it('shows pending message when booking is pending', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: '123',
          data: () => ({
            bookingId: 'ORD-123',
            travelerName: 'Pending User',
            status: 'pending',
            totalPrice: 2000,
            packageName: 'Standard',
          }),
        },
      ],
    });

    await render(<BookingStatusScreen />);
    
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    await act(async () => {
      fireEvent.changeText(input, 'ORD-123');
    });

    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeTruthy();
      expect(screen.getByText(/Your payment is pending manual verification/)).toBeTruthy();
    });
  });

  it('finds booking via direct document ID fallback', async () => {
    // 1st query empty
    (getDocs as jest.Mock).mockResolvedValueOnce({ empty: true, docs: [] });
    // doc lookup finds it
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'doc_999',
      data: () => ({
        bookingId: 'ATGL-DOC999',
        travelerName: 'Direct Doc User',
        status: 'confirmed',
        totalPrice: 1800,
        packageName: 'Camping',
      }),
    });

    await render(<BookingStatusScreen />);
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    await act(async () => {
      fireEvent.changeText(input, 'doc_999');
    });
    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Direct Doc User')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
    });
  });

  it('shows error when booking is not found across all fallbacks', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({ empty: true, docs: [] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    (getDocs as jest.Mock).mockResolvedValueOnce({ empty: true, docs: [] });

    await render(<BookingStatusScreen />);
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    await act(async () => {
      fireEvent.changeText(input, 'NOTFOUND123');
    });
    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Booking not found. Please check your Booking ID.')).toBeTruthy();
    });
  });

  it('shows error when firestore throws during search', async () => {
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore error'));

    await render(<BookingStatusScreen />);
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    await act(async () => {
      fireEvent.changeText(input, 'ERROR-ID');
    });
    const trackBtn = screen.getByText('Track');
    await act(async () => {
      fireEvent.press(trackBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Error fetching booking. Please try again later.')).toBeTruthy();
    });
  });

  it('automatically searches when paramBookingId is provided in URL params', async () => {
    mockBookingSearchParams = { bookingId: 'PARAM-123' };
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'p123',
          data: () => ({
            bookingId: 'PARAM-123',
            travelerName: 'Auto Searched',
            status: 'confirmed',
            totalPrice: 2500,
            packageName: 'Premium',
          }),
        },
      ],
    });

    await render(<BookingStatusScreen />);

    await waitFor(() => {
      expect(screen.getByText('Auto Searched')).toBeTruthy();
    });
    mockBookingSearchParams = {};
  });

  it('renders sign in with google button and triggers login when pressed', async () => {
    mockUserProfile = null;
    await render(<BookingStatusScreen />);

    const googleBtn = screen.getByText('Sign in with Google');
    await act(async () => {
      fireEvent.press(googleBtn);
    });

    expect(mockLoginWithGoogle).toHaveBeenCalledWith('traveller');
  });

  it('renders vendor account notice when userProfile role is vendor', async () => {
    mockUserProfile = { role: 'vendor', email: 'vendor@adventures.com' };
    await render(<BookingStatusScreen />);

    expect(screen.getByText('Vendor Account')).toBeTruthy();
    expect(screen.getByText(/You are logged in as a Vendor/)).toBeTruthy();
    mockUserProfile = null;
  });

  it('fetches and displays traveller bookings when logged in as traveller and handles logout', async () => {
    mockUserProfile = { role: 'traveller', email: 'traveller@user.com' };
    (getDocs as jest.Mock).mockResolvedValueOnce({
      forEach: (callback: any) => {
        callback({
          id: 'user_b1',
          data: () => ({
            bookingId: 'USER-B1',
            travelerName: 'Traveller One',
            status: 'confirmed',
            totalPrice: 1200,
            packageName: 'Day Hike',
            createdAt: 1000,
          }),
        });
      },
    });

    await render(<BookingStatusScreen />);

    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeTruthy();
      expect(screen.getByText('Traveller One')).toBeTruthy();
    });

    const logoutBtn = screen.getByText('Logout');
    await act(async () => {
      fireEvent.press(logoutBtn);
    });
    expect(mockLogout).toHaveBeenCalled();
    mockUserProfile = null;
  });
});
