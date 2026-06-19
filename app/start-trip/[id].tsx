import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../../utils/uploadImage';
import OllieLoading from '../../components/OllieLoading';
import { FontAwesome } from '@expo/vector-icons';

export default function StartTripScreen() {
  const { id } = useLocalSearchParams();
  const { trips, updateTrip } = useAppContext();
  const trip = trips.find(t => t.id === id);

  const [captainName, setCaptainName] = useState(trip?.vendorName || '');
  const [captainPhone, setCaptainPhone] = useState(trip?.vendorWhatsApp || '');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  if (!trip) return <><Stack.Screen options={{ title: 'Start Trip' }} /><View style={styles.centerContainer}><Text>Trip not found</Text></View></>;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need permissions to upload vehicle photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
    });

    if (!result.canceled) {
      setVehiclePhoto(result.assets[0].uri);
    }
  };

  const handleStartTrip = async () => {
    // Fields are now optional as requested by user.
    setIsStarting(true);
    try {
      let photoUrl = vehiclePhoto;
      if (vehiclePhoto && !vehiclePhoto.startsWith('http')) {
        const fileName = `vehicle_${Date.now()}.jpg`;
        photoUrl = await uploadImage(vehiclePhoto, `trips/${trip.id}/crew/${fileName}`);
      }

      await updateTrip(trip.id, {
        tripStatus: 'started',
        crewDetails: {
          captainName: captainName || 'Not Provided',
          captainPhone: captainPhone || 'Not Provided',
          driverName: driverName || 'Not Provided',
          vehicleNumber: vehicleNumber || 'Not Provided',
          vehiclePhoto: photoUrl || 'https://via.placeholder.com/400x200.png?text=No+Vehicle+Photo'
        }
      });

      Alert.alert('Trip Started!', 'Live tracking is now available.');
      router.replace(`/vendor-live/${trip.id}` as any);
    } catch (e) {
      Alert.alert('Error', 'Failed to start trip.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Start Trip' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Trip to {trip.title.replace('Trip to ', '')}</Text>
        <Text style={styles.subtitle}>Enter details so travellers can find the vehicle easily. (All fields optional)</Text>

        <Text style={styles.label}>Captain Name</Text>
        <TextInput style={styles.input} value={captainName} onChangeText={setCaptainName} placeholder="Optional" />

        <Text style={styles.label}>Captain Phone</Text>
        <TextInput style={styles.input} value={captainPhone} onChangeText={setCaptainPhone} placeholder="Optional" />

        <Text style={styles.label}>Driver Name</Text>
        <TextInput style={styles.input} value={driverName} onChangeText={setDriverName} placeholder="Optional" />

        <Text style={styles.label}>Vehicle Number</Text>
        <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. MH 12 AB 1234 (Optional)" />

        <Text style={styles.label}>Vehicle Photo (Optional)</Text>
        {vehiclePhoto ? (
          <View style={{ marginBottom: 20 }}>
            <Image source={{ uri: vehiclePhoto }} style={{ width: '100%', height: 200, borderRadius: 10 }} />
            <TouchableOpacity onPress={pickImage} style={{ position: 'absolute', right: 10, top: 10, backgroundColor: 'white', padding: 8, borderRadius: 20 }}>
              <FontAwesome name="edit" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <FontAwesome name="camera" size={24} color="#00b0ff" />
            <Text style={{ marginTop: 8, color: '#00b0ff' }}>Upload Bus/Car Photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.startBtn, isStarting && { opacity: 0.7 }]} 
          onPress={handleStartTrip}
          disabled={isStarting}
        >
          {isStarting ? <OllieLoading size={30} /> : <Text style={styles.startBtnText}>Start Live Trip</Text>}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff', paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { color: '#666', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
  photoBtn: { height: 150, borderWidth: 2, borderColor: '#00b0ff', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#f0fbff' },
  startBtn: { backgroundColor: '#4ade80', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
