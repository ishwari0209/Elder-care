import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

// Fade + slide-up entrance. Use delay to stagger lists.
export default function FadeIn({ children, delay = 0, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}
