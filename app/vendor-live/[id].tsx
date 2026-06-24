import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VendorMap from '../../components/VendorMap';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { LOCATION_TASK_NAME } from '../../utils/backgroundLocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Booking } from '../../data/trips';

export default function VendorLiveDashboard() {
  const { id } = useLocalSearchParams();
  const { trips, updateTrip, updateBookingStatus } = useAppContext();
  const trip = trips.find(t => t.id === id);
  const { liveState, updateCaptainLocation } = useLiveTracking(id as string);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [captainLoc, setCaptainLoc] = useState<{ latitude: number, longitude: number } | null>(null);
  const [lastPickupCrossedAt, setLastPickupCrossedAt] = useState<number | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(true);

  const lastPickup = trip?.pickupPoints && trip.pickupPoints.length > 0 
    ? trip.pickupPoints[trip.pickupPoints.length - 1] 
    : null;

  useEffect(() => {
    (async () => {
      // Fetch actual bookings for this trip to show in the "Mark Paid" list
      setLoadingBookings(true);
      try {
        const q = query(collection(db, 'bookings'), where('tripId', '==', id));
        const snap = await getDocs(q);
        const fetchedBookings: Booking[] = [];
        snap.forEach(doc => fetchedBookings.push({ id: doc.id, ...doc.data() } as Booking));
        setBookings(fetchedBookings);
      } catch (e) {
        console.error("Error fetching bookings", e);
      } finally {
        setLoadingBookings(false);
      }

      // Save active trip ID for background task
      await AsyncStorage.setItem('activeLiveTripId', id as string);

      let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Need location permissions to broadcast your live location.');
        return;
      }

      let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        Alert.alert('Warning', 'Background location permission is highly recommended. Live tracking may stop if you close the app.');
      }

      const initial = await Location.getCurrentPositionAsync({});
      setCaptainLoc({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
      updateCaptainLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude, updatedAt: Date.now() });

      // Start Background Task instead of foreground watcher
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 50, // update every 50 meters
        deferredUpdatesInterval: 30000, // update every 30 secs in background
        foregroundService: {
          notificationTitle: 'Live Tracking Active',
          notificationBody: 'Broadcasting your location to travellers',
          notificationColor: '#4ade80'
        }
      });

    })();

    return () => {
      // We do NOT stop the background task on unmount so they can press back without breaking tracking!
      // They must explicitly click "Complete Pickups" to stop.
    };
  }, []);

  if (!trip) return <View><Text>Trip not found</Text></View>;

  const handleEndPickups = async () => {
    Alert.alert(
      'Complete Pickups',
      'Are you sure? This will stop broadcasting your live location to travellers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: async () => {
            // Stop background tracking explicitly
            if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
              await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
            await AsyncStorage.removeItem('activeLiveTripId');
            await updateTrip(trip.id, { tripStatus: 'completed' });
            Alert.alert('Completed', 'Pickups finished and tracking stopped.');
            router.replace('/vendor-dashboard' as any);
          }
        }
      ]
    );
  };

  const toggleBroadcasting = async () => {
    try {
      if (isBroadcasting) {
        if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
        setIsBroadcasting(false);
        Alert.alert('Paused', 'Location broadcasting paused.');
      } else {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 50,
          deferredUpdatesInterval: 30000,
          foregroundService: {
            notificationTitle: 'Live Tracking Active',
            notificationBody: 'Broadcasting your location to travellers',
            notificationColor: '#4ade80'
          }
        });
        setIsBroadcasting(true);
        Alert.alert('Resumed', 'Location broadcasting resumed.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not toggle tracking state.');
    }
  };

  const handleExportManifest = async () => {
    try {
      const travellersList = Object.values(liveState.travellers || {});
      if (travellersList.length === 0) {
        Alert.alert('Info', 'No travellers have joined the live tracking session yet.');
        return;
      }

      const csvHeader = 'Name,Distance (km),Last Updated\\n';
      const csvRows = travellersList.map(t => {
        let dist = 'Unknown';
        if (captainLoc && t.location) {
          dist = (getDistance(captainLoc, t.location) / 1000).toFixed(2);
        }
        const time = new Date(t.location?.updatedAt || Date.now()).toLocaleTimeString();
        return `${t.name},${dist},${time}`;
      }).join('\\n');
      
      const csvString = csvHeader + csvRows;
      const safeTitle = trip?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'trip';

      if (Platform.OS === 'web') {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `manifest_${safeTitle}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      const fileUri = `${FileSystem.documentDirectory}manifest_${safeTitle}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on your device');
        return;
      }
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share Passenger Manifest',
        UTI: 'public.comma-separated-values-text'
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to export manifest');
    }
  };

  const togglePaymentStatus = async (bookingId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    await updateBookingStatus(bookingId, newStatus as 'pending' | 'confirmed');
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus as any } : b));
  };

  const travellersList = Object.values(liveState.travellers || {});

  return (
    <>
      <Stack.Screen options={{ title: 'Live Tracking' }} />
      <FlatList
        style={styles.container}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{t('vendorLive.live', 'LIVE')}: {trip.title}</Text>
              <Text style={styles.subtitle}>{t('vendorLive.broadcasting', 'Broadcasting your location in the background...')}</Text>
              
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportManifest}>
                  <FontAwesome name="file-text-o" size={14} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.exportBtnText}>{t('vendorLive.exportCsv', 'Export CSV')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.exportBtn, { backgroundColor: isBroadcasting ? '#f59e0b' : '#22c55e' }]} 
                  onPress={toggleBroadcasting}
                >
                  <FontAwesome name={isBroadcasting ? "pause" : "play"} size={14} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.exportBtnText}>{isBroadcasting ? 'Pause' : 'Resume'} Tracking</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 15, marginTop: 10, padding: 10, backgroundColor: '#e6f6ff', borderRadius: 8}}>
              <FontAwesome name="info-circle" size={16} color="#00b0ff" style={{marginRight: 10, marginTop: 2}} />
              <Text style={{flex: 1, fontSize: 12, color: '#4a5568', lineHeight: 18}}>
                {t('vendorLive.trackingHelp', 'Help: You can safely minimize the app or go back. We will continue broadcasting your location. Click "Complete Pickups" to stop.')}
              </Text>
            </View>

            <View style={styles.mapContainer}>
              <VendorMap captainLoc={captainLoc} travellersList={travellersList} />
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={styles.listTitle}>{t('vendorLive.travellersWaiting', 'Travellers Joined Live')} ({travellersList.length})</Text>
              {travellersList.length === 0 && <Text style={{ color: '#666', marginTop: 10 }}>{t('vendorLive.noGuests', 'No guests have joined yet.')}</Text>}
              {travellersList.map(item => {
                let distanceText = 'Unknown location';
                if (item.location && captainLoc) {
                  const distMeters = getDistance(
                    { latitude: captainLoc.latitude, longitude: captainLoc.longitude },
                    { latitude: item.location.latitude, longitude: item.location.longitude }
                  );
                  distanceText = distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km away` : `${distMeters} m away`;
                }
                return (
                  <View key={item.id} style={styles.travellerItem}>
                    <Text style={styles.travellerName}>{item.name}</Text>
                    <Text style={styles.travellerDist}>{distanceText}</Text>
                  </View>
                );
              })}
            </View>
            
            <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
              <Text style={styles.listTitle}>Passenger Bookings</Text>
              {loadingBookings && <ActivityIndicator size="small" color="#00b0ff" />}
            </View>
          </>
        }
        data={bookings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.bookingItem}>
            <View>
              <Text style={styles.bookingName}>{item.travelerName}</Text>
              <Text style={styles.bookingDetails}>{item.seats || 1} Seat(s) | ₹{item.totalPrice}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.paidToggleBtn, item.status === 'paid' && { backgroundColor: '#4ade80', borderColor: '#4ade80' }]} 
              onPress={() => togglePaymentStatus(item.id, item.status)}
            >
              <FontAwesome name={item.status === 'paid' ? 'check' : 'clock-o'} size={14} color={item.status === 'paid' ? 'white' : '#f59e0b'} style={{ marginRight: 6 }} />
              <Text style={[styles.paidToggleText, item.status === 'paid' && { color: 'white' }]}>
                {item.status === 'paid' ? 'Paid' : 'Pending'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loadingBookings ? <Text style={{ color: '#666', marginHorizontal: 20, marginTop: 10 }}>No bookings found for this trip.</Text> : null
        }
        ListFooterComponent={
          <TouchableOpacity style={[styles.endBtn, { marginBottom: Math.max(insets.bottom, 20) }]} onPress={handleEndPickups}>
            <Text style={styles.endBtnText}>{t('vendorLive.allPickupsCompleted', 'All Pickups Completed')}</Text>
          </TouchableOpacity>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e53e3e' },
  subtitle: { color: '#666', marginTop: 4 },
  mapContainer: { height: 300 },
  map: { flex: 1 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  travellerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  travellerName: { fontSize: 16, fontWeight: '500' },
  travellerDist: { fontSize: 14, color: '#00b0ff' },
  bookingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  bookingName: { fontSize: 16, fontWeight: '500' },
  bookingDetails: { fontSize: 13, color: '#666', marginTop: 2 },
  paidToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: '#f59e0b' },
  paidToggleText: { fontSize: 13, fontWeight: 'bold', color: '#f59e0b' },
  endBtn: { backgroundColor: '#e53e3e', margin: 20, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  endBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  exportBtn: { marginTop: 12, backgroundColor: '#8b5cf6', padding: 10, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
