import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      const loc = locations[0];
      try {
        const tripId = await AsyncStorage.getItem('activeLiveTripId');
        if (tripId) {
          await setDoc(doc(db, 'live_trips', tripId), {
            captain: { 
              latitude: loc.coords.latitude, 
              longitude: loc.coords.longitude, 
              updatedAt: Date.now() 
            }
          }, { merge: true });
        }
      } catch (e) {
        console.error('Failed to sync background location', e);
      }
    }
  }
});
