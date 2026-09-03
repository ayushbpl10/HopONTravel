import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { Logger } from '../utils/logger';

export default function VendorLoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { t } = useTranslation();
  const { loginWithGoogle, loginLoading } = useAppContext();
  const [localLoading, setLocalLoading] = useState(false);

  const handleLogin = async () => {
    setLocalLoading(true);
    try {
      await loginWithGoogle('vendor');
      router.replace('/vendor-dashboard');
    } catch (e: any) {
      Logger.error('Vendor login explicitly failed', e);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground 
        source={require('../assets/images/Media.jpg')} 
        style={styles.bgImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <FontAwesome name="briefcase" size={80} color="#3b82f6" />
          </View>
          
          <Text style={styles.title}>Vendor Portal</Text>
          <Text style={styles.subtitle}>
            Manage your trips, handle bookings, and grow your adventure business with HopON Travel!
          </Text>

          <TouchableOpacity 
            style={[styles.loginBtn, (loginLoading || localLoading) && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loginLoading || localLoading}
          >
            {loginLoading || localLoading ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <>
                <FontAwesome name="google" size={24} color={colors.card} style={{ marginRight: 12 }} />
                <Text style={styles.loginBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, resizeMode: 'cover' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  backBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    paddingBottom: 80,
  },
  iconContainer: {
    marginBottom: 30,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 50,
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6', // Distinct blue for vendor
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  loginBtnText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
