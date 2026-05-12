import React, { useEffect, useRef } from 'react';
import { Animated, Image, View, StyleSheet, Easing } from 'react-native';

export default function OllieLoading({ size = 100 }: { size?: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        // 1. Hat Tap Down (200ms)
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 8,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleY, {
            toValue: 0.96,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 2. Lowest point & Tilt (150ms)
        Animated.parallel([
          Animated.timing(rotate, {
            toValue: 1, // Will map to 5 degrees
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 3. Rebound Up (150ms)
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -3,
            duration: 150,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(scaleY, {
            toValue: 1.04,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 150,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 4. Settle (200ms)
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleY, {
            toValue: 1,
            duration: 200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 5. Pause (700ms)
        Animated.delay(700),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [translateY, scaleY, rotate]);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          {
            transform: [
              { translateY: translateY },
              { scaleY: scaleY },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/images/app_icon.png')}
          style={{ width: size, height: size, borderRadius: size / 4 }}
          resizeMode="contain"
        />
      </Animated.View>
      <View style={styles.shadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    marginTop: 5,
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
  },
});
