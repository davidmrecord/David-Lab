import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../theme/ThemeContext';

export default function OfflineBanner() {
  const { isOffline, isLoading } = useNetworkStatus();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (isLoading) return;
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, isLoading]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: colors.warning, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>No internet connection · catches will sync later</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
