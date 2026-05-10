import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { useAppState } from '../../src/core/StateContext';

const CASH_ACTIONS = [
  { label: 'Manager Float (Cash In)', value: 'receive_float' },
  { label: 'Handset Cash (Cash In)', value: 'handset_cash' },
  { label: 'Manager Drop (Cash Out)', value: 'drop_manager' },
  { label: 'Expense / Donation (Cash Out)', value: 'expense' }
];

export default function DrawerScreen() {
  const appState = useAppState(); // Hook into our new global state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCashModalVisible, setCashModalVisible] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashAction, setCashAction] = useState('receive_float');

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

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
      
      txList.sort((a, b) => (b.id || 0) - (a.id || 0));
      setTransactions(txList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching native ledger:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveCash = async () => {
    const amount = parseFloat(cashAmount) || 0;
    if (amount <= 0) { 
      Alert.alert("Invalid Input", "Enter a valid amount."); 
      return; 
    }
    
    // Safety check replicated from legacy code
    if (!appState.currentSessionId && appState.currentDeskId !== 'sandbox') { 
      Alert.alert("Error", "Desk not open."); 
      return; 
    }

    const isCashIn = cashAction === 'receive_float' || cashAction === 'handset_cash';
    const finalValue = isCashIn ? amount : -amount;

    let txName = 'Cash Adjustment';
    let paymentLabel = '';

    if (cashAction === 'drop_manager') { txName = 'Manager Drop'; paymentLabel = 'Dropped to Manager'; }
    else if (cashAction === 'expense') { txName = 'Expense / Donation'; paymentLabel = 'Cash Out'; }
    else if (cashAction === 'handset_cash') { txName = 'Handset Cash'; paymentLabel = 'Cash In (Holding)'; }
    else if (cashAction === 'receive_float') { txName = 'Manager Float'; paymentLabel = 'Cash In (Float)'; }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    const tx = {
      id: Date.now(), 
      receiptNo: 'TX-' + Math.floor(Math.random() * 1000000), // Native random fallback until helpers are ported
      type: 'adjustment', 
      name: txName, 
      trackAs: 'Physical Cash', 
      amount: amount, 
      qty: 1,
      payment: paymentLabel, 
      cashAmt: finalValue, 
      mfsAmt: 0, 
      isDeleted: false,
      time: timeStr,
      dateStr: dateStr, 
      deskId: appState.currentDeskId || 'unknown', 
      sessionId: appState.currentSessionId || 'unknown', 
      agentId: auth.currentUser?.uid || 'unknown', 
      agentName: appState.userNickname || appState.userDisplayName || 'Agent'
    };

    try {
      await addDoc(collection(db, 'transactions'), tx);
      setCashModalVisible(false);
      setCashAmount('');
      setCashAction('receive_float'); // reset
      Alert.alert("Success", `${txName} Logged!`);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save cash action.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Desk Actions</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => setCashModalVisible(true)}
          >
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

        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* NATIVE MODAL FOR CASH ACTIONS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCashModalVisible}
        onRequestClose={() => setCashModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manager Cash Action</Text>
            
            <Text style={styles.inputLabel}>Amount (Tk)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="0"
              value={cashAmount}
              onChangeText={setCashAmount}
            />

            <Text style={styles.inputLabel}>Action Type</Text>
            <View style={styles.radioGroup}>
              {CASH_ACTIONS.map((option) => (
                <TouchableOpacity 
                  key={option.value} 
                  style={[styles.radioBtn, cashAction === option.value && styles.radioBtnActive]}
                  onPress={() => setCashAction(option.value)}
                >
                  <Text style={[styles.radioText, cashAction === option.value && styles.radioTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCashModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveCash}>
                <Text style={styles.modalSaveText}>Save Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  txAmount: { fontSize: 18, fontWeight: '800' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  radioGroup: { gap: 8, marginBottom: 24 },
  radioBtn: { padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  radioBtnActive: { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff' },
  radioText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  radioTextActive: { color: '#0369a1', fontWeight: '700' },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  modalSaveBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 16 }
});