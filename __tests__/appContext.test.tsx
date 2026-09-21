import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { act, render, waitFor } from '@testing-library/react-native';
import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import React from 'react';
import { Alert, Text } from 'react-native';
import {
  AppProvider,
  AppSecurityAttackThrottler,
  DEMO_APP_TRAVELLER_USER,
  DEMO_APP_VENDOR_USER,
  useAppContext,
} from '../context/AppContext';

jest.spyOn(Alert, 'alert');

describe('AppSecurityAttackThrottler', () => {
  beforeEach(() => {
    AppSecurityAttackThrottler.reset();
    jest.clearAllMocks();
  });

  test('allows operations within limit and triggers lockout on excess', () => {
    expect(AppSecurityAttackThrottler.isLockedOut()).toBe(false);

    for (let i = 0; i < 5; i++) {
      expect(AppSecurityAttackThrottler.checkAndEnforce('testAction')).toBe(true);
    }

    expect(AppSecurityAttackThrottler.checkAndEnforce('testAction')).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      '🚨 Attack Protection Activated',
      expect.stringContaining('locked for 60 seconds')
    );
    expect(AppSecurityAttackThrottler.isLockedOut()).toBe(true);

    expect(AppSecurityAttackThrottler.checkAndEnforce('anotherAction')).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      '🚨 Security Alert: Attack Protection',
      expect.stringContaining('is blocked')
    );

    AppSecurityAttackThrottler.reset();
    expect(AppSecurityAttackThrottler.isLockedOut()).toBe(false);
    expect(AppSecurityAttackThrottler.checkAndEnforce('testAction')).toBe(true);
  });
});

describe('useAppContext hook', () => {
  test('throws error when used outside of AppProvider', () => {
    expect(() => useAppContext()).toThrow();
  });
});

