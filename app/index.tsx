import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View, ImageBackground, TouchableOpacity, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import OllieLoading from '../components/OllieLoading';

export default function HomeScreen() {
  const { trips, loading } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTrips = trips.filter((trip) => {
    const query = searchQuery.toLowerCase();
    return trip.title.toLowerCase().includes(query) || trip.description.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <OllieLoading size={120} />
        <Text style={{ marginTop: 20, color: '#8a94a6', fontWeight: '600' }}>Fetching Adventures...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={18} color="#8a94a6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search trips, destinations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          placeholderTextColor="#8a94a6"
        />
      </View>
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Link href={`/trip/${item.id}`} asChild>
            <TouchableOpacity style={styles.cardContainer} activeOpacity={0.8}>
              <ImageBackground
                source={{ uri: item.images[0] }}
                style={styles.cardImage}
                imageStyle={{ borderRadius: 16 }}
              >
                <View style={styles.overlay}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.date}>{item.dateDuration}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {item.totalSeats - item.bookedSeats} seats left
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    height: 200,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  date: {
    color: '#e0e0e0',
    fontSize: 14,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
    fontWeight: '500',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  }
});
