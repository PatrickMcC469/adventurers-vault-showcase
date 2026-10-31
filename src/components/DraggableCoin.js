import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

export const COIN_SIZE = 40;

const DENOM_STYLES = {
  copper:   { bg: '#b87333', border: '#7a4a1e', text: '#fff',    label: 'CP' },
  silver:   { bg: '#a8a8a8', border: '#6e6e6e', text: '#fff',    label: 'SP' },
  electrum: { bg: '#5fd4e0', border: '#2a9aab', text: '#fff',    label: 'EP' },
  gold:     { bg: '#ffd700', border: '#b8960a', text: '#1a1a2e', label: 'GP' },
  platinum: { bg: '#e8e8f0', border: '#9090b0', text: '#1a1a2e', label: 'PP' },
};

export default function DraggableCoin({ denomination, initialX, initialY, bounds, extraCount = 0 }) {
  const denomStyle = DENOM_STYLES[denomination];

  // pan tracks the current drag offset from the initial position
  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

  // We need to track the last settled position so the next drag starts from there
  const lastPos = useRef({ x: initialX, y: initialY });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        // Tell Animated where we currently are so the gesture delta starts at 0
        pan.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gesture) => {
        // Clamp within the chest bounds
        const newX = Math.max(bounds.left, Math.min(bounds.right  - COIN_SIZE, lastPos.current.x + gesture.dx));
        const newY = Math.max(bounds.top,  Math.min(bounds.bottom - COIN_SIZE, lastPos.current.y + gesture.dy));
        pan.setValue({ x: newX - lastPos.current.x, y: newY - lastPos.current.y });
      },

      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        // Save the final clamped position for the next drag
        lastPos.current = {
          x: Math.max(bounds.left, Math.min(bounds.right  - COIN_SIZE, lastPos.current.x + gesture.dx)),
          y: Math.max(bounds.top,  Math.min(bounds.bottom - COIN_SIZE, lastPos.current.y + gesture.dy)),
        };
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.coin,
        { backgroundColor: denomStyle.bg, borderColor: denomStyle.border },
        { left: 0, top: 0, transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={[styles.label, { color: denomStyle.text }]}>{denomStyle.label}</Text>
      {extraCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{extraCount}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coin: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },
  label: { fontSize: 11, fontWeight: 'bold' },
  badge: {
    position: 'absolute',
    top: -6, right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
