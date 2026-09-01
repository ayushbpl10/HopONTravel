import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import 'react-native-reanimated';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppProvider, useAppContext } from '../context/AppContext';

// Optional: Suppress default error screen if needed in development
// import { ErrorUtils } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { changeLanguage } from '../config/i18n';
import '../utils/backgroundLocation'; // Register background task

function RootLayoutNav({ showLangModal, setShowLangModal, handleLangChange }: any) {
  const { userProfile, loginWithGoogle } = useAppContext();
  const router = useRouter();
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleTravellerPress = () => {
    if (userProfile?.role === 'traveller') {
      router.push('/my-bookings');
    } else if (userProfile?.role === 'vendor') {
      Alert.alert('Notice', 'You are logged in as a Vendor. Please logout first to switch roles.');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleVendorPress = () => {
    if (userProfile?.role === 'vendor') {
      router.push('/vendor-dashboard');
    } else if (userProfile?.role === 'traveller') {
      Alert.alert('Notice', 'You are logged in as a Traveller. Please logout first to switch roles.');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      {/* Language Selection Modal */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangChange('en')}>
              <Text style={styles.langText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangChange('hi')}>
              <Text style={styles.langText}>हिंदी (Hindi)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangChange('mr')}>
              <Text style={styles.langText}>मराठी (Marathi)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangChange('kn')}>
              <Text style={styles.langText}>ಕನ್ನಡ (Kannada)</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showLoginModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLoginModal(false)}>
          <View style={[styles.modalContent, { width: 300, padding: 25 }]}>
            <Text style={styles.modalTitle}>Welcome to HopON</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>Please select how you want to continue.</Text>

            <TouchableOpacity 
              style={[styles.loginRoleBtn, { backgroundColor: '#00b0ff' }]} 
              onPress={async () => {
                setShowLoginModal(false);
                await loginWithGoogle('traveller');
              }}
            >
              <FontAwesome name="user" size={20} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.loginRoleBtnText}>Continue as Traveller</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginRoleBtn, { backgroundColor: '#4a5568', marginTop: 15 }]} 
              onPress={async () => {
                setShowLoginModal(false);
                await loginWithGoogle('vendor');
                router.push('/vendor-dashboard');
              }}
            >
              <FontAwesome name="briefcase" size={20} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.loginRoleBtnText}>Continue as Vendor</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: 'bold' },
          headerTintColor: '#333',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Ab Toh Ghoom Le',
            headerLeft: undefined,
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  style={{ marginRight: 15 }}
                  onPress={() => setShowLangModal(true)}
                >
                  <FontAwesome name="language" size={24} color="#00b0ff" />
                </TouchableOpacity>
                {/* Traveller Icon */}
                <TouchableOpacity style={{ marginRight: 15 }} onPress={handleTravellerPress}>
                  <FontAwesome name="user" size={24} color="#00b0ff" />
                </TouchableOpacity>

                {/* Vendor Icon */}
                <TouchableOpacity style={{ marginRight: 10 }} onPress={handleVendorPress}>
                  <FontAwesome name="briefcase" size={24} color="#00b0ff" />
                </TouchableOpacity>
              </View>
            )
          }} 
        />
        <Stack.Screen name="trip/[id]" options={{ title: 'Trip Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="checkout/[id]" options={{ title: 'Checkout', headerBackTitle: 'Back' }} />
        <Stack.Screen name="vendor-dashboard" options={{ title: 'Vendor Portal', presentation: 'modal' }} />
        <Stack.Screen name="vendor-live/[id]" options={{ title: 'Live Tracking' }} />
        <Stack.Screen name="start-trip/[id]" options={{ title: 'Start Trip' }} />
        <Stack.Screen name="booking-confirmation" options={{ title: 'Booking Confirmation' }} />
        <Stack.Screen name="booking-status" options={{ title: 'Booking Status' }} />
        <Stack.Screen name="my-bookings" options={{ title: 'My Bookings' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [showLangModal, setShowLangModal] = useState(false);

  const handleLangChange = (code: string) => {
    changeLanguage(code);
    setShowLangModal(false);
  };

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="auto" />
        <OfflineIndicator />
        <RootLayoutNav showLangModal={showLangModal} setShowLangModal={setShowLangModal} handleLangChange={handleLangChange} />
      </AppProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: 300,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  langOption: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    alignItems: 'center'
  },
  langText: {
    fontSize: 16,
    color: '#00b0ff',
    fontWeight: '500'
  },
  loginRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
  },
  loginRoleBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
