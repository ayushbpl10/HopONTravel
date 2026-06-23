import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../context/AppContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Booking } from '../data/trips';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';

const StarRating = ({ tripId, guestName, onSubmit }: { tripId: string, guestName: string, onSubmit: (stars: number) => void }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation();

  if (submitted) return <Text style={{ color: '#22c55e', fontSize: 12, marginTop: 8 }}>{t('bookings.thankYouReview', '✓ Thank you for your review!')}</Text>;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      <Text style={{ fontSize: 12, color: '#718096', marginRight: 10 }}>{t('bookings.rateTrip', 'Rate this trip:')}</Text>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity 
          key={star} 
          onPress={() => {
            setRating(star);
            setSubmitted(true);
            onSubmit(star);
          }}
          style={{ paddingHorizontal: 2 }}
        >
          <FontAwesome name={star <= rating ? "star" : "star-o"} size={20} color="#f59e0b" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function MyBookingsScreen() {
  const { vendorProfile, submitRating } = useAppContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchBookings = async () => {
      if (!vendorProfile?.id) {
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
        const q = query(collection(db, 'bookings'), where('userId', '==', vendorProfile.id));
        const snap = await getDocs(q);
        const data: Booking[] = [];
        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
        // Sort by newest first
        data.sort((a, b) => b.createdAt - a.createdAt);
        setBookings(data);
        AsyncStorage.setItem('cached_bookings', JSON.stringify(data)).catch(() => {});
      } catch (error) {
        console.error("Error fetching bookings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [vendorProfile]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00b0ff" />
      </View>
    );
  }

  if (!vendorProfile) {
    return (
      <View style={styles.center}>
        <FontAwesome name="lock" size={50} color="#cbd5e0" style={{ marginBottom: 20 }} />
        <Text style={styles.emptyTitle}>{t('bookings.pleaseLogin', 'Please log in to view your bookings.')}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/vendor-dashboard' as any)}>
          <Text style={styles.loginBtnText}>{t('bookings.goToProfile', 'Go to Profile & Login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('bookings.myBookings', 'My Bookings'), headerBackTitle: 'Back' }} />
      <View style={styles.container}>
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.statusBadge}>{item.status.toUpperCase()}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.tripTitle}>{item.travelerName}'s Trip</Text>
              <Text style={styles.details}>{t('bookings.package', 'Package')}: {item.packageName}</Text>
              <Text style={styles.details}>{t('bookings.totalPaid', 'Total Paid')}: ₹{item.totalPrice}</Text>
              
              <StarRating 
                tripId={item.tripId} 
                guestName={item.travelerName} 
                onSubmit={(stars) => {
                  submitRating(item.tripId, { guestName: item.travelerName, stars, createdAt: Date.now() });
                }} 
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="ticket" size={50} color="#e2e8f0" style={{ marginBottom: 20 }} />
              <Text style={styles.emptyTitle}>{t('bookings.noBookings', 'No bookings yet.')}</Text>
              <Text style={styles.emptySubtitle}>{t('bookings.emptySubtitle', 'When you book a trip, it will appear here.')}</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  listContainer: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { backgroundColor: '#dcfce7', color: '#166534', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: '#a0aec0' },
  tripTitle: { fontSize: 18, fontWeight: '700', color: '#2d3748', marginBottom: 8 },
  details: { fontSize: 14, color: '#718096', marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#4a5568', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: '#8a94a6', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
  loginBtn: { marginTop: 20, backgroundColor: '#00b0ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
