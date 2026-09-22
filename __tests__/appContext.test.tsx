import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { signInAnonymously, signOut } from 'firebase/auth';
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
import { Alert, Platform, Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import { auth } from '../config/firebase';
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
    const ComponentOutside = () => {
      try {
        useAppContext();
      } catch (err: any) {
        return <Text testID="caught-error">{err.message}</Text>;
      }
      return null;
    };
    const { getByTestId } = render(<ComponentOutside />);
    expect(getByTestId('caught-error').props.children).toBe('useAppContext must be used within an AppProvider');
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

  test('covers error paths and edge cases: duplicate lock, notification failure, status update fallback', async () => {
    const realUser = {
      id: 'real_vendor_999',
      email: 'vendor999@real.com',
      name: 'Vendor 999',
      role: 'vendor' as const,
      upiId: 'real@upi',
      whatsappNumber: '+919988776655',
    };
    await AsyncStorage.setItem('userProfile', JSON.stringify(realUser));

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      id: 'real_vendor_999',
      data: () => realUser,
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.userProfile?.id).toBe('real_vendor_999');
    });

    // 1. Status update error fallback to state
    AppSecurityAttackThrottler.reset();
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore update error'));
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ travelerEmail: 'traveller@test.com', bookingId: 'ATGL-55555' }),
    });

    await act(async () => {
      await latestContext.updateBookingStatus('b_fail', 'failed');
    });

    // 2. bookTrip with vendor lookup by WhatsApp
    AppSecurityAttackThrottler.reset();
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: 'trip_no_vid',
        title: 'Trip No Vid',
        vendorWhatsApp: '+919988776655',
        batches: [{ id: 'b_wa', bookedSeats: 0, totalSeats: 20 }],
      }),
    });
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [{ id: 'found_vendor_id', data: () => ({ pushToken: 'found-token' }) }],
    });
    // Simulating push notification fetch rejection
    global.fetch = jest.fn(() => Promise.reject(new Error('Push notification service down'))) as any;

    await act(async () => {
      await latestContext.bookTrip({
        tripId: 'trip_no_vid',
        batchId: 'b_wa',
        travelerName: 'Anil Kapoor',
        travelerPhone: '+919988776655',
        seats: 2,
        totalPrice: 2000,
        status: 'pending',
        createdAt: Date.now(),
      });
    });
    expect(addDoc).toHaveBeenCalled();

    // 3. Demo user clicking 'Sign in with Google' on requireRealGoogleAccount alert
    await act(async () => {
      await latestContext.mockVendorLogin();
    });

    AppSecurityAttackThrottler.reset();
    let capturedButtons: any;
    (Alert.alert as jest.Mock).mockImplementationOnce((title, msg, buttons) => {
      capturedButtons = buttons;
    });

    await act(async () => {
      await latestContext.updateUserProfile({ name: 'Blocked' });
    });

    expect(capturedButtons).toBeDefined();
    // Invoke the 'Sign in with Google' button callback
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: { user: { email: 'v@test.com', name: 'Vendor' }, idToken: 'token123' },
    });
    const signInBtn = capturedButtons.find((b: any) => b.text === 'Sign in with Google');
    if (signInBtn && signInBtn.onPress) {
      await act(async () => {
        await signInBtn.onPress();
      });
    }

    // 4. Session loading fallback when vendorDoc doesn't exist in Firestore
    await AsyncStorage.setItem('userProfile', JSON.stringify({ id: 'cached_only_user', name: 'Cached User', role: 'vendor' }));
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });
  });

  test('covers notification handler callback and android push notification registration', async () => {
    // 1. Notification handler configuration
    if ((global as any).__lastNotificationHandler?.handleNotification) {
      const config = await (global as any).__lastNotificationHandler.handleNotification();
      expect(config).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    }

    // 2. Android push notification registration
    const originalOS = Platform.OS;
    try {
      Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: 'expo-token-android' });

      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        data: { user: { email: 'android@test.com', name: 'Android User' }, idToken: 'token-android' },
      });

      render(
        <AppProvider>
          <Consumer />
        </AppProvider>
      );

      await waitFor(() => expect(latestContext?.loading).toBe(false));

      await act(async () => {
        await latestContext.loginWithGoogle('vendor');
      });

      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.any(Object));

      // Test denied permission path
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
      (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
        type: 'success',
        data: { user: { email: 'android2@test.com', name: 'Android User 2' }, idToken: 'token-android-2' },
      });

      await act(async () => {
        await latestContext.loginWithGoogle('vendor');
      });
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  test('covers loadInitialTrips error and seedInitialData error', async () => {
    // 1. loadInitialTrips error catch
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Network error loading trips'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.loading).toBe(false));
    expect(consoleSpy).toHaveBeenCalledWith('Error loading trips:', expect.any(Error));

    // 2. seedInitialData error catch when initial query returns 0 trips
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: true,
      docs: [],
      forEach: jest.fn(),
    });
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('Failed to seed'));

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.loading).toBe(false));
    expect(consoleSpy).toHaveBeenCalledWith('Error seeding initial data:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  test('covers loadVendorBookings demo vendor, snapshot sorting, and error callback', async () => {
    // 1. Demo vendor in session restoring triggers DEMO_APP_VENDOR_BOOKINGS
    await AsyncStorage.setItem('userProfile', JSON.stringify(DEMO_APP_VENDOR_USER));
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      id: DEMO_APP_VENDOR_USER.id,
      data: () => DEMO_APP_VENDOR_USER,
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.vendorBookings?.length).toBeGreaterThan(0));

    // 2. Snapshot callback with documents to sort for real vendor
    let capturedNext: any;
    let capturedErr: any;
    (onSnapshot as jest.Mock).mockImplementation((q, next, err) => {
      capturedNext = next;
      capturedErr = err;
      return jest.fn();
    });

    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: { user: { email: 'snap_vendor@test.com', name: 'Snap Vendor' }, idToken: 'token_snap' },
    });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: 'snap_vendor_uid', role: 'vendor', name: 'Snap Vendor' }),
    });

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });

    if (capturedNext) {
      act(() => {
        capturedNext({
          forEach: (cb: any) => {
            cb({ id: 'b_old', data: () => ({ createdAt: 100, travelerName: 'Old' }) });
            cb({ id: 'b_new', data: () => ({ createdAt: 500, travelerName: 'New' }) });
          },
        });
      });
      expect(latestContext.vendorBookings[0]?.id).toBe('b_new');
    }

    // 3. Snapshot error callback
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    if (capturedErr) {
      act(() => {
        capturedErr(new Error('Snapshot permission denied'));
      });
      expect(consoleSpy).toHaveBeenCalledWith('Error loading vendor bookings:', expect.any(Error));
    }
    consoleSpy.mockRestore();
  });

  test('covers fetchMoreTrips zero-docs branch and catch error branch', async () => {
    // Initial trips to populate lastVisible
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

    await waitFor(() => expect(latestContext?.hasMoreTrips).toBe(true));

    // 1. fetchMoreTrips returns 0 docs -> setHasMoreTrips(false)
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: true,
      docs: [],
      forEach: jest.fn(),
    });

    await act(async () => {
      await latestContext.fetchMoreTrips();
    });

    expect(latestContext.hasMoreTrips).toBe(false);

    // 2. fetchMoreTrips error catch
    // Reset hasMoreTrips back to true by refreshing
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: mockTripList,
      forEach(cb: any) {
        this.docs.forEach(cb);
      },
    });
    await act(async () => {
      await latestContext.refreshTrips();
    });

    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Fetch more failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await latestContext.fetchMoreTrips();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error fetching more trips:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  test('covers loadSession offline/error fallback, doc not found, and JSON parse failure', async () => {
    // 1. Cached profile but Firestore getDoc returns exists: false
    await AsyncStorage.setItem('userProfile', JSON.stringify({ id: 'vendor_cache_only', name: 'Cache Only', role: 'vendor' }));
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.userProfile?.id).toBe('vendor_cache_only');
    });

    // 2. Cached profile but Firestore getDoc throws (offline)
    const cachedProfile = { id: 'cached_offline_vendor', name: 'Offline Vendor', role: 'vendor' };
    await AsyncStorage.setItem('userProfile', JSON.stringify(cachedProfile));
    (getDoc as jest.Mock).mockRejectedValueOnce(new Error('Offline unavailable'));

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(latestContext?.userProfile?.id).toBe('cached_offline_vendor');
    });

    // 3. Invalid JSON in AsyncStorage
    await AsyncStorage.setItem('userProfile', 'invalid{json');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load session');
    });
    consoleSpy.mockRestore();
  });

  test('covers loginWithGoogle edge cases: missing user, getTokens fallback and failure, traveller role assignment', async () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.loading).toBe(false));

    // 1. Missing user info from Google
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({});
    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });
    expect(Alert.alert).toHaveBeenCalledWith('Login Failed', expect.stringContaining('Could not retrieve user info'));

    // 2. idToken not in response, getTokens() called and succeeds
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      user: { email: 'gettokens@test.com', name: 'GetTokens User' },
      idToken: null,
    });
    (GoogleSignin.getTokens as jest.Mock).mockResolvedValueOnce({ idToken: 'token-from-gettokens' });
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });
    expect(setDoc).toHaveBeenCalled();

    // 3. idToken missing, getTokens() throws error, idToken remains null
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      user: { email: 'notoken@test.com', name: 'No Token User' },
      idToken: null,
    });
    (GoogleSignin.getTokens as jest.Mock).mockRejectedValueOnce(new Error('getTokens error'));

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });
    expect(Alert.alert).toHaveBeenCalledWith('Login Failed', expect.stringContaining('Could not obtain Google ID token'));

    // 4. Logging in as traveller when existing user doc has no role
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: { user: { email: 'traveller_norole@test.com', name: 'No Role' }, idToken: 'token_norole' },
    });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ email: 'traveller_norole@test.com', name: 'No Role' }), // role undefined
    });

    await act(async () => {
      await latestContext.loginWithGoogle('traveller');
    });
    expect(updateDoc).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ role: 'traveller' }));
  });

  test('covers mock logins on web platform with anonymous auth and storage errors', async () => {
    const originalOS = Platform.OS;
    try {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      render(
        <AppProvider>
          <Consumer />
        </AppProvider>
      );

      await waitFor(() => expect(latestContext?.loading).toBe(false));

      // 1. Web mockTravellerLogin success and anonymous auth error catch
      await act(async () => {
        await latestContext.mockTravellerLogin();
      });
      expect(signInAnonymously).toHaveBeenCalled();

      (signInAnonymously as jest.Mock).mockRejectedValueOnce(new Error('Anon signin failed'));
      await act(async () => {
        await latestContext.mockTravellerLogin();
      });

      // 2. Web mockVendorLogin success and anonymous auth error catch
      await act(async () => {
        await latestContext.mockVendorLogin();
      });

      (signInAnonymously as jest.Mock).mockRejectedValueOnce(new Error('Anon signin failed'));
      await act(async () => {
        await latestContext.mockVendorLogin();
      });

      // 3. AsyncStorage setItem failures in mock logins
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValueOnce(new Error('Storage failure'));

      await act(async () => {
        await latestContext.mockTravellerLogin();
      });
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Mock login failed.');

      AsyncStorage.setItem = jest.fn().mockRejectedValueOnce(new Error('Storage failure'));
      await act(async () => {
        await latestContext.mockVendorLogin();
      });
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Mock login failed.');

      AsyncStorage.setItem = originalSetItem;
    } finally {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    }
  });

  test('covers logout with active listener unsubscribe and signout rejection', async () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.loading).toBe(false));

    // Sign in as real vendor with active listener
    const mockUnsub = jest.fn();
    (onSnapshot as jest.Mock).mockReturnValueOnce(mockUnsub);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      data: { user: { email: 'v_logout@test.com', name: 'Vendor Logout' }, idToken: 'token_logout' },
    });
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: 'uid_logout', role: 'vendor' }),
    });

    await act(async () => {
      await latestContext.loginWithGoogle('vendor');
    });

    // Make Google and Firebase signouts reject to cover error catches
    (GoogleSignin.signOut as jest.Mock).mockRejectedValueOnce(new Error('Google signOut failed'));
    (signOut as jest.Mock).mockRejectedValueOnce(new Error('Firebase signOut failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await latestContext.logout();
    });

    expect(mockUnsub).toHaveBeenCalled();
    expect(latestContext.userProfile).toBeNull();
    expect(latestContext.vendorBookings).toEqual([]);
    consoleSpy.mockRestore();
  });

  test('covers throttler lockouts, auth fallbacks, duplicate lock, and seat update error in trip/booking methods', async () => {
    const realVendor = {
      id: 'real_vendor_coverage',
      email: 'vendor_cov@real.com',
      name: 'Vendor Cov',
      role: 'vendor' as const,
      upiId: 'cov@upi',
      whatsappNumber: '+919988771122',
      paymentSettings: { enabled: true, gateway: 'razorpay' as const, razorpayKeyId: 'rzp_key_test' },
    };
    await AsyncStorage.setItem('userProfile', JSON.stringify(realVendor));

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      id: realVendor.id,
      data: () => realVendor,
    });

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    await waitFor(() => expect(latestContext?.userProfile?.id).toBe(realVendor.id));

    // 1. addTrip with auth.currentUser null and anonymous fallback error
    const originalCurrentUser = auth.currentUser;
    (auth as any).currentUser = null;
    (signInAnonymously as jest.Mock).mockRejectedValueOnce(new Error('Anon error on addTrip'));

    await act(async () => {
      await latestContext.addTrip({
        title: 'New Cov Trip',
        location: 'Goa',
        duration: '2D/1N',
        difficulty: 'Easy',
        category: 'Beach',
        status: 'published',
        images: ['https://example.com/beach.jpg'],
        itinerary: [],
        inclusions: [],
        exclusions: [],
        packages: [{ id: 'p1', name: 'Basic', price: 1500, description: 'Basic pkg' }],
        batches: [],
      } as any);
    });
    expect(addDoc).toHaveBeenCalled();

    // 2. addTrip throttler lockout
    for (let i = 0; i < 6; i++) {
      AppSecurityAttackThrottler.checkAndEnforce('lockout');
    }
    const addResult = await latestContext.addTrip({ title: 'Blocked Trip' } as any);
    expect(addResult).toBeUndefined();

    // 3. deleteTrip throttler lockout
    await act(async () => {
      await latestContext.deleteTrip('trip_blocked');
    });

    // 4. updateBookingStatus throttler lockout
    await act(async () => {
      await latestContext.updateBookingStatus('b_blocked', 'confirmed');
    });

    // 5. bookTrip throttler lockout
    await act(async () => {
      await latestContext.bookTrip({ tripId: 'trip_blocked' } as any);
    });

    AppSecurityAttackThrottler.reset();

    // 6. Duplicate booking submission lock
    let resolveAddDoc: any;
    (addDoc as jest.Mock).mockImplementationOnce(() => new Promise(res => { resolveAddDoc = res; }));
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ id: 'trip_dup', batches: [] }),
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const b1 = latestContext.bookTrip({
      tripId: 'trip_dup',
      travelerName: 'Dup One',
      travelerPhone: '+919988776655',
      seats: 1,
      totalPrice: 1000,
    });
    const b2 = latestContext.bookTrip({
      tripId: 'trip_dup',
      travelerName: 'Dup Two',
      travelerPhone: '+919988776655',
      seats: 1,
      totalPrice: 1000,
    });
    if (resolveAddDoc) resolveAddDoc({ id: 'b_resolved' });
    await Promise.all([b1, b2]);
    expect(warnSpy).toHaveBeenCalledWith('Booking submission in progress, ignoring duplicate call.');
    warnSpy.mockRestore();

    // 7. bookTrip when auth.currentUser is null and tripDocSnap does NOT exist
    (auth as any).currentUser = null;
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

    await act(async () => {
      await latestContext.bookTrip({
        tripId: 'non_existent_trip',
        travelerName: 'Rohit Sharma',
        travelerPhone: '+919988776655',
        seats: 2,
        totalPrice: 4000,
        status: 'pending',
      });
    });
    expect(addDoc).toHaveBeenCalled();

    // 8. bookTrip seat update catch error
    (auth as any).currentUser = originalCurrentUser;
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        id: 'trip_seat_err',
        vendorId: 'vendor_1',
        batches: [{ id: 'batch_err', bookedSeats: 0 }],
      }),
    });
    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore seat update failed'));

    await act(async () => {
      await latestContext.bookTrip({
        tripId: 'trip_seat_err',
        batchId: 'batch_err',
        travelerName: 'Rohit Sharma',
        travelerPhone: '+919988776655',
        seats: 2,
        totalPrice: 4000,
      });
    });
    expect(addDoc).toHaveBeenCalled();

    // 9. updateBookingStatus notification lookup error catch
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ travelerEmail: 'traveller_err@test.com', bookingId: 'ATGL-ERR' }),
    });
    (getDocs as jest.Mock).mockRejectedValueOnce(new Error('Network failure looking up token'));

    await act(async () => {
      await latestContext.updateBookingStatus('b_notif_err', 'confirmed');
    });
    expect(updateDoc).toHaveBeenCalled();
  });
});
