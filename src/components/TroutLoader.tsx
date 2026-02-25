import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface TroutLoaderProps {
  progress: number; // 0–1, drives the fill left-to-right
  size?: number;
  animate?: boolean; // idle breathing pulse when no progress
}

// Simplified trout silhouette path (tail-left, mouth-right)
const TROUT_PATH =
  'M10,32 C10,20 18,12 32,10 L55,8 C70,6 82,10 90,18 C96,24 98,30 96,36 ' +
  'C94,44 88,50 80,52 L55,56 C40,58 24,54 16,46 C12,42 10,38 10,32 Z ' +
  'M4,32 C2,28 4,22 8,20 L10,32 L8,44 C4,42 2,36 4,32 Z';

export default function TroutLoader({
  progress,
  size = 120,
  animate = false,
}: TroutLoaderProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const clampedProgress = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    if (!animate) {
      pulseAnim.setValue(clampedProgress);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, clampedProgress]);

  const fillWidth = animate
    ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, size] })
    : clampedProgress * size;

  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 100 64">
      <Defs>
        <ClipPath id="trout-clip">
          <Path d={TROUT_PATH} />
        </ClipPath>
      </Defs>
      {/* Outline */}
      <Path
        d={TROUT_PATH}
        fill={colors.surfaceAlt}
        stroke={colors.border}
        strokeWidth={1.5}
      />
      {/* Fill */}
      <G clipPath="url(#trout-clip)">
        <Rect
          x={0}
          y={0}
          width={animate ? undefined : clampedProgress * 100}
          height={64}
          fill={colors.primary}
        />
      </G>
    </Svg>
  );
}
