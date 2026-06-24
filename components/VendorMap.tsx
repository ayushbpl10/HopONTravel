import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

interface VendorMapProps {
  captainLoc: { latitude: number, longitude: number } | null;
  travellersList: any[];
}

export default function VendorMap({ captainLoc, travellersList }: VendorMapProps) {
  if (!captainLoc) return null;
  
  return (
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
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%' }
});
