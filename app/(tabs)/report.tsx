import { db } from '@/src/config/firebase';
import { useAppState } from '@/src/core/StateContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Helper for exact date matching
const getStrictDate = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function ReportScreen() {
  const { appState, updateAppState } = useAppState();
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // --- REAL-TIME DATA SYNC ---
  useEffect(() => {
    if (!appState.currentSessionId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'), 
      where('sessionId', '==', appState.currentSessionId),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appState.currentSessionId]);

  // --- REPORT MATH (Matches your PWA logic exactly) ---
  const openingCash = appState.currentOpeningCash || 0;
  
  // Sales (Excluding adjustments/transfers)
  const cashSales = transactions
    .filter(t => t.type !== 'adjustment' && t.type !== 'transfer_out' && t.type !== 'transfer_in')
    .reduce((sum, tx) => sum + (tx.cashAmt || 0), 0);
  
  // Manager Drops / Adjustments
  const adjustments = transactions
    .filter(t => t.type === 'adjustment')
    .reduce((sum, tx) => sum + (tx.cashAmt || 0), 0);

  const expectedCash = openingCash + cashSales + adjustments;
  const mfsTotal = transactions.reduce((sum, tx) => sum + (tx.mfsAmt || 0), 0);
  const ersTotal = transactions.filter(t => t.name === 'ERS Flexiload').reduce((sum, tx) => sum + (tx.amount || 0), 0);

  // --- CLOSE DESK LOGIC ---
  const closeDesk = () => {
    Alert.alert(
      "Close Shift",
      `Are you sure? You are expected to hand over ${expectedCash} Tk. This will permanently seal your desk.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "SEAL DESK", 
          style: "destructive", 
          onPress: executeCloseDesk 
        }
      ]
    );
  };

  const executeCloseDesk = async () => {
    setIsClosing(true);
    try {
      // 1. Save the EOD Report Snapshot
      await setDoc(doc(collection(db, 'eod_reports')), {
        deskId: appState.currentDeskId,
        sessionId: appState.currentSessionId,
        dateStr: getStrictDate(),
        submittedBy: appState.userNickname || appState.userDisplayName || 'Agent',
        submittedAt: serverTimestamp(),
        expectedClosing: { cash: expectedCash, inventory: appState.currentOpeningInv }, // Passing opening inv for now
        actualClosing: { cash: expectedCash, inventory: appState.currentOpeningInv }, // One-click close logic
        variance: 0,
        managerDrop: expectedCash,
      });

      // 2. Mark Session as Closed
      await updateDoc(doc(db, 'sessions', appState.currentSessionId), {
        status: 'closed', closedAt: serverTimestamp()
      });

      // 3. Detach Desk Pointer
      await updateDoc(doc(db, 'desks', appState.currentDeskId), {
        status: 'closed', currentSessionId: null
      });

      // 4. Release User Lock
      if (appState.currentUser?.uid) {
        await updateDoc(doc(db, 'users', appState.currentUser.uid), {
          assignedDeskId: null, assignedDate: null
        });
      }

      // 5. Clear Local State & Redirect
      updateAppState({
        currentDeskId: null,
        currentSessionId: null,
        currentDeskName: '',
        currentOpeningCash: 0,
        currentOpeningInv: {}
      });

      Alert.alert("Shift Complete", "Your desk has been successfully sealed.");
      router.replace('/floor'); // Send back to the floor map

    } catch (error) {
      console.error("Failed to close desk:", error);
      Alert.alert("Error", "Could not seal desk. Please check your connection.");
    } finally {
      setIsClosing(false);
    }
  };

  // --- UI RENDER ---
  if (!appState.currentSessionId) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="lock-outline" size={64} color="#cbd5e1" />
        <Text style={styles.emptyText}>No Active Desk</Text>
        <Text style={styles.subText}>Join a desk from the Floor Map to view your report.</Text>
      </View>
    );
  }

  if (loading || isClosing) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>{appState.currentDeskName} Report</Text>

      {/* Cash Formula Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Cash Reconciliation</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Opening Float:</Text>
          <Text style={styles.value}>{openingCash} Tk</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>(+) Cash Sales:</Text>
          <Text style={[styles.value, { color: '#10b981' }]}>+{cashSales} Tk</Text>
        </View>
        <View style={[styles.row, styles.borderBottom]}>
          <Text style={styles.label}>(+/-) Manager Drops:</Text>
          <Text style={[styles.value, { color: adjustments < 0 ? '#ef4444' : '#0f172a' }]}>{adjustments} Tk</Text>
        </View>
        <View style={styles.rowTotal}>
          <Text style={styles.totalLabel}>Expected Drawer:</Text>
          <Text style={styles.totalValue}>{expectedCash} Tk</Text>
        </View>
      </View>

      {/* Digital Sales Cards */}
      <View style={styles.grid}>
        <View style={[styles.card, styles.gridCard]}>
          <Text style={styles.gridLabel}>Total MFS</Text>
          <Text style={[styles.gridValue, { color: '#8b5cf6' }]}>{mfsTotal} Tk</Text>
        </View>
        <View style={[styles.card, styles.gridCard]}>
          <Text style={styles.gridLabel}>ERS Sent</Text>
          <Text style={[styles.gridValue, { color: '#f59e0b' }]}>{ersTotal} Tk</Text>
        </View>
      </View>

      {/* Close Shift Button */}
      <TouchableOpacity style={styles.closeBtn} onPress={closeDesk}>
        <MaterialIcons name="lock" size={24} color="white" />
        <Text style={styles.closeBtnText}>CONFIRM & SEAL DESK</Text>
      </TouchableOpacity>

      <View style={{height: 50}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24, marginTop: 40 },
  emptyText: { fontSize: 22, fontWeight: '700', color: '#475569', marginTop: 16 },
  subText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { backgroundColor: '#f1f5f9', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#334155', textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderStyle: 'dashed' },
  label: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  rowTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, backgroundColor: '#f8fafc' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  totalValue: { fontSize: 20, fontWeight: '900', color: '#0ea5e9' },

  grid: { flexDirection: 'row', gap: 12 },
  gridCard: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'flex-start' },
  gridLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  gridValue: { fontSize: 22, fontWeight: '800' },

  closeBtn: { backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 10, marginTop: 20, elevation: 3 },
  closeBtnText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});