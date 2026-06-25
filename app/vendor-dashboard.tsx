import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, ActivityIndicator, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Trip } from '../data/trips';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../utils/uploadImage';
import OllieLoading from '../components/OllieLoading';
import { parseWhatsAppMessage, AIProvider, parseLocalHeuristics } from '../utils/aiParser';
import { Logger } from '../utils/logger';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

// Configuration for limits
const LIMITS = {
  MAX_TRIPS_PER_VENDOR: 10,
  MAX_IMAGE_SIZE_MB: 2,
  MAX_TITLE_CHARS: 50,
  MAX_DESC_CHARS: 500,
  MAX_PRICE_CHARS: 10,
  MAX_DATE_CHARS: 30,
  MAX_IMAGES_PER_TRIP: 5
};

export default function VendorDashboardScreen() {
  const { trips, vendorProfile, loginWithGoogle, mockVendorLogin, logout, updateVendorProfile, updateTrip, addTrip, deleteTrip } = useAppContext();
  const [upiInput, setUpiInput] = useState(vendorProfile?.upiId || '');
  const [waInput, setWaInput] = useState(vendorProfile?.whatsappNumber || '');
  const [nameInput, setNameInput] = useState(vendorProfile?.name || '');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'trips' | 'bookings'>('trips');
  const [bookingSearch, setBookingSearch] = useState('');
  const { t } = useTranslation();
  
  // Edit/Add form states
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('₹');
  const [editDesc, setEditDesc] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editPickupPoints, setEditPickupPoints] = useState<{location: string, time: string, mapLink?: string}[]>([]);
  const [editTotalSeats, setEditTotalSeats] = useState('20');
  const [editBookedSeats, setEditBookedSeats] = useState('0');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showTimePickerForIdx, setShowTimePickerForIdx] = useState<number | null>(null);

  // AI Import states
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [waText, setWaText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    const loadAiSettings = async () => {
      try {
        const savedProvider = await AsyncStorage.getItem('ai_provider');
        const savedKey = await AsyncStorage.getItem('ai_api_key');
        if (savedProvider === 'gemini' || savedProvider === 'openai') {
          setAiProvider(savedProvider as AIProvider);
        }
        if (savedKey) {
          setApiKey(savedKey);
        }
      } catch (e) {
        console.error("Failed to load AI settings", e);
      }
    };
    loadAiSettings();
  }, []);

  const handleLogin = async () => {
    await loginWithGoogle();
  };

  const handleUpdateProfile = () => {
    if (!upiInput.includes('@')) {
      Alert.alert('Invalid UPI', 'Please enter a valid UPI ID (e.g., name@bank)');
      return;
    }
    if (!waInput.startsWith('+')) {
      Alert.alert('Invalid WhatsApp', 'Please include country code (e.g., +91...)');
      return;
    }
    updateVendorProfile({ 
      upiId: upiInput, 
      whatsappNumber: waInput,
      name: nameInput
    });
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handleLogout = () => {
    logout();
    router.back();
  };

  const startEditing = (trip: Trip) => {
    setEditingTrip(trip);
    setIsAddingNew(false);
    setEditTitle(trip.title);
    setEditPrice(trip.packages && trip.packages.length > 0 ? trip.packages[0].price.toString() : '0');
    setEditDesc(trip.description);
    
    // Parse existing date roughly, or use current date
    setEditStartDate(new Date());
    setEditEndDate(new Date(Date.now() + 86400000 * 2));
    setEditPickupPoints(trip.pickupPoints || []);

    setEditTotalSeats(trip.batches && trip.batches.length > 0 ? trip.batches[0].totalSeats.toString() : '0');
    setEditBookedSeats(trip.batches && trip.batches.length > 0 ? trip.batches[0].bookedSeats.toString() : '0');
    setEditImages((trip.images || []).filter(img => img && typeof img === 'string' && img.trim() !== ''));
  };

  const startAddingNew = () => {
    if (trips.length >= LIMITS.MAX_TRIPS_PER_VENDOR) {
      Alert.alert('Limit Reached', `You can only have up to ${LIMITS.MAX_TRIPS_PER_VENDOR} active trip listings on the free plan.`);
      return;
    }
    setIsAddingNew(true);
    setEditingTrip({ id: 'new' } as Trip);
    setEditTitle('');
    setEditPrice('₹');
    setEditDesc('');
    setEditStartDate(new Date());
    setEditEndDate(new Date(Date.now() + 86400000 * 2));
    setEditPickupPoints([]);
    setEditTotalSeats('20');
    setEditBookedSeats('0');
    setEditImages([]);
  };

  const startAddingFromParsed = (trip: Partial<Trip>) => {
    if (trips.length >= LIMITS.MAX_TRIPS_PER_VENDOR) {
      Alert.alert('Limit Reached', `You can only have up to ${LIMITS.MAX_TRIPS_PER_VENDOR} active trip listings on the free plan.`);
      return;
    }
    setIsAddingNew(true);
    setEditingTrip({ id: 'new', ...trip } as Trip);
    setEditTitle(trip.title || '');
    setEditPrice(trip.packages && trip.packages.length > 0 ? trip.packages[0].price.toString() : '₹');
    setEditDesc(trip.description || '');
    
    // Attempt to parse start date
    let startDate = new Date();
    if (trip.batches && trip.batches.length > 0) {
      const match = trip.batches[0].dateDuration.match(/(\d{1,2})/);
      if (match) startDate.setDate(parseInt(match[1]));
    }
    setEditStartDate(startDate);
    setEditEndDate(new Date(startDate.getTime() + 86400000 * 2));
    
    setEditPickupPoints(trip.pickupPoints || []);
    setEditTotalSeats(trip.batches && trip.batches.length > 0 ? trip.batches[0].totalSeats.toString() : '20');
    setEditBookedSeats(trip.batches && trip.batches.length > 0 ? trip.batches[0].bookedSeats.toString() : '0');
    setEditImages([]);
  };

  const pickImage = async () => {
    if (editImages.length >= LIMITS.MAX_IMAGES_PER_TRIP) {
      Alert.alert('Limit Reached', `Maximum ${LIMITS.MAX_IMAGES_PER_TRIP} images allowed per trip.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.6,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        Alert.alert('File Too Large', `Image must be smaller than ${LIMITS.MAX_IMAGE_SIZE_MB}MB.`);
        return;
      }
      setEditImages([...editImages, asset.uri]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...editImages];
    newImages.splice(index, 1);
    setEditImages(newImages);
  };

  const handleDeleteTrip = () => {
    if (!editingTrip) return;
    
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to permanently delete this trip listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setIsUploading(true);
            try {
              await deleteTrip(editingTrip.id);
              setEditingTrip(null);
              Alert.alert('Deleted', 'Trip listing has been removed.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip.');
            } finally {
              setIsUploading(false);
            }
          }
        },
      ]
    );
  };

  const saveTrip = async () => {
    if (!editingTrip) return;
    if (!editTitle || editPrice === '₹') {
      Alert.alert('Required Fields', 'Please fill in the title and price.');
      return;
    }
    
    setIsUploading(true);
    try {
      const finalImageUrls: string[] = [];
      const folderId = isAddingNew ? Date.now().toString() : editingTrip.id;

      for (const uri of editImages) {
        if (uri.startsWith('http')) {
          finalImageUrls.push(uri);
        } else {
          const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const url = await uploadImage(uri, `trips/${folderId}/${fileName}`);
          finalImageUrls.push(url);
        }
      }

      const formattedDate = `${editStartDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${editEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

      const tripData = {
        title: editTitle.trim(),
        packages: [{ name: 'Base Package', price: parseInt(editPrice) || 0 }],
        description: editDesc.trim(),
        batches: [{ id: Date.now().toString(), dateDuration: formattedDate, totalSeats: parseInt(editTotalSeats) || 0, bookedSeats: parseInt(editBookedSeats) || 0 }],
        images: finalImageUrls,
        vendorName: vendorProfile?.name || '',
        vendorId: vendorProfile?.id || '',
        vendorUPI: [vendorProfile?.upiId || ''],
        vendorWhatsApp: vendorProfile?.whatsappNumber || '',
        addOns: [],
        pickupPoints: editPickupPoints.filter(p => p.location.trim() && p.time.trim()),
        itinerary: '',
        inclusions: [],
        exclusions: [],
        thingsToCarry: [],
        cancellationPolicy: [],
        status: 'published' as const
      };

      if (isAddingNew) {
        await addTrip(tripData);
      } else {
        await updateTrip(editingTrip.id, tripData);
      }
      
      setEditingTrip(null);
      setIsAddingNew(false);
      Alert.alert('Success', isAddingNew ? 'New trip listed!' : 'Trip updated successfully!');
    } catch (error: any) {
      Logger.error('Failed to save trip', error);
      Alert.alert('Error', error?.message || 'Failed to save trip. Check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiParse = async () => {
    if (!waText.trim()) {
      Alert.alert('Error', 'Please provide the WhatsApp message.');
      return;
    }

    if (apiKey.trim()) {
      AsyncStorage.setItem('ai_provider', aiProvider).catch(e => Logger.warn('Failed to save AI provider', e));
      AsyncStorage.setItem('ai_api_key', apiKey).catch(e => Logger.warn('Failed to save API key', e));
    }

    setIsParsing(true);
    try {
      // 1. Try Local Heuristics FIRST
      let parsedTrips = parseLocalHeuristics(waText);
      let trip = parsedTrips[0];
      
      // 2. Evaluate if local heuristics need AI enhancement (missing critical or detailed fields)
      const needsAI = 
        !trip.title || 
        !trip.packages || trip.packages.length === 0 ||
        !trip.batches || trip.batches.length === 0 ||
        !trip.itinerary || trip.itinerary.length < 20 ||
        (trip.inclusions?.length === 0 && trip.exclusions?.length === 0);

      if (needsAI && apiKey.trim()) {
        Logger.info('Local extraction needs refinement, enhancing with AI');
        parsedTrips = await parseWhatsAppMessage(waText, aiProvider, apiKey);
      } else if (needsAI && !apiKey.trim()) {
        Alert.alert('Notice', 'Local parsing extracted limited data. You can provide an API key for better AI extraction.');
      }

      if (!parsedTrips || parsedTrips.length === 0) {
        Alert.alert('Failed', 'No trips could be extracted from the text.');
        return;
      }

      // 3. Instead of saving silently, open the editor with the first parsed trip!
      setIsAiModalVisible(false);
      setWaText('');
      startAddingFromParsed(parsedTrips[0]);
      
      if (parsedTrips.length > 1) {
         Alert.alert('Notice', `Extracted \${parsedTrips.length} trips, but loading the first one into the editor for validation.`);
      }

    } catch (error: any) {
      Logger.error('AI Parse failed', error);
      // Fallback: If AI completely crashed (e.g. 503), just use the local heuristics anyway!
      const fallbackTrips = parseLocalHeuristics(waText);
      if (fallbackTrips.length > 0) {
        Alert.alert('AI Error', 'AI services unavailable. Loaded basic details locally. Please fill in the rest manually.');
        setIsAiModalVisible(false);
        setWaText('');
        startAddingFromParsed(fallbackTrips[0]);
      } else {
        Alert.alert('Parsing Error', error.message || 'Failed to parse message.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const renderSupportFeedback = () => (
    <View style={styles.dashboardCard}>
      <Text style={styles.sectionTitle}>Support & Feedback</Text>
      <Text style={styles.subtitle}>Help us improve or support the platform!</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={async () => {
        const handleReport = async (text: string | null) => {
          if (text) {
            try {
              await addTrip({ title: `REPORT: ${text.substring(0, 20)}`, description: text, vendorName: vendorProfile?.name || 'Unknown', vendorId: vendorProfile?.id || 'Unknown', vendorWhatsApp: 'system', vendorUPI: ['system'], images: [], batches: [{ id: '1', dateDuration: 'REPORT_DO_NOT_DELETE', totalSeats: 0, bookedSeats: 0 }], packages: [], addOns: [], pickupPoints: [], itinerary: '', inclusions: [], exclusions: [], thingsToCarry: [], cancellationPolicy: [], status: 'draft' } as any);
              Alert.alert("Sent", "Your issue has been reported to the server.");
            } catch (e) {
              Alert.alert("Error", "Could not send report.");
            }
          }
        };

        if (Platform.OS === 'web') {
          const text = window.prompt("Report Issue\n\nPlease describe the issue you are facing.");
          handleReport(text);
        } else {
          Alert.prompt(
            "Report Issue",
            "Please describe the issue you are facing. Logs will be attached automatically.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Submit", onPress: (text) => handleReport(text) }
            ]
          );
        }
      }}>
        <FontAwesome name="bug" size={18} color="#4a5568" style={{ marginRight: 10 }} />
        <Text style={styles.actionButtonText}>Report Issue with Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.donateButton} onPress={async () => {
        const upiUrl = `upi://pay?pa=ayushbpl10@ybl&pn=AbTohGhoomLe&cu=INR`;
        try {
          await Linking.openURL(upiUrl);
        } catch (error) {
          Alert.alert('Error', 'Could not open UPI App. Please ensure GPay, PhonePe, or Paytm is installed.');
        }
      }}>
        <FontAwesome name="heart" size={18} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.donateButtonText}>Donate to Support Us</Text>
      </TouchableOpacity>
    </View>
  );

  if (!vendorProfile) {
    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.loginCard, { marginBottom: 20 }]}>
          <FontAwesome name="google" size={48} color="#DB4437" style={styles.googleIcon} />
          <Text style={styles.title}>{t('vendor.loginTitle', 'Vendor Portal')}</Text>
          <Text style={styles.subtitle}>{t('vendor.loginSubtitle', 'Sign in with Google to manage your trips and payment settings.')}</Text>
          
          <TouchableOpacity style={styles.googleButton} onPress={handleLogin}>
            <FontAwesome name="google" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>{t('vendor.signInWithGoogle', 'Sign in with Google')}</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity 
              style={[styles.googleButton, { backgroundColor: '#4a5568', marginTop: 15 }]} 
              onPress={mockVendorLogin}
            >
              <FontAwesome name="code" size={20} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Dev Login (Web Only)</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderSupportFeedback()}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.dashboardCard}>
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.welcomeText}>{t('vendor.welcome', 'Welcome')}, {vendorProfile.name}</Text>
            <Text style={styles.emailText}>{vendorProfile.email}</Text>
            {(() => {
              const myTrips = trips.filter(t => t.vendorName === vendorProfile?.name);
              let totalRating = 0;
              let totalReviews = 0;
              myTrips.forEach(t => {
                t.ratings?.forEach(r => {
                  totalRating += r.stars;
                  totalReviews += 1;
                });
              });
              if (totalReviews === 0) return null;
              const avgRating = (totalRating / totalReviews).toFixed(1);
              return (
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                  <FontAwesome name="star" color="#f59e0b" size={14} />
                  <Text style={{marginLeft: 4, fontWeight: 'bold', color: '#4a5568', fontSize: 13}}>
                    {avgRating} ({totalReviews} reviews)
                  </Text>
                </View>
              );
            })()}
          </View>
          <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.push('/my-bookings' as any)}>
               <FontAwesome name="ticket" size={24} color="#00b0ff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutSmall} onPress={handleLogout}>
               <FontAwesome name="sign-out" size={20} color="#e53e3e" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Information</Text>
          
          <Text style={styles.label}>Display Name</Text>
          <TextInput style={styles.input} value={nameInput} onChangeText={setNameInput} placeholder="Your Business Name" maxLength={40} />

          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput style={styles.input} value={waInput} onChangeText={setWaInput} placeholder="+919876543210" keyboardType="phone-pad" maxLength={15} />

          <Text style={styles.label}>Merchant UPI ID</Text>
          <TextInput style={styles.input} value={upiInput} onChangeText={setUpiInput} placeholder="e.g., mybusiness@okicici" autoCapitalize="none" maxLength={50} />

          <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
            <Text style={styles.saveButtonText}>{t('vendor.updateProfile', 'Update Profile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'trips' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('trips')}
          >
            <Text style={[styles.tabText, activeTab === 'trips' && styles.tabTextActive]}>Your Trips</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'bookings' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>Manage Bookings</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'trips' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>{t('vendor.yourTrips', 'Your Trips')}</Text>
              <Text style={styles.limitText}>{trips.length} / {LIMITS.MAX_TRIPS_PER_VENDOR} trips used</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.addNewBtn, { backgroundColor: '#8b5cf6' }]} 
                onPress={() => setIsAiModalVisible(true)}
              >
                 <FontAwesome name="magic" size={14} color="white" />
                 <Text style={styles.addNewBtnText}>{t('vendor.aiImport', 'AI Import')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addNewBtn, trips.length >= LIMITS.MAX_TRIPS_PER_VENDOR && styles.disabledBtn]} 
                onPress={startAddingNew}
              >
                 <FontAwesome name="plus" size={14} color="white" />
                 <Text style={styles.addNewBtnText}>{t('vendor.addNewTrip', 'Add New')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>No trips listed yet. Click "Add New" to start!</Text>
          ) : (
            trips.map((trip) => (
              <TouchableOpacity 
                key={trip.id} 
                style={[styles.tripItem, trip.tripStatus === 'started' && { borderColor: '#4ade80', borderWidth: 2 }]} 
                onPress={() => {
                  if (trip.tripStatus === 'started') {
                    router.push(`/vendor-live/${trip.id}` as any);
                  } else {
                    startEditing(trip);
                  }
                }}
              >
                <View style={styles.tripInfo}>
                  <Text style={styles.tripTitle}>{trip.title}</Text>
                  <Text style={styles.tripDate}>{trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : 'TBD'}</Text>
                  <Text style={styles.tripSeats}>{trip.batches ? trip.batches.reduce((acc, b) => acc + (b.totalSeats - b.bookedSeats), 0) : 0} / {trip.batches ? trip.batches.reduce((acc, b) => acc + b.totalSeats, 0) : 0} seats available</Text>
                  {trip.tripStatus === 'started' && (
                    <Text style={{ color: '#4ade80', fontWeight: 'bold', marginTop: 4 }}>LIVE TRACKING ACTIVE</Text>
                  )}
                  {trip.tripStatus !== 'started' && (
                    <TouchableOpacity 
                      style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#4ade80', borderRadius: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }} 
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/start-trip/${trip.id}` as any);
                      }}
                    >
                      <FontAwesome name="play" size={10} color="white" style={{ marginRight: 6 }} />
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Start Live Tracking</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <FontAwesome name={trip.tripStatus === 'started' ? "map-marker" : "edit"} size={20} color={trip.tripStatus === 'started' ? "#4ade80" : "#00b0ff"} />
              </TouchableOpacity>
            ))
          )}
        </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Manage Bookings</Text>
              <TextInput 
                style={[styles.input, { width: 150, marginBottom: 0 }]} 
                placeholder="Search Name or ID" 
                value={bookingSearch}
                onChangeText={setBookingSearch}
              />
            </View>
            
            {vendorBookings.length === 0 ? (
              <Text style={styles.emptyText}>No bookings received yet.</Text>
            ) : (
              vendorBookings.filter(b => b.travelerName.toLowerCase().includes(bookingSearch.toLowerCase()) || b.bookingId?.toLowerCase().includes(bookingSearch.toLowerCase())).map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingIdText}>{booking.bookingId}</Text>
                    <View style={[styles.statusBadge, booking.status === 'confirmed' ? {backgroundColor: '#dcfce7'} : booking.status === 'failed' ? {backgroundColor: '#fee2e2'} : {backgroundColor: '#fef3c7'}]}>
                      <Text style={[styles.statusText, booking.status === 'confirmed' ? {color: '#16a34a'} : booking.status === 'failed' ? {color: '#dc2626'} : {color: '#d97706'}]}>
                        {booking.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.bookingBody}>
                    <View style={styles.bookingRow}>
                      <FontAwesome name="user" size={14} color="#64748b" style={{width: 20}} />
                      <Text style={styles.bookingData}>{booking.travelerName}</Text>
                    </View>
                    <View style={styles.bookingRow}>
                      <FontAwesome name="phone" size={14} color="#64748b" style={{width: 20}} />
                      <Text style={styles.bookingData}>{booking.travelerPhone}</Text>
                    </View>
                    <View style={styles.bookingRow}>
                      <FontAwesome name="ticket" size={14} color="#64748b" style={{width: 20}} />
                      <Text style={styles.bookingData}>{booking.packageName} ({booking.seats} seats)</Text>
                    </View>
                    <View style={styles.bookingRow}>
                      <FontAwesome name="rupee" size={14} color="#64748b" style={{width: 20}} />
                      <Text style={[styles.bookingData, {fontWeight: 'bold', color: '#00b0ff'}]}>₹{booking.totalPrice}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.bookingActions}>
                    {booking.status !== 'confirmed' && (
                      <TouchableOpacity 
                        style={[styles.statusUpdateBtn, {backgroundColor: '#22c55e'}]} 
                        onPress={() => updateBookingStatus(booking.id, 'confirmed')}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>Mark Success</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status !== 'failed' && (
                      <TouchableOpacity 
                        style={[styles.statusUpdateBtn, {backgroundColor: '#ef4444'}]} 
                        onPress={() => updateBookingStatus(booking.id, 'failed')}
                      >
                        <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 12}}>Mark Failed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Add/Edit Trip Modal */}
      <Modal visible={editingTrip !== null} animationType="slide">
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isAddingNew ? 'List New Trip' : 'Edit Trip'}</Text>
            <TouchableOpacity onPress={() => setEditingTrip(null)}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Trip Title</Text>
            <Text style={styles.charCount}>{editTitle.length}/{LIMITS.MAX_TITLE_CHARS}</Text>
          </View>
          <TextInput 
            style={styles.input} 
            value={editTitle} 
            onChangeText={setEditTitle} 
            placeholder="e.g. Weekend getaway to Gokarna" 
            maxLength={LIMITS.MAX_TITLE_CHARS}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Price</Text>
              <TextInput 
                style={styles.input} 
                value={editPrice} 
                onChangeText={setEditPrice} 
                placeholder="₹" 
                maxLength={LIMITS.MAX_PRICE_CHARS}
              />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>{t('vendor.startDate', 'Start Date')}</Text>
              <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowStartDatePicker(true)}>
                <Text>{editStartDate.toLocaleDateString('en-GB')}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={editStartDate}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) setEditStartDate(selectedDate);
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('vendor.endDate', 'End Date')}</Text>
              <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={() => setShowEndDatePicker(true)}>
                <Text>{editEndDate.toLocaleDateString('en-GB')}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={editEndDate}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) setEditEndDate(selectedDate);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('vendor.description', 'Description')}</Text>
            <Text style={styles.charCount}>{editDesc.length}/{LIMITS.MAX_DESC_CHARS}</Text>
          </View>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={editDesc} 
            onChangeText={setEditDesc} 
            multiline 
            numberOfLines={4} 
            placeholder={t('vendor.descPlaceholder', 'Describe the itinerary...')} 
            maxLength={LIMITS.MAX_DESC_CHARS}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('vendor.pickupPoints', 'Pickup Points')}</Text>
          </View>
          {editPickupPoints.map((pt, idx) => (
            <View key={idx} style={{ marginBottom: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <TextInput 
                  style={[styles.input, { flex: 2, marginBottom: 0 }]} 
                  placeholder="Location (e.g. Wakad)" 
                  value={pt.location} 
                  onChangeText={(text) => {
                    const newPts = [...editPickupPoints];
                    newPts[idx].location = text;
                    setEditPickupPoints(newPts);
                  }} 
                />
                <TouchableOpacity 
                  style={[styles.input, { flex: 1, marginBottom: 0, justifyContent: 'center' }]} 
                  onPress={() => setShowTimePickerForIdx(idx)}
                >
                  <Text style={{ color: pt.time ? '#2d3748' : '#a0aec0' }}>{pt.time || 'Set Time'}</Text>
                </TouchableOpacity>
                {showTimePickerForIdx === idx && (
                  <DateTimePicker
                    value={pt.time ? (() => { 
                      const d = new Date(); 
                      const parts = pt.time.match(/(\d+):(\d+) (AM|PM)/); 
                      if(parts) { 
                        d.setHours((parseInt(parts[1]) % 12) + (parts[3]==='PM'?12:0)); 
                        d.setMinutes(parseInt(parts[2])); 
                      } 
                      return d; 
                    })() : new Date()}
                    mode="time"
                    onChange={(event, selectedDate) => {
                      setShowTimePickerForIdx(null);
                      if (selectedDate) {
                        const timeStr = selectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        const newPts = [...editPickupPoints];
                        newPts[idx].time = timeStr;
                        setEditPickupPoints(newPts);
                      }
                    }}
                  />
                )}
                <TouchableOpacity 
                  style={{ justifyContent: 'center', padding: 5 }}
                  onPress={() => {
                    const newPts = [...editPickupPoints];
                    newPts.splice(idx, 1);
                    setEditPickupPoints(newPts);
                  }}
                >
                  <FontAwesome name="trash" size={20} color="#e53e3e" />
                </TouchableOpacity>
              </View>
              <TextInput 
                style={[styles.input, { marginBottom: 0 }]} 
                placeholder="Google Maps Link (Optional)" 
                value={pt.mapLink || ''} 
                onChangeText={(text) => {
                  const newPts = [...editPickupPoints];
                  newPts[idx].mapLink = text;
                  setEditPickupPoints(newPts);
                }} 
              />
            </View>
          ))}
          <TouchableOpacity 
            style={{ padding: 10, alignSelf: 'flex-start', marginBottom: 15 }} 
            onPress={() => setEditPickupPoints([...editPickupPoints, { location: '', time: '' }])}
          >
            <Text style={{ color: '#00b0ff', fontWeight: 'bold' }}>+ {t('vendor.addPickup', 'Add Pickup Point')}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>{t('vendor.totalSeats', 'Total Seats')}</Text>
              <TextInput style={styles.input} value={editTotalSeats} onChangeText={setEditTotalSeats} keyboardType="numeric" maxLength={3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('vendor.bookedSeats', 'Booked Seats')}</Text>
              <TextInput style={styles.input} value={editBookedSeats} onChangeText={setEditBookedSeats} keyboardType="numeric" maxLength={3} />
            </View>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>{t('vendor.tripImages', 'Trip Images')} ({editImages.length}/{LIMITS.MAX_IMAGES_PER_TRIP})</Text>
            <Text style={styles.hintText}>Max {LIMITS.MAX_IMAGE_SIZE_MB}MB</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {editImages.map((uri, index) => {
              if (!uri) return null;
              return (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                    <FontAwesome name="times-circle" size={20} color="#e53e3e" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {editImages.length < LIMITS.MAX_IMAGES_PER_TRIP && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <FontAwesome name="plus" size={24} color="#00b0ff" />
                <Text style={styles.addImageText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.saveButton, isUploading && styles.disabledButton]} 
            onPress={saveTrip}
            disabled={isUploading}
          >
            {isUploading ? (
              <OllieLoading size={30} />
            ) : (
              <Text style={styles.saveButtonText}>{isAddingNew ? t('vendor.listTrip', 'List Trip') : t('vendor.saveChanges', 'Save Changes')}</Text>
            )}
          </TouchableOpacity>


          {!isAddingNew && (
            <TouchableOpacity 
              style={[styles.deleteButton, isUploading && styles.disabledButton]} 
              onPress={handleDeleteTrip}
              disabled={isUploading}
            >
              <FontAwesome name="trash" size={16} color="#e53e3e" />
              <Text style={styles.deleteButtonText}>{t('vendor.deleteTrip', 'Delete Trip Listing')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Modal>

      {/* AI Import Modal */}
      <Modal visible={isAiModalVisible} animationType="slide" transparent={true}>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('vendor.aiImportTitle', 'AI WhatsApp Import')}</Text>
              <TouchableOpacity onPress={() => setIsAiModalVisible(false)} disabled={isParsing}>
                <FontAwesome name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('vendor.aiProvider', 'AI Provider')}</Text>
            <View style={styles.providerToggle}>
              <TouchableOpacity 
                style={[styles.toggleBtn, aiProvider === 'gemini' && styles.toggleBtnActive]}
                onPress={() => setAiProvider('gemini')}
              >
                <Text style={[styles.toggleBtnText, aiProvider === 'gemini' && styles.toggleBtnTextActive]}>Gemini</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, aiProvider === 'openai' && styles.toggleBtnActive]}
                onPress={() => setAiProvider('openai')}
              >
                <Text style={[styles.toggleBtnText, aiProvider === 'openai' && styles.toggleBtnTextActive]}>OpenAI</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.label, { marginBottom: 0 }]}>{t('vendor.apiKey', 'API Key')}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(aiProvider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://platform.openai.com/api-keys')}>
                <Text style={{ fontSize: 12, color: '#00b0ff', fontWeight: 'bold' }}>{t('vendor.getKey', 'Get Key')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ position: 'relative', justifyContent: 'center' }}>
              <TextInput 
                style={[styles.input, { paddingRight: 40 }]} 
                value={apiKey} 
                onChangeText={setApiKey} 
                placeholder={`Enter ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key`} 
                secureTextEntry={!showApiKey} 
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={{ position: 'absolute', right: 10, top: 12 }} 
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <FontAwesome name={showApiKey ? "eye-slash" : "eye"} size={20} color="#a0aec0" />
              </TouchableOpacity>
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15, padding: 10, backgroundColor: '#e6f6ff', borderRadius: 8}}>
              <FontAwesome name="info-circle" size={16} color="#00b0ff" style={{marginRight: 10, marginTop: 2}} />
              <Text style={{flex: 1, fontSize: 12, color: '#4a5568', lineHeight: 18}}>
                {t('vendor.apiKeyHelp', 'Help: To use AI Import, you need a free API key. Click "Get Key", sign in, generate a key, and paste it here. Your key is only used locally and never stored on our servers.')}
              </Text>
            </View>

            <Text style={styles.label}>{t('vendor.pasteWa', 'Paste WhatsApp Message')}</Text>
            <TextInput 
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]} 
              value={waText} 
              onChangeText={setWaText} 
              placeholder={t('vendor.pasteWaPlaceholder', 'Paste the raw broadcast message here...')} 
              multiline 
            />

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#8b5cf6' }, isParsing && styles.disabledButton]} 
              onPress={handleAiParse}
              disabled={isParsing}
            >
              {isParsing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <OllieLoading size={30} />
                  <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>{t('vendor.parsing', 'Parsing with AI...')}</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>{t('vendor.parseAndImport', 'Parse & Import')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderSupportFeedback()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    padding: 20,
    justifyContent: 'center',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  googleIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dashboardCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  emailText: {
    fontSize: 14,
    color: '#718096',
  },
  logoutSmall: {
    padding: 10,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 20,
    marginBottom: 30,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  limitText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00b0ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addNewBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  disabledBtn: {
    backgroundColor: '#cbd5e0',
  },
  label: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#a0aec0',
  },
  hintText: {
    fontSize: 12,
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2d3748',
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#00b0ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    height: 50,
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#e53e3e',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#a0aec0',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tripInfo: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tripSeats: {
    fontSize: 12,
    color: '#00b0ff',
    marginTop: 4,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 15,
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#00b0ff',
    backgroundColor: '#f0fbff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#00b0ff',
    marginTop: 4,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edf2f7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ed64a6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  donateButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  aiModalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  aiModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '70%',
  },
  providerToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#0f172a',
  },
  
  // Tab Styles
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#e0f7ff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#00b0ff', fontWeight: 'bold' },

  // Booking Card Styles
  bookingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  bookingIdText: { fontSize: 14, fontWeight: 'bold', color: '#475569', letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  bookingBody: { marginBottom: 16 },
  bookingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bookingData: { fontSize: 14, color: '#334155' },
  bookingActions: { flexDirection: 'row', gap: 10 },
  statusUpdateBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
});
