import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getCampaigns, createCampaign, deleteCampaign, renameCampaign, createCharacter } from '../database/db';
import { getIsPremium } from '../utils/purchases';
import AdBanner from '../components/AdBanner';

const FREE_TIER_LIMIT = 3;

export default function HomeScreen({ navigation }) {
  const [campaigns,      setCampaigns]      = useState([]);
  const [modalVisible,   setModalVisible]   = useState(false);
  const [campaignName,   setCampaignName]   = useState('');
  const [characterName,  setCharacterName]  = useState('');
  const [isPremium,      setIsPremium]      = useState(false);

  useEffect(() => {
    getIsPremium().then(setIsPremium);
  }, []);

  // useFocusEffect re-runs whenever this screen comes into focus
  // so the list stays fresh when you navigate back from the wallet
  useFocusEffect(
    useCallback(() => {
      setCampaigns(getCampaigns());
    }, [])
  );

  function handleCreate() {
    if (!campaignName.trim() || !characterName.trim()) {
      Alert.alert('Missing info', 'Please enter both a campaign and character name.');
      return;
    }
    const campaignId = createCampaign(campaignName.trim());
    createCharacter(campaignId, characterName.trim());
    setCampaigns(getCampaigns());
    setCampaignName('');
    setCharacterName('');
    setModalVisible(false);
  }

  function handleDelete(campaign) {
    Alert.alert(
      'Delete Campaign',
      `Delete "${campaign.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: () => {
            deleteCampaign(campaign.id);
            setCampaigns(getCampaigns());
          }
        },
      ]
    );
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.campaignRow}
        onPress={() => navigation.navigate('Wallet', { campaignId: item.id, campaignName: item.name })}
        onLongPress={() => handleDelete(item)}
      >
        <Text style={styles.campaignName}>{item.name}</Text>
        <Text style={styles.campaignArrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Adventurer's Vault</Text>
      <Text style={styles.subtitle}>Your Campaigns</Text>

      <Text style={styles.tierLabel}>
        {isPremium
          ? '👑 Premium — Unlimited campaigns'
          : `${campaigns.length}/${FREE_TIER_LIMIT} campaigns${campaigns.length >= FREE_TIER_LIMIT ? ' · Upgrade for more' : ''}`}
      </Text>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.empty}>No campaigns yet. Create one below!</Text>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          if (!isPremium && campaigns.length >= FREE_TIER_LIMIT) {
            navigation.navigate('Premium', {
              onUnlock: () => setIsPremium(true),
            });
          } else {
            setModalVisible(true);
          }
        }}
      >
        <Text style={styles.addButtonText}>+ New Campaign</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Campaign</Text>

            <Text style={styles.fieldLabel}>Campaign Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. The Lost Kingdom"
              placeholderTextColor="#555"
              value={campaignName}
              onChangeText={setCampaignName}
            />
            <Text style={styles.fieldLabel}>Player Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aldric the Bold"
              placeholderTextColor="#555"
              value={characterName}
              onChangeText={setCharacterName}
            />

            <TouchableOpacity style={styles.confirmButton} onPress={handleCreate}>
              <Text style={styles.confirmButtonText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginTop: 20 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  campaignRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#16213e', marginHorizontal: 16, marginVertical: 6,
    padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#ffd700',
  },
  campaignName: { fontSize: 18, color: '#fff', fontWeight: '600' },
  campaignArrow: { fontSize: 24, color: '#ffd700' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
  addButton: {
    margin: 16, backgroundColor: '#ffd700', padding: 16,
    borderRadius: 12, alignItems: 'center',
  },
  addButtonText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#16213e', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffd700', marginBottom: 16, textAlign: 'center' },
  input: {
    backgroundColor: '#0f3460', color: '#fff', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 16,
  },
  confirmButton: { backgroundColor: '#ffd700', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  confirmButtonText: { fontWeight: 'bold', fontSize: 16, color: '#1a1a2e' },
  cancelText: { color: '#aaa', textAlign: 'center', marginTop: 12, fontSize: 16 },
  fieldLabel: { color: '#ffd700', fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  tierLabel: { color: '#555', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  upgradeIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  upgradeBody: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});
