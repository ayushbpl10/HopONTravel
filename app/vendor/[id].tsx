import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Share, 
  Linking,
  Clipboard,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trip } from '../../data/trips';
import { getStockImageForTrip } from '../../data/stockImages';
import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';

export default function VendorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<{
    name: string;
    email?: string;
    phone?: string;
    instagramUrl?: string;
    termsAndConditions?: string;
  } | null>(null);
  const [vendorTrips, setVendorTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchVendorData = async () => {
      setLoading(true);
      try {
        // Fetch vendor user profile if available
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          setVendorInfo({
            name: uData.name || uData.businessName || 'Verified Vendor',
            email: uData.email,
            phone: uData.phone || uData.whatsapp,
            instagramUrl: uData.instagramUrl,
            termsAndConditions: uData.termsAndConditions,
          });
        }

        // Fetch trips by vendorId or vendorName
        const tripsRef = collection(db, 'trips');
        const qById = query(tripsRef, where('vendorId', '==', id));
        const snapById = await getDocs(qById);

        let tripsList: Trip[] = [];
        snapById.forEach(docSnap => {
          tripsList.push({ id: docSnap.id, ...docSnap.data() } as Trip);
        });

        // Fallback: if no trips found by vendorId, search by vendorName if id is string
        if (tripsList.length === 0) {
          const qByName = query(tripsRef, where('vendorName', '==', id));
          const snapByName = await getDocs(qByName);
          snapByName.forEach(docSnap => {
            tripsList.push({ id: docSnap.id, ...docSnap.data() } as Trip);
          });
        }

        setVendorTrips(tripsList);

        if (!userSnap.exists() && tripsList.length > 0) {
          setVendorInfo({
            name: tripsList[0].vendorName || 'Verified Vendor',
            phone: tripsList[0].vendorWhatsApp,
          });
        }
      } catch (err) {
        console.error('Error loading vendor profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [id]);

  const webVendorUrl = `https://abtohghoomle.com/vendor.html?id=${id}`;

  const handleShareVendor = async () => {
    try {
      await Share.share({
        message: `Check out trips by ${vendorInfo?.name || 'our verified vendor'} on Ab Toh Ghoom Le! 🏔️\n\n🌐 View Profile: ${webVendorUrl}`,
        title: `${vendorInfo?.name || 'Vendor'} | Ab Toh Ghoom Le`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(webVendorUrl);
    Alert.alert('Copied!', 'Vendor page web link copied to clipboard.');
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading Vendor Profile...</Text>
      </View>
    );
  }

  const vendorName = vendorInfo?.name || 'Verified Trip Partner';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Vendor Hero Card */}
      <View style={[styles.vendorHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{vendorName.charAt(0).toUpperCase()}</Text>
        </View>
        
        <View style={styles.verifiedRow}>
          <FontAwesome name="check-circle" size={16} color="#3b82f6" />
          <Text style={styles.verifiedTag}>Verified Travel Partner</Text>
        </View>

        <Text style={[styles.vendorTitle, { color: colors.textPrimary }]}>{vendorName}</Text>
        <Text style={[styles.vendorSubtitle, { color: colors.textSecondary }]}>
          {vendorTrips.length} Active {vendorTrips.length === 1 ? 'Trip' : 'Trips'} Listed
        </Text>

        {/* Contact & Social Links */}
        <View style={styles.contactRow}>
          {vendorInfo?.phone && (
            <TouchableOpacity 
              style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
              onPress={() => Linking.openURL(`https://wa.me/${(vendorInfo.phone || '').replace(/[^0-9]/g, '')}`)}
            >
              <FontAwesome name="whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          )}

          {vendorInfo?.instagramUrl && (
            <TouchableOpacity 
              style={[styles.contactBtn, { backgroundColor: '#E1306C' }]}
              onPress={() => Linking.openURL(vendorInfo.instagramUrl!)}
            >
              <FontAwesome name="instagram" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Instagram</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.contactBtn, { backgroundColor: colors.primary }]}
            onPress={handleShareVendor}
          >
            <FontAwesome name="share-alt" size={16} color="#fff" />
            <Text style={styles.contactBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Web Storefront Link Bar */}
        <TouchableOpacity style={styles.webLinkPill} onPress={handleCopyLink}>
          <FontAwesome name="globe" size={14} color="#FFB800" />
          <Text style={styles.webLinkText}>{webVendorUrl}</Text>
          <FontAwesome name="copy" size={14} color="#FFB800" />
        </TouchableOpacity>
      </View>

      {/* Trips Section */}
      <View style={styles.tripsSection}>
        <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
          Trips by {vendorName} ({vendorTrips.length})
        </Text>

        {vendorTrips.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FontAwesome name="compass" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active trips currently listed by this vendor.</Text>
          </View>
        ) : (
          vendorTrips.map(trip => {
            const tripImg = (trip.images && trip.images.length > 0) 
              ? trip.images[0] 
              : getStockImageForTrip(trip.title, trip.category);
            const dateText = trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : 'Upcoming';
            const price = trip.packages && trip.packages.length > 0 ? trip.packages[0].price : ((trip as any).price || 0);

            return (
              <TouchableOpacity 
                key={trip.id} 
                style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/trip/${trip.id}`)}
              >
                <Image source={{ uri: tripImg }} style={styles.tripImage} />
                <View style={styles.tripInfo}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{trip.category || 'Trek'}</Text>
                  </View>
                  <Text style={[styles.tripTitle, { color: colors.textPrimary }]} numberOfLines={1}>{trip.title}</Text>
                  <Text style={[styles.tripDate, { color: colors.textSecondary }]}>📅 {dateText}</Text>
                  
                  <View style={styles.priceRow}>
                    <Text style={[styles.tripPrice, { color: colors.primary }]}>₹{price}</Text>
                    <View style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>View Details →</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Terms & Conditions if set */}
      {vendorInfo?.termsAndConditions && (
        <View style={[styles.termsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.termsTitle, { color: colors.textPrimary }]}>📜 Vendor Terms & Cancellation Policy</Text>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>{vendorInfo.termsAndConditions}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  vendorHero: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFB800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#000' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  verifiedTag: { color: '#3b82f6', fontWeight: '700', fontSize: 13 },
  vendorTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  vendorSubtitle: { fontSize: 14, marginBottom: 16 },
  contactRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  webLinkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,184,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  webLinkText: { color: '#FFB800', fontSize: 12, fontWeight: '600' },
  tripsSection: { marginBottom: 20 },
  sectionHeader: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  emptyBox: { padding: 40, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  tripCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
    height: 120,
  },
  tripImage: { width: 120, height: '100%', resizeMode: 'cover' },
  tripInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,184,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: { color: '#FFB800', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  tripTitle: { fontSize: 16, fontWeight: '700' },
  tripDate: { fontSize: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripPrice: { fontSize: 18, fontWeight: '800' },
  viewBtn: { backgroundColor: '#FFB800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  viewBtnText: { color: '#000', fontSize: 11, fontWeight: '800' },
  termsBox: { padding: 16, borderRadius: 16, borderWidth: 1 },
  termsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  termsText: { fontSize: 13, lineHeight: 20 },
});
