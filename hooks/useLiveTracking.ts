import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LiveLocation, GuestTraveller } from '../data/trips';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LiveTripState {
  captain?: LiveLocation;
  travellers?: Record<string, GuestTraveller>;
}

export const useLiveTracking = (tripId: string) => {
  const [liveState, setLiveState] = useState<LiveTripState>({});
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    // Load existing guest ID if present
    AsyncStorage.getItem(`guest_id_${tripId}`).then(id => {
      if (id) setGuestId(id);
    });

    if (!tripId) return;

    const liveRef = doc(db, 'live_trips', tripId);
    
    const unsubscribe = onSnapshot(liveRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveState(docSnap.data() as LiveTripState);
      }
    });

    return () => unsubscribe();
  }, [tripId]);

  const updateCaptainLocation = async (location: LiveLocation) => {
    const liveRef = doc(db, 'live_trips', tripId);
    await setDoc(liveRef, { captain: location }, { merge: true });
  };

  const joinAsGuest = async (name: string) => {
    let id = guestId;
    if (!id) {
      id = 'guest_' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      await AsyncStorage.setItem(`guest_id_${tripId}`, id);
      setGuestId(id);
    }
    
    // Create initial entry without location yet
    const liveRef = doc(db, 'live_trips', tripId);
    await setDoc(liveRef, { 
      [`travellers.${id}`]: { id, name, location: null } 
    }, { merge: true });
    
    return id;
  };

  const updateGuestLocation = async (id: string, name: string, location: LiveLocation) => {
    const liveRef = doc(db, 'live_trips', tripId);
    await setDoc(liveRef, { 
      [`travellers.${id}`]: { id, name, location } 
    }, { merge: true });
  };

  const stopTracking = async () => {
    // Optional: cleanup or just leave it to expire
  };

  return {
    liveState,
    guestId,
    updateCaptainLocation,
    joinAsGuest,
    updateGuestLocation,
    stopTracking
  };
};
