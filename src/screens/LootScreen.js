import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LOOT_TIERS, calculateLoot } from '../utils/lootEngine';
import { logTransaction, updateWallet, getWalletByCharacter } from '../database/db';

export default function LootScreen({ route, navigation }) {
  const { walletId, characterId } = route.params;

  const [selectedTier, setSelectedTier] = useState(0);
  const [rollInput, setRollInput]       = useState('');
  const [result, setResult]             = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  function handleRoll() {
    const roll = parseInt(rollInput, 10);
    if (isNaN(roll) || roll < 1 || roll > 20) {
      alert('Enter a roll between 1 and 20.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const outcome = calculateLoot(selectedTier, roll);
    setResult(outcome);
    setModalVisible(true);

    if (!outcome.isNat1) {
      const wallet = getWalletByCharacter(characterId);
      if (wallet) {
        const updated = {
          copper:   (wallet.copper   || 0) + outcome.loot.copper,
          silver:   (wallet.silver   || 0) + outcome.loot.silver,
          electrum: (wallet.electrum || 0) + outcome.loot.electrum,
          gold:     (wallet.gold     || 0) + outcome.loot.gold,
          platinum: (wallet.platinum || 0) + outcome.loot.platinum,
        };
        updateWallet(wallet.id, updated);
        logTransaction(
          walletId,
          'add',
          outcome.loot,
          `Loot the Room — ${LOOT_TIERS[selectedTier].name}, roll ${roll}${outcome.isNat20 ? ' (NAT 20!)' : ''}`,
        );
      }
    }
  }

  function closeModal() {
    setModalVisible(false);
    setRollInput('');
    if (result && !result.isNat1) {
      navigation.goBack();
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <Text style={styles.title}>Loot the Room</Text>
          <Text style={styles.subtitle}>Select a tier, then enter your investigation roll.</Text>

          {/* Tier picker */}
          <Text style={styles.sectionLabel}>Room / Enemy Tier</Text>
          {LOOT_TIERS.map((tier, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.tierRow, selectedTier === idx && styles.tierRowSelected]}
              onPress={() => setSelectedTier(idx)}
              activeOpacity={0.8}
            >
              <View style={[styles.tierDot, selectedTier === idx && styles.tierDotSelected]} />
              <View>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierRange}>{tierSummary(tier)}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Roll input */}
          <Text style={styles.sectionLabel}>Your Investigation Roll (1–20)</Text>
          <TextInput
            style={styles.rollInput}
            keyboardType="number-pad"
            placeholder="e.g. 14"
            placeholderTextColor="#555"
            maxLength={2}
            value={rollInput}
            onChangeText={setRollInput}
          />

          <TouchableOpacity style={styles.rollButton} onPress={handleRoll} activeOpacity={0.85}>
            <Text style={styles.rollButtonText}>Roll for Loot</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Result modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, result?.isNat1 && styles.modalCardFail, result?.isNat20 && styles.modalCardNat20]}>

            {result?.isNat20 && <Text style={styles.nat20Banner}>NATURAL 20!</Text>}
            {result?.isNat1  && <Text style={styles.nat1Banner}>NATURAL 1</Text>}

            {result?.flavor && (
              <Text style={styles.flavorText}>{result.flavor}</Text>
            )}

            {result && !result.isNat1 && (
              <View style={styles.lootGrid}>
                {result.loot.copper   > 0 && <LootRow label="Copper"   value={result.loot.copper}   color="#c87533" />}
                {result.loot.silver   > 0 && <LootRow label="Silver"   value={result.loot.silver}   color="#c0c0c0" />}
                {result.loot.gold     > 0 && <LootRow label="Gold"     value={result.loot.gold}     color="#ffd700" />}
                {result.loot.platinum > 0 && <LootRow label="Platinum" value={result.loot.platinum} color="#d0d0e8" />}
                {result.loot.copper === 0 && result.loot.silver === 0 &&
                 result.loot.gold === 0   && result.loot.platinum === 0 && (
                  <Text style={styles.emptyLoot}>Nothing of value found.</Text>
                )}
              </View>
            )}

            {result && !result.isNat1 && (
              <Text style={styles.savedNote}>Added to your wallet and history.</Text>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LootRow({ label, value, color }) {
  return (
    <View style={styles.lootRow}>
      <Text style={[styles.lootLabel, { color }]}>{label}</Text>
      <Text style={styles.lootValue}>{value}</Text>
    </View>
  );
}

function tierSummary(tier) {
  const parts = [];
  if (tier.maxCopper   > 0) parts.push(`${tier.minCopper}–${tier.maxCopper} CP`);
  if (tier.maxSilver   > 0) parts.push(`${tier.minSilver}–${tier.maxSilver} SP`);
  if (tier.maxGold     > 0) parts.push(`${tier.minGold}–${tier.maxGold} GP`);
  if (tier.maxPlat     > 0) parts.push(`${tier.minPlat}–${tier.maxPlat} PP`);
  return parts.join('  ·  ') || 'Nothing';
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0d1117' },
  content:    { padding: 20, paddingBottom: 40 },

  title:      { fontSize: 26, fontWeight: 'bold', color: '#ffd700', marginBottom: 4 },
  subtitle:   { fontSize: 13, color: '#9ca3af', marginBottom: 24 },

  sectionLabel: { fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 8 },

  tierRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  tierRowSelected: { borderColor: '#ffd700' },
  tierDot:         { width: 12, height: 12, borderRadius: 6, backgroundColor: '#374151', marginRight: 12 },
  tierDotSelected: { backgroundColor: '#ffd700' },
  tierName:        { color: '#f3f4f6', fontWeight: '600', fontSize: 15 },
  tierRange:       { color: '#6b7280', fontSize: 12, marginTop: 2 },

  rollInput: {
    backgroundColor: '#16213e', borderRadius: 10, borderWidth: 1, borderColor: '#374151',
    color: '#f3f4f6', fontSize: 22, fontWeight: 'bold', textAlign: 'center',
    paddingVertical: 14, paddingHorizontal: 20, marginBottom: 20,
  },

  rollButton:     { backgroundColor: '#ffd700', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  rollButtonText: { color: '#0d1117', fontWeight: 'bold', fontSize: 17 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard:     { backgroundColor: '#16213e', borderRadius: 16, padding: 28, width: '100%', borderWidth: 1, borderColor: '#374151' },
  modalCardFail:   { borderColor: '#f87171' },
  modalCardNat20:  { borderColor: '#ffd700' },

  nat20Banner: { fontSize: 20, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginBottom: 12 },
  nat1Banner:  { fontSize: 20, fontWeight: 'bold', color: '#f87171', textAlign: 'center', marginBottom: 12 },
  flavorText:  { color: '#d1d5db', fontSize: 15, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },

  lootGrid:   { marginBottom: 16 },
  lootRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  lootLabel:  { fontSize: 16, fontWeight: '600' },
  lootValue:  { fontSize: 16, color: '#f3f4f6', fontWeight: 'bold' },
  emptyLoot:  { color: '#6b7280', textAlign: 'center', paddingVertical: 10 },

  savedNote:    { color: '#4ade80', fontSize: 12, textAlign: 'center', marginBottom: 16 },
  closeButton:  { backgroundColor: '#ffd700', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  closeButtonText: { color: '#0d1117', fontWeight: 'bold', fontSize: 16 },
});
