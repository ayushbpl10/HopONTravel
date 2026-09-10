import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MyBookingsScreen from '../app/my-bookings';

// Mock router
const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  router: {
    push: (...args: any[]) => mockRouterPush(...args),
    replace: (...args: any[]) => mockRouterReplace(...args),
  },
  Stack: {
    Screen: () => null,
  },
}));

// Mock Firebase
let mockBookingsDocs: any[] = [];
jest.mock('../config/firebase', () => ({
  db: {},
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({
    forEach: (cb: any) => mockBookingsDocs.forEach(cb),
    empty: mockBookingsDocs.length === 0,
  })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock AppContext
let mockUserProfile: any = {
  id: 'user_123',
  name: 'Rahul Sharma',
  email: 'rahul@example.com',
  role: 'traveller',
};
const mockLogout = jest.fn();

jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    userProfile: mockUserProfile,
    logout: mockLogout,
  }),
}));

// Mock ThemeContext
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#00b0ff',
      background: '#f8fafc',
      card: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#dcfce7',
      danger: '#ef4444',
    },
    isDark: false,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

describe('My Bookings Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile = {
      id: 'user_123',
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      role: 'traveller',
    };
    mockBookingsDocs = [
      {
        id: 'doc_1',
        data: () => ({
          bookingId: 'ATGL-88889999',
          travelerName: 'Rahul Sharma',
          travelerPhone: '+919876543210',
          travelerEmail: 'rahul@example.com',
          packageName: 'Deluxe Tent',
          seats: 2,
          totalPrice: 4000,
          status: 'confirmed',
          createdAt: 1735689600000,
        }),
      },
    ];
  });

  it('renders login prompt when user is not logged in', async () => {
    mockUserProfile = null;

    await render(<MyBookingsScreen />);

    expect(screen.getByText('Please log in to view your bookings.')).toBeTruthy();
    const loginBtn = screen.getByText('Traveller Login');
    await act(async () => {
      fireEvent.press(loginBtn);
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/traveller-login');
  });

  it('renders user profile banner and booking cards for logged in user', async () => {
    await render(<MyBookingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeTruthy();
      expect(screen.getByText('rahul@example.com')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
      expect(screen.getByText(/Package: Deluxe Tent/i)).toBeTruthy();
      expect(screen.getByText(/Total Paid: ₹4000/i)).toBeTruthy();
      expect(screen.getByText('ID: ATGL-88889999')).toBeTruthy();
    });
  });

  it('navigates to booking status when booking card is pressed', async () => {
    await render(<MyBookingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeTruthy();
    });

    const bookingCard = screen.getByLabelText('View booking for Deluxe Tent');
    await act(async () => {
      fireEvent.press(bookingCard);
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/booking-status',
      params: { bookingId: 'ATGL-88889999' },
    });
  });

  it('renders empty state when user has no bookings', async () => {
    mockBookingsDocs = [];

    await render(<MyBookingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('No bookings yet.')).toBeTruthy();
      expect(screen.getByText('When you book a trip, it will appear here.')).toBeTruthy();
    });
  });

  it('handles logout confirmation alert and logs out user', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Simulate clicking "Log Out" button (index 1)
      if (buttons && buttons.length > 1) {
        buttons[1].onPress?.();
      }
    });

    await render(<MyBookingsScreen />);

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeTruthy();
    });

    const logoutBtn = screen.getByText('Logout');
    await act(async () => {
      fireEvent.press(logoutBtn);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Log Out',
      expect.stringContaining('Are you sure you want to log out'),
      expect.any(Array)
    );
    expect(mockLogout).toHaveBeenCalled();
  });
});
