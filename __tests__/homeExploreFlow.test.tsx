import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/index';
import { Trip } from '../data/trips';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  __esModule: true,
  Link: ({ children }: any) => children,
  router: {
    push: (...args: any[]) => mockRouterPush(...args),
    replace: jest.fn(),
  },
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

// Mock react-i18next with realistic translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      const translations: Record<string, string> = {
        'explore.searchPlaceholder': 'Search destinations...',
        'explore.heroTitle': 'Ab Toh Ghoom Le!',
        'explore.live': 'LIVE',
        'explore.completed': 'Completed',
        'explore.by': 'by',
        'explore.left': 'left',
        'explore.tbd': 'TBD',
        'explore.filterAll': 'All',
        'explore.filterUnder1000': 'Under ₹1000',
        'explore.filter1000To2000': '₹1000–₹2000',
        'explore.filterAbove2000': 'Above ₹2000',
        'explore.noTrips': 'No Trips Found',
        'explore.noTripsSub': 'Try adjusting your search or filters to discover new adventures.',
        'explore.endOfList': "You've reached the end",
      };
      return defaultValue || translations[key] || key;
    },
  }),
}));

const mockTrips: Trip[] = [
  {
    id: 'trip_1',
    title: 'Harishchandragad Trek',
    description: 'Scenic night trek to Konkan Kada',
    vendorName: 'Sahyadri Trekkers',
    vendorWhatsApp: '+919876543210',
    vendorUPI: ['sahyadri@upi'],
    vendorId: 'v1',
    images: ['https://example.com/img1.jpg'],
    packages: [{ name: 'Standard', price: 950 }],
    batches: [{ id: 'b1', dateDuration: '10-11 Oct', totalSeats: 20, bookedSeats: 8 }],
    pickupPoints: [],
    addOns: [],
    itinerary: 'Day 1: Base village',
    inclusions: ['Food'],
    exclusions: [],
    thingsToCarry: [],
    cancellationPolicy: [],
    status: 'published',
    category: 'Trekking',
    destination: 'Maharashtra',
  },
  {
    id: 'trip_2',
    title: 'Goa Beach Camping',
    description: 'Relaxing beachside camping in North Goa',
    vendorName: 'Coastal Vibe',
    vendorWhatsApp: '+919876543211',
    vendorUPI: ['coastal@upi'],
    vendorId: 'v2',
    images: ['https://example.com/img2.jpg'],
    packages: [{ name: 'Camp & Dine', price: 1800 }],
    batches: [{ id: 'b2', dateDuration: '15-16 Oct', totalSeats: 30, bookedSeats: 10 }],
    pickupPoints: [],
    addOns: [],
    itinerary: 'Day 1: Beach arrival',
    inclusions: ['BBQ'],
    exclusions: [],
    thingsToCarry: [],
    cancellationPolicy: [],
    status: 'published',
    tripStatus: 'started',
    category: 'Camping',
    destination: 'Goa',
  },
  {
    id: 'trip_3',
    title: 'Leh Ladakh Expedition',
    description: 'High altitude Himalayan road trip',
    vendorName: 'Himalayan Riders',
    vendorWhatsApp: '+919876543212',
    vendorUPI: ['leh@upi'],
    vendorId: 'v3',
    images: ['https://example.com/img3.jpg'],
    packages: [{ name: 'Bike Tour', price: 25000 }],
    batches: [{ id: 'b3', dateDuration: '1-7 Nov', totalSeats: 15, bookedSeats: 5 }],
    pickupPoints: [],
    addOns: [],
    itinerary: 'Day 1: Leh arrival',
    inclusions: ['Bikes', 'Fuel'],
    exclusions: [],
    thingsToCarry: [],
    cancellationPolicy: [],
    status: 'published',
    category: 'Road Trip',
    destination: 'Ladakh',
  },
];

const mockToggleWishlist = jest.fn();
let mockWishlist: string[] = ['trip_1'];
const mockRefreshTrips = jest.fn(() => Promise.resolve());

jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    trips: mockTrips,
    loading: false,
    fetchMoreTrips: jest.fn(),
    hasMoreTrips: false,
    refreshTrips: mockRefreshTrips,
  }),
}));

