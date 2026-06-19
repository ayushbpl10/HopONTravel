import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { FontAwesome } from '@expo/vector-icons';

export default function VendorLiveDashboard() {
  const { id } = useLocalSearchParams();
  const { trips, updateTrip } = useAppContext();
  const trip = trips.find(t => t.id === id);
  const { liveState, updateCaptainLocation } = useLiveTracking(id as string);

  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [captainLoc, setCaptainLoc] = useState<{ latitude: number, longitude: number } | null>(null);
  const [lastPickupCrossedAt, setLastPickupCrossedAt] = useState<number | null>(null);

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
              if (locationSubscription) locationSubscription.remove();
              await updateTrip(trip!.id, { tripStatus: 'completed' });
              Alert.alert('Auto Completed', '1 hour passed since the last pickup point was crossed. Trip marked as completed.');
              router.replace('/vendor-dashboard' as any);
            }
          }
        }
      );
      setLocationSubscription(sub);
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
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
            if (locationSubscription) locationSubscription.remove();
            await updateTrip(trip.id, { tripStatus: 'completed' });
            Alert.alert('Completed', 'Pickups finished and tracking stopped.');
            router.replace('/vendor-dashboard' as any);
          }
        }
      ]
    );
  };

  const travellersList = Object.values(liveState.travellers || {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LIVE: {trip.title}</Text>
        <Text style={styles.subtitle}>Broadcasting your location...</Text>
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
        <Text style={styles.listTitle}>Travellers Waiting ({travellersList.length})</Text>
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
          ListEmptyComponent={<Text style={{ color: '#666', marginTop: 10 }}>No guests have joined yet.</Text>}
        />
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={handleEndPickups}>
        <Text style={styles.endBtnText}>All Pickups Completed</Text>
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
  endBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
