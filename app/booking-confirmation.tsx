import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function BookingConfirmationScreen() {
  const params = useLocalSearchParams();
  const { tripTitle, tripDate, seats, totalPrice, bookingId, packageName, paymentStatus } = params;
  const { t } = useTranslation();

  useEffect(() => {
    // Success haptic on arrival
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎉 I just booked "${tripTitle}" on HopON Travel!\nDate: ${tripDate}\nSeats: ${seats}\nBooking ID: ${bookingId}`,
      });
    } catch (e) {}
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Success Icon */}
        <View style={styles.successCircle}>
          <View style={styles.successInner}>
            <FontAwesome name="check" size={50} color="#fff" />
          </View>
        </View>

        <Text style={styles.heading}>{t('booking.confirmed', 'Booking Confirmed!')}</Text>
        <Text style={styles.subheading}>{t('booking.subtitle', 'Your adventure is locked in. Get ready!')}</Text>

        {/* Ticket Card */}
        <View style={styles.ticket}>
          {/* Ticket Header */}
          <View style={[styles.ticketHeader, paymentStatus === 'pending' && { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.ticketHeaderText}>{t('booking.receipt', 'BOOKING RECEIPT')}</Text>
            <View style={styles.confirmedBadge}>
              <FontAwesome name={paymentStatus === 'pending' ? "clock-o" : "check-circle"} size={14} color={paymentStatus === 'pending' ? "#f59e0b" : "#22c55e"} />
              <Text style={[styles.confirmedBadgeText, paymentStatus === 'pending' && { color: '#f59e0b' }]}>
                {paymentStatus === 'pending' ? t('booking.pending', 'PENDING') : t('booking.confirmedStatus', 'CONFIRMED')}
              </Text>
            </View>
          </View>

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Trip Info */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('booking.trip', 'Trip')}</Text>
            <Text style={styles.rowValue} numberOfLines={2}>{tripTitle}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('booking.date', 'Date')}</Text>
            <Text style={styles.rowValue}>{tripDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('bookings.package', 'Package')}</Text>
            <Text style={styles.rowValue}>{packageName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('tripDetails.seats', 'Seats')}</Text>
            <Text style={styles.rowValue}>{seats}</Text>
          </View>

          {/* Dashed Divider */}
          <View style={styles.dashedDivider} />

          {/* Total */}
          <View style={[styles.row, { marginBottom: 0 }]}>
            <Text style={styles.totalLabel}>{paymentStatus === 'pending' ? t('bookings.totalAmount', 'Total Amount') : t('bookings.totalPaid', 'Total Paid')}</Text>
            <Text style={styles.totalValue}>₹{totalPrice}</Text>
          </View>

          {/* Ticket Footer Notch */}
          <View style={styles.ticketNotch}>
            <View style={styles.notchLeft} />
            <View style={styles.notchLine} />
            <View style={styles.notchRight} />
          </View>

          {/* Booking ID */}
          <View style={styles.bookingIdRow}>
            <Text style={styles.bookingIdLabel}>{t('booking.id', 'Booking ID')}</Text>
            <Text style={styles.bookingId}>{bookingId}</Text>
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoBox, paymentStatus === 'pending' && { backgroundColor: '#fef3c7' }]}>
          <FontAwesome name="info-circle" size={16} color={paymentStatus === 'pending' ? "#d97706" : "#00b0ff"} />
          <Text style={[styles.infoText, paymentStatus === 'pending' && { color: '#b45309' }]}>
            {paymentStatus === 'pending' 
              ? t('booking.pendingNote', 'Your payment is pending manual verification by the vendor.')
              : t('booking.confirmedNote', 'Show this booking ID to your trip captain on departure day.')}
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <FontAwesome name="share-alt" size={18} color="#fff" />
          <Text style={styles.shareBtnText}>{t('booking.share', 'Share Trip')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/' as any)}
        >
          <Text style={styles.homeBtnText}>{t('booking.home', 'Back to Home')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { alignItems: 'center', padding: 24, paddingTop: 60, paddingBottom: 60 },

  successCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(34,197,94,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#22c55e',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  subheading: { fontSize: 16, color: '#718096', textAlign: 'center', marginBottom: 32 },

  ticket: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8, marginBottom: 20,
    overflow: 'hidden',
  },
  ticketHeader: {
    backgroundColor: '#00b0ff', paddingHorizontal: 20, paddingVertical: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ticketHeaderText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100,
  },
  confirmedBadgeText: { color: '#22c55e', fontWeight: '800', fontSize: 11 },

  dashedDivider: {
    height: 1, marginHorizontal: 20, marginVertical: 16,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', borderStyle: 'dashed',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  rowLabel: { fontSize: 14, color: '#718096', fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 2, textAlign: 'right' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#00b0ff' },

  ticketNotch: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 0,
  },
  notchLeft: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f0f4f8', marginLeft: -10 },
  notchLine: { flex: 1, height: 1, borderTopWidth: 2, borderTopColor: '#e2e8f0', borderStyle: 'dashed' },
  notchRight: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f0f4f8', marginRight: -10 },

  bookingIdRow: { alignItems: 'center', paddingBottom: 20 },
  bookingIdLabel: { fontSize: 11, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bookingId: { fontSize: 16, fontWeight: '800', color: '#4a5568', letterSpacing: 2 },

  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#e0f7ff', borderRadius: 12, padding: 14, width: '100%', marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: '#0369a1', lineHeight: 18 },

  shareBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#00b0ff', paddingVertical: 16, borderRadius: 100, marginBottom: 12,
    shadowColor: '#00b0ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  homeBtn: {
    width: '100%', paddingVertical: 16, borderRadius: 100,
    borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center',
  },
  homeBtnText: { color: '#4a5568', fontSize: 16, fontWeight: '600' },
});
