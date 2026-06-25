import React, { createContext, useState, useContext, useEffect } from 'react';
import { Trip, Rating, Booking, trips as initialTrips } from '../data/trips';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return undefined;
    token = (await Notifications.getExpoPushTokenAsync()).data;
  }
  return token;
}
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc, 
  query, 
  getDocs,
  addDoc,
  deleteDoc,
  arrayUnion,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

// Replace with your Web Client ID from Google Cloud Console
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '264459863602-lfns732opcfoi2ardm5qddarsd6e4kb1.apps.googleusercontent.com',
  });
}

interface VendorProfile {
  id: string; 
  email: string;
  name: string;
  upiId: string;
  whatsappNumber: string;
  pushToken?: string;
}

interface AppContextType {
  trips: Trip[];
  vendorBookings: Booking[];
  loading: boolean;
  vendorProfile: VendorProfile | null;
  loginWithGoogle: () => Promise<void>;
  mockVendorLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateVendorProfile: (updates: Partial<VendorProfile>) => void;
  updateTrip: (tripId: string, updates: Partial<Trip>) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  bookTrip: (booking: Omit<Booking, 'id'>) => Promise<void>;
  updateBookingStatus: (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'failed') => Promise<void>;
  submitRating: (tripId: string, rating: Rating) => Promise<void>;
  fetchMoreTrips: () => Promise<void>;
  hasMoreTrips: boolean;
  refreshTrips: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vendorBookings, setVendorBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);

  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreTrips, setHasMoreTrips] = useState(true);

  // 1. Initial Load of Trips (Paginated)
  const loadInitialTrips = async () => {
    try {
      const q = query(collection(db, 'trips'), limit(10));
      const querySnapshot = await getDocs(q);
      
      const tripsData: Trip[] = [];
      querySnapshot.forEach((docSnap) => {
        tripsData.push({ id: docSnap.id, ...docSnap.data() } as Trip);
      });

      if (tripsData.length === 0 && initialTrips.length > 0) {
        await seedInitialData();
        // After seeding, fetch again so the skeleton loader doesn't loop forever!
        const q2 = query(collection(db, 'trips'), limit(10));
        const querySnapshot2 = await getDocs(q2);
        const tripsData2: Trip[] = [];
        querySnapshot2.forEach((docSnap) => {
          tripsData2.push({ id: docSnap.id, ...docSnap.data() } as Trip);
        });
        setTrips(tripsData2);
        if (querySnapshot2.docs.length > 0) {
          setLastVisible(querySnapshot2.docs[querySnapshot2.docs.length - 1]);
        }
        setHasMoreTrips(querySnapshot2.docs.length === 10);
        AsyncStorage.setItem('cached_trips', JSON.stringify(tripsData2)).catch(() => {});
        setLoading(false);
        return;
      }
      
      setTrips(tripsData);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMoreTrips(querySnapshot.docs.length === 10);
      AsyncStorage.setItem('cached_trips', JSON.stringify(tripsData)).catch(() => {});
      setLoading(false);
    } catch (error) {
      console.error("Error loading trips:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load offline cache first
    AsyncStorage.getItem('cached_trips').then(cached => {
      if (cached) {
        const parsed = JSON.parse(cached) as Trip[];
        if (parsed.length > 0) {
          setTrips(parsed);
          setLoading(false);
        }
      }
    }).catch(() => {});

    loadInitialTrips();
  }, []);

  const refreshTrips = async () => {
    setLoading(true);
    await loadInitialTrips();
  };

  const fetchMoreTrips = async () => {
    if (!lastVisible || !hasMoreTrips) return;
    
    try {
      const q = query(collection(db, 'trips'), startAfter(lastVisible), limit(10));
      const querySnapshot = await getDocs(q);
      
      const tripsData: Trip[] = [];
      querySnapshot.forEach((docSnap) => {
        tripsData.push({ id: docSnap.id, ...docSnap.data() } as Trip);
      });

      if (tripsData.length > 0) {
        setTrips(prev => [...prev, ...tripsData]);
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMoreTrips(querySnapshot.docs.length === 10);
      } else {
        setHasMoreTrips(false);
      }
    } catch (error) {
      console.error("Error fetching more trips:", error);
    }
  };

  const seedInitialData = async () => {
    setLoading(true);
    console.log('Seeding initial data to Firestore...');
    try {
      for (const trip of initialTrips) {
        const { id, ...tripData } = trip;
        await addDoc(collection(db, 'trips'), tripData);
      }

    } catch (error) {
      console.error("Error seeding initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load vendor profile from local storage (to maintain session)
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('vendorProfile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          // Refresh from Firestore to get latest data
          const vendorDoc = await getDocs(query(collection(db, 'vendors')));
          const found = vendorDoc.docs.find(d => d.id === parsed.id);
          if (found) {
            setVendorProfile({ id: found.id, ...found.data() } as VendorProfile);
            loadVendorBookings(found.id);
          } else {
            setVendorProfile(parsed);
            if (parsed.id) loadVendorBookings(parsed.id);
          }
        }
      } catch (e) {
        console.error('Failed to load session');
      }
    };
    loadSession();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // v13+ API: response = { type: 'success', data: { user: { email, name } } }
      // Older API: response = { user: { email, name } }
      // We handle both for compatibility
      let email: string;
      let name: string;

      if ('type' in response && response.type === 'success' && response.data?.user) {
        // New v13+ format
        email = response.data.user.email;
        name = response.data.user.name || 'Vendor';
      } else if ((response as any).user) {
        // Old format fallback
        email = (response as any).user.email;
        name = (response as any).user.name || 'Vendor';
      } else {
        throw new Error('Could not retrieve user info from Google. Please try again.');
      }

      // Check if vendor exists in Firestore
      const q = query(collection(db, 'vendors'));
      const querySnapshot = await getDocs(q);
      let existingVendor = querySnapshot.docs.find(doc => doc.data().email === email);

      let profile: VendorProfile;
      let pushToken = '';
      try {
        pushToken = await registerForPushNotificationsAsync() || '';
      } catch (e) {}

      if (existingVendor) {
        profile = { id: existingVendor.id, ...existingVendor.data() } as VendorProfile;
        if (pushToken && profile.pushToken !== pushToken) {
          await updateDoc(doc(db, 'vendors', existingVendor.id), { pushToken });
          profile.pushToken = pushToken;
        }
      } else {
        // Create new vendor in Firestore
        const newVendorData = {
          email,
          name,
          upiId: 'merchant@bank',
          whatsappNumber: '+911234567890',
          pushToken
        };
        const docRef = await addDoc(collection(db, 'vendors'), newVendorData);
        profile = { id: docRef.id, ...newVendorData };
      }

      setVendorProfile(profile);
      await AsyncStorage.setItem('vendorProfile', JSON.stringify(profile));
      loadVendorBookings(profile.id);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      Alert.alert(
        'Login Failed', 
        `Could not connect to Google. Please try again.\nError: ${error.message || 'Unknown'}`
      );
    }
  };

  const mockVendorLogin = async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.log('Anonymous sign-in failed, continuing with local mock:', e);
        }
      }

      const email = 'AbTohGhoomLe@gmail.com';
      const name = 'Dev Vendor';
      
      const q = query(collection(db, 'vendors'));
      const querySnapshot = await getDocs(q);
      let existingVendor = querySnapshot.docs.find(doc => doc.data().email === email);

      let profile: VendorProfile;

      if (existingVendor) {
        profile = { id: existingVendor.id, ...existingVendor.data() } as VendorProfile;
      } else {
        const newVendorRef = await addDoc(collection(db, 'vendors'), {
          email,
          name,
          upiId: '',
          whatsappNumber: '',
          pushToken: ''
        });
        profile = { id: newVendorRef.id, email, name, upiId: '', whatsappNumber: '' };
      }

      await AsyncStorage.setItem('vendorProfile', JSON.stringify(profile));
      setVendorProfile(profile);
      loadVendorBookings(profile.id);
      Alert.alert('Dev Login', 'Successfully mocked login on Web!');
    } catch (e) {
      Alert.alert('Error', 'Mock login failed.');
    }
  };

  const logout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error(error);
    }
    setVendorProfile(null);
    await AsyncStorage.removeItem('vendorProfile');
  };

  const updateVendorProfile = async (updates: Partial<VendorProfile>) => {
    if (vendorProfile) {
      const updatedProfile = { ...vendorProfile, ...updates };
      
      // 1. Update Firestore
      const vendorRef = doc(db, 'vendors', vendorProfile.id);
      await updateDoc(vendorRef, updates);

      // 2. Update Local State
      setVendorProfile(updatedProfile);
      await AsyncStorage.setItem('vendorProfile', JSON.stringify(updatedProfile));

      // 3. Update only trips belonging to this vendor in Firestore
      const { where } = await import('firebase/firestore');
      const vendorTripsQ = query(collection(db, 'trips'), where('vendorId', '==', vendorProfile.id));
      const vendorTripsSnap = await getDocs(vendorTripsQ);
      for (const tripDoc of vendorTripsSnap.docs) {
        await updateDoc(doc(db, 'trips', tripDoc.id), {
          vendorName: updatedProfile.name,
          vendorUPI: updatedProfile.upiId,
          vendorWhatsApp: updatedProfile.whatsappNumber
        });
      }
    }
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, updates);
  };

  const addTrip = async (trip: Omit<Trip, 'id'>) => {
    await addDoc(collection(db, 'trips'), trip);
  };

  const deleteTrip = async (tripId: string) => {
    const tripRef = doc(db, 'trips', tripId);
    await deleteDoc(tripRef);
  };

  const bookTrip = async (booking: Omit<Booking, 'id'>) => {
    const tripRef = doc(db, 'trips', booking.tripId);
    // Bug Fix #4: Use getDoc for single-document fetch instead of scanning all trips
    const { getDoc } = await import('firebase/firestore');
    const tripDocSnap = await getDoc(tripRef);
    let finalBooking = { ...booking };

    if (tripDocSnap.exists()) {
      const trip = tripDocSnap.data() as Trip;
      // Try to find the vendorId based on WhatsApp number
      const { where } = await import('firebase/firestore');
      const vendorQ = query(collection(db, 'vendors'), where('whatsappNumber', '==', trip.vendorWhatsApp));
      const vendorSnap = await getDocs(vendorQ);
      let vendorToken = '';
      
      if (!vendorSnap.empty) {
        const vData = vendorSnap.docs[0].data();
        finalBooking.vendorId = vendorSnap.docs[0].id;
        vendorToken = vData.pushToken;
      }
      
      // Save booking to a separate 'bookings' collection
      await addDoc(collection(db, 'bookings'), finalBooking);

      // Increment bookedSeats for the relevant batch
      const updatedBatches = trip.batches.map((b: any) =>
        b.id === booking.batchId ? { ...b, bookedSeats: b.bookedSeats + (booking.seats || 1) } : b
      );
      await updateDoc(tripRef, { batches: updatedBatches });

      // Send Push Notification to Vendor
      if (vendorToken) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: vendorToken,
              sound: 'default',
              title: 'New Booking! 🎉',
              body: `${booking.travelerName} just booked a package for ${trip.title}.`,
            }),
          });
        } catch (e) {
          console.error("Failed to send push notification", e);
        }
      }
    } else {
      await addDoc(collection(db, 'bookings'), finalBooking);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'failed') => {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { status });
    if (vendorProfile) {
      loadVendorBookings(vendorProfile.id);
    }
  };

  const submitRating = async (tripId: string, rating: Rating) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { ratings: arrayUnion(rating) });
  };

  return (
    <AppContext.Provider value={{ trips, vendorBookings, loading, vendorProfile, loginWithGoogle, mockVendorLogin, logout, updateVendorProfile, updateTrip, addTrip, deleteTrip, bookTrip, updateBookingStatus, submitRating, fetchMoreTrips, hasMoreTrips, refreshTrips }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
