import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppProvider, useAppContext } from '../context/AppContext';
import { ThemeProvider, useTheme, ThemeColors } from '../context/ThemeContext';
import { Logger } from '../utils/logger';

import { FontAwesome } from '@expo/vector-icons';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { changeLanguage } from '../config/i18n';
import '../utils/backgroundLocation';
import { OfflineIndicator } from '../components/OfflineIndicator';

function RootLayoutNav({ showLangModal, setShowLangModal, handleLangChange }: any) {
  const { userProfile, loginWithGoogle } = useAppContext();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const styles = getStyles(colors);

  const handleProfilePress = () => {
    if (userProfile?.role === 'traveller') {
      router.push('/my-bookings');
    } else if (userProfile?.role === 'vendor') {
      router.push('/vendor-dashboard');
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      
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
            <Text style={styles.modalTitle}>Welcome to Ab Toh Ghoom Le</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.textSecondary }}>Please select how you want to continue.</Text>

            <TouchableOpacity 
              style={[styles.loginRoleBtn, { backgroundColor: colors.primary }]} 
              onPress={() => {
                setShowLoginModal(false);
                router.push('/traveller-login');
              }}
            >
              <FontAwesome name="user" size={20} color={isDark ? "#000" : "#fff"} style={{ marginRight: 10 }} />
              <Text style={[styles.loginRoleBtnText, { color: isDark ? "#000" : "#fff" }]}>Continue as Traveller</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginRoleBtn, { backgroundColor: isDark ? '#333' : '#4a5568', marginTop: 15 }]} 
              onPress={() => {
                setShowLoginModal(false);
                router.push('/vendor-login');
              }}
            >
              <FontAwesome name="briefcase" size={20} color="white" style={{ marginRight: 10 }} />
              <Text style={[styles.loginRoleBtnText, { color: '#fff' }]}>Continue as Vendor</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { fontWeight: 'bold' },
          headerTintColor: colors.textPrimary,
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Ab Toh Ghoom Le',
            headerLeft: undefined,
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={{ marginRight: 15 }} onPress={() => router.push('/settings')}>
                  <FontAwesome name="cog" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ marginRight: 15 }}
                  onPress={() => setShowLangModal(true)}
                >
                  <FontAwesome name="language" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={{ marginRight: 10 }} onPress={handleProfilePress}>
                  <FontAwesome name="user-circle-o" size={24} color={colors.primary} />
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
        <Stack.Screen name="wishlist" options={{ title: 'Wishlist' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [showLangModal, setShowLangModal] = useState(false);

  // Global crash protection: log unhandled errors to Firestore
  useEffect(() => {
    const defaultHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      Logger.error(`Global${isFatal ? ' FATAL' : ''} error`, error);
      if (defaultHandler) defaultHandler(error, isFatal);
    });
    return () => {
      if (defaultHandler) ErrorUtils.setGlobalHandler(defaultHandler);
    };
  }, []);

  const handleLangChange = (code: string) => {
    changeLanguage(code);
    setShowLangModal(false);
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <OfflineIndicator />
          <RootLayoutNav showLangModal={showLangModal} setShowLangModal={setShowLangModal} handleLangChange={handleLangChange} />
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    width: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.textPrimary
  },
  langOption: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center'
  },
  langText: {
    fontSize: 16,
    color: colors.primary,
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
    fontSize: 16,
    fontWeight: 'bold'
  }
});
