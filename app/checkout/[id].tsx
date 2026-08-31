import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { initiatePayment, isPaymentGatewayEnabled, PaymentResult, VendorPaymentConfig } from '../../services/paymentService';

export default function CheckoutScreen() {
  const { 
    id, batchId, packageName, seats, totalPrice, tripTitle, 
    vendorName, vendorWhatsApp, vendorUPI,
    vendorPaymentEnabled, vendorPaymentGateway, vendorRazorpayKey
  } = useLocalSearchParams();
  const { bookTrip } = useAppContext();
  const { t } = useTranslation();

  // Build vendor payment config from URL params
  const vendorPaymentConfig: VendorPaymentConfig = {
    enabled: vendorPaymentEnabled === 'true',
    gateway: (vendorPaymentGateway as any) || 'manual',
    razorpayKeyId: vendorRazorpayKey as string || undefined,
  };
  
  const hasOnlinePayment = isPaymentGatewayEnabled(vendorPaymentConfig);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [numTravellers, setNumTravellers] = useState(seats?.toString() || '1');
  const [consent, setConsent] = useState(false);
  const [captchaNum1] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaNum2] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceed = async () => {
    if (!name || !phone || !email || !numTravellers) {
      Alert.alert('Required Fields', 'Please fill out all fields.');
      return;
    }
    if (!consent) {
      Alert.alert('Consent Required', 'You must accept the risks involved.');
      return;
    }
    if (parseInt(captchaAnswer, 10) !== captchaNum1 + captchaNum2) {
      Alert.alert('Security Check Failed', 'Please answer the math question correctly.');
      return;
    }
    
    // Simple regex validation
    if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsProcessing(true);

    // Generate Order ID
    const orderId = 'ATGL-' + Math.floor(10000000 + Math.random() * 90000000).toString();
    const amount = parseFloat(totalPrice as string) || 0;
    
    if (amount <= 0) {
      Alert.alert('Error', 'Invalid booking amount. Please go back and try again.');
      setIsProcessing(false);
      return;
    }

    try {
      let bookingStatus: 'pending' | 'confirmed' = 'pending';
      let paymentId = '';
      let paymentGateway = 'manual';

      // Only initiate online payment if vendor has it enabled
      if (hasOnlinePayment) {
        const paymentResult: PaymentResult = await initiatePayment({
          amount,
          orderId,
          description: `Booking for ${tripTitle} - ${packageName}`,
          customerName: name,
          customerEmail: email,
          customerPhone: phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`,
          vendorName: vendorName as string,
          vendorPaymentConfig,
          notes: {
            trip_id: id as string,
            batch_id: batchId as string,
            seats: numTravellers,
          },
        });

        bookingStatus = paymentResult.success ? 'confirmed' : 'pending';
        paymentId = paymentResult.paymentId || '';
        paymentGateway = paymentResult.gateway;
      }
      // If no online payment, booking stays pending for manual payment

      // Save booking to context/Firebase
      await bookTrip({
        tripId: id as string,
        batchId: batchId as string,
        packageName: packageName as string,
        travelerName: name,
        travelerPhone: phone,
        travelerEmail: email,
        seats: parseInt(numTravellers, 10),
        totalPrice: amount,
        status: bookingStatus,
        createdAt: Date.now(),
        bookingId: orderId,
        paymentId,
        paymentGateway,
      } as any);

      router.replace({
        pathname: '/booking-confirmation' as any,
        params: {
          tripTitle,
          tripDate: 'TBD',
          seats: numTravellers,
          totalPrice: totalPrice as string,
          bookingId: orderId,
          packageName,
          paymentStatus: bookingStatus,
          paymentId,
          travelerName: name,
          travelerPhone: phone,
          vendorName,
          vendorWhatsApp,
          vendorUPI
        }
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Traveller Details</Text>
      <Text style={styles.subtitle}>Complete this form to proceed with your booking for {tripTitle}</Text>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="John Doe" 
            value={name} 
            onChangeText={setName} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="10-digit mobile number" 
            keyboardType="phone-pad"
            value={phone} 
            onChangeText={setPhone} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="john@example.com" 
            keyboardType="email-address"
            autoCapitalize="none"
            value={email} 
            onChangeText={setEmail} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Number of Travellers *</Text>
          <TextInput 
            style={styles.input} 
            keyboardType="number-pad"
            value={numTravellers} 
            onChangeText={setNumTravellers} 
          />
        </View>
      </View>

      <View style={styles.consentCard}>
        <View style={styles.consentRow}>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: '#00b0ff' }} />
          <Text style={styles.consentText}>
            I understand and accept the risks involved in treks or physically demanding activities.
          </Text>
        </View>
      </View>

      <View style={styles.captchaCard}>
        <Text style={styles.captchaTitle}>Security Check</Text>
        <Text style={styles.captchaSubtitle}>Please answer this simple math question to verify you are human.</Text>
        <View style={styles.captchaRow}>
          <View style={styles.captchaBox}>
            <Text style={styles.captchaMath}>{captchaNum1} + {captchaNum2} = </Text>
          </View>
          <TextInput
            style={styles.captchaInput}
            keyboardType="number-pad"
            placeholder="?"
            value={captchaAnswer}
            onChangeText={setCaptchaAnswer}
          />
        </View>
      </View>

      {/* Payment Info */}
      {hasOnlinePayment ? (
        <View style={styles.paymentInfoCard}>
          <View style={styles.paymentInfoRow}>
            <FontAwesome name="shield" size={16} color="#22c55e" />
            <Text style={styles.paymentInfoText}>Secure payment powered by Razorpay</Text>
          </View>
          <Text style={styles.paymentMethodsText}>UPI | Cards | NetBanking | Wallets</Text>
        </View>
      ) : (
        <View style={[styles.paymentInfoCard, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
          <View style={styles.paymentInfoRow}>
            <FontAwesome name="info-circle" size={16} color="#d97706" />
            <Text style={[styles.paymentInfoText, { color: '#92400e' }]}>Manual Payment Required</Text>
          </View>
          <Text style={[styles.paymentMethodsText, { color: '#b45309' }]}>
            Pay via UPI or WhatsApp after booking confirmation
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[
          styles.btn, 
          (!consent || !name || !phone || !email || !captchaAnswer || isProcessing) ? styles.btnDisabled : null
        ]} 
        onPress={handleProceed}
        disabled={!consent || !name || !phone || !email || !captchaAnswer || isProcessing}
      >
        {isProcessing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.btnText}>Processing...</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome name={hasOnlinePayment ? "lock" : "check"} size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>{hasOnlinePayment ? `Pay ₹${totalPrice}` : 'Confirm Booking'}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.termsText}>
        By proceeding, you agree to our Terms of Service and Privacy Policy
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a' },
  consentCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 25 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  consentText: { flex: 1, fontSize: 13, color: '#1e3a8a', lineHeight: 20 },
  captchaCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 25 },
  captchaTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  captchaSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  captchaRow: { flexDirection: 'row', alignItems: 'center' },
  captchaBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginRight: 10 },
  captchaMath: { fontSize: 18, fontWeight: '800', color: '#334155', letterSpacing: 2 },
  captchaInput: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  paymentInfoCard: { 
    backgroundColor: '#f0fdf4', 
    borderRadius: 12, 
    padding: 15, 
    borderWidth: 1, 
    borderColor: '#bbf7d0', 
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentInfoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 6,
  },
  paymentInfoText: { 
    fontSize: 13, 
    color: '#166534', 
    fontWeight: '600',
  },
  paymentMethodsText: { 
    fontSize: 11, 
    color: '#4ade80', 
    fontWeight: '500',
  },
  btn: { backgroundColor: '#00b0ff', padding: 16, borderRadius: 100, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  termsText: { 
    fontSize: 11, 
    color: '#94a3b8', 
    textAlign: 'center', 
    marginTop: 15,
    marginBottom: 30,
  },
});
