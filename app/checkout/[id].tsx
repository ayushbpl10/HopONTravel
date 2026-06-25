import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppContext } from '../../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function CheckoutScreen() {
  const { id, batchId, packageName, seats, totalPrice, tripTitle, vendorName, vendorWhatsApp, vendorUPI } = useLocalSearchParams();
  const { bookTrip } = useAppContext();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [numTravellers, setNumTravellers] = useState(seats?.toString() || '1');
  const [consent, setConsent] = useState(false);
  const [captchaNum1] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaNum2] = useState(Math.floor(Math.random() * 10) + 1);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

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

    // Generate Order ID
    const orderId = 'ORD' + Math.floor(10000000 + Math.random() * 90000000).toString();

    // Save booking to context/Firebase
    try {
      await bookTrip({
        tripId: id as string,
        batchId: batchId as string,
        packageName: packageName as string,
        travelerName: name,
        travelerPhone: phone,
        travelerEmail: email,
        seats: parseInt(numTravellers, 10),
        totalPrice: parseFloat(totalPrice as string),
        status: 'pending',
        createdAt: Date.now(),
        bookingId: orderId
      } as any);

      router.replace({
        pathname: '/booking-confirmation' as any,
        params: {
          tripTitle,
          tripDate: 'TBD', // In a real app we'd pass this or fetch it
          seats: numTravellers,
          totalPrice,
          bookingId: orderId,
          packageName,
          paymentStatus: 'pending',
          travelerName: name,
          travelerPhone: phone,
          vendorName,
          vendorWhatsApp,
          vendorUPI
        }
      });
    } catch (e) {
      Alert.alert('Error', 'Could not create booking request. Please try again.');
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

      <TouchableOpacity 
        style={[styles.btn, (!consent || !name || !phone || !email || !captchaAnswer) ? styles.btnDisabled : null]} 
        onPress={handleProceed}
        disabled={!consent || !name || !phone || !email || !captchaAnswer}
      >
        <Text style={styles.btnText}>Proceed to Payment</Text>
      </TouchableOpacity>
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
  btn: { backgroundColor: '#00b0ff', padding: 15, borderRadius: 100, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
