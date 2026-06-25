import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Dimensions, Modal, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
const { width } = Dimensions.get('window');
import { useLocalSearchParams, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TripMap from '../../components/TripMap';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const { trips, vendorProfile, bookTrip } = useAppContext();
  const trip = trips.find((t) => t.id === id);
  const { liveState, guestId, joinAsGuest, updateGuestLocation } = useLiveTracking(id as string);
  const { t } = useTranslation();

  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedPackageName, setSelectedPackageName] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [seats, setSeats] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  useEffect(() => {
    if (trip) {
      if (!selectedBatchId && trip.batches && trip.batches.length > 0) setSelectedBatchId(trip.batches[0].id);
      if (!selectedPackageName && trip.packages && trip.packages.length > 0) setSelectedPackageName(trip.packages[0].name);
    }
  }, [trip]);

  // Derive total price
  const basePrice = trip?.packages?.find(p => p.name === selectedPackageName)?.price || 0;
  const addOnsPrice = selectedAddOns.reduce((total, addonName) => {
    const addon = trip?.addOns?.find(a => a.name === addonName);
    return total + (addon?.price || 0);
  }, 0);
  const totalPrice = (basePrice + addOnsPrice) * seats;

  let etaMins = 0;
  let distanceKm = 0;
  if (isTracking && guestId && liveState.captain && liveState.travellers?.[guestId]?.location) {
    const distMeters = getDistance(
      { latitude: liveState.captain.latitude, longitude: liveState.captain.longitude },
      { latitude: liveState.travellers[guestId].location.latitude, longitude: liveState.travellers[guestId].location.longitude }
    );
    distanceKm = distMeters / 1000;
    etaMins = Math.round((distanceKm / 40) * 60);
  }

  useEffect(() => {
    // Check if guest was already tracking this trip
    AsyncStorage.getItem(`tracking_${id}`).then((storedGuestId) => {
      if (storedGuestId) {
        AsyncStorage.getItem(`guestName_${id}`).then(async (storedName) => {
          if (storedName) {
            setGuestName(storedName);
            setIsTracking(true);
            
            // Restart location watcher
            const sub = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.High, distanceInterval: 100, timeInterval: 60000 },
              (loc) => {
                updateGuestLocation(storedGuestId, storedName, { latitude: loc.coords.latitude, longitude: loc.coords.longitude, updatedAt: Date.now() });
              }
            );
            setLocationSubscription(sub);
          }
        });
      }
    });

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text>Trip not found.</Text>
      </View>
    );
  }

  const handleJoinTrip = async () => {
    if (!guestName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need location permissions to share your location with the captain.');
      return;
    }

    setIsJoinModalVisible(false);
    
    try {
      const gId = await joinAsGuest(guestName);
      
      const initial = await Location.getCurrentPositionAsync({});
      await updateGuestLocation(gId, guestName, { latitude: initial.coords.latitude, longitude: initial.coords.longitude, updatedAt: Date.now() });
      
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 100, timeInterval: 60000 },
        (loc) => {
          updateGuestLocation(gId, guestName, { latitude: loc.coords.latitude, longitude: loc.coords.longitude, updatedAt: Date.now() });
        }
      );
      setLocationSubscription(sub);
      setIsTracking(true);
      
      // Persist tracking state
      await AsyncStorage.setItem(`tracking_${id}`, gId);
      await AsyncStorage.setItem(`guestName_${id}`, guestName);

      Alert.alert('Joined!', 'Your location is now shared with the Captain.');
    } catch (e: any) {
      console.error('Join Error:', e);
      Alert.alert('Error', `Could not join trip: ${e.message || 'Unknown error'}`);
    }
  };

  const handleProceedToCheckout = () => {
    router.push({
      pathname: `/checkout/${trip.id}` as any,
      params: {
        batchId: selectedBatchId,
        packageName: selectedPackageName,
        seats: seats.toString(),
        totalPrice: totalPrice.toString(),
        tripTitle: trip.title,
        vendorName: trip.vendorName,
        vendorWhatsApp: trip.vendorWhatsApp,
        vendorUPI: trip.vendorUPI ? trip.vendorUPI[0] : ''
      }
    });
  };



  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.heroScroll}>
        {trip.images && trip.images.length > 0 ? (
          trip.images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
          ))
        ) : (
          <View style={[styles.heroImage, { width, backgroundColor: '#cbd5e0', justifyContent: 'center', alignItems: 'center' }]}>
            <FontAwesome name="image" size={50} color="#a0aec0" />
          </View>
        )}
      </ScrollView>
      
      <View style={styles.detailsContainer}>
        {trip.tripStatus === 'started' && (
          <View style={styles.liveBanner}>
            <Text style={styles.liveBannerText}>🔴 LIVE TRACKING ACTIVE</Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{trip.title}</Text>
            <Text style={styles.date}>{trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : 'TBD'}</Text>
          </View>
          <Text style={styles.price}>₹{basePrice}</Text>
        </View>

        {/* Live Trip Section */}
        {trip.tripStatus === 'started' && (
          <View style={styles.liveSection}>
            {trip.crewDetails && (
              <>
                <Text style={styles.sectionTitle}>Trip Crew & Vehicle</Text>
                {trip.crewDetails.vehiclePhoto ? <Image source={{ uri: trip.crewDetails.vehiclePhoto }} style={styles.vehicleImage} /> : null}
                <View style={styles.crewInfoBox}>
                  <Text style={styles.crewLabel}>Vehicle No: <Text style={styles.crewValue}>{trip.crewDetails.vehicleNumber}</Text></Text>
                  <Text style={styles.crewLabel}>Driver: <Text style={styles.crewValue}>{trip.crewDetails.driverName}</Text></Text>
                  <Text style={styles.crewLabel}>Captain: <Text style={styles.crewValue}>{trip.crewDetails.captainName}</Text></Text>
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>{t('tripDetails.liveTracking', 'Live Tracking')}</Text>
            <View style={styles.mapWrapper}>
              <TripMap 
                captain={liveState.captain || null} 
                travellers={liveState.travellers} 
                guestId={guestId} 
                isTracking={isTracking} 
              />
              {!liveState.captain && (
                <View style={styles.mapPlaceholder}><Text>Waiting for Captain's location...</Text></View>
              )}
            </View>

            {!isTracking ? (
              <View>
                <TouchableOpacity 
                  style={[styles.joinBtn, vendorProfile ? { opacity: 0.5 } : {}]} 
                  disabled={!!vendorProfile}
                  onPress={() => setIsJoinModalVisible(true)}
                >
                  <Text style={styles.joinBtnText}>{t('tripDetails.joinTrip', 'Join Trip & Share Location')}</Text>
                </TouchableOpacity>
                {vendorProfile && (
                  <Text style={{ textAlign: 'center', marginTop: 8, color: '#e53e3e', fontSize: 12 }}>
                    {t('tripDetails.vendorJoinWarning', 'You are logged in as a Vendor. Please sign out to join a trip as a traveller.')}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.trackingPill}>
                <Text style={styles.trackingPillText}>✓ You are sharing your location</Text>
                {etaMins > 0 && (
                  <Text style={{color: 'white', marginTop: 4, fontWeight: 'bold', textAlign: 'center'}}>
                    Bus is ~{distanceKm.toFixed(1)} km away. ETA: {etaMins} mins
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Seats</Text>
            <Text style={styles.statValue}>{trip.batches ? trip.batches.reduce((acc, b) => acc + b.totalSeats, 0) : 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={[styles.statValue, { color: '#00b0ff' }]}>{trip.batches ? trip.batches.reduce((acc, b) => acc + (b.totalSeats - b.bookedSeats), 0) : 0}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('tripDetails.aboutTrip', 'About this trip')}</Text>
        <Text style={styles.description}>{trip.description}</Text>

        {/* Inclusions & Exclusions */}
        {((trip.inclusions && trip.inclusions.length > 0) || (trip.exclusions && trip.exclusions.length > 0)) && (
          <View style={styles.incExcContainer}>
            {trip.inclusions && trip.inclusions.length > 0 && (
              <View style={styles.incList}>
                <Text style={styles.sectionTitle}>{t('tripDetails.inclusions', 'Inclusions')}</Text>
                {trip.inclusions.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <FontAwesome name="check-circle" size={16} color="#22c55e" style={styles.listIcon} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            {trip.exclusions && trip.exclusions.length > 0 && (
              <View style={styles.excList}>
                <Text style={styles.sectionTitle}>{t('tripDetails.exclusions', 'Exclusions')}</Text>
                {trip.exclusions.map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <FontAwesome name="times-circle" size={16} color="#ef4444" style={styles.listIcon} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Itinerary */}
        {trip.itinerary ? (
          <View style={styles.itinerarySection}>
            <Text style={styles.sectionTitle}>{t('tripDetails.itinerary', 'Itinerary')}</Text>
            {trip.itinerary.split('Day ').filter((d: string) => d.trim() !== '').map((dayText: string, i: number) => {
              const lines = dayText.trim().split('\n');
              const dayTitle = 'Day ' + lines[0];
              const dayDetails = lines.slice(1).join('\n');
              const isExpanded = expandedDay === i;
              
              return (
                <View key={i} style={styles.itineraryCard}>
                  <TouchableOpacity style={styles.itineraryHeader} onPress={() => setExpandedDay(isExpanded ? null : i)}>
                    <Text style={styles.itineraryDay}>{dayTitle}</Text>
                    <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#718096" />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.itineraryContent}>
                      <Text style={styles.itineraryText}>{dayDetails}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {trip.pickupPoints && trip.pickupPoints.length > 0 && (
          <View style={styles.pickupSection}>
            <Text style={styles.sectionTitle}>{t('tripDetails.pickupPoints', 'Pickup Points')}</Text>
            {trip.pickupPoints.map((p, idx) => (
              <View key={idx} style={styles.pickupItem}>
                <FontAwesome name="map-marker" size={20} color="#e53e3e" style={{ marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickupLocation}>{p.location}</Text>
                  <Text style={styles.pickupTime}>{p.time}</Text>
                </View>
                {p.mapLink && (
                  <TouchableOpacity onPress={() => Linking.openURL(p.mapLink!)}>
                    <FontAwesome name="external-link" size={16} color="#00b0ff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.vendorCard}>
          <FontAwesome name="user-circle" size={40} color="#cbd5e0" style={styles.vendorIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorLabel}>Organized by</Text>
            <Text style={styles.vendorName}>{trip.vendorName}</Text>
            <View style={styles.vendorInfoRow}>
              <FontAwesome name="whatsapp" size={14} color="#718096" />
              <Text style={styles.vendorInfoText}>{trip.vendorWhatsApp}</Text>
            </View>
          </View>
        </View>

        {/* Booking Selection (Batch, Package, Addons) */}
        <View style={styles.bookingSelectionSection}>
          <Text style={styles.sectionTitle}>{t('tripDetails.customizeTrip', 'Customize Your Trip')}</Text>
          
          {trip.batches && trip.batches.length > 0 && (
            <>
              <Text style={styles.selectionLabel}>{t('tripDetails.selectDate', 'Select Date')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
                {trip.batches.map(b => (
                  <TouchableOpacity 
                    key={b.id} 
                    style={[styles.chip, selectedBatchId === b.id && styles.chipActive]}
                    onPress={() => setSelectedBatchId(b.id)}
                  >
                    <Text style={[styles.chipText, selectedBatchId === b.id && styles.chipTextActive]}>{b.dateDuration}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {trip.packages && trip.packages.length > 0 && (
            <>
              <Text style={styles.selectionLabel}>{t('tripDetails.selectPackage', 'Select Package')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionScroll}>
                {trip.packages.map((p, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.chip, selectedPackageName === p.name && styles.chipActive]}
                    onPress={() => setSelectedPackageName(p.name)}
                  >
                    <Text style={[styles.chipText, selectedPackageName === p.name && styles.chipTextActive]}>{p.name} (₹{p.price})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {trip.addOns && trip.addOns.length > 0 && (
            <>
              <Text style={styles.selectionLabel}>Add-Ons (Optional)</Text>
              {trip.addOns.map((addon, i) => {
                const isSelected = selectedAddOns.includes(addon.name);
                return (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.addonRow, isSelected && styles.addonRowActive]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedAddOns(selectedAddOns.filter(a => a !== addon.name));
                      } else {
                        setSelectedAddOns([...selectedAddOns, addon.name]);
                      }
                    }}
                  >
                    <View style={[styles.addonCheck, isSelected && styles.addonCheckActive]}>
                      {isSelected && <FontAwesome name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.addonName}>{addon.name}</Text>
                    <Text style={styles.addonPrice}>+₹{addon.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <View style={styles.seatsRow}>
            <Text style={styles.selectionLabel}>Number of Seats</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(Math.max(1, seats - 1))}>
                <FontAwesome name="minus" size={16} color="#00b0ff" />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{seats}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(seats + 1)}>
                <FontAwesome name="plus" size={16} color="#00b0ff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalBoxLabel}>{t('tripDetails.total', 'Total Price')}</Text>
          <Text style={styles.totalBoxValue}>₹{totalPrice}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.bookButton, styles.proceedButton]} onPress={handleProceedToCheckout}>
            <Text style={styles.bookButtonText}>Proceed to Traveller Details</Text>
            <FontAwesome name="arrow-right" size={16} color="white" style={{marginLeft: 8, marginTop: 2}} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Guest Join Modal */}
      <Modal visible={isJoinModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Trip</Text>
            <Text style={styles.modalDesc}>Enter your name so the Captain can locate you for pickup.</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Your Full Name" 
              value={guestName} 
              onChangeText={setGuestName} 
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsJoinModalVisible(false)}>
                <Text style={{ color: '#666' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleJoinTrip}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  contentContainer: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroScroll: { height: 300 },
  heroImage: { height: 300, resizeMode: 'cover' },
  detailsContainer: { padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: '#ffffff', marginTop: -30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  liveBanner: { backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  liveBannerText: { color: '#ef4444', fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  date: { fontSize: 14, color: '#718096', marginTop: 6, fontWeight: '500' },
  price: { fontSize: 24, fontWeight: 'bold', color: '#00b0ff' },
  
  liveSection: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  vehicleImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  crewInfoBox: { marginBottom: 16 },
  crewLabel: { fontSize: 14, color: '#4a5568', marginBottom: 4 },
  crewValue: { fontWeight: 'bold', color: '#1a1a1a' },
  mapWrapper: { height: 200, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  joinBtn: { backgroundColor: '#4ade80', padding: 14, borderRadius: 8, alignItems: 'center' },
  joinBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  trackingPill: { backgroundColor: '#dcfce7', padding: 12, borderRadius: 8, alignItems: 'center' },
  trackingPillText: { color: '#166534', fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#f5f7fa', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  statLabel: { fontSize: 12, color: '#8a94a6', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: '#4a5568', marginBottom: 24 },
  
  pickupSection: { marginBottom: 24 },
  pickupItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 },
  pickupLocation: { fontSize: 16, fontWeight: '600', color: '#2d3748' },
  pickupTime: { fontSize: 14, color: '#718096' },

  vendorCard: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 30, flexDirection: 'row', alignItems: 'center' },
  vendorIcon: { marginRight: 15 },
  vendorLabel: { fontSize: 12, color: '#718096', marginBottom: 2 },
  vendorName: { fontSize: 18, fontWeight: '700', color: '#2d3748', marginBottom: 4 },
  vendorInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  vendorInfoText: { fontSize: 12, color: '#718096', marginLeft: 6 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bookButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 100, elevation: 4 },
  bookButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  proceedButton: { backgroundColor: '#0f172a', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { color: '#666', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 12 },
  confirmBtn: { backgroundColor: '#4ade80', padding: 12, borderRadius: 8, paddingHorizontal: 20 },

  // New UI section styles
  incExcContainer: { marginBottom: 24 },
  incList: { marginBottom: 16 },
  excList: { marginBottom: 8 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  listIcon: { marginRight: 10, marginTop: 2 },
  listText: { fontSize: 15, color: '#4a5568', flex: 1, lineHeight: 22 },

  itinerarySection: { marginBottom: 24 },
  itineraryCard: { backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  itineraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  itineraryDay: { fontSize: 16, fontWeight: '700', color: '#2d3748' },
  itineraryContent: { padding: 16, paddingTop: 0, backgroundColor: '#fff' },
  itineraryText: { fontSize: 15, color: '#4a5568', lineHeight: 24 },

  bookingSelectionSection: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  selectionLabel: { fontSize: 14, fontWeight: '700', color: '#4a5568', marginBottom: 8, marginTop: 12 },
  selectionScroll: { marginBottom: 12, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0', marginRight: 10 },
  chipActive: { backgroundColor: '#00b0ff', borderColor: '#00b0ff' },
  chipText: { fontSize: 14, color: '#4a5568', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  addonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  addonRowActive: { borderColor: '#00b0ff', backgroundColor: '#e0f7ff' },
  addonCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e0', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  addonCheckActive: { backgroundColor: '#00b0ff', borderColor: '#00b0ff' },
  addonName: { flex: 1, fontSize: 15, color: '#2d3748', fontWeight: '500' },
  addonPrice: { fontSize: 15, fontWeight: '700', color: '#00b0ff' },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 100, borderWidth: 1, borderColor: '#cbd5e0' },
  stepBtn: { padding: 10, paddingHorizontal: 16 },
  stepValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 24, textAlign: 'center' },

  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a202c', padding: 16, borderRadius: 12, marginBottom: 24 },
  totalBoxLabel: { fontSize: 16, color: '#a0aec0', fontWeight: '600' },
  totalBoxValue: { fontSize: 24, fontWeight: '800', color: '#fff' }
});
