import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { purchasePremium, restorePurchases } from '../utils/purchases';

export default function PremiumScreen({ navigation, route }) {
  const { onUnlock } = route.params ?? {};
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const success = await purchasePremium();
      if (success) {
        Alert.alert('Welcome to Premium!', 'You now have unlimited campaigns, custom currency, and no ads.', [
          { text: 'Awesome!', onPress: () => { onUnlock?.(); navigation.goBack(); } },
        ]);
      }
    } catch (e) {
      Alert.alert('Purchase failed', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Purchase restored!', 'Your premium access has been restored.', [
          { text: 'Great!', onPress: () => { onUnlock?.(); navigation.goBack(); } },
        ]);
      } else {
        Alert.alert('No purchase found', 'No previous premium purchase was found for this account.');
      }
    } catch (e) {
      Alert.alert('Restore failed', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.crown}>👑</Text>
      <Text style={styles.title}>Adventurer's Vault Premium</Text>
      <Text style={styles.price}>$1.99 — One-time purchase</Text>

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>What you get:</Text>
        <Text style={styles.feature}>✦  Unlimited campaigns</Text>
        <Text style={styles.feature}>✦  Custom currency systems</Text>
        <Text style={styles.feature}>✦  Remove all ads</Text>
        <Text style={styles.feature}>✦  Support an indie developer</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#ffd700" style={{ marginTop: 24 }} />
      ) : (
        <>
          <TouchableOpacity style={styles.buyButton} onPress={handlePurchase}>
            <Text style={styles.buyButtonText}>Upgrade for $1.99</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore previous purchase</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Maybe later</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', padding: 24 },
  crown:         { fontSize: 60, marginTop: 20, marginBottom: 8 },
  title:         { fontSize: 26, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginBottom: 4 },
  price:         { fontSize: 16, color: '#aaa', marginBottom: 32 },
  featuresCard:  { backgroundColor: '#16213e', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  featuresTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  feature:       { color: '#fff', fontSize: 15, marginBottom: 10 },
  buyButton:     { backgroundColor: '#ffd700', padding: 16, borderRadius: 12, width: '100%', alignItems: 'center', marginBottom: 12 },
  buyButtonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 18 },
  restoreButton: { padding: 12, width: '100%', alignItems: 'center' },
  restoreText:   { color: '#aaa', fontSize: 14 },
  cancelText:    { color: '#555', fontSize: 14, marginTop: 16 },
});
