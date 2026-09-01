import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const WISHLIST_KEY = 'hopontravel_wishlist';

export function useWishlist() {
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await AsyncStorage.getItem(WISHLIST_KEY);
      if (data) {
        setWishlistedIds(JSON.parse(data));
      }
    } catch (e) {
      console.error('Failed to load wishlist', e);
    }
  };

  const toggleWishlist = async (tripId: string) => {
    try {
      let updatedList = [...wishlistedIds];
      if (updatedList.includes(tripId)) {
        updatedList = updatedList.filter(id => id !== tripId);
      } else {
        updatedList.push(tripId);
      }
      setWishlistedIds(updatedList);
      await AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to toggle wishlist', e);
    }
  };

  return { wishlistedIds, toggleWishlist };
}
