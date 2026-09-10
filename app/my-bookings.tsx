import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../config/firebase';
import { useAppContext } from '../context/AppContext';
import { Booking } from '../data/trips';

export default function MyBookingsScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { userProfile, logout } = useAppContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
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

  useEffect(() => {
    const fetchBookings = async () => {
      if (!userProfile?.id) {
        setLoading(false);
        return;
      }
      try {
        const cached = await AsyncStorage.getItem('cached_bookings');
        if (cached) {
          setBookings(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) {}

      try {
        const q = query(collection(db, 'bookings'), where('travelerEmail', '==', userProfile.email));
        const snap = await getDocs(q);
        const data: Booking[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
        // Sort by newest first
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setBookings(data);
        AsyncStorage.setItem('cached_bookings', JSON.stringify(data)).catch(() => {});
      } catch (error: any) {
        if (error?.code !== 'permission-denied') {
          console.error("Error fetching bookings", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [userProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.center}>
        <FontAwesome name="lock" size={50} color={colors.border} style={{ marginBottom: 20 }} />
        <Text style={styles.emptyTitle}>{t('bookings.pleaseLogin', 'Please log in to view your bookings.')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/traveller-login')}>
          <Text style={styles.loginBtnText}>Traveller Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('bookings.myBookings', 'My Bookings'), 
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 8, padding: 6 }}>
              <FontAwesome name="sign-out" size={20} color="#ef4444" />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        {/* Traveller Profile Banner */}
        <View style={styles.profileBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.avatarSmall}>
              <FontAwesome name="user" size={18} color={colors.card} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{userProfile.name || 'Traveller'}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{userProfile.email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bannerLogoutBtn} onPress={handleLogout}>
            <FontAwesome name="sign-out" size={14} color="#dc2626" style={{ marginRight: 5 }} />
            <Text style={styles.bannerLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push({ pathname: '/booking-status' as any, params: { bookingId: item.bookingId || item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`View booking for ${item.packageName}`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.statusBadge}>{item.status.toUpperCase()}</Text>
                <Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle}>{item.travelerName}&apos;s Trip</Text>
                  <Text style={styles.details}>{t('bookings.package', 'Package')}: {item.packageName}</Text>
                  <Text style={styles.details}>{t('bookings.totalPaid', 'Total Paid')}: ₹{item.totalPrice}</Text>
                  {item.bookingId ? (
                    <Text style={[styles.details, { fontSize: 12, color: colors.primary, fontWeight: '600' }]}>
                      ID: {item.bookingId}
                    </Text>
                  ) : null}
                </View>
                <FontAwesome name="chevron-right" size={16} color={colors.textSecondary} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="ticket" size={50} color={colors.border} style={{ marginBottom: 20 }} />
              <Text style={styles.emptyTitle}>{t('bookings.noBookings', 'No bookings yet.')}</Text>
              <Text style={styles.emptySubtitle}>{t('bookings.emptySubtitle', 'When you book a trip, it will appear here.')}</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bannerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bannerLogoutText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  listContainer: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: colors.success, color: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: colors.textSecondary },
  tripTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  details: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textSecondary, marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  loginBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  loginBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 }
});
