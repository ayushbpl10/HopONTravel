import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { getDistance } from 'geolib';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, Linking, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import TripMap from '../../components/TripMap';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAppContext } from '../../context/AppContext';
import { useLiveTracking } from '../../hooks/useLiveTracking';
import { useWishlist } from '../../hooks/useWishlist';

const { width } = Dimensions.get('window');

const CountdownTimer = ({ dateDuration, styles }: { dateDuration: string, styles: any }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number } | null>(null);

  useEffect(() => {
    // Attempt to parse start date from "15 Aug - 17 Aug" format
    let targetDate = new Date();
    try {
      const parts = dateDuration.split('-');
      if (parts.length > 0) {
        // Create a fake valid date string by appending the current year if it's missing
        let startStr = parts[0].trim();
        if (!startStr.match(/\d{4}/)) {
          startStr += ` ${new Date().getFullYear()}`;
        }
        const parsed = new Date(startStr);
        if (!isNaN(parsed.getTime())) {
          targetDate = parsed;
          // Set to 6 AM by default if no time
          targetDate.setHours(6, 0, 0, 0);
        }
      }
    } catch(e) {}

    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    }, 60000); // update every minute

    // Initial call
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff > 0) {
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60)
      });
    }

    return () => clearInterval(interval);
  }, [dateDuration]);

  if (!timeLeft) return null;

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownTitle}>⏳ Starts In</Text>
      <View style={styles.countdownRow}>
        <View style={styles.countdownBox}><Text style={styles.countdownNum}>{timeLeft.days}</Text><Text style={styles.countdownLabel}>Days</Text></View>
        <Text style={styles.countdownSep}>:</Text>
        <View style={styles.countdownBox}><Text style={styles.countdownNum}>{timeLeft.hours}</Text><Text style={styles.countdownLabel}>Hours</Text></View>
        <Text style={styles.countdownSep}>:</Text>
        <View style={styles.countdownBox}><Text style={styles.countdownNum}>{timeLeft.minutes}</Text><Text style={styles.countdownLabel}>Mins</Text></View>
      </View>
    </View>
  );
};

