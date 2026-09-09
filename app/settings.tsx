import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors } = useTheme();
  const { userProfile, logout } = useAppContext();
  const styles = getStyles(colors);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle', 'Log Out'),
      t('settings.logoutConfirm', 'Are you sure you want to log out of your account?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.logout', 'Log Out'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Logged Out', 'You have been logged out successfully.');
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('settings.title', 'Settings'), 
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account', 'Account & Profile')}</Text>
          {userProfile ? (
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <FontAwesome name="user" size={24} color={colors.card} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userProfile.name || 'Traveller'}</Text>
                  <Text style={styles.profileEmail}>{userProfile.email}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {userProfile.role === 'vendor' ? 'VENDOR' : 'TRAVELLER'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <FontAwesome name="sign-out" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={styles.logoutBtnText}>{t('settings.logout', 'Log Out')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileCard}>
              <Text style={styles.guestText}>You are currently browsing as a guest.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  style={[styles.loginOptionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/traveller-login')}
                >
                  <FontAwesome name="user" size={14} color={colors.card} style={{ marginRight: 6 }} />
                  <Text style={styles.loginOptionText}>Traveller Login</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.loginOptionBtn, { backgroundColor: '#475569' }]}
                  onPress={() => router.push('/vendor-login')}
                >
                  <FontAwesome name="briefcase" size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.loginOptionText}>Vendor Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance', 'Appearance')}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <FontAwesome name={isDark ? "moon-o" : "sun-o"} size={20} color={colors.primary} style={{ marginRight: 12, width: 24, textAlign: 'center' }} />
              <Text style={styles.settingLabel}>{t('settings.darkMode', 'Cinematic Dark Mode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e0', true: colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>App Name</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Ab Toh Ghoom Le</Text>
          </View>
          <View style={[styles.settingRow, { marginTop: 8 }]}>
            <Text style={styles.settingLabel}>Version</Text>
            <Text style={{ color: colors.textSecondary }}>1.1.0</Text>
          </View>
        </View>
      </View>
    </>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: 'rgba(0,176,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutBtnText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 15,
  },
  guestText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  loginOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginOptionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
