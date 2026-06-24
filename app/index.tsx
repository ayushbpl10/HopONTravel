import React, { useState, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View, ImageBackground, TouchableOpacity, TextInput, ScrollView, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { Link, router } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import { Skeleton } from '../components/Skeleton';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const PRICE_FILTERS = [
  { labelKey: 'explore.filterAll', defaultLabel: 'All', max: Infinity },
  { labelKey: 'explore.filterUnder1000', defaultLabel: 'Under ₹1000', max: 1000 },
  { labelKey: 'explore.filter1000To2000', defaultLabel: '₹1000–₹2000', min: 1000, max: 2000 },
  { labelKey: 'explore.filterAbove2000', defaultLabel: 'Above ₹2000', min: 2000, max: Infinity },
];

const AnimatedCard = ({ trip, t }: { trip: any, t: any }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const price = trip.packages && trip.packages.length > 0 ? trip.packages[0].price : null;
  const available = trip.batches ? trip.batches.reduce((acc: number, b: any) => acc + (b.totalSeats - b.bookedSeats), 0) : 0;

  return (
    <Link href={`/trip/${trip.id}`} asChild>
      <TouchableOpacity 
        activeOpacity={0.9}
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: false }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start()}
      >
        <Animated.View style={[styles.cardContainer, { transform: [{ scale }] }]}>
          <ImageBackground
            source={{ uri: trip.images[0] || 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&q=80' }}
            style={styles.cardImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.overlay}
            >
              <View style={styles.titleContainer}>
                {trip.tripStatus === 'started' && (
                  <BlurView intensity={80} tint="dark" style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>🔴 {t('explore.live', 'LIVE')}</Text>
                  </BlurView>
                )}
                {trip.tripStatus === 'completed' && (
                  <BlurView intensity={80} tint="dark" style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>✓ {t('explore.completed', 'Completed')}</Text>
                  </BlurView>
                )}
                <Text style={styles.title}>{trip.title}</Text>
                <Text style={styles.date}>{trip.batches && trip.batches.length > 0 ? trip.batches[0].dateDuration : t('explore.tbd', 'TBD')}</Text>
                <Text style={styles.vendorName}>{t('explore.by', 'by')} {trip.vendorName}</Text>
              </View>
              <View style={styles.rightCol}>
                {price && (
                  <BlurView intensity={60} tint="dark" style={styles.glassPill}>
                    <Text style={styles.priceBadgeText}>₹{price}</Text>
                  </BlurView>
                )}
                <BlurView intensity={40} tint="light" style={styles.glassPillSecondary}>
                  <Text style={styles.pillText}>{available} {t('explore.left', 'left')}</Text>
                </BlurView>
              </View>
            </LinearGradient>
          </ImageBackground>
        </Animated.View>
      </TouchableOpacity>
    </Link>
  );
};

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
      <View style={styles.container}>
        <View style={{ height: 250, backgroundColor: '#e2e8f0' }} />
        <ScrollView style={{ paddingHorizontal: 16, marginTop: -40 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.cardContainer, { padding: 15, backgroundColor: '#fff', borderRadius: 20 }]}>
              <Skeleton height={150} borderRadius={10} style={{ marginBottom: 10 }} />
              <Skeleton height={20} width="70%" style={{ marginBottom: 5 }} />
              <Skeleton height={16} width="40%" />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80' }} 
        style={styles.heroSection}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(240,242,245,1)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('explore.heroTitle', 'Discover Your Next Adventure')}</Text>
          <Text style={styles.heroSubtitle}>{t('explore.heroSubtitle', 'Find and book the best trips directly from verified local guides.')}</Text>
        </View>

        {/* Glassmorphic Search Bar */}
        <BlurView intensity={80} tint="default" style={styles.searchBlurContainer}>
          <FontAwesome name="search" size={18} color="#4a5568" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('explore.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            placeholderTextColor="#718096"
          />
        </BlurView>
      </ImageBackground>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {PRICE_FILTERS.map((f, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setActiveFilter(idx)}
            >
              {activeFilter === idx ? (
                <LinearGradient
                  colors={['#00b0ff', '#007bb5']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.filterChip, { borderWidth: 0 }]}
                >
                  <Text style={styles.filterChipTextActive}>{t(f.labelKey, f.defaultLabel)}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterChip}>
                  <Text style={styles.filterChipText}>{t(f.labelKey, f.defaultLabel)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trip List */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredTrips.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00b0ff" />}
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
        renderItem={({ item }) => <AnimatedCard trip={item} t={t} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="map-o" size={64} color="#cbd5e0" />
            <Text style={styles.emptyTitle}>{t('explore.noTrips', 'No Trips Found')}</Text>
            <Text style={styles.emptySubtitle}>{t('explore.noTripsSub', 'Try adjusting your search or filters to discover new adventures.')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  heroSection: {
    height: 280,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  heroContent: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a202c',
    marginBottom: 8,
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#4a5568',
    fontWeight: '500',
    lineHeight: 22,
  },
  searchBlurContainer: {
    flexDirection: 'row', alignItems: 'center', 
    marginHorizontal: 16, borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1a202c', fontWeight: '500' },
  filterWrapper: {
    marginTop: 10,
    marginBottom: 5,
  },
  filterRow: { maxHeight: 50 },
  filterChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, 
    backgroundColor: '#ffffff', marginRight: 10, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#4a5568' },
  filterChipTextActive: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  listContainer: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, padding: 16 },
  cardContainer: {
    height: 240, marginBottom: 24, shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2,
    shadowRadius: 15, elevation: 8,
  },
  cardImage: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingTop: 80, // Ensures gradient stretches up nicely
  },
  titleContainer: { flex: 1, marginRight: 15 },
  liveBadge: {
    alignSelf: 'flex-start', overflow: 'hidden',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  title: {
    color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  date: {
    color: '#e2e8f0', fontSize: 14, marginTop: 4, fontWeight: '600',
  },
  vendorName: { color: '#90cdf4', fontSize: 13, marginTop: 4, fontWeight: '700' },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  glassPill: { 
    overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  glassPillSecondary: {
    overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)'
  },
  priceBadgeText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  pillText: { color: '#1a202c', fontWeight: '800', fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#4a5568', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: '#8a94a6', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 },
});