export default function TripDetailScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { id } = useLocalSearchParams();
  const { trips, userProfile, bookTrip } = useAppContext();
  const trip = trips.find((t) => t.id === id);
  const { liveState, guestId, joinAsGuest, updateGuestLocation } = useLiveTracking(id as string);
  const { wishlistedIds, toggleWishlist } = useWishlist();
  const { t } = useTranslation();

  const isWishlisted = trip ? wishlistedIds.includes(trip.id) : false;

  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedPackageName, setSelectedPackageName] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [seats, setSeats] = useState<number>(1);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [discountCode, setDiscountCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const handleImageScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveImageIndex(index);
  };

  useEffect(() => {
    if (trip) {
      if (!selectedBatchId && trip.batches && trip.batches.length > 0) setSelectedBatchId(trip.batches[0].id);
      if (!selectedPackageName && trip.packages && trip.packages.length > 0) setSelectedPackageName(trip.packages[0].name);
    }
  }, [trip]);

  // Memoized price calculations for performance
  const basePrice = useMemo(() => 
    trip?.packages?.find(p => p.name === selectedPackageName)?.price || 0,
    [trip?.packages, selectedPackageName]
  );
  
  const addOnsPrice = useMemo(() => 
    selectedAddOns.reduce((total, addonName) => {
      const addon = trip?.addOns?.find(a => a.name === addonName);
      return total + (addon?.price || 0);
    }, 0),
    [selectedAddOns, trip?.addOns]
  );
  
  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !trip?.vendorId) return;
    setIsApplyingDiscount(true);
    try {
      const vendorRef = doc(db, 'vendors', trip.vendorId);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        const vendorData = vendorSnap.data();
        const codeData = vendorData.discountCodes?.find((c: any) => c.code === discountCode.trim().toUpperCase());
        if (codeData && codeData.usedCount < codeData.maxUses) {
          setDiscountPercent(codeData.discountPercent);
          Alert.alert('Applied', `${codeData.discountPercent}% discount applied successfully!`);
        } else {
          Alert.alert('Invalid Code', 'This code is invalid or has expired.');
          setDiscountPercent(0);
        }
      } else {
        Alert.alert('Error', 'Could not verify code.');
        setDiscountPercent(0);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to apply discount.');
      setDiscountPercent(0);
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const totalPrice = useMemo(() => {
    const subtotal = (basePrice + addOnsPrice) * seats;
    return subtotal - (subtotal * (discountPercent / 100));
  }, [basePrice, addOnsPrice, seats, discountPercent]);

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
            locationSubscription.current = sub;
          }
        });
      }
    });

    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
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
      locationSubscription.current = sub;
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
        vendorUPI: trip.vendorUPI && trip.vendorUPI.length > 0 ? trip.vendorUPI[0] : '',
        // Pass vendor payment config for Razorpay
        vendorPaymentEnabled: trip.vendorPaymentConfig?.enabled ? 'true' : 'false',
        vendorPaymentGateway: trip.vendorPaymentConfig?.gateway || 'manual',
        vendorRazorpayKey: trip.vendorPaymentConfig?.razorpayKeyId || '',
      }
    });
  };

  const handleShareTrip = async () => {
    try {
      const tripDate = trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : 'TBD';
      const webLink = `https://abtohghoomle.com/trip.html?id=${trip.id}`;
      const appLink = `hopontravel://trip/${trip.id}`;
      const message = `Check out this amazing trip! 🌍\n\n` +
        `*${trip.title}*\n` +
        `📅 ${tripDate}\n` +
        `💰 Starting from ₹${basePrice}\n` +
        `👤 Organized by ${trip.vendorName}\n\n` +
        `🌐 Book on Web: ${webLink}\n` +
        `📱 Open in App: ${appLink}`;
      
      await Share.share({
        message,
        title: `Trip: ${trip.title}`,
      });
    } catch (error) {
      console.error('Error sharing trip:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false} 
          style={styles.heroScroll}
          onScroll={handleImageScroll}
          scrollEventThrottle={16}
        >
          {trip.images && trip.images.length > 0 ? (
            trip.images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
            ))
          ) : (
            <View style={[styles.heroImage, { width, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
              <FontAwesome name="image" size={50} color={colors.textSecondary} />
            </View>
          )}
        </ScrollView>
        <TouchableOpacity 
          style={styles.wishlistBtn}
          onPress={() => trip && toggleWishlist(trip.id)}
        >
          <FontAwesome name={isWishlisted ? "heart" : "heart-o"} size={24} color={isWishlisted ? "#ef4444" : "#fff"} />
        </TouchableOpacity>
        {/* Page Indicator Dots */}
        {trip.images && trip.images.length > 1 && (
          <View style={styles.dotsContainer}>
            {trip.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeImageIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
      
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

        {trip.batches && trip.batches.length > 0 && trip.tripStatus !== 'started' && trip.tripStatus !== 'completed' && (
          <CountdownTimer dateDuration={trip.batches[0].dateDuration} styles={styles} />
        )}

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
                <View style={styles.mapPlaceholder}><Text>Waiting for Captain&apos;s location...</Text></View>
              )}
            </View>

            {!isTracking ? (
              <View>
                <TouchableOpacity 
                  style={[styles.joinBtn, userProfile?.role === 'vendor' ? { opacity: 0.5 } : {}]} 
                  disabled={userProfile?.role === 'vendor'}
                  onPress={() => setIsJoinModalVisible(true)}
                >
                  <Text style={styles.joinBtnText}>{t('tripDetails.joinTrip', 'Join Trip & Share Location')}</Text>
                </TouchableOpacity>
                {userProfile?.role === 'vendor' && (
                  <Text style={{ textAlign: 'center', marginTop: 8, color: '#e53e3e', fontSize: 12 }}>
                    {t('tripDetails.vendorJoinWarning', 'You are logged in as a Vendor. Please sign out to join a trip as a traveller.')}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.trackingPill}>
                <Text style={styles.trackingPillText}>✓ You are sharing your location</Text>
                {etaMins > 0 && (
                  <Text style={{color: colors.card, marginTop: 4, fontWeight: 'bold', textAlign: 'center'}}>
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
            <Text style={[styles.statValue, { color: colors.primary }]}>{trip.batches ? trip.batches.reduce((acc, b) => acc + (b.totalSeats - b.bookedSeats), 0) : 0}</Text>
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
                    <FontAwesome name="times-circle" size={16} color={colors.danger} style={styles.listIcon} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Itinerary */}
        {trip.structuredItinerary && trip.structuredItinerary.length > 0 ? (
          <View style={styles.itinerarySection}>
            <Text style={styles.sectionTitle}>{t('tripDetails.itinerary', 'Itinerary')}</Text>
            {trip.structuredItinerary.map((dayItem, i) => {
              const isExpanded = expandedDay === i;
              
              return (
                <View key={i} style={styles.itineraryCard}>
                  <TouchableOpacity style={styles.itineraryHeader} onPress={() => setExpandedDay(isExpanded ? null : i)}>
                    <Text style={styles.itineraryDay}>Day {dayItem.day}: {dayItem.title}</Text>
                    <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.itineraryContent}>
                      <Text style={styles.itineraryText}>{dayItem.description}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : trip.itinerary ? (
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
                    <FontAwesome name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textSecondary} />
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
                    <FontAwesome name="external-link" size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.vendorCard}>
          <FontAwesome name="user-circle" size={40} color={colors.border} style={styles.vendorIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorLabel}>Organized by</Text>
            <Text style={styles.vendorName}>{trip.vendorName}</Text>
            <View style={styles.vendorInfoRow}>
              <FontAwesome name="whatsapp" size={14} color={colors.textSecondary} />
              <Text style={styles.vendorInfoText}>{trip.vendorWhatsApp}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareTrip}>
            <FontAwesome name="share-alt" size={18} color={colors.primary} />
          </TouchableOpacity>
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
                      {isSelected && <FontAwesome name="check" size={12} color={colors.card} />}
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
                <FontAwesome name="minus" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{seats}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setSeats(seats + 1)}>
                <FontAwesome name="plus" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Promo Code Section */}
          <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
            <Text style={styles.selectionLabel}>Promo Code</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 48, backgroundColor: colors.card, textTransform: 'uppercase' }}
                placeholder="Enter Code"
                value={discountCode}
                onChangeText={setDiscountCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={{ backgroundColor: discountPercent > 0 ? '#10b981' : '#0ea5e9', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8, height: 48 }}
                onPress={handleApplyDiscount}
                disabled={isApplyingDiscount || discountPercent > 0}
              >
                <Text style={{ color: colors.card, fontWeight: 'bold' }}>{discountPercent > 0 ? 'Applied' : (isApplyingDiscount ? '...' : 'Apply')}</Text>
              </TouchableOpacity>
            </View>
            {discountPercent > 0 && (
              <Text style={{ color: '#10b981', fontSize: 13, marginTop: 6, fontWeight: '500' }}>
                🎉 {discountPercent}% discount applied!
              </Text>
            )}
          </View>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalBoxLabel}>{t('tripDetails.total', 'Total Price')}</Text>
          <Text style={styles.totalBoxValue}>₹{totalPrice}</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.bookButton, styles.proceedButton]} onPress={handleProceedToCheckout}>
            <Text style={styles.bookButtonText}>Proceed to Traveller Details</Text>
            <FontAwesome name="arrow-right" size={16} color={colors.card} style={{marginLeft: 8, marginTop: 2}} />
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
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleJoinTrip}>
                <Text style={{ color: colors.card, fontWeight: 'bold' }}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  contentContainer: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroScroll: { height: 300 },
  heroImage: { height: 300, resizeMode: 'cover' },
  detailsContainer: { padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.card, marginTop: -30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  liveBanner: { backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  liveBannerText: { color: colors.danger, fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titleContainer: { flex: 1, marginRight: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a' },
  date: { fontSize: 14, color: colors.textSecondary, marginTop: 6, fontWeight: '500' },
  price: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  shareIconText: { marginLeft: 8, fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  wishlistBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 25
  },
  countdownContainer: { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#bae6fd', alignItems: 'center' },
  countdownTitle: { color: '#0369a1', fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  countdownBox: { backgroundColor: colors.card, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', minWidth: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  countdownNum: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  countdownLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginTop: 2, fontWeight: '600' },
  countdownSep: { fontSize: 20, fontWeight: 'bold', color: '#bae6fd', marginBottom: 12 },
  
  liveSection: { backgroundColor: colors.background, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  vehicleImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  crewInfoBox: { marginBottom: 16 },
  crewLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  crewValue: { fontWeight: 'bold', color: '#1a1a1a' },
  mapWrapper: { height: 200, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  joinBtn: { backgroundColor: '#4ade80', padding: 14, borderRadius: 8, alignItems: 'center' },
  joinBtnText: { color: colors.card, fontWeight: 'bold', fontSize: 16 },
  trackingPill: { backgroundColor: colors.success, padding: 12, borderRadius: 8, alignItems: 'center' },
  trackingPillText: { color: '#166534', fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#f5f7fa', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  statLabel: { fontSize: 12, color: '#8a94a6', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, marginBottom: 24 },
  
  pickupSection: { marginBottom: 24 },
  pickupItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 8, marginBottom: 8 },
  pickupLocation: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  pickupTime: { fontSize: 14, color: colors.textSecondary },

  vendorCard: { backgroundColor: colors.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 30, flexDirection: 'row', alignItems: 'center' },
  vendorIcon: { marginRight: 15 },
  vendorLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  vendorName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  vendorInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  vendorInfoText: { fontSize: 12, color: colors.textSecondary, marginLeft: 6 },
  shareButton: { padding: 12, backgroundColor: '#e0f7ff', borderRadius: 100 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bookButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 100, elevation: 4 },
  bookButtonText: { color: colors.card, fontSize: 16, fontWeight: 'bold' },
  proceedButton: { backgroundColor: '#0f172a', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { color: colors.textSecondary, marginBottom: 16 },
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
  listText: { fontSize: 15, color: colors.textSecondary, flex: 1, lineHeight: 22 },

  itinerarySection: { marginBottom: 24 },
  itineraryCard: { backgroundColor: colors.background, borderRadius: 8, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  itineraryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.card },
  itineraryDay: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  itineraryContent: { padding: 16, paddingTop: 0, backgroundColor: colors.card },
  itineraryText: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },

  bookingSelectionSection: { backgroundColor: colors.background, padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  selectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  selectionScroll: { marginBottom: 12, paddingBottom: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.card, fontWeight: '700' },
  addonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  addonRowActive: { borderColor: colors.primary, backgroundColor: '#e0f7ff' },
  addonCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  addonCheckActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  addonName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  addonPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 100, borderWidth: 1, borderColor: colors.border },
  stepBtn: { padding: 10, paddingHorizontal: 16 },
  stepValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 24, textAlign: 'center' },

  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.textPrimary, padding: 16, borderRadius: 12, marginBottom: 24 },
  totalBoxLabel: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  totalBoxValue: { fontSize: 24, fontWeight: '800', color: colors.card },

  // Image gallery dots
  dotsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'absolute', 
    bottom: 45, 
    left: 0, 
    right: 0 
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    marginHorizontal: 4 
  },
  dotActive: { 
    backgroundColor: colors.card, 
    width: 24 
  },
});
