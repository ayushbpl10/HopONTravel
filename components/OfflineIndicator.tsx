import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useAppContext();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <FontAwesome name="wifi" size={14} color="#fff" style={styles.icon} />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OfflineIndicator;
