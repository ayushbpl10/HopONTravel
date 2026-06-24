import React, { useState } from 'react';
import { Stack, Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AppProvider } from '../context/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Optional: Suppress default error screen if needed in development
// import { ErrorUtils } from 'react-native';
import '../utils/backgroundLocation'; // Register background task
import { FontAwesome } from '@expo/vector-icons';
import { TouchableOpacity, Alert, Modal, View, Text, StyleSheet } from 'react-native';
import '../config/i18n';
import { changeLanguage } from '../config/i18n';

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
              title: 'HopONTravel',
              headerLeft: undefined, // Removed from left
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={{ marginRight: 20 }}
                    onPress={() => setShowLangModal(true)}
                  >
                    <FontAwesome name="language" size={24} color="#00b0ff" />
                  </TouchableOpacity>
                  <Link href={"/vendor-dashboard" as any} asChild>
                    <TouchableOpacity style={{ marginRight: 15 }}>
                      <FontAwesome name="user-circle" size={24} color="#00b0ff" />
                    </TouchableOpacity>
                  </Link>
                </View>
              )
            }} 
          />
          <Stack.Screen name="trip/[id]" options={{ title: 'Trip Details', headerBackTitle: 'Back' }} />
          <Stack.Screen name="vendor-dashboard" options={{ title: 'Vendor Portal', presentation: 'modal' }} />
          <Stack.Screen name="vendor-live/[id]" options={{ title: 'Live Tracking' }} />
          <Stack.Screen name="booking-confirmation" options={{ title: 'Booking Confirmation' }} />
        </Stack>
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
    borderRadius: 12,
    width: 250,
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
  }
});
