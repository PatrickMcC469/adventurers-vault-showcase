import React from 'react';
import { Animated, StyleSheet } from 'react-native';

export const COIN_SIZE = 32;

export const DENOM_STYLES = {
  copper:   { bg: '#b87333', border: '#7a4a1e' },
  silver:   { bg: '#b0b0b0', border: '#6e6e6e' },
  electrum: { bg: '#5fd4e0', border: '#2a9aab' },
  gold:     { bg: '#ffd700', border: '#c8960a' },
  platinum: { bg: '#e0e0f0', border: '#9090b0' },
};

export default function CoinToken({ denomination, animX, animY, animRotation, panHandlers }) {
  const s = DENOM_STYLES[denomination];

  const rotate = animRotation.interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
    extrapolate: 'extend',
  });

  return (
    <Animated.View
      style={[
        styles.coin,
        { backgroundColor: s.bg, borderColor: s.border },
        { transform: [{ translateX: animX }, { translateY: animY }, { rotate }] },
      ]}
      {...panHandlers}
    />
  );
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 6,
  },
});
