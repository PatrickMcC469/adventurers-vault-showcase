import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from '../database/db';
import { formatWallet } from '../utils/currency';

export default function HistoryScreen({ route }) {
  const { walletId } = route.params;
  const [transactions, setTransactions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      setTransactions(getTransactions(walletId));
    }, [walletId])
  );

  function renderItem({ item }) {
    const isAdd = item.type === 'add';
    const amountWallet = {
      copper: item.copper, silver: item.silver,
      electrum: item.electrum, gold: item.gold, platinum: item.platinum,
    };
    const isCustomTx = !item.copper && !item.silver && !item.electrum && !item.gold && !item.platinum && item.note;
    const formatted = isCustomTx ? null : formatWallet(amountWallet, !!item.electrum);
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <View style={styles.row}>
        <View style={[styles.badge, isAdd ? styles.addBadge : styles.subtractBadge]}>
          <Text style={styles.badgeText}>{isAdd ? '+' : '−'}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.amount}>{formatted ?? item.note}</Text>
          {!isCustomTx && item.note ? <Text style={styles.note}>{item.note}</Text> : null}
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffd700', textAlign: 'center', marginVertical: 20 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#16213e', marginHorizontal: 16, marginVertical: 6,
    padding: 14, borderRadius: 12,
  },
  badge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  addBadge: { backgroundColor: '#2d6a4f' },
  subtractBadge: { backgroundColor: '#6a2d2d' },
  badgeText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  rowContent: { flex: 1 },
  amount: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { color: '#aaa', fontSize: 14, marginTop: 2 },
  date: { color: '#555', fontSize: 12, marginTop: 4 },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 16 },
});
