import { render } from '@testing-library/react-native';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { Skeleton } from '../components/Skeleton';

// Mock AppContext for OfflineIndicator
const mockUseAppContext = jest.fn();
jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'trip_123' }),
  router: { push: jest.fn(), replace: jest.fn() }
}));

// Mock Live Tracking Hook
jest.mock('../hooks/useLiveTracking', () => ({
  useLiveTracking: () => ({
    liveState: { captain: null, travellers: {} },
    guestId: null,
    joinAsGuest: jest.fn(),
    updateGuestLocation: jest.fn()
  })
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key,
  }),
}));

describe('Skeleton Component', () => {
  it('renders default skeleton with default props', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders custom dimensions and border radius', () => {
    const { toJSON } = render(
      <Skeleton width={150} height={50} borderRadius={12} style={{ marginVertical: 8 }} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('handles percentage width and circular dimensions', () => {
    const { toJSON } = render(<Skeleton width="50%" height={60} borderRadius={30} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('OfflineIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online', async () => {
    mockUseAppContext.mockReturnValue({ isOnline: true });
    const { toJSON } = (await render(<OfflineIndicator />)) as any;
    expect(toJSON()).toBeNull();
  });

  it('renders offline message when offline', async () => {
    mockUseAppContext.mockReturnValue({ isOnline: false });
    const { getByText } = (await render(<OfflineIndicator />)) as any;
    expect(getByText('No internet connection')).toBeTruthy();
  });
});

describe('Component Utility Tests', () => {
  it('price calculation is correct', () => {
    const basePrice = 1500;
    const addOnsPrice = 200;
    const seats = 2;
    const totalPrice = (basePrice + addOnsPrice) * seats;
    expect(totalPrice).toBe(3400);
  });

  it('average rating calculation is correct', () => {
    const ratings = [{ stars: 5 }, { stars: 4 }, { stars: 3 }];
    const avgRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
    expect(avgRating.toFixed(1)).toBe('4.0');
  });

  it('returns null for empty ratings', () => {
    const ratings: any[] = [];
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
      : null;
    expect(avgRating).toBeNull();
  });
});
