import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Booking } from '../data/trips';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

export default function BookingStatusScreen() {
  const { userProfile, loginWithGoogle, logout } = useAppContext();
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loadingUserBookings, setLoadingUserBookings] = useState(false);
  
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUserBookings = async () => {
      if (userProfile?.role === 'traveller' && userProfile.email) {
        setLoadingUserBookings(true);
        try {
          const q = query(collection(db, 'bookings'), where('travelerEmail', '==', userProfile.email));
          const snap = await getDocs(q);
          const data: Booking[] = [];
          snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
          data.sort((a, b) => b.createdAt - a.createdAt);
          setUserBookings(data);
        } catch (e) {
          console.error("Error fetching user bookings", e);
        } finally {
          setLoadingUserBookings(false);
        }
      }
    };
    fetchUserBookings();
  }, [userProfile]);

  const handleSearch = async () => {
    if (!searchId.trim()) {
      setErrorMsg('Please enter a valid Booking ID.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setBooking(null);

    try {
      const q = query(collection(db, 'bookings'), where('bookingId', '==', searchId.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        // Fallback: Check if they entered the document ID instead of the custom bookingId
        const q2 = query(collection(db, 'bookings'));
        const allSnap = await getDocs(q2);
        const found = allSnap.docs.find(d => d.id === searchId.trim() || d.data().bookingId === searchId.trim());
        
        if (found) {
          setBooking({ id: found.id, ...found.data() } as Booking);
        } else {
          setErrorMsg('Booking not found. Please check your Booking ID.');
        }
      } else {
        setBooking({ id: snap.docs[0].id, ...snap.docs[0].data() } as Booking);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error fetching booking. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const renderTicket = (b: Booking) => (
    <View style={styles.ticket} key={b.id}>
      <View style={[styles.ticketHeader, b.status === 'pending' && { backgroundColor: '#f59e0b' }, b.status === 'failed' && { backgroundColor: '#ef4444' }, b.status === 'cancelled' && { backgroundColor: '#64748b' }]}>
        <Text style={styles.ticketHeaderText}>BOOKING DETAILS</Text>
        <View style={styles.confirmedBadge}>
          <FontAwesome 
            name={b.status === 'confirmed' ? "check-circle" : b.status === 'pending' ? "clock-o" : "times-circle"} 
            size={14} 
            color={b.status === 'confirmed' ? "#22c55e" : b.status === 'pending' ? "#f59e0b" : "#dc2626"} 
          />
          <Text style={[styles.confirmedBadgeText, b.status === 'pending' && { color: '#f59e0b' }, (b.status === 'failed' || b.status === 'cancelled') && { color: '#dc2626' }]}>
            {b.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.dashedDivider} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Traveler Name</Text>
        <Text style={styles.rowValue}>{b.travelerName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Package</Text>
        <Text style={styles.rowValue}>{b.packageName}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Seats</Text>
        <Text style={styles.rowValue}>{b.seats || 1}</Text>
      </View>

      <View style={styles.dashedDivider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total Amount</Text>
        <Text style={styles.totalValue}>₹{b.totalPrice}</Text>
      </View>

      <View style={styles.ticketNotch}>
        <View style={styles.notchLeft} />
        <View style={styles.notchLine} />
        <View style={styles.notchRight} />
      </View>

      <View style={styles.bookingIdRow}>
        <Text style={styles.bookingIdLabel}>Booking ID</Text>
        <Text style={styles.bookingId}>{b.bookingId || b.id}</Text>
      </View>
      
      {b.status === 'pending' && (
        <View style={[styles.infoBox, { backgroundColor: '#fef3c7' }]}>
          <FontAwesome name="info-circle" size={16} color="#d97706" />
          <Text style={[styles.infoText, { color: '#b45309' }]}>
            Your payment is pending manual verification. If you haven&apos;t paid yet, please contact the vendor.
          </Text>
        </View>
      )}
      
      {b.status === 'confirmed' && (
        <View style={[styles.infoBox, { backgroundColor: '#dcfce7' }]}>
          <FontAwesome name="check-circle" size={16} color="#16a34a" />
          <Text style={[styles.infoText, { color: '#15803d' }]}>
            Booking Confirmed! Show this ID to your captain on departure day.
          </Text>
        </View>
      )}

      {b.status === 'failed' && (
        <View style={[styles.infoBox, { backgroundColor: '#fee2e2' }]}>
          <FontAwesome name="times-circle" size={16} color="#dc2626" />
          <Text style={[styles.infoText, { color: '#b91c1c' }]}>
            Payment verification failed. Please contact support.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Booking Status', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Search Section */}
        <View style={styles.searchCard}>
          <FontAwesome name="search" size={30} color="#00b0ff" style={{ marginBottom: 15 }} />
          <Text style={styles.title}>Check Booking Status</Text>
          <Text style={styles.subtitle}>Enter your unique Booking ID to check your confirmation status and ticket details.</Text>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. ATGL-XXXXX"
              value={searchId}
              onChangeText={setSearchId}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.searchBtn, loading && { opacity: 0.7 }]} 
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchBtnText}>Track</Text>}
            </TouchableOpacity>
          </View>
          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        </View>

        {/* Result Section */}
        {booking && renderTicket(booking)}

        <View style={styles.divider} />

        {/* SSO Login Section */}
        {!userProfile && (
          <View style={styles.ssoCard}>
            <FontAwesome name="user-circle" size={30} color="#4a5568" style={{ marginBottom: 10 }} />
            <Text style={styles.title}>Track All Your Trips</Text>
            <Text style={styles.subtitle}>Log in with your email to automatically track all your past and upcoming bookings.</Text>
            <TouchableOpacity style={styles.googleButton} onPress={() => loginWithGoogle('traveller')}>
              <FontAwesome name="google" size={20} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>
          </View>
        )}

        {userProfile && userProfile.role === 'vendor' && (
          <View style={styles.ssoCard}>
            <Text style={styles.title}>Vendor Account</Text>
            <Text style={styles.subtitle}>You are logged in as a Vendor. To see trips booked for you, go to the Vendor Portal.</Text>
          </View>
        )}

        {userProfile && userProfile.role === 'traveller' && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' }}>My Bookings</Text>
              <TouchableOpacity onPress={logout}>
                <Text style={{ color: '#00b0ff', fontWeight: '600' }}>Logout</Text>
              </TouchableOpacity>
            </View>
            
            {loadingUserBookings ? (
              <ActivityIndicator size="large" color="#00b0ff" style={{ marginTop: 20 }} />
            ) : userBookings.length > 0 ? (
              userBookings.map(b => renderTicket(b))
            ) : (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#718096' }}>No bookings found for {userProfile.email}.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 20 },
  searchCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 20 },
  ssoCard: { backgroundColor: '#f8f9fa', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  inputWrapper: { flexDirection: 'row', width: '100%', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#cbd5e0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8f9fa' },
  searchBtn: { backgroundColor: '#00b0ff', paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: '#e53e3e', marginTop: 10, fontSize: 14, alignSelf: 'flex-start' },
  googleButton: { backgroundColor: '#DB4437', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%' },
  googleButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#cbd5e0', marginVertical: 20 },

  // Ticket styles
  ticket: { width: '100%', backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8, overflow: 'hidden', marginBottom: 20 },
  ticketHeader: { backgroundColor: '#00b0ff', paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketHeaderText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  confirmedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  confirmedBadgeText: { color: '#22c55e', fontWeight: '800', fontSize: 11 },
  dashedDivider: { height: 1, marginHorizontal: 20, marginVertical: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', borderStyle: 'dashed' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  rowLabel: { fontSize: 14, color: '#718096', fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 2, textAlign: 'right' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#00b0ff' },
  ticketNotch: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 0 },
  notchLeft: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f0f4f8', marginLeft: -10 },
  notchLine: { flex: 1, height: 1, borderTopWidth: 2, borderTopColor: '#e2e8f0', borderStyle: 'dashed' },
  notchRight: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f0f4f8', marginRight: -10 },
  bookingIdRow: { alignItems: 'center', paddingBottom: 20 },
  bookingIdLabel: { fontSize: 11, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bookingId: { fontSize: 16, fontWeight: '800', color: '#4a5568', letterSpacing: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
