import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';

export default function VendorLiveDashboard() {
  const { id } = useLocalSearchParams();
  const { trips, updateTrip } = useAppContext();
  const trip = trips.find(t => t.id === id);
  const { liveState, updateCaptainLocation } = useLiveTracking(id as string);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [captainLoc, setCaptainLoc] = useState<{ latitude: number, longitude: number } | null>(null);
  const [lastPickupCrossedAt, setLastPickupCrossedAt] = useState<number | null>(null);
  const locationSubRef = React.useRef<Location.LocationSubscription | null>(null);

  const lastPickup = trip?.pickupPoints && trip.pickupPoints.length > 0 
    ? trip.pickupPoints[trip.pickupPoints.length - 1] 
    : null;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Need location permissions to broadcast your live location.');
        return;
      }

      const initial = await Location.getCurrentPositionAsync({});
      setCaptainLoc({ latitude: initial.coords.latitude, longitude: initial.coords.longitude });
      updateCaptainLocation({ latitude: initial.coords.latitude, longitude: initial.coords.longitude, updatedAt: Date.now() });

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 100, timeInterval: 60000 },
        async (loc) => {
          const lat = loc.coords.latitude;
          const lon = loc.coords.longitude;
          setCaptainLoc({ latitude: lat, longitude: lon });
          updateCaptainLocation({ latitude: lat, longitude: lon, updatedAt: Date.now() });

          // Auto-complete logic
          if (lastPickup && lastPickup.latitude && lastPickup.longitude) {
            const dist = getDistance(
              { latitude: lat, longitude: lon },
              { latitude: lastPickup.latitude, longitude: lastPickup.longitude }
            );

            // If within 200m of the last pickup point, mark it crossed
            if (dist <= 200 && !lastPickupCrossedAt) {
              setLastPickupCrossedAt(Date.now());
            }

            // If 1 hour has passed since crossing, auto-complete
            if (lastPickupCrossedAt && (Date.now() - lastPickupCrossedAt > 3600000)) {
              if (locationSubRef.current) locationSubRef.current.remove();
              await updateTrip(trip!.id, { tripStatus: 'completed' });
              Alert.alert('Auto Completed', '1 hour passed since the last pickup point was crossed. Trip marked as completed.');
              router.replace('/vendor-dashboard' as any);
            }
          }
        }
      );
      locationSubRef.current = sub;
    })();

    return () => {
      if (locationSubRef.current) locationSubRef.current.remove();
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
            if (locationSubRef.current) locationSubRef.current.remove();
            await updateTrip(trip.id, { tripStatus: 'completed' });
            Alert.alert('Completed', 'Pickups finished and tracking stopped.');
            router.replace('/vendor-dashboard' as any);
          }
        }
      ]
    );
  };

  const handleExportManifest = async () => {
    try {
      const csvHeader = 'Name,Distance (km),Last Updated\n';
      const csvRows = Object.entries(liveState.travellers || {}).map(([gId, t]) => {
        let dist = 'Unknown';
        if (captainLoc && t.location) {
          dist = (getDistance(captainLoc, t.location) / 1000).toFixed(2);
        }
        const time = new Date(t.location?.updatedAt || Date.now()).toLocaleTimeString();
        return `${t.name},${dist},${time}`;
      }).join('\n');
      
      const csvString = csvHeader + csvRows;
      const safeTitle = trip?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'trip';
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

  const travellersList = Object.values(liveState.travellers || {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('vendorLive.live', 'LIVE')}: {trip.title}</Text>
        <Text style={styles.subtitle}>{t('vendorLive.broadcasting', 'Broadcasting your location...')}</Text>
        
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportManifest}>
           <FontAwesome name="file-text-o" size={14} color="white" style={{ marginRight: 6 }} />
           <Text style={styles.exportBtnText}>{t('vendorLive.exportCsv', 'Export CSV Manifest')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 15, marginTop: 10, padding: 10, backgroundColor: '#e6f6ff', borderRadius: 8}}>
        <FontAwesome name="info-circle" size={16} color="#00b0ff" style={{marginRight: 10, marginTop: 2}} />
        <Text style={{flex: 1, fontSize: 12, color: '#4a5568', lineHeight: 18}}>
          {t('vendorLive.trackingHelp', 'Help: Keep the app open to continue broadcasting your location accurately. The trip will auto-complete 1 hour after crossing the final pickup point.')}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        {captainLoc && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: captainLoc.latitude,
              longitude: captainLoc.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={captainLoc} title="Captain (You)">
              <FontAwesome name="bus" size={30} color="#00b0ff" />
            </Marker>
            
            {travellersList.map(t => (
              t.location ? (
                <Marker key={t.id} coordinate={t.location} title={t.name}>
                  <FontAwesome name="user-circle" size={24} color="#e53e3e" />
                </Marker>
              ) : null
            ))}
          </MapView>
        )}
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>{t('vendorLive.travellersWaiting', 'Travellers Waiting')} ({travellersList.length})</Text>
        <FlatList
          data={travellersList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            let distanceText = 'Unknown location';
            if (item.location && captainLoc) {
              const distMeters = getDistance(
                { latitude: captainLoc.latitude, longitude: captainLoc.longitude },
                { latitude: item.location.latitude, longitude: item.location.longitude }
              );
              distanceText = distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km away` : `${distMeters} m away`;
            }

            return (
              <View style={styles.travellerItem}>
                <Text style={styles.travellerName}>{item.name}</Text>
                <Text style={styles.travellerDist}>{distanceText}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#666', marginTop: 10 }}>{t('vendorLive.noGuests', 'No guests have joined yet.')}</Text>}
        />
      </View>

      <TouchableOpacity style={[styles.endBtn, { marginBottom: Math.max(insets.bottom, 20) }]} onPress={handleEndPickups}>
        <Text style={styles.endBtnText}>{t('vendorLive.allPickupsCompleted', 'All Pickups Completed')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#e53e3e' },
  subtitle: { color: '#666' },
  mapContainer: { height: 300 },
  map: { flex: 1 },
  listContainer: { flex: 1, padding: 20 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  travellerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  travellerName: { fontSize: 16, fontWeight: '500' },
  travellerDist: { fontSize: 14, color: '#00b0ff' },
  endBtn: { backgroundColor: '#e53e3e', margin: 20, padding: 16, borderRadius: 10, alignItems: 'center' },
  endBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  exportBtn: { marginTop: 10, backgroundColor: '#8b5cf6', padding: 10, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
