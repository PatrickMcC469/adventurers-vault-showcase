import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Accelerometer } from 'expo-sensors';
import { getCharacterByCampaign, getWalletByCharacter, getSettings, getCustomWalletAmounts, getDenominationsByTemplate, updateCharacterAvatar } from '../database/db';
import * as ImagePicker from 'expo-image-picker';
import { documentDirectory, copyAsync } from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { DISPLAY_NAMES } from '../constants/currency';
import CoinToken, { COIN_SIZE } from '../components/CoinToken';
import AdBanner from '../components/AdBanner';
import { getIsPremium } from '../utils/purchases';
import CoinIcon from '../components/CoinIcon';
import Svg, { Circle, Path, Line, Polygon, Rect } from 'react-native-svg';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_PER_DENOM      = 8;   // max coins shown per denomination
const MAX_TOTAL_COINS    = 32;  // hard cap on total coins to prevent lag
const GRAVITY_STRENGTH   = 0.45;
const DAMPING            = 0.94;
const BOUNCE             = 0.18;
const FLOOR_FRICTION     = 0.65;
const SLEEP_THRESHOLD    = 0.06;
const ANG_DAMPING        = 0.88;
const ANG_SLEEP          = 0.3;

function buildCoinKeys(wallet, settings) {
  if (!wallet || !settings) return [];
  const denoms = settings.electrum_enabled
    ? ['platinum', 'gold', 'electrum', 'silver', 'copper']
    : ['platinum', 'gold', 'silver', 'copper'];
  const keys = [];
  denoms.forEach((denom) => {
    const count = Math.min(wallet[denom] || 0, MAX_PER_DENOM);
    for (let i = 0; i < count; i++) {
      if (keys.length >= MAX_TOTAL_COINS) return; // hard cap
      keys.push(`${denom}-${i}`);
    }
  });
  return keys;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletScreen({ route, navigation }) {
  const { campaignId, campaignName } = route.params;

  const [character,     setCharacter]     = useState(null);
  const [wallet,        setWallet]        = useState(null);
  const [settings,      setSettings]      = useState(null);
  const [coinKeys,      setCoinKeys]      = useState([]);
  const [customDenoms,  setCustomDenoms]  = useState([]);
  const [customAmounts, setCustomAmounts] = useState([]);
  const [isPremium,     setIsPremium]     = useState(false);

  useEffect(() => { getIsPremium().then(setIsPremium); }, []);

  // Physics world bounds — set when the physics area is measured
  const boundsRef        = useRef({ left: 0, right: 300, top: 0, bottom: 600 });
  const coinStateRef     = useRef({});
  const gravityRef       = useRef({ x: 0, y: GRAVITY_STRENGTH });
  const panRespondersRef = useRef({});  // cached PanResponders — never recreated
  const coinsArrayRef    = useRef([]); // flat array for physics loop, no Object.values() each tick
  const hasLoadedRef     = useRef(false); // false on first load — spawn coins settled

  // ── Load data ──────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const char = getCharacterByCampaign(campaignId);
      if (!char) return;
      const s = getSettings(char.id);
      const w = getWalletByCharacter(char.id);

      setCharacter((prev) => {
        if (prev && prev.id === char.id && prev.avatar_uri === char.avatar_uri && prev.name === char.name) return prev;
        return char;
      });
      setWallet((prev) => {
        if (prev && prev.copper === w.copper && prev.silver === w.silver &&
            prev.electrum === w.electrum && prev.gold === w.gold && prev.platinum === w.platinum) return prev;
        return w;
      });
      setSettings((prev) => {
        if (prev && prev.auto_convert === s.auto_convert && prev.electrum_enabled === s.electrum_enabled &&
            prev.currency_mode === s.currency_mode && prev.active_template_id === s.active_template_id) return prev;
        return s;
      });

      if (s?.currency_mode === 'custom' && s?.active_template_id) {
        setCustomDenoms(getDenominationsByTemplate(s.active_template_id));
        setCustomAmounts(getCustomWalletAmounts(char.id));
      } else {
        setCustomDenoms([]);
        setCustomAmounts([]);
      }
    }, [campaignId])
  );

  // ── Sync coins with wallet ─────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet || !settings) return;
    const newKeys = buildCoinKeys(wallet, settings);
    const b = boundsRef.current;

    const firstLoad = !hasLoadedRef.current;

    newKeys.forEach((key, order) => {
      if (!coinStateRef.current[key]) {
        const denom = key.split('-')[0];
        let x, y, vx, vy, angularVelocity;

        if (firstLoad) {
          // On open — place coins already resting at the bottom, spread randomly
          x  = b.left + Math.random() * Math.max(0, b.right - b.left - COIN_SIZE);
          y  = b.bottom - COIN_SIZE - Math.random() * COIN_SIZE * 2;
          vx = 0; vy = 0; angularVelocity = 0;
        } else {
          // New coin added — fall in from above, staggered
          x  = b.left + Math.random() * Math.max(0, b.right - b.left - COIN_SIZE);
          y  = b.top - COIN_SIZE - (order * COIN_SIZE * 1.4);
          vx = (Math.random() - 0.5) * 5;
          vy = 2 + Math.random() * 3;
          angularVelocity = (Math.random() - 0.5) * 18;
        }

        coinStateRef.current[key] = {
          _key: key,
          x, y, vx, vy,
          rotation: Math.random() * 360,
          angularVelocity,
          animX:        new Animated.Value(x),
          animY:        new Animated.Value(y),
          animRotation: new Animated.Value(Math.random() * 360),
          isDragging:   false,
          denomination: denom,
        };
      }
    });

    hasLoadedRef.current = true;

    Object.keys(coinStateRef.current).forEach((key) => {
      if (!newKeys.includes(key)) {
        // Move off screen instantly so the coin doesn't flash before React unmounts it
        const coin = coinStateRef.current[key];
        if (coin) { coin.animX.setValue(-9999); coin.animY.setValue(-9999); }
        delete coinStateRef.current[key];
        delete panRespondersRef.current[key];
      }
    });

    // Rebuild flat array once so the physics loop never calls Object.values()
    coinsArrayRef.current = Object.values(coinStateRef.current);

    setCoinKeys(newKeys);
  }, [wallet?.copper, wallet?.silver, wallet?.electrum, wallet?.gold, wallet?.platinum]);

  // ── Accelerometer ──────────────────────────────────────────────────────────
  useEffect(() => {
    Accelerometer.setUpdateInterval(50);
    const sub = Accelerometer.addListener(({ x, y }) => {
      const prev = gravityRef.current;
      // x: left/right tilt. y: -1 when upright, +1 when upside down.
      // Gravity direction follows the phone — flip upside down and coins fall "up".
      // Android accelerometer axes are inverted vs iOS — flip both
      const flip  = Platform.OS === 'android' ? -1 : 1;
      const newGx =  flip * x * GRAVITY_STRENGTH;
      const newGy = -flip * y * GRAVITY_STRENGTH;

      // Wake sleeping coins when gravity direction shifts noticeably
      const shift = Math.abs(newGx - prev.x) + Math.abs(newGy - prev.y);
      if (shift > 0.18) {
        coinsArrayRef.current.forEach((coin) => {
          if (!coin.isDragging) {
            coin.vx += newGx * 3;
            coin.vy += newGy * 3;
            coin.angularVelocity += (Math.random() - 0.5) * 4;
          }
        });
      }

      gravityRef.current = { x: newGx, y: newGy };
    });
    return () => sub.remove();
  }, []);

  // ── Physics loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = setInterval(() => {
      const g = gravityRef.current;
      const b = boundsRef.current;
      const coins = coinsArrayRef.current;

      // ── Step 1: apply gravity + damping + wall bounds to each coin ──
      coins.forEach((coin) => {
        // Skip coins that were removed between ticks
        if (!coinStateRef.current[coin._key]) return;
        if (coin.isDragging) return;
        // Skip physics entirely for sleeping coins — big performance win
        if (coin.vx === 0 && coin.vy === 0 && coin.angularVelocity === 0) return;

        coin.vx += g.x;
        coin.vy += g.y;
        coin.vx *= DAMPING;
        coin.vy *= DAMPING;
        coin.x  += coin.vx;
        coin.y  += coin.vy;

        if (coin.x < b.left) {
          coin.x = b.left;
          coin.vx = Math.abs(coin.vx) * BOUNCE;
        }
        if (coin.x > b.right - COIN_SIZE) {
          coin.x = b.right - COIN_SIZE;
          coin.vx = -Math.abs(coin.vx) * BOUNCE;
        }
        if (coin.y < b.top) {
          coin.y = b.top;
          coin.vy = Math.abs(coin.vy) * BOUNCE;
        }
        if (coin.y > b.bottom - COIN_SIZE) {
          coin.y = b.bottom - COIN_SIZE;
          coin.vy = -Math.abs(coin.vy) * BOUNCE;
          coin.vx *= FLOOR_FRICTION;
        }

        if (Math.abs(coin.vx) < SLEEP_THRESHOLD) coin.vx = 0;
        if (Math.abs(coin.vy) < SLEEP_THRESHOLD) coin.vy = 0;

        // Rotation
        coin.angularVelocity *= ANG_DAMPING;
        if (Math.abs(coin.angularVelocity) < ANG_SLEEP) coin.angularVelocity = 0;
        coin.rotation += coin.angularVelocity;
      });

      // ── Step 2: coin-coin collision detection (O(N²) circle vs circle) ──
      // For every pair, check if circles overlap. If so, push apart and
      // exchange velocity along the collision normal.
      for (let i = 0; i < coins.length; i++) {
        for (let j = i + 1; j < coins.length; j++) {
          const a = coins[i];
          const c = coins[j];
          // Skip pairs where both coins are fully settled — saves most collision work
          if (a.vx === 0 && a.vy === 0 && c.vx === 0 && c.vy === 0) continue;

          // Use center points
          const ax = a.x + COIN_SIZE / 2;
          const ay = a.y + COIN_SIZE / 2;
          const cx = c.x + COIN_SIZE / 2;
          const cy = c.y + COIN_SIZE / 2;

          const dx = cx - ax;
          const dy = cy - ay;
          const distSq = dx * dx + dy * dy;

          if (distSq < COIN_SIZE * COIN_SIZE && distSq > 0) {
            const dist    = Math.sqrt(distSq);
            const nx      = dx / dist;         // collision normal
            const ny      = dy / dist;
            const overlap = COIN_SIZE - dist;

            // Push the two coins apart equally
            const half = overlap / 2 + 0.5;    // +0.5 prevents micro-overlaps
            if (!a.isDragging) { a.x -= nx * half; a.y -= ny * half; }
            if (!c.isDragging) { c.x += nx * half; c.y += ny * half; }

            // Only exchange velocity if coins are meaningfully approaching each other
            // Skipping impulse on slow collisions stops settled coins from perpetually nudging
            const relVn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
            if (relVn < -0.3) {
              const impulse = relVn * 0.5;
              if (!a.isDragging) { a.vx += impulse * nx; a.vy += impulse * ny; }
              if (!c.isDragging) { c.vx -= impulse * nx; c.vy -= impulse * ny; }
            }
          }
        }
      }

      coins.forEach((coin) => {
        coin.animX.setValue(coin.x);
        coin.animY.setValue(coin.y);
        coin.animRotation.setValue(coin.rotation);
      });
    }, 33);
    return () => clearInterval(loop);
  }, []);

  // ── PanResponder factory (cached — created once per coin key) ──────────────
  function getPanResponder(key) {
    if (panRespondersRef.current[key]) return panRespondersRef.current[key];
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        const coin = coinStateRef.current[key];
        if (!coin) return;
        coin.isDragging  = true;
        coin.vx = 0; coin.vy = 0;
        coin._dragStartX = coin.x;
        coin._dragStartY = coin.y;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, g) => {
        const coin = coinStateRef.current[key];
        const b    = boundsRef.current;
        if (!coin) return;
        coin.x = Math.max(b.left, Math.min(b.right  - COIN_SIZE, coin._dragStartX + g.dx));
        coin.y = Math.max(b.top,  Math.min(b.bottom - COIN_SIZE, coin._dragStartY + g.dy));
        coin.animX.setValue(coin.x);
        coin.animY.setValue(coin.y);
      },
      onPanResponderRelease: (_, g) => {
        const coin = coinStateRef.current[key];
        if (!coin) return;
        coin.vx = g.vx * 0.3;
        coin.vy = g.vy * 0.3;
        coin.angularVelocity = (g.vx - g.vy) * 0.8;
        coin.isDragging = false;
      },
    });
    panRespondersRef.current[key] = pr;
    return pr;
  }

  // ── Avatar picker ───────────────────────────────────────────────────────────
  async function pickAvatar() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please go to Settings → Adventurer\'s Vault → Photos and set it to "All Photos".',
          [{ text: 'OK' }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const tempUri = result.assets[0].uri;
        const fileName = `avatar_${character.id}_${Date.now()}.jpg`;
        const permanentUri = documentDirectory + fileName;
        await copyAsync({ from: tempUri, to: permanentUri });
        updateCharacterAvatar(character.id, permanentUri);
        setCharacter((prev) => ({ ...prev, avatar_uri: permanentUri }));
      }
    } catch (e) {
      Alert.alert('Avatar Error', e.message || 'Something went wrong.');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const denominations = settings?.electrum_enabled
    ? ['platinum', 'gold', 'electrum', 'silver', 'copper']
    : ['platinum', 'gold', 'silver', 'copper'];

  const isCustomMode = settings?.currency_mode === 'custom';

  if (!character || !wallet || !settings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading wallet...</Text>
      </SafeAreaView>
    );
  }

  // ── Shared nav param builders ──────────────────────────────────────────────
  const standardNavParams = {
    walletId: wallet.id, characterId: character.id,
    electrumEnabled: !!settings.electrum_enabled, autoConvert: !!settings.auto_convert,
    thresholds: {
      copper:   settings.min_copper   || 0,
      silver:   settings.min_silver   || 0,
      electrum: settings.min_electrum || 0,
      gold:     settings.min_gold     || 0,
    },
  };
  const customNavParams = {
    walletId: wallet.id, characterId: character.id,
    currencyMode: 'custom', customAmounts, customDenoms,
    activeTemplateId: settings.active_template_id,
    autoConvert: !!settings.auto_convert,
  };
  const settingsParams = { characterId: character.id, walletId: wallet.id, currentSettings: settings };

  function navAdd()      { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Transaction', { ...(isCustomMode ? customNavParams : standardNavParams), type: 'add' }); }
  function navSpend()    { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Transaction', { ...(isCustomMode ? customNavParams : standardNavParams), type: 'subtract' }); }
  function navHistory()  { navigation.navigate('History',  { walletId: wallet.id }); }
  function navSettings() { navigation.navigate('Settings', settingsParams); }
  function navLoot()     { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Loot', { walletId: wallet.id, characterId: character.id }); }

  // ── Shared top UI (character card + denoms + buttons) ─────────────────────
  const TopUI = (
    <View style={styles.topSection}>

      {/* ── Character card ── */}
      <View style={styles.characterCard}>
        {/* Faint watermark chest */}
        <View style={styles.watermark} pointerEvents="none">
          <Svg width={110} height={90} opacity={0.07}>
            {/* Simple chest outline */}
            <Rect x={10} y={30} width={90} height={55} rx={6} fill="#ffd700" />
            <Rect x={10} y={30} width={90} height={22} rx={6} fill="#ffd700" />
            <Rect x={38} y={40} width={24} height={16} rx={4} fill="#0d1117" />
            <Line x1={10} y1={52} x2={100} y2={52} stroke="#0d1117" strokeWidth={2} />
          </Svg>
        </View>

        {/* Avatar — tap to change photo */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
          {character.avatar_uri ? (
            <Image source={{ uri: character.avatar_uri }} style={styles.avatarImage} />
          ) : (
            <Svg width={56} height={56}>
              <Circle cx={28} cy={28} r={27} fill="none" stroke="#ffd700" strokeWidth={1.5} />
              <Circle cx={28} cy={22} r={9} fill="#ffd700" opacity={0.85} />
              <Path d="M 10 50 Q 28 36 46 50" fill="#ffd700" opacity={0.85} />
            </Svg>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditText}>✎</Text>
          </View>
        </TouchableOpacity>

        {/* Name block */}
        <View style={styles.nameBlock}>
          <Text style={styles.campaignLabel}>{campaignName}</Text>
          <Text style={styles.characterName}>{character.name}</Text>
          {/* Decorative divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDiamond} />
            <View style={styles.dividerLine} />
          </View>
        </View>
      </View>

      {/* ── Denomination grid ── */}
      <View style={styles.denomGrid}>
        {isCustomMode
          ? customAmounts.map((row) => (
              <View key={row.denom_id} style={styles.denomCell}>
                <View style={styles.denomIconWrap}>
                  <CoinIcon denomination="gold" size={40} />
                </View>
                <View style={styles.denomText}>
                  <Text style={styles.denomName}>{row.name}</Text>
                  <Text style={styles.denomAmount}>{row.amount}</Text>
                </View>
              </View>
            ))
          : denominations.map((denom) => (
              <View key={denom} style={styles.denomCell}>
                <View style={styles.denomIconWrap}>
                  <CoinIcon denomination={denom} size={40} />
                </View>
                <View style={styles.denomText}>
                  <Text style={[styles.denomName, denomColors[denom]]}>{DISPLAY_NAMES[denom]}</Text>
                  <Text style={styles.denomAmount}>{wallet[denom]}</Text>
                </View>
              </View>
            ))
        }
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.addButton]} onPress={navAdd}>
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIconText}>+</Text>
          </View>
          <Text style={[styles.actionLabel, { color: '#4ade80' }]}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.subtractButton]} onPress={navSpend}>
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIconText}>−</Text>
          </View>
          <Text style={[styles.actionLabel, { color: '#f87171' }]}>Spend</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.historyButton]} onPress={navHistory}>
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIconText}>⟳</Text>
          </View>
          <Text style={[styles.actionLabel, { color: '#60a5fa' }]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.settingsButton]} onPress={navSettings}>
          <View style={styles.actionIconCircle}>
            <Text style={styles.actionIconText}>⚙</Text>
          </View>
          <Text style={[styles.actionLabel, { color: '#9ca3af' }]}>Settings</Text>
        </TouchableOpacity>

        {!isCustomMode && (
          <TouchableOpacity style={[styles.actionButton, styles.lootButton]} onPress={navLoot}>
            <View style={styles.actionIconCircle}>
              <Text style={styles.actionIconText}>⚔</Text>
            </View>
            <Text style={[styles.actionLabel, { color: '#fbbf24' }]}>Loot</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ── Custom currency mode — no physics ─────────────────────────────────────
  if (isCustomMode) {
    return (
      <SafeAreaView style={styles.container}>
        {TopUI}
        {!isPremium && <AdBanner />}
      </SafeAreaView>
    );
  }

  // ── Standard mode — physics world ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {TopUI}
      <View
        style={styles.physicsWorld}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          boundsRef.current = { left: 0, right: width, top: 0, bottom: height };
        }}
      >
        {coinKeys.map((key) => {
          const coin = coinStateRef.current[key];
          if (!coin) return null;
          return (
            <CoinToken
              key={key}
              denomination={coin.denomination}
              animX={coin.animX}
              animY={coin.animY}
              animRotation={coin.animRotation}
              panHandlers={getPanResponder(key).panHandlers}
            />
          );
        })}
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const denomColors = {
  copper:   { color: '#c87533' },
  silver:   { color: '#c0c0c0' },
  electrum: { color: '#5fd4e0' },
  gold:     { color: '#ffd700' },
  platinum: { color: '#d0d0e8' },
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0d1117' },
  loading:      { color: '#aaa', textAlign: 'center', marginTop: 60 },
  physicsWorld: { flex: 1 },

  topSection: { paddingHorizontal: 14, paddingTop: 10 },

  // ── Character card ──
  characterCard: {
    backgroundColor: '#0f1e33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute', right: 8, top: 4,
  },
  avatarWrap: { marginRight: 14, position: 'relative' },
  avatarImage: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5, borderColor: '#ffd700',
  },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#ffd700', borderRadius: 8,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  avatarEditText: { fontSize: 10, color: '#1a1a2e', fontWeight: 'bold' },
  nameBlock:  { flex: 1 },
  campaignLabel: { color: '#6b7280', fontSize: 12, marginBottom: 2 },
  characterName: { color: '#ffd700', fontSize: 26, fontWeight: 'bold', letterSpacing: 0.5 },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#ffd70055' },
  dividerDiamond:{
    width: 7, height: 7, backgroundColor: '#ffd700',
    transform: [{ rotate: '45deg' }], marginHorizontal: 6,
  },

  // ── Denom grid ──
  denomGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: 10,
  },
  denomCell: {
    width: '49%',
    backgroundColor: '#0f1e33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  denomIconWrap: { marginRight: 10 },
  denomText:     { flex: 1 },
  denomName:     { fontSize: 14, fontWeight: '600', color: '#e5e7eb', marginBottom: 2 },
  denomAmount:   { fontSize: 22, color: '#ffffff', fontWeight: 'bold' },

  // ── Action buttons ──
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  actionButton: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#0f1e33', borderRadius: 12,
    borderWidth: 1, borderColor: '#1e3a5f',
  },
  addButton:      { borderColor: '#166534' },
  subtractButton: { borderColor: '#7f1d1d' },
  historyButton:  { borderColor: '#1e3a5f' },
  settingsButton: { borderColor: '#1e3a5f' },
  lootButton:     { borderColor: '#78350f' },
  actionIconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a2a40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 5,
  },
  actionIconText: { color: '#fff', fontSize: 20, fontWeight: 'bold', lineHeight: 24 },
  actionLabel:    { fontSize: 12, fontWeight: '600' },
});
