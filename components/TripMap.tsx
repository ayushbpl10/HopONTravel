import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

interface TripMapProps {
  captain: { latitude: number, longitude: number } | null;
  travellers?: any;
  guestId?: string | null;
  isTracking?: boolean;
}

export default function TripMap({ captain, travellers, guestId, isTracking }: TripMapProps) {
  if (!captain) return null;
  
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: captain.latitude,
        longitude: captain.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      <Marker coordinate={captain} title="Bus / Captain">
        <FontAwesome name="bus" size={30} color="#00b0ff" />
      </Marker>
      
      {isTracking && guestId && travellers?.[guestId]?.location && (
        <Marker coordinate={travellers[guestId].location} title="You">
          <FontAwesome name="user-circle" size={24} color="#e53e3e" />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%' }
});
