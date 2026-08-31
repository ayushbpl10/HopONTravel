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
  const { userProfile } = useAppContext();
  const [showUserModal, setShowUserModal] = useState(false);
  const router = useRouter();

  const handleUserOptionSelect = (option: 'traveller' | 'vendor') => {
    setShowUserModal(false);
    if (option === 'traveller') {
      router.push('/booking-status');
    } else {
      router.push('/vendor-dashboard');
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

      {/* User Type Selection Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUserModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Continue as</Text>
            <TouchableOpacity style={styles.userOption} onPress={() => handleUserOptionSelect('traveller')}>
              <FontAwesome name="suitcase" size={20} color="#00b0ff" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.userOptionTitle}>Traveller</Text>
                <Text style={styles.userOptionDesc}>Track bookings & join trips</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#a0aec0" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.userOption, { borderBottomWidth: 0 }]} onPress={() => handleUserOptionSelect('vendor')}>
              <FontAwesome name="briefcase" size={20} color="#00b0ff" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.userOptionTitle}>Vendor</Text>
                <Text style={styles.userOptionDesc}>Manage trips & bookings</Text>
              </View>
              <FontAwesome name="chevron-right" size={14} color="#a0aec0" />
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
                  style={{ marginRight: 20 }}
                  onPress={() => setShowLangModal(true)}
                >
                  <FontAwesome name="language" size={24} color="#00b0ff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ marginRight: 15 }}
                  onPress={() => setShowUserModal(true)}
                >
                  <FontAwesome name="user-circle" size={24} color="#00b0ff" />
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
  userOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  userOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  userOptionDesc: {
    fontSize: 12,
    color: '#718096',
  },
});
