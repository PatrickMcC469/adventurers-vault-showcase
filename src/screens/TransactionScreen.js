import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { updateWallet, logTransaction, getWalletByCharacter, updateCustomWalletAmounts } from '../database/db';
import { addToWallet, subtractFromWallet } from '../utils/currency';
import { DISPLAY_NAMES, DENOMINATIONS } from '../constants/currency';

export default function TransactionScreen({ route, navigation }) {
  const {
    walletId, characterId, type,
    electrumEnabled, autoConvert, thresholds = {},
    // custom currency params
    currencyMode = 'standard',
    customAmounts = [], customDenoms = [],
  } = route.params;

  const isCustom = currencyMode === 'custom';

  // ── Standard mode state ────────────────────────────────────────────────────
  const [amounts, setAmounts] = useState(
    { copper: '', silver: '', electrum: '', gold: '', platinum: '' }
  );

  // ── Custom mode state ──────────────────────────────────────────────────────
  const [customInputs, setCustomInputs] = useState(
    Object.fromEntries(customDenoms.map((d) => [d.id, '']))
  );

  const [note, setNote] = useState('');

  const denominations = electrumEnabled
    ? ['platinum', 'gold', 'electrum', 'silver', 'copper']
    : ['platinum', 'gold', 'silver', 'copper'];

  // ── Standard confirm ───────────────────────────────────────────────────────
  function handleStandardConfirm() {
    const amountWallet = {};
    DENOMINATIONS.forEach((d) => { amountWallet[d] = parseInt(amounts[d], 10) || 0; });
    const totalEntered = Object.values(amountWallet).reduce((a, b) => a + b, 0);
    if (totalEntered === 0) {
      Alert.alert('No amount entered', 'Please enter at least one coin amount.');
      return;
    }

    const currentWallet = getWalletByCharacter(characterId);

    if (type === 'add') {
      const newWallet = addToWallet(currentWallet, amountWallet, autoConvert, electrumEnabled, thresholds);
      updateWallet(walletId, newWallet);
      logTransaction(walletId, 'add', amountWallet, note.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).then(() => navigation.goBack());
    } else {
      const result = subtractFromWallet(currentWallet, amountWallet, electrumEnabled);
      if (!result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Not enough coin", "You don't have enough currency for this transaction.");
        return;
      }
      updateWallet(walletId, result.wallet);
      logTransaction(walletId, 'subtract', amountWallet, note.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).then(() => navigation.goBack());
    }
  }

  // ── Custom confirm ─────────────────────────────────────────────────────────
  function handleCustomConfirm() {
    const inputs = customDenoms.map((d) => ({
      denomId: d.id,
      name:    d.name,
      entered: parseInt(customInputs[d.id], 10) || 0,
      rateToNext: d.rate_to_next,
      orderIndex: d.order_index,
    }));

    const totalEntered = inputs.reduce((a, b) => a + b.entered, 0);
    if (totalEntered === 0) {
      Alert.alert('No amount entered', 'Please enter at least one amount.');
      return;
    }

    // Build current amounts map: denomId -> amount
    const currentMap = {};
    customAmounts.forEach((row) => { currentMap[row.denom_id] = row.amount; });

    if (type === 'add') {
      // Add entered amounts then auto-convert up using custom rates
      const newMap = { ...currentMap };
      inputs.forEach(({ denomId, entered }) => {
        newMap[denomId] = (newMap[denomId] || 0) + entered;
      });

      if (autoConvert) {
        // Cascade up using custom rates (lowest → highest)
        for (let i = 0; i < customDenoms.length - 1; i++) {
          const curr = customDenoms[i];
          const next = customDenoms[i + 1];
          const rate = curr.rate_to_next;
          if (!rate || rate < 2) continue;
          const promote = Math.floor(newMap[curr.id] / rate);
          if (promote > 0) {
            newMap[curr.id] -= promote * rate;
            newMap[next.id] = (newMap[next.id] || 0) + promote;
          }
        }
      }

      const updates = Object.entries(newMap).map(([denomId, amount]) => ({
        denomId: parseInt(denomId, 10), amount,
      }));
      updateCustomWalletAmounts(characterId, updates);
      const addSummary = inputs.filter(i => i.entered > 0).map(i => `${i.entered} ${i.name}`).join(', ');
      logTransaction(walletId, 'add', { copper:0, silver:0, electrum:0, gold:0, platinum:0 }, addSummary + (note.trim() ? ` — ${note.trim()}` : ''));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).then(() => navigation.goBack());

    } else {
      // Check if player can afford it (compare in base units)
      // Convert everything to the lowest denomination value
      function toBase(map) {
        let total = 0;
        let multiplier = 1;
        for (let i = 0; i < customDenoms.length; i++) {
          const d = customDenoms[i];
          total += (map[d.id] || 0) * multiplier;
          if (d.rate_to_next) multiplier *= d.rate_to_next;
        }
        return total;
      }

      // Build cost map
      const costMap = {};
      inputs.forEach(({ denomId, entered }) => { costMap[denomId] = entered; });

      if (toBase(costMap) > toBase(currentMap)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Not enough", "You don't have enough currency for this transaction.");
        return;
      }

      // Subtract: convert everything to base, subtract, rebuild
      const ownedBase = toBase(currentMap);
      const costBase  = toBase(costMap);
      let remaining   = ownedBase - costBase;

      const newMap = {};
      let multiplier = 1;
      const multipliers = [];
      for (let i = 0; i < customDenoms.length; i++) {
        multipliers.push(multiplier);
        if (customDenoms[i].rate_to_next) multiplier *= customDenoms[i].rate_to_next;
      }
      // Rebuild from highest to lowest
      for (let i = customDenoms.length - 1; i >= 0; i--) {
        const d = customDenoms[i];
        const val = Math.floor(remaining / multipliers[i]);
        newMap[d.id] = val;
        remaining -= val * multipliers[i];
      }

      const updates = Object.entries(newMap).map(([denomId, amount]) => ({
        denomId: parseInt(denomId, 10), amount,
      }));
      updateCustomWalletAmounts(characterId, updates);
      const subtractSummary = inputs.filter(i => i.entered > 0).map(i => `${i.entered} ${i.name}`).join(', ');
      logTransaction(walletId, 'subtract', { copper:0, silver:0, electrum:0, gold:0, platinum:0 }, subtractSummary + (note.trim() ? ` — ${note.trim()}` : ''));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).then(() => navigation.goBack());
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>
          {type === 'add' ? '+ Add' : '− Spend'}
        </Text>

        {isCustom ? (
          // Custom denomination inputs
          customDenoms.map((denom) => (
            <View key={denom.id} style={styles.row}>
              <Text style={[styles.denomLabel, { color: '#ffd700' }]}>{denom.name}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={customInputs[denom.id]}
                onChangeText={(val) => {
                  const n = parseInt(val, 10);
                  const capped = isNaN(n) ? '' : String(Math.min(n, 999999));
                  setCustomInputs((prev) => ({ ...prev, [denom.id]: capped }));
                }}
              />
            </View>
          ))
        ) : (
          // Standard D&D denomination inputs
          denominations.map((denom) => (
            <View key={denom} style={styles.row}>
              <Text style={[styles.denomLabel, denomColors[denom]]}>{DISPLAY_NAMES[denom]}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                value={amounts[denom]}
                onChangeText={(val) => {
                  const n = parseInt(val, 10);
                  const capped = isNaN(n) ? '' : String(Math.min(n, 999999));
                  setAmounts((prev) => ({ ...prev, [denom]: capped }));
                }}
              />
            </View>
          ))
        )}

        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="Note (e.g. Paid blacksmith, Quest reward)"
          placeholderTextColor="#666"
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity
          style={[styles.confirmButton, type === 'add' ? styles.addColor : styles.subtractColor]}
          onPress={isCustom ? handleCustomConfirm : handleStandardConfirm}
        >
          <Text style={styles.confirmText}>
            {type === 'add' ? 'Add to Wallet' : 'Spend from Wallet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const denomColors = {
  copper:   { color: '#b87333' },
  silver:   { color: '#c0c0c0' },
  electrum: { color: '#7df9ff' },
  gold:     { color: '#ffd700' },
  platinum: { color: '#e5e4e2' },
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:         { padding: 24 },
  title:          { fontSize: 26, fontWeight: 'bold', color: '#ffd700', marginBottom: 24, textAlign: 'center' },
  row:            { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  denomLabel:     { fontSize: 18, fontWeight: 'bold', width: 90 },
  input: {
    flex: 1, backgroundColor: '#16213e', color: '#fff',
    borderRadius: 8, padding: 12, fontSize: 18,
  },
  noteInput:      { marginTop: 8, marginBottom: 24 },
  confirmButton:  { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  addColor:       { backgroundColor: '#2d6a4f' },
  subtractColor:  { backgroundColor: '#6a2d2d' },
  confirmText:    { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelText:     { color: '#aaa', textAlign: 'center', fontSize: 16 },
});
