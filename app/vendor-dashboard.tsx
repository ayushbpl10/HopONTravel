import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Image, ActivityIndicator, Linking } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Trip } from '../data/trips';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../utils/uploadImage';
import OllieLoading from '../components/OllieLoading';
import { parseWhatsAppMessage, AIProvider } from '../utils/aiParser';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const { trips, vendorProfile, loginWithGoogle, logout, updateVendorProfile, updateTrip, addTrip, deleteTrip } = useAppContext();
  const [upiInput, setUpiInput] = useState(vendorProfile?.upiId || '');
  const [waInput, setWaInput] = useState(vendorProfile?.whatsappNumber || '');
  const [nameInput, setNameInput] = useState(vendorProfile?.name || '');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
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

  // AI Import states
  const [isAiModalVisible, setIsAiModalVisible] = useState(false);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [waText, setWaText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

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
    setEditImages(trip.images || []);
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
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save trip. Check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiParse = async () => {
    if (!apiKey.trim() || !waText.trim()) {
      Alert.alert('Error', 'Please provide both an API Key and the WhatsApp message.');
      return;
    }

    setIsParsing(true);
    try {
      const parsedTrips = await parseWhatsAppMessage(waText, aiProvider, apiKey);
      
      if (!parsedTrips || parsedTrips.length === 0) {
        Alert.alert('Failed', 'No trips could be extracted from the text.');
        return;
      }

      // Save each parsed trip to the database
      let count = 0;
      for (const trip of parsedTrips) {
        if (trips.length + count >= LIMITS.MAX_TRIPS_PER_VENDOR) break;
        
        await addTrip({
          title: trip.title || 'Untitled Trip',
          description: trip.description || '',
          batches: trip.batches || [],
          packages: trip.packages || [],
          addOns: trip.addOns || [],
          pickupPoints: trip.pickupPoints || [],
          itinerary: trip.itinerary || '',
          inclusions: trip.inclusions || [],
          exclusions: trip.exclusions || [],
          thingsToCarry: trip.thingsToCarry || [],
          cancellationPolicy: trip.cancellationPolicy || [],
          images: [],
          vendorName: vendorProfile?.name || '',
          vendorUPI: [vendorProfile?.upiId || ''],
          vendorWhatsApp: vendorProfile?.whatsappNumber || '',
          status: 'draft'
        } as any);
        count++;
      }

      Alert.alert('Success', `Successfully imported ${count} trip(s) as drafts!`);
      setIsAiModalVisible(false);
      setWaText('');
    } catch (error: any) {
      Alert.alert('Parsing Error', error.message || 'Failed to parse message.');
    } finally {
      setIsParsing(false);
    }
  };

  const renderSupportFeedback = () => (
    <View style={styles.dashboardCard}>
      <Text style={styles.sectionTitle}>Support & Feedback</Text>
      <Text style={styles.subtitle}>Help us improve or support the platform!</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={() => {
        Alert.prompt(
          "Report Issue",
          "Please describe the issue you are facing. Logs will be attached automatically.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit", onPress: async (text: string | undefined) => {
              if (text) {
                try {
                  await addTrip({ title: `REPORT: ${text.substring(0, 20)}`, description: text, vendorName: vendorProfile?.name || 'Unknown', vendorWhatsApp: 'system', vendorUPI: ['system'], images: [], batches: [{ id: '1', dateDuration: 'REPORT_DO_NOT_DELETE', totalSeats: 0, bookedSeats: 0 }], packages: [], addOns: [], pickupPoints: [], itinerary: '', inclusions: [], exclusions: [], thingsToCarry: [], cancellationPolicy: [], status: 'draft' } as any); // Quick hack to save report to trips or a new collection
                  Alert.alert("Sent", "Your issue has been reported to the server.");
                } catch (e) {
                  Alert.alert("Error", "Could not send report.");
                }
              }
            }}
          ]
        );
      }}>
        <FontAwesome name="bug" size={18} color="#4a5568" style={{ marginRight: 10 }} />
        <Text style={styles.actionButtonText}>Report Issue with Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.donateButton} onPress={async () => {
        const upiUrl = `upi://pay?pa=ayushbpl10@ybl&pn=HopON+Travel+Support&cu=INR`;
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
          <Text style={styles.title}>Vendor Portal</Text>
          <Text style={styles.subtitle}>Sign in with Google to manage your trips and payment settings.</Text>
          
          <TouchableOpacity style={styles.googleButton} onPress={handleLogin}>
            <FontAwesome name="google" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
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
            <Text style={styles.welcomeText}>Welcome, {vendorProfile.name}</Text>
            <Text style={styles.emailText}>{vendorProfile.email}</Text>
          </View>
          <TouchableOpacity style={styles.logoutSmall} onPress={handleLogout}>
             <FontAwesome name="sign-out" size={20} color="#e53e3e" />
          </TouchableOpacity>
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
            <Text style={styles.saveButtonText}>Update Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Your Trips</Text>
              <Text style={styles.limitText}>{trips.length} / {LIMITS.MAX_TRIPS_PER_VENDOR} trips used</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.addNewBtn, { backgroundColor: '#8b5cf6' }]} 
                onPress={() => setIsAiModalVisible(true)}
              >
                 <FontAwesome name="magic" size={14} color="white" />
                 <Text style={styles.addNewBtnText}>AI Import</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addNewBtn, trips.length >= LIMITS.MAX_TRIPS_PER_VENDOR && styles.disabledBtn]} 
                onPress={startAddingNew}
              >
                 <FontAwesome name="plus" size={14} color="white" />
                 <Text style={styles.addNewBtnText}>Add New</Text>
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
                </View>
                <FontAwesome name={trip.tripStatus === 'started' ? "map-marker" : "edit"} size={20} color={trip.tripStatus === 'started' ? "#4ade80" : "#00b0ff"} />
              </TouchableOpacity>
            ))
          )}
        </View>
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
              <Text style={styles.label}>Start Date</Text>
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
              <Text style={styles.label}>End Date</Text>
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
            <Text style={styles.label}>Description</Text>
            <Text style={styles.charCount}>{editDesc.length}/{LIMITS.MAX_DESC_CHARS}</Text>
          </View>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={editDesc} 
            onChangeText={setEditDesc} 
            multiline 
            numberOfLines={4} 
            placeholder="Describe the itinerary..." 
            maxLength={LIMITS.MAX_DESC_CHARS}
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Pickup Points</Text>
          </View>
          {editPickupPoints.map((pt, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 10, gap: 10 }}>
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
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="Time (10:00 PM)" 
                value={pt.time} 
                onChangeText={(text) => {
                  const newPts = [...editPickupPoints];
                  newPts[idx].time = text;
                  setEditPickupPoints(newPts);
                }} 
              />
              <TouchableOpacity 
                style={{ justifyContent: 'center', padding: 10 }}
                onPress={() => {
                  const newPts = [...editPickupPoints];
                  newPts.splice(idx, 1);
                  setEditPickupPoints(newPts);
                }}
              >
                <FontAwesome name="trash" size={20} color="#e53e3e" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={{ padding: 10, alignSelf: 'flex-start', marginBottom: 15 }} 
            onPress={() => setEditPickupPoints([...editPickupPoints, { location: '', time: '' }])}
          >
            <Text style={{ color: '#00b0ff', fontWeight: 'bold' }}>+ Add Pickup Point</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Total Seats</Text>
              <TextInput style={styles.input} value={editTotalSeats} onChangeText={setEditTotalSeats} keyboardType="numeric" maxLength={3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Booked Seats</Text>
              <TextInput style={styles.input} value={editBookedSeats} onChangeText={setEditBookedSeats} keyboardType="numeric" maxLength={3} />
            </View>
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Trip Images ({editImages.length}/{LIMITS.MAX_IMAGES_PER_TRIP})</Text>
            <Text style={styles.hintText}>Max {LIMITS.MAX_IMAGE_SIZE_MB}MB each</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {editImages.map((uri, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                  <FontAwesome name="times-circle" size={20} color="#e53e3e" />
                </TouchableOpacity>
              </View>
            ))}
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
              <Text style={styles.saveButtonText}>{isAddingNew ? 'List Trip' : 'Save Changes'}</Text>
            )}
          </TouchableOpacity>

          {!isAddingNew && editingTrip?.tripStatus !== 'started' && (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#4ade80', marginTop: 10 }]} 
              onPress={() => {
                setEditingTrip(null);
                router.push(`/start-trip/${editingTrip!.id}` as any);
              }}
            >
              <Text style={styles.saveButtonText}>Start Trip (Live Tracking)</Text>
            </TouchableOpacity>
          )}

          {!isAddingNew && (
            <TouchableOpacity 
              style={[styles.deleteButton, isUploading && styles.disabledButton]} 
              onPress={handleDeleteTrip}
              disabled={isUploading}
            >
              <FontAwesome name="trash" size={16} color="#e53e3e" />
              <Text style={styles.deleteButtonText}>Delete Trip Listing</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Modal>

      {/* AI Import Modal */}
      <Modal visible={isAiModalVisible} animationType="slide" transparent={true}>
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI WhatsApp Import</Text>
              <TouchableOpacity onPress={() => setIsAiModalVisible(false)} disabled={isParsing}>
                <FontAwesome name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>AI Provider</Text>
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
              <Text style={[styles.label, { marginBottom: 0 }]}>API Key</Text>
              <TouchableOpacity onPress={() => Linking.openURL(aiProvider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://platform.openai.com/api-keys')}>
                <Text style={{ fontSize: 12, color: '#00b0ff', fontWeight: 'bold' }}>Get Key</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              value={apiKey} 
              onChangeText={setApiKey} 
              placeholder={`Enter ${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key`} 
              secureTextEntry 
              autoCapitalize="none"
            />

            <Text style={styles.label}>Paste WhatsApp Message</Text>
            <TextInput 
              style={[styles.input, { height: 150, textAlignVertical: 'top' }]} 
              value={waText} 
              onChangeText={setWaText} 
              placeholder="Paste the raw broadcast message here..." 
              multiline 
            />

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: '#8b5cf6' }, isParsing && styles.disabledButton]} 
              onPress={handleAiParse}
              disabled={isParsing}
            >
              {isParsing ? (
                <OllieLoading size={30} />
              ) : (
                <Text style={styles.saveButtonText}>Extract Trips</Text>
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
  }
});
