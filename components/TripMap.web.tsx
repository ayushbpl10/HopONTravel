import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function TripMap(props: any) {
  return (
    <View style={styles.mapPlaceholder}>
      <FontAwesome name="map" size={40} color="#a0aec0" style={{ marginBottom: 10 }} />
      <Text style={{ color: '#4a5568', fontWeight: 'bold' }}>Map View</Text>
      <Text style={{ color: '#718096', fontSize: 12 }}>Not available on web preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' }
});
