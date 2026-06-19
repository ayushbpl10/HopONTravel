import React, { createContext, useState, useContext, useEffect } from 'react';
import { Trip, Rating, Booking, trips as initialTrips } from '../data/trips';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
  arrayUnion
} from 'firebase/firestore';

// Replace with your Web Client ID from Google Cloud Console
GoogleSignin.configure({
  webClientId: '264459863602-lfns732opcfoi2ardm5qddarsd6e4kb1.apps.googleusercontent.com',
});

interface VendorProfile {
  id: string; 
  email: string;
  name: string;
  upiId: string;
  whatsappNumber: string;
}

interface AppContextType {
  trips: Trip[];
  loading: boolean;
  vendorProfile: VendorProfile | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateVendorProfile: (updates: Partial<VendorProfile>) => void;
  updateTrip: (tripId: string, updates: Partial<Trip>) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  bookTrip: (booking: Omit<Booking, 'id'>) => Promise<void>;
  submitRating: (tripId: string, rating: Rating) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);

  // 1. Listen for Trips in Firestore
  useEffect(() => {
    // Load offline cache first so app works without internet
    AsyncStorage.getItem('cached_trips').then(cached => {
      if (cached) {
        const parsed = JSON.parse(cached) as Trip[];
        if (parsed.length > 0) {
          setTrips(parsed);
          setLoading(false);
        }
      }
    }).catch(() => {});

    const q = query(collection(db, 'trips'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tripsData: Trip[] = [];
      const now = new Date();
      
      querySnapshot.forEach((docSnap) => {
        const trip = { id: docSnap.id, ...docSnap.data() } as Trip;
        
        // --- Client-Side Cron: Delete if 7 days older than start date ---
        // Attempt to parse start date. Usually format is "27 - 29 May 2026". 
        // We split by '-' and try to parse the first part.
        let isExpired = false;
        try {
          const firstBatchDate = trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : null;
          const firstPart = firstBatchDate ? firstBatchDate.split('-')[0].trim() : null;
          if (!firstPart) throw new Error('No date');
          const startDate = new Date(firstPart);
          
          if (!isNaN(startDate.getTime())) {
            const diffTime = Math.abs(now.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            // If it's more than 7 days past the start date, delete it.
            if (now > startDate && diffDays > 7) {
              isExpired = true;
              console.log(`Cron: Deleting expired trip: ${trip.title}`);
              deleteDoc(doc(db, 'trips', trip.id)).catch(console.error);
              // In a real app, you'd also delete images from Storage here
            }
          }
        } catch (e) {
          console.error('Cron error parsing date', e);
        }

        if (!isExpired) {
          tripsData.push(trip);
        }
      });
      
      // If Firestore is empty, seed it with our initial data
      if (tripsData.length === 0 && initialTrips.length > 0) {
        seedInitialData();
      } else {
        setTrips(tripsData);
        // Cache trips for offline use
        AsyncStorage.setItem('cached_trips', JSON.stringify(tripsData)).catch(() => {});
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to trips:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
          } else {
            setVendorProfile(parsed);
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

      if (existingVendor) {
        profile = { id: existingVendor.id, ...existingVendor.data() } as VendorProfile;
      } else {
        // Create new vendor in Firestore
        const newVendorData = {
          email,
          name,
          upiId: 'merchant@bank',
          whatsappNumber: '+911234567890'
        };
        const docRef = await addDoc(collection(db, 'vendors'), newVendorData);
        profile = { id: docRef.id, ...newVendorData };
      }

      setVendorProfile(profile);
      await AsyncStorage.setItem('vendorProfile', JSON.stringify(profile));
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      
      // Attempt to log the exact error to Firestore for debugging
      try {
        const errorMsg = error.message || JSON.stringify(error) || 'Unknown error';
        await addDoc(collection(db, 'trips'), {
          title: `LOGIN ERROR: ${errorMsg.substring(0, 20)}`,
          description: `Full error: ${errorMsg}\nCode: ${error.code}`,
          vendorName: 'System Log',
          vendorWhatsApp: 'system',
          vendorUPI: 'system',
          images: [],
          totalSeats: 0,
          bookedSeats: 0,
          price: '0',
          dateDuration: new Date().toISOString()
        } as any);
      } catch (logError) {
        console.error('Failed to log error to Firestore', logError);
      }

      import('react-native').then(({ Alert }) => {
        Alert.alert(
          'Login Failed', 
          `Could not connect to Google.\nError: ${error.message || 'Unknown'}\n\nA diagnostic log has been sent to the server.`
        );
      });
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

      // 3. Update all trips owned by this vendor in Firestore
      // (For now, we'll update all trips as per previous logic, but in real app we'd filter)
      for (const trip of trips) {
        const tripRef = doc(db, 'trips', trip.id);
        await updateDoc(tripRef, {
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
    // Save booking to a separate 'bookings' collection
    await addDoc(collection(db, 'bookings'), booking);
    // Increment bookedSeats for the relevant batch
    const tripRef = doc(db, 'trips', booking.tripId);
    const tripSnap = await getDocs(query(collection(db, 'trips')));
    const tripDoc = tripSnap.docs.find(d => d.id === booking.tripId);
    if (tripDoc) {
      const trip = tripDoc.data() as Trip;
      const updatedBatches = trip.batches.map(b =>
        b.id === booking.batchId ? { ...b, bookedSeats: b.bookedSeats + 1 } : b
      );
      await updateDoc(tripRef, { batches: updatedBatches });
    }
  };

  const submitRating = async (tripId: string, rating: Rating) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, { ratings: arrayUnion(rating) });
  };

  return (
    <AppContext.Provider value={{ trips, loading, vendorProfile, loginWithGoogle, logout, updateVendorProfile, updateTrip, addTrip, deleteTrip, bookTrip, submitRating }}>
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
