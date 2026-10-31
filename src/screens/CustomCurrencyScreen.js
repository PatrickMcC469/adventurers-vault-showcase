import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCurrencyTemplates, createCurrencyTemplate, deleteCurrencyTemplate,
  getDenominationsByTemplate, saveTemplateDenominations,
  applyCustomCurrencyTemplate, revertToStandardCurrency,
} from '../database/db';

const MAX_DENOMS   = 6;
const DENOM_COLORS = ['#b87333','#c0c0c0','#7df9ff','#ffd700','#e5e4e2','#a78bfa'];

export default function CustomCurrencyScreen({ route, navigation }) {
  const { characterId, walletId, currentMode, currentTemplateId } = route.params;

  const [templates,     setTemplates]     = useState([]);
  const [mode,          setMode]          = useState('list'); // 'list' | 'create'
  const [templateName,  setTemplateName]  = useState('');
  const [denoms,        setDenoms]        = useState([
    { name: '', rateToNext: '' },
    { name: '', rateToNext: '' },
  ]);

  useFocusEffect(useCallback(() => {
    setTemplates(getCurrencyTemplates());
  }, []));

  // ── Denom helpers ──────────────────────────────────────────────────────────
  function addDenom() {
    if (denoms.length >= MAX_DENOMS) return;
    setDenoms((prev) => [...prev, { name: '', rateToNext: '' }]);
  }

  function removeDenom(index) {
    if (denoms.length <= 1) return;
    setDenoms((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDenom(index, field, value) {
    setDenoms((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }

  // ── Save template ──────────────────────────────────────────────────────────
  function handleSaveTemplate() {
    if (!templateName.trim()) {
      Alert.alert('Name required', 'Please give your currency set a name.');
      return;
    }
    const filled = denoms.filter((d) => d.name.trim());
    if (filled.length < 1) {
      Alert.alert('Add denominations', 'You need at least one denomination.');
      return;
    }
    // All denoms except the last need a rate
    for (let i = 0; i < filled.length - 1; i++) {
      const rate = parseInt(filled[i].rateToNext, 10);
      if (!rate || rate < 2) {
        Alert.alert(
          'Invalid rate',
          `"${filled[i].name}" needs a conversion rate of 2 or more to the next denomination.`
        );
        return;
      }
    }

    const templateId = createCurrencyTemplate(templateName.trim());
    saveTemplateDenominations(
      templateId,
      filled.map((d, i) => ({
        name:       d.name.trim(),
        orderIndex: i,
        rateToNext: i < filled.length - 1 ? parseInt(d.rateToNext, 10) : null,
      }))
    );

    setTemplates(getCurrencyTemplates());
    setMode('list');
    setTemplateName('');
    setDenoms([{ name: '', rateToNext: '' }, { name: '', rateToNext: '' }]);
  }

  // ── Apply template ─────────────────────────────────────────────────────────
  function handleApply(template) {
    const denomiList = getDenominationsByTemplate(template.id);
    const denomPreview = denomiList.map((d) => d.name).join(' → ');

    Alert.alert(
      'Switch to Custom Currency?',
      `This will clear your current wallet balance and transaction history.\n\n` +
      `Currency: ${template.name}\n${denomPreview}\n\n` +
      `Please start a new campaign or accept losing your current saved amount.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Switch',
          style: 'destructive',
          onPress: () => {
            applyCustomCurrencyTemplate(characterId, walletId, template.id);
            navigation.goBack();
          },
        },
      ]
    );
  }

  // ── Revert to standard ─────────────────────────────────────────────────────
  function handleRevertToStandard() {
    Alert.alert(
      'Switch back to Standard Currency?',
      'This will clear your custom wallet balance, transaction history, and restore D&D currency (CP/SP/GP/PP).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          style: 'destructive',
          onPress: () => {
            revertToStandardCurrency(characterId, walletId);
            navigation.goBack();
          },
        },
      ]
    );
  }

  // ── Delete template ────────────────────────────────────────────────────────
  function handleDelete(template) {
    if (template.id === currentTemplateId) {
      Alert.alert('In Use', 'This template is currently active. Switch to a different currency first.');
      return;
    }
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCurrencyTemplate(template.id);
            setTemplates(getCurrencyTemplates());
          },
        },
      ]
    );
  }

  // ── Render: create form ────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>New Currency Set</Text>
          <Text style={styles.subtitle}>
            Add denominations from lowest to highest value.
          </Text>

          <TextInput
            style={styles.nameInput}
            placeholder="Currency set name (e.g. Shadowrun Credits)"
            placeholderTextColor="#555"
            value={templateName}
            onChangeText={setTemplateName}
          />

          {denoms.map((denom, index) => (
            <View key={index} style={styles.denomRow}>
              <View style={[styles.denomDot, { backgroundColor: DENOM_COLORS[index] }]} />
              <View style={styles.denomFields}>
                <TextInput
                  style={styles.denomNameInput}
                  placeholder={`Denomination ${index + 1} name`}
                  placeholderTextColor="#555"
                  value={denom.name}
                  onChangeText={(v) => updateDenom(index, 'name', v)}
                />
                {index < denoms.length - 1 && (
                  <View style={styles.rateRow}>
                    <TextInput
                      style={styles.rateInput}
                      placeholder="Qty. = 1 of next"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      value={denom.rateToNext}
                      onChangeText={(v) => updateDenom(index, 'rateToNext', v)}
                    />
                    <Text style={styles.rateLabel}>
                      = 1 {denoms[index + 1]?.name || `Denom ${index + 2}`}
                    </Text>
                  </View>
                )}
                {index === denoms.length - 1 && (
                  <Text style={styles.highestLabel}>Highest denomination</Text>
                )}
              </View>
              {denoms.length > 1 && (
                <TouchableOpacity onPress={() => removeDenom(index)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {denoms.length < MAX_DENOMS && (
            <TouchableOpacity style={styles.addDenomBtn} onPress={addDenom}>
              <Text style={styles.addDenomText}>+ Add Denomination ({denoms.length}/{MAX_DENOMS})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTemplate}>
            <Text style={styles.saveBtnText}>Save Currency Set</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode('list')}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: template list ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Custom Currency</Text>

        {/* Current mode indicator */}
        {currentMode === 'custom' && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>✓ Using Custom Currency</Text>
            <TouchableOpacity onPress={handleRevertToStandard}>
              <Text style={styles.revertText}>Switch back to D&D standard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved templates */}
        {templates.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Saved Currency Sets</Text>
            {templates.map((t) => {
              const isActive = t.id === currentTemplateId;
              const denomList = getDenominationsByTemplate(t.id);
              return (
                <View key={t.id} style={[styles.templateCard, isActive && styles.activeCard]}>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>
                      {t.name} {isActive ? '✓' : ''}
                    </Text>
                    <Text style={styles.templateDenoms}>
                      {denomList.map((d) => d.name).join(' → ')}
                    </Text>
                  </View>
                  <View style={styles.templateActions}>
                    {!isActive && (
                      <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(t)}>
                        <Text style={styles.applyBtnText}>Apply</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(t)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {templates.length === 0 && (
          <Text style={styles.emptyText}>
            No custom currency sets yet. Create one below to get started.
          </Text>
        )}

        <TouchableOpacity style={styles.createBtn} onPress={() => setMode('create')}>
          <Text style={styles.createBtnText}>+ Create New Currency Set</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#1a1a2e' },
  scroll:       { padding: 20 },
  title:        { fontSize: 26, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginBottom: 6 },
  subtitle:     { color: '#aaa', textAlign: 'center', fontSize: 13, marginBottom: 20 },

  activeBanner: {
    backgroundColor: '#2d6a4f', borderRadius: 10, padding: 12,
    marginBottom: 20, alignItems: 'center',
  },
  activeBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  revertText:       { color: '#aaffcc', fontSize: 13, marginTop: 4 },

  sectionHeader: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  templateCard:  {
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
  },
  activeCard:    { borderWidth: 1, borderColor: '#ffd700' },
  templateInfo:  { flex: 1 },
  templateName:  { color: '#fff', fontSize: 16, fontWeight: '600' },
  templateDenoms:{ color: '#aaa', fontSize: 12, marginTop: 3 },
  templateActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  applyBtn:      { backgroundColor: '#ffd700', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  applyBtnText:  { color: '#1a1a2e', fontWeight: 'bold', fontSize: 13 },
  deleteBtn:     { backgroundColor: '#6a2d2d', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { color: '#fff', fontWeight: 'bold' },

  emptyText:    { color: '#555', textAlign: 'center', marginVertical: 24, fontSize: 14 },
  createBtn:    {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#ffd700',
  },
  createBtnText: { color: '#ffd700', fontWeight: 'bold', fontSize: 16 },

  // Create form
  nameInput: {
    backgroundColor: '#16213e', color: '#fff', borderRadius: 10,
    padding: 12, fontSize: 16, marginBottom: 20,
  },
  denomRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  denomDot:    { width: 14, height: 14, borderRadius: 7, marginTop: 4, marginRight: 10 },
  denomFields: { flex: 1 },
  denomNameInput: {
    backgroundColor: '#0f1f3d', color: '#fff', borderRadius: 8,
    padding: 10, fontSize: 15, marginBottom: 8,
  },
  rateRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateInput:    {
    backgroundColor: '#0f1f3d', color: '#fff', borderRadius: 8,
    padding: 8, fontSize: 14, width: 60, textAlign: 'center',
  },
  rateLabel:    { color: '#aaa', fontSize: 13, flex: 1 },
  highestLabel: { color: '#ffd700', fontSize: 12, fontStyle: 'italic' },
  removeBtn:    { paddingLeft: 10, paddingTop: 2 },
  removeBtnText:{ color: '#ff4444', fontSize: 18, fontWeight: 'bold' },

  addDenomBtn:  {
    borderWidth: 1, borderColor: '#ffd700', borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 16,
  },
  addDenomText: { color: '#ffd700', fontSize: 14 },

  saveBtn:      { backgroundColor: '#ffd700', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  saveBtnText:  { color: '#1a1a2e', fontSize: 18, fontWeight: 'bold' },
  cancelText:   { color: '#aaa', textAlign: 'center', fontSize: 16 },
});
