import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useWishlist } from '../hooks/useWishlist';
import { Link } from 'expo-router';

export default function WishlistScreen() {
  const { trips } = useAppContext();
  const { wishlistedIds, toggleWishlist } = useWishlist();
  const { t } = useTranslation();

  const wishlistedTrips = trips.filter(trip => wishlistedIds.includes(trip.id));

  return (
    <>
      <Stack.Screen options={{ title: t('wishlist.title', 'Saved Trips'), headerBackTitle: 'Back' }} />
      <View style={styles.container}>
        <FlatList
          data={wishlistedTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={wishlistedTrips.length === 0 ? styles.emptyState : styles.list}
          renderItem={({ item }) => (
            <Link href={`/trip/${item.id}`} asChild>
              <TouchableOpacity style={styles.card}>
                <Image 
                  source={{ uri: (item.images && item.images.length > 0 ? item.images[0] : null) || 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&q=80' }} 
                  style={styles.image} 
                />
                <View style={styles.info}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.vendor}>by {item.vendorName}</Text>
                  <Text style={styles.price}>
                    {item.packages && item.packages.length > 0 ? `₹${item.packages[0].price}` : 'Price TBD'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.removeBtn}
                  onPress={() => toggleWishlist(item.id)}
                >
                  <FontAwesome name="heart" size={24} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            </Link>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContent}>
              <FontAwesome name="heart-o" size={64} color="#cbd5e0" />
              <Text style={styles.emptyTitle}>No saved trips yet</Text>
              <Text style={styles.emptySubtitle}>Tap the heart icon on any trip to save it for later.</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden'
  },
  image: { width: 100, height: 100 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  vendor: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  price: { fontSize: 15, fontWeight: 'bold', color: '#0ea5e9' },
  removeBtn: { padding: 16, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContent: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#334155', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center' }
});