jest.mock('../hooks/useWishlist', () => ({
  useWishlist: () => ({
    wishlistedIds: mockWishlist,
    toggleWishlist: mockToggleWishlist,
  }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#00b0ff',
      background: '#f8fafc',
      card: '#ffffff',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      danger: '#ef4444',
      success: '#22c55e',
    },
    isDark: false,
  }),
}));

describe('Home Explore Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWishlist = ['trip_1'];
  });

  it('renders list of published trips with details and badges', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Harishchandragad Trek')).toBeTruthy();
    expect(screen.getByText('Goa Beach Camping')).toBeTruthy();
    expect(screen.getByText('Leh Ladakh Expedition')).toBeTruthy();

    // Check pricing
    expect(screen.getByText('₹950')).toBeTruthy();
    expect(screen.getByText('₹1800')).toBeTruthy();
    expect(screen.getByText('₹25000')).toBeTruthy();

    // Check live tracking badge on started trip
    expect(screen.getByText(/LIVE/i)).toBeTruthy();

    // Check seat count remaining
    expect(screen.getByText(/12 left/i)).toBeTruthy();
    expect(screen.getByText(/20 left/i)).toBeTruthy();
    expect(screen.getByText(/10 left/i)).toBeTruthy();
  });

  it('filters trips by search query (title, description, or vendor)', async () => {
    await render(<HomeScreen />);

    const searchInput = screen.getByPlaceholderText('Search destinations...');

    // Search by title
    await act(async () => {
      fireEvent.changeText(searchInput, 'Goa');
    });

    await waitFor(() => {
      expect(screen.getByText('Goa Beach Camping')).toBeTruthy();
      expect(screen.queryByText('Harishchandragad Trek')).toBeNull();
      expect(screen.queryByText('Leh Ladakh Expedition')).toBeNull();
    });

    // Search by vendor name
    await act(async () => {
      fireEvent.changeText(searchInput, 'Himalayan Riders');
    });

    await waitFor(() => {
      expect(screen.getByText('Leh Ladakh Expedition')).toBeTruthy();
      expect(screen.queryByText('Goa Beach Camping')).toBeNull();
    });
  });

  it('filters trips by price category using price dropdown modal', async () => {
    await render(<HomeScreen />);

    // Open price modal
    const priceDropdown = screen.getByText('All');
    await act(async () => {
      fireEvent.press(priceDropdown);
    });

    // Select "Under ₹1000"
    const under1000Option = screen.getByText('Under ₹1000');
    await act(async () => {
      fireEvent.press(under1000Option);
    });

    await waitFor(() => {
      expect(screen.getByText('Harishchandragad Trek')).toBeTruthy(); // ₹950
      expect(screen.queryByText('Goa Beach Camping')).toBeNull(); // ₹1800
      expect(screen.queryByText('Leh Ladakh Expedition')).toBeNull(); // ₹25000
    });
  });

  it('filters trips by category using category dropdown modal', async () => {
    await render(<HomeScreen />);

    // Open category modal
    const categoryDropdown = screen.getByText('Category');
    await act(async () => {
      fireEvent.press(categoryDropdown);
    });

    // Select Camping
    const campingOption = screen.getByText('Camping');
    await act(async () => {
      fireEvent.press(campingOption);
    });

    await waitFor(() => {
      expect(screen.getByText('Goa Beach Camping')).toBeTruthy();
      expect(screen.queryByText('Harishchandragad Trek')).toBeNull();
      expect(screen.queryByText('Leh Ladakh Expedition')).toBeNull();
    });
  });

  it('shows empty state when search matches no trips', async () => {
    await render(<HomeScreen />);

    const searchInput = screen.getByPlaceholderText('Search destinations...');
    await act(async () => {
      fireEvent.changeText(searchInput, 'NonExistentDestinationXYZ');
    });

    await waitFor(() => {
      expect(screen.getByText('No Trips Found')).toBeTruthy();
      expect(screen.getByText(/Try adjusting your search or filters/i)).toBeTruthy();
    });
  });
});
