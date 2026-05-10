import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';

export default function DrawerScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Native State Management: Listen to Firebase directly
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Fetching user's non-deleted transactions for the ledger
    const txQuery = query(
      collection(db, 'transactions'),
      where('agentId', '==', auth.currentUser.uid),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(txQuery, (snapshot) => {
      const txList: any[] = [];
      snapshot.forEach((doc) => {
        txList.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort newest first based on the internal ID timestamp from your web app
      txList.sort((a, b) => (b.id || 0) - (a.id || 0));
      
      setTransactions(txList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching native ledger:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Desk Actions</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 20 }}>💵</Text>
            </View>
            <Text style={styles.actionText}>Cash Actions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
              <Text style={{ fontSize: 20 }}>🔄</Text>
            </View>
            <Text style={styles.actionText}>Desk Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
              <Text style={{ fontSize: 20 }}>📦</Text>
            </View>
            <Text style={styles.actionText}>+ Main Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={{ fontSize: 20 }}>↩️</Text>
            </View>
            <Text style={styles.actionText}>− Return Stock</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Close Desk</Text>
        </TouchableOpacity>

        <View style={styles.ledgerHeader}>
          <Text style={styles.ledgerTitle}>DESK LEDGER</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions found.</Text>
        ) : (
          transactions.map((tx, index) => {
            const isOutflow = tx.type === 'adjustment' || tx.type === 'transfer_out';
            const amtColor = isOutflow ? '#ef4444' : '#0f172a';
            const amtPrefix = isOutflow ? '− ' : '';
            
            return (
              <View key={tx.docId || index} style={styles.txCard}>
                <View style={styles.txIconBox}>
                  <Text style={styles.txQty}>{tx.qty}x</Text>
                </View>
                <View style={styles.txDetails}>
                  <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
                  <Text style={styles.txMeta}>{tx.time} • {tx.payment}</Text>
                </View>
                <Text style={[styles.txAmount, { color: amtColor }]}>
                  {amtPrefix}{Math.abs(tx.amount || 0)}
                </Text>
              </View>
            );
          })
        )}

        {/* Bottom padding so scroll doesn't cut off behind the tab bar */}
        <View style={{ height: 100 }} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24, marginTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  closeBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  closeBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  ledgerHeader: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12, marginBottom: 12 },
  ledgerTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 20, fontStyle: 'italic' },
  txCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, alignItems: 'center' },
  txIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txQty: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  txDetails: { flex: 1, justifyContent: 'center' },
  txName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  txMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  txAmount: { fontSize: 18, fontWeight: '800' }
});