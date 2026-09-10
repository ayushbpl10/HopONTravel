import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import WishlistScreen from '../app/wishlist';
import { Trip } from '../data/trips';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  Link: ({ children, href }: any) => {
    // Clone child to inject simulated onPress
    return React.cloneElement(children, {
      onPress: () => mockRouterPush(href),
    });
  },
  Stack: {
    Screen: () => null,
  },
  router: {
    push: (...args: any[]) => mockRouterPush(...args),
  },
}));

// Mock trips data
const mockTrips: Trip[] = [
  {
    id: 'trip_w1',
    title: 'Rajmachi Fireflies Trek',
    vendorName: 'Firefly Treks',
    vendorWhatsApp: '+919876543210',
    vendorUPI: ['firefly@upi'],
    packages: [{ name: 'Standard', price: 1200 }],
    images: ['https://example.com/rajmachi.jpg'],
    batches: [{ id: 'b1', dateDuration: '10 Jun', totalSeats: 20, bookedSeats: 5 }],
    category: 'Trekking',
    destination: 'Lonavala',
    status: 'published',
  } as Trip,
  {
    id: 'trip_w2',
    title: 'Goa Coastal Backpacking',
    vendorName: 'Beach Explorers',
    vendorWhatsApp: '+919876543211',
    vendorUPI: ['goa@upi'],
    packages: [{ name: 'Solo', price: 4500 }],
    images: ['https://example.com/goa.jpg'],
    batches: [{ id: 'b2', dateDuration: '20 Nov', totalSeats: 15, bookedSeats: 2 }],
    category: 'Camping',
    destination: 'Goa',
    status: 'published',
  } as Trip,
];

// Mock AppContext
jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    trips: mockTrips,
  }),
}));

// Mock Wishlist Hook
const mockToggleWishlist = jest.fn();
let mockWishlistIds = ['trip_w1'];

jest.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    wishlistedIds: mockWishlistIds,
    toggleWishlist: (...args: any[]) => mockToggleWishlist(...args),
  }),
}));

// Mock ThemeContext
jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#f8fafc',
      card: '#ffffff',
      border: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      primary: '#00b0ff',
      danger: '#ef4444',
    },
    isDark: false,
  }),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('Wishlist Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWishlistIds = ['trip_w1'];
  });

  afterEach(() => {
    cleanup();
  });

  it('renders wishlisted trips matching wishlistedIds', async () => {
    await render(<WishlistScreen />);

    expect(screen.getByText('Rajmachi Fireflies Trek')).toBeTruthy();
    expect(screen.getByText('by Firefly Treks')).toBeTruthy();
    expect(screen.getByText('₹1200')).toBeTruthy();
    expect(screen.queryByText('Goa Coastal Backpacking')).toBeNull();
  });

  it('allows removing trip from wishlist via heart button', async () => {
    await render(<WishlistScreen />);

    const removeBtn = screen.getByLabelText('Remove from wishlist');
    await act(async () => {
      fireEvent.press(removeBtn);
    });

    expect(mockToggleWishlist).toHaveBeenCalledWith('trip_w1');
  });

  it('navigates to trip details when card body is pressed', async () => {
    await render(<WishlistScreen />);

    const tripTitle = screen.getByText('Rajmachi Fireflies Trek');
    await act(async () => {
      fireEvent.press(tripTitle);
    });

    expect(mockRouterPush).toHaveBeenCalledWith('/trip/trip_w1');
  });

  it('displays empty state when no trips are saved', async () => {
    mockWishlistIds = [];
    await render(<WishlistScreen />);

    expect(screen.getByText('No saved trips yet')).toBeTruthy();
    expect(screen.getByText('Tap the heart icon on any trip to save it for later.')).toBeTruthy();
  });
});