describe('AppProvider Flow & Methods', () => {
  let latestContext: ReturnType<typeof useAppContext>;

  const Consumer: React.FC = () => {
    const ctx = useAppContext();
    latestContext = ctx;
    return <Text testID="provider-ready">{ctx.loading ? 'loading' : 'ready'}</Text>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    AppSecurityAttackThrottler.reset();
    await AsyncStorage.clear();
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;
  });

  test('renders children and loads initial trips from firestore', async () => {
    const mockTripList = Array.from({ length: 10 }, (_, i) => ({
      id: `trip_${i}`,
      data: () => ({ title: `Trip ${i}`, status: 'published', packages: [{ price: 999 }] }),
    }));

    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: mockTripList,
      forEach(cb: any) {
        this.docs.forEach(cb);
      },
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.loading).toBe(false);
    });

    expect(latestContext.trips.length).toBe(10);
    expect(latestContext.hasMoreTrips).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('cached_trips', expect.any(String));
  });

  test('seeds fallback data when firestore returns no trips', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: jest.fn(),
      })
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'seeded_1', data: () => ({ title: 'Seeded Trip', status: 'published' }) }],
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
      });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.trips?.length).toBeGreaterThan(0);
    });
  });

  test('loads cached trips on startup', async () => {
    const cached = [{ id: 'cached_1', title: 'Cached Trip', status: 'published' }];
    await AsyncStorage.setItem('cached_trips', JSON.stringify(cached));

    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'cached_1', data: () => cached[0] }],
      forEach(cb: any) {
        cb(this.docs[0]);
      },
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.trips?.length).toBeGreaterThan(0);
    });

    expect(latestContext.trips[0].id).toBe('cached_1');
  });

  test('network status handles offline failure', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network offline'))) as any;

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.isOnline).toBe(false);
    });
  });

  test('refreshTrips reloads initial trips', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: [{ id: 'refreshed_1', data: () => ({ title: 'Refreshed Trip', status: 'published' }) }],
      forEach(cb: any) {
        cb(this.docs[0]);
      },
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.loading).toBe(false);
    });

    await act(async () => {
      await latestContext.refreshTrips();
    });

    expect(latestContext.trips[0].id).toBe('refreshed_1');
  });

  test('fetchMoreTrips handles pagination when more items exist and when reached end', async () => {
    const firstTen = Array.from({ length: 10 }, (_, i) => ({
      id: `trip_${i}`,
      data: () => ({ title: `Trip ${i}`, status: 'published' }),
    }));

    (getDocs as jest.Mock)
      .mockResolvedValueOnce({
        empty: false,
        docs: firstTen,
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
      })
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'more_1', data: () => ({ title: 'More Trip', status: 'published' }) }],
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
      })
      .mockResolvedValueOnce({
        empty: true,
        docs: [],
        forEach: jest.fn(),
      });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.hasMoreTrips).toBe(true);
    });

    await act(async () => {
      await latestContext.fetchMoreTrips();
    });

    expect(latestContext.trips.some(t => t.id === 'more_1')).toBe(true);

    // End of pagination
    await act(async () => {
      await latestContext.fetchMoreTrips();
    });
    expect(latestContext.hasMoreTrips).toBe(false);
  });

  test('mockTravellerLogin and mockVendorLogin set demo users', async () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext).toBeTruthy();
    });

    await act(async () => {
      await latestContext.mockTravellerLogin();
    });

    expect(latestContext.userProfile?.id).toBe(DEMO_APP_TRAVELLER_USER.id);
    expect(Alert.alert).toHaveBeenCalledWith('⚡ Demo Traveller', expect.any(String));

    await act(async () => {
      await latestContext.mockVendorLogin();
    });

    expect(latestContext.userProfile?.id).toBe(DEMO_APP_VENDOR_USER.id);
    expect(latestContext.vendorBookings.length).toBeGreaterThan(0);
    expect(Alert.alert).toHaveBeenCalledWith('⚡ Demo Organiser', expect.any(String));

    await act(async () => {
      await latestContext.logout();
    });

    expect(latestContext.userProfile).toBeNull();
    expect(latestContext.vendorBookings.length).toBe(0);
  });

  test('demo account restricts mutation actions (requireRealGoogleAccount)', async () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext).toBeTruthy();
    });

    await act(async () => {
      await latestContext.mockVendorLogin();
    });

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.updateUserProfile({ name: 'Hacked' });
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.updateTrip('demo', { title: 'Hacked' });
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.addTrip({ title: 'New Trip', destination: 'Nowhere', price: 500 } as any);
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.deleteTrip('demo');
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.bookTrip({ tripId: 'demo', travelerName: 'Hacker', travelerPhone: '9999999999' } as any);
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));

    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.updateBookingStatus('b1', 'confirmed');
    });
    expect(Alert.alert).toHaveBeenCalledWith('🔐 Google Sign-In Required', expect.any(String), expect.any(Array));
  });

  test('loginWithGoogle handles v13+ response format and upgrades/saves vendor profile', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: {
        idToken: 'mock-valid-id-token',
        user: { email: 'vendor@test.com', name: 'Real Vendor' },
      },
    });

    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: 'cred-1',
      data: () => ({
        name: 'Real Vendor',
        email: 'vendor@test.com',
        role: 'traveller',
        pushToken: 'old-token',
      }),
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext).toBeTruthy();
    });

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });

    expect(latestContext.userProfile?.role).toBe('vendor');
    expect(updateDoc).toHaveBeenCalled();
  });

  test('loginWithGoogle handles new user creation when doc does not exist', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      user: { email: 'new@test.com', name: 'New User' },
      idToken: 'mock-valid-id-token',
    });

    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => false,
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext).toBeTruthy();
    });

    await act(async () => {
      await latestContext.loginWithGoogle('traveller');
    });

    expect(setDoc).toHaveBeenCalled();
    expect(latestContext.userProfile?.email).toBe('new@test.com');
  });

  test('loginWithGoogle displays alert on failure', async () => {
    (GoogleSignin.signIn as jest.Mock).mockRejectedValueOnce(new Error('Google connection error'));

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext).toBeTruthy();
    });

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });

    expect(Alert.alert).toHaveBeenCalledWith('Login Failed', expect.stringContaining('Google connection error'));
  });

  test('real user can perform updates, addTrip, deleteTrip, bookTrip, and updateBookingStatus', async () => {
    const realUser = {
      id: 'real_vendor_123',
      email: 'organizer@real.com',
      name: 'Sahyadri Real',
      role: 'vendor' as const,
      upiId: 'real@upi',
      whatsappNumber: '+919988776655',
      paymentSettings: { enabled: true, gateway: 'razorpay' as const, razorpayKeyId: 'rzp_test_123' },
    };
    await AsyncStorage.setItem('userProfile', JSON.stringify(realUser));

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      id: 'real_vendor_123',
      data: () => realUser,
    });

    (getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'real_trip_1',
          data: () => ({
            title: 'Real Adventure',
            vendorId: 'real_vendor_123',
            vendorWhatsApp: '+919988776655',
            batches: [{ id: 'batch_1', bookedSeats: 2, totalSeats: 20 }],
          }),
        },
      ],
      forEach(cb: any) {
        this.docs.forEach(cb);
      },
    });

    (addDoc as jest.Mock).mockResolvedValue({ id: 'new_trip_id' });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.userProfile?.id).toBe('real_vendor_123');
    });

    // 1. updateUserProfile
    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.updateUserProfile({ name: 'Sahyadri Pro' });
    });
    expect(latestContext.userProfile?.name).toBe('Sahyadri Pro');
    expect(updateDoc).toHaveBeenCalled();

    // 2. updateTrip
    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.updateTrip('real_trip_1', { title: 'Updated Adventure' });
    });
    expect(updateDoc).toHaveBeenCalled();

    // 3. addTrip
    AppSecurityAttackThrottler.reset();
    let created: any;
    await act(async () => {
      created = await latestContext.addTrip({
        title: 'Brand New Trek',
        destination: 'Sahyadri',
        price: 1500,
        packages: [{ name: 'Standard', price: 1500 }],
        batches: [{ id: 'batch_1', dateDuration: 'Tomorrow', totalSeats: 20, bookedSeats: 0 }],
      } as any);
    });
    expect(created?.id).toBe('new_trip_id');
    expect(addDoc).toHaveBeenCalled();

    // 4. deleteTrip
    AppSecurityAttackThrottler.reset();
    await act(async () => {
      await latestContext.deleteTrip('real_trip_1');
    });
    expect(deleteDoc).toHaveBeenCalled();

    // 5. bookTrip validations
    AppSecurityAttackThrottler.reset();
    await expect(latestContext.bookTrip({} as any)).rejects.toThrow('Missing tripId in booking payload');
    await expect(latestContext.bookTrip({ tripId: 't1', travelerName: 'A' } as any)).rejects.toThrow('Traveler name must be at least 2 characters');
    await expect(latestContext.bookTrip({ tripId: 't1', travelerName: 'Valid', travelerPhone: '123' } as any)).rejects.toThrow('valid phone number');

    // 5b. bookTrip success
    AppSecurityAttackThrottler.reset();
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: 'real_trip_1',
        title: 'Real Adventure',
        vendorId: 'real_vendor_123',
        batches: [{ id: 'batch_1', bookedSeats: 2, totalSeats: 20 }],
      }),
    });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ pushToken: 'vendor-push-token' }),
    });

    await act(async () => {
      await latestContext.bookTrip({
        tripId: 'real_trip_1',
        batchId: 'batch_1',
        travelerName: 'Sanjay Dutt',
        travelerPhone: '+919988776655',
        travelerEmail: 'sanjay@test.com',
        seats: 2,
        totalPrice: 3000,
        status: 'pending',
        createdAt: Date.now(),
      });
    });
    expect(addDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();

    // 6. updateBookingStatus
    AppSecurityAttackThrottler.reset();
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ travelerEmail: 'sanjay@test.com', bookingId: 'ATGL-99999' }),
    });
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ pushToken: 'traveller-push-token' }) }],
    });

    await act(async () => {
      await latestContext.updateBookingStatus('booking_123', 'confirmed');
    });
    expect(updateDoc).toHaveBeenCalled();
  });
});
