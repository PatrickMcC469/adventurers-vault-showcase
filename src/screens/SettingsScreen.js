import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateSettings } from '../database/db';
import { getDenominationsByTemplate } from '../database/db';
import { getIsPremium } from '../utils/purchases';

const THRESHOLD_DENOMS = [
  { key: 'copper',   label: 'Copper',   color: '#b87333' },
  { key: 'silver',   label: 'Silver',   color: '#c0c0c0' },
  { key: 'electrum', label: 'Electrum', color: '#7df9ff' },
  { key: 'gold',     label: 'Gold',     color: '#ffd700' },
];

export default function SettingsScreen({ route, navigation }) {
  const { characterId, walletId, currentSettings } = route.params;

  const isCustomMode     = currentSettings.currency_mode === 'custom';
  const activeTemplateId = currentSettings.active_template_id;
  const activeDenoms     = isCustomMode && activeTemplateId
    ? getDenominationsByTemplate(activeTemplateId) : [];

  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => { getIsPremium().then(setIsPremium); }, []);

  const [autoConvert,     setAutoConvert]     = useState(!!currentSettings.auto_convert);
  const [electrumEnabled, setElectrumEnabled] = useState(!!currentSettings.electrum_enabled);
  const [thresholds,      setThresholds]      = useState({
    copper:   String(currentSettings.min_copper   ?? 0),
    silver:   String(currentSettings.min_silver   ?? 0),
    electrum: String(currentSettings.min_electrum ?? 0),
    gold:     String(currentSettings.min_gold     ?? 0),
  });

  function setThreshold(key, val) {
    setThresholds((prev) => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    updateSettings(characterId, {
      autoConvert,
      electrumEnabled,
      containerStyle: 'none',
      minCopper:   parseInt(thresholds.copper,   10) || 0,
      minSilver:   parseInt(thresholds.silver,   10) || 0,
      minElectrum: parseInt(thresholds.electrum, 10) || 0,
      minGold:     parseInt(thresholds.gold,     10) || 0,
    });
    navigation.goBack();
  }

  // Only show electrum threshold row if electrum is enabled
  const visibleThresholds = THRESHOLD_DENOMS.filter(
    (d) => d.key !== 'electrum' || electrumEnabled
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>

        {/* ── Auto-Convert toggle ── */}
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Auto-Convert</Text>
            <Text style={styles.description}>
              Automatically promote coins when you have enough (e.g. 10 SP → 1 GP)
            </Text>
          </View>
          <Switch
            value={autoConvert}
            onValueChange={setAutoConvert}
            trackColor={{ true: '#ffd700' }}
            thumbColor={autoConvert ? '#1a1a2e' : '#aaa'}
          />
        </View>

        {/* ── Minimum thresholds — only visible when auto-convert is on ── */}
        {autoConvert && (
          <View style={styles.thresholdSection}>
            <Text style={styles.thresholdHeading}>
              Minimum to keep before converting
            </Text>
            <Text style={styles.thresholdSubtext}>
              Coins above this amount will be converted up. Set to 0 to always convert.
            </Text>
            {visibleThresholds.map((d) => (
              <View key={d.key} style={styles.thresholdRow}>
                <Text style={[styles.thresholdLabel, { color: d.color }]}>{d.label}</Text>
                <TextInput
                  style={styles.thresholdInput}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  placeholder="0"
                  placeholderTextColor="#555"
                  value={thresholds[d.key]}
                  onChangeText={(val) => setThreshold(d.key, val)}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        {/* ── Electrum toggle ── */}
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Use Electrum (EP)</Text>
            <Text style={styles.description}>
              Enable the Electrum denomination (5 SP = 1 EP, 2 EP = 1 GP)
            </Text>
          </View>
          <Switch
            value={electrumEnabled}
            onValueChange={setElectrumEnabled}
            trackColor={{ true: '#ffd700' }}
            thumbColor={electrumEnabled ? '#1a1a2e' : '#aaa'}
          />
        </View>

      </View>

      {/* ── Custom Currency card ── */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.label}>Custom Currency</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>PREMIUM</Text>
              </View>
            </View>
            <Text style={styles.description}>
              Replace D&D currency with your own denomination names and conversion rates
            </Text>
          </View>
        </View>

        {isCustomMode ? (
          <View style={styles.activeCustom}>
            <Text style={styles.activeCustomLabel}>Active:</Text>
            <Text style={styles.activeCustomDenoms}>
              {activeDenoms.map((d) => d.name).join(' → ')}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => {
            if (!isPremium) {
              navigation.navigate('Premium', {});
              return;
            }
            navigation.navigate('CustomCurrency', {
              characterId,
              walletId,
              currentMode:       currentSettings.currency_mode,
              currentTemplateId: currentSettings.active_template_id,
            });
          }}
        >
          <Text style={styles.manageBtnText}>
            {!isPremium ? '👑 Unlock Custom Currency' : isCustomMode ? 'Manage Custom Currency' : 'Set Up Custom Currency'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Settings</Text>
      </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:      { padding: 20, paddingBottom: 40 },
  title:       { fontSize: 26, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginBottom: 24 },
  card:        { backgroundColor: '#16213e', borderRadius: 16, padding: 16, marginBottom: 24 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowText:     { flex: 1, marginRight: 12 },
  label:       { color: '#fff', fontSize: 16, fontWeight: '600' },
  description: { color: '#aaa', fontSize: 13, marginTop: 2 },
  divider:     { height: 1, backgroundColor: '#0f3460', marginVertical: 8 },

  thresholdSection: {
    backgroundColor: '#0f1f3d',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  thresholdHeading: { color: '#ffd700', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  thresholdSubtext: { color: '#888', fontSize: 12, marginBottom: 10 },
  thresholdRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  thresholdLabel: { fontSize: 15, fontWeight: '600', width: 80 },
  thresholdInput: {
    flex: 1, backgroundColor: '#16213e', color: '#fff',
    borderRadius: 8, padding: 8, fontSize: 15, textAlign: 'right',
  },

  saveButton: { backgroundColor: '#ffd700', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText:   { color: '#1a1a2e', fontSize: 18, fontWeight: 'bold' },

  premiumBadge: {
    backgroundColor: '#ffd700', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  premiumText:  { color: '#1a1a2e', fontSize: 10, fontWeight: 'bold' },

  activeCustom:      { backgroundColor: '#0f1f3d', borderRadius: 8, padding: 10, marginVertical: 8 },
  activeCustomLabel: { color: '#aaa', fontSize: 12, marginBottom: 2 },
  activeCustomDenoms:{ color: '#ffd700', fontSize: 14, fontWeight: '600' },

  manageBtn:     {
    backgroundColor: '#0f3460', borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 4,
  },
  manageBtnText: { color: '#ffd700', fontWeight: 'bold', fontSize: 15 },
});
