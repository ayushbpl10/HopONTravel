import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Alert, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
import { useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const { trips } = useAppContext();
  const trip = trips.find((t) => t.id === id);

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text>Trip not found.</Text>
      </View>
    );
  }

  const handleWhatsAppBooking = async () => {
    const message = `Hi ${trip.vendorName}, I'm interested in booking the "${trip.title}" trip. Are there seats available?`;
    const url = `whatsapp://send?phone=${trip.vendorWhatsApp}&text=${encodeURIComponent(message)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web if app is not installed
        const webUrl = `https://wa.me/${trip.vendorWhatsApp}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp.');
    }
  };

  const handleUPIPayment = async () => {
    // Generate a random 8 digit order ID
    const orderId = 'ORD' + Math.floor(10000000 + Math.random() * 90000000).toString();
    
    // Clean price string from '₹1500' to '1500.00'
    const numericPrice = trip.price.replace(/[^0-9.]/g, '') + '.00';
    
    // Construct Raw UPI Intent URL
    const upiUrl = `upi://pay?pa=${trip.vendorUPI}&pn=${encodeURIComponent(trip.vendorName)}&am=${numericPrice}&cu=INR&tr=${orderId}`;

    try {
      // Trying to open the URL directly is more robust on physical devices
      await Linking.openURL(upiUrl);
    } catch (error) {
      Alert.alert(
        'Could Not Open UPI App', 
        'Please ensure you have a UPI app like GPay, PhonePe, or Paytm installed and set up on your device.'
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.heroScroll}>
        {trip.images.map((img, index) => (
          <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
        ))}
      </ScrollView>
      
      <View style={styles.detailsContainer}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{trip.title}</Text>
            <Text style={styles.date}>{trip.dateDuration}</Text>
          </View>
          <Text style={styles.price}>{trip.price}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Seats</Text>
            <Text style={styles.statValue}>{trip.totalSeats}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={[styles.statValue, { color: '#00b0ff' }]}>{trip.totalSeats - trip.bookedSeats}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>About this trip</Text>
        <Text style={styles.description}>{trip.description}</Text>

        <View style={styles.vendorCard}>
          <FontAwesome name="user-circle" size={40} color="#cbd5e0" style={styles.vendorIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorLabel}>Organized by</Text>
            <Text style={styles.vendorName}>{trip.vendorName}</Text>
            <View style={styles.vendorInfoRow}>
              <FontAwesome name="whatsapp" size={14} color="#718096" />
              <Text style={styles.vendorInfoText}>{trip.vendorWhatsApp}</Text>
            </View>
            <View style={styles.vendorInfoRow}>
              <FontAwesome name="bank" size={12} color="#718096" />
              <Text style={styles.vendorInfoText}>{trip.vendorUPI}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.bookButton, styles.upiButton]} 
            onPress={handleUPIPayment}
            activeOpacity={0.8}
          >
            <FontAwesome name="rupee" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.bookButtonText}>Pay via UPI</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bookButton, styles.waButton]} 
            onPress={handleWhatsAppBooking}
            activeOpacity={0.8}
          >
            <FontAwesome name="whatsapp" size={24} color="white" style={styles.buttonIcon} />
            <Text style={styles.bookButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroScroll: {
    height: 300,
  },
  heroImage: {
    height: 300,
    resizeMode: 'cover',
  },
  detailsContainer: {
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#ffffff',
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 14,
    color: '#718096',
    marginTop: 6,
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00b0ff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8a94a6',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a5568',
    marginBottom: 24,
  },
  vendorCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorIcon: {
    marginRight: 15,
  },
  vendorLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  vendorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  vendorInfoText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 100, // Pill shape
    elevation: 4,
  },
  upiButton: {
    backgroundColor: '#00b0ff', // UPI Blue
    shadowColor: '#00b0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  waButton: {
    backgroundColor: '#25D366', // WhatsApp Green
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
