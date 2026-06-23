import React, { useState, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View, ImageBackground, TouchableOpacity, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import OllieLoading from '../components/OllieLoading';
import { useTranslation } from 'react-i18next';

const PRICE_FILTERS = [
  { label: 'All', max: Infinity },
  { label: 'Under ₹1000', max: 1000 },
  { label: '₹1000–₹2000', min: 1000, max: 2000 },
  { label: 'Above ₹2000', min: 2000, max: Infinity },
];

export default function HomeScreen() {
  const { trips, loading, fetchMoreTrips, hasMoreTrips, refreshTrips } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (refreshTrips) await refreshTrips();
    setRefreshing(false);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  const filteredTrips = useMemo(() => {
    const filter = PRICE_FILTERS[activeFilter];
    const query = searchQuery.toLowerCase();
    return trips.filter((trip) => {
      const matchesSearch = trip.title.toLowerCase().includes(query) || trip.description.toLowerCase().includes(query);
      const price = trip.packages && trip.packages.length > 0 ? trip.packages[0].price : 0;
      const matchesPrice = price >= (filter.min ?? 0) && price <= filter.max;
      return matchesSearch && matchesPrice;
    });
  }, [trips, searchQuery, activeFilter]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <OllieLoading size={120} />
        <Text style={{ marginTop: 20, color: '#8a94a6', fontWeight: '600' }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#8a94a6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('explore.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          placeholderTextColor="#8a94a6"
        />
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {PRICE_FILTERS.map((f, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.filterChip, activeFilter === idx && styles.filterChipActive]}
            onPress={() => setActiveFilter(idx)}
          >
            <Text style={[styles.filterChipText, activeFilter === idx && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Trip List */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredTrips.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={() => {
          if (fetchMoreTrips && hasMoreTrips) fetchMoreTrips();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          filteredTrips.length > 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              {hasMoreTrips ? <ActivityIndicator size="small" color="#00b0ff" /> : <Text style={{ color: '#a0aec0' }}>{t('explore.endOfList', "You've reached the end")}</Text>}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const price = item.packages && item.packages.length > 0 ? item.packages[0].price : null;
          const available = item.batches ? item.batches.reduce((acc, b) => acc + (b.totalSeats - b.bookedSeats), 0) : 0;
          return (
            <Link href={`/trip/${item.id}`} asChild>
              <TouchableOpacity style={styles.cardContainer} activeOpacity={0.8}>
                <ImageBackground
                  source={{ uri: item.images[0] || 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&q=80' }}
                  style={styles.cardImage}
                  imageStyle={{ borderRadius: 16 }}
                >
                  <View style={styles.overlay}>
                    <View style={styles.titleContainer}>
                      {item.tripStatus === 'started' && (
                        <View style={styles.liveBadge}>
                          <Text style={styles.liveBadgeText}>🔴 LIVE</Text>
                        </View>
                      )}
                      {item.tripStatus === 'completed' && (
                        <View style={[styles.liveBadge, { backgroundColor: '#4a5568' }]}>
                          <Text style={styles.liveBadgeText}>✓ Completed</Text>
                        </View>
                      )}
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.date}>{item.batches && item.batches.length > 0 ? item.batches[0].dateDuration : 'TBD'}</Text>
                      <Text style={styles.vendorName}>by {item.vendorName}</Text>
                    </View>
                    <View style={styles.rightCol}>
                      {price && (
                        <View style={styles.priceBadge}>
                          <Text style={styles.priceBadgeText}>₹{price}</Text>
                        </View>
                      )}
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{available} left</Text>
                      </View>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </Link>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="map-o" size={64} color="#cbd5e0" />
            <Text style={styles.emptyTitle}>No Trips Found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters to discover new adventures.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  filterRow: { maxHeight: 50 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e2e8f0',
    marginRight: 8, justifyContent: 'center', alignItems: 'center',
  },
  filterChipActive: { backgroundColor: '#00b0ff' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#4a5568' },
  filterChipTextActive: { color: '#fff' },
  listContainer: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, padding: 16 },
  cardContainer: {
    height: 210, marginBottom: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15,
    shadowRadius: 10, elevation: 5,
  },
  cardImage: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    padding: 16, backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  titleContainer: { flex: 1, marginRight: 10 },
  liveBadge: {
    alignSelf: 'flex-start', backgroundColor: '#e53e3e',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 4,
  },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  title: {
    color: '#ffffff', fontSize: 20, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10,
  },
  date: {
    color: '#e0e0e0', fontSize: 13, marginTop: 3, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5,
  },
  vendorName: { color: '#a0c8ff', fontSize: 12, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  priceBadge: { backgroundColor: '#00b0ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  pillText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#4a5568', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: '#8a94a6', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
});
