import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { useAppState } from '../../src/core/StateContext';
import { getPhysicalItems } from '../../src/features/inventory';
import { getStrictDate } from '../../src/utils/helpers';

export default function ReportScreen() {
  const appState = useAppState();
  const [reportMode, setReportMode] = useState<'personal' | 'floor'>('personal');
  const [targetDate, setTargetDate] = useState(getStrictDate());
  const [loading, setLoading] = useState(true);

  // Stats State
  const [salesStats, setSalesStats] = useState({ cash: 0, mfs: 0, ers: 0, total: 0 });
  const [itemsSold, setItemsSold] = useState<Record<string, number>>({});
  const [inventoryStats, setInventoryStats] = useState<Record<string, any>>({});
  const [vaultSessions, setVaultSessions] = useState<any[]>([]);
  const [floorOpeningCash, setFloorOpeningCash] = useState(0);
  const [floorManagerDrops, setFloorManagerDrops] = useState(0);

  useEffect(() => {
    // If manager/admin, default to floor mode as per legacy rule
    if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') {
      setReportMode('floor');
    }
  }, [appState.currentUserRole]);

  useEffect(() => {
    setLoading(true);
    const dateStr = targetDate;

    // 1. Fetch Transactions for the Summary
    const txQuery = query(collection(db, 'transactions'), where('dateStr', '==', dateStr), where('isDeleted', '==', false));

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      let cash = 0, mfs = 0, ers = 0;
      let items: Record<string, number> = {};
      let drops = 0;
      
      const invGroups = appState.globalInventoryGroups || [];
      let inv: Record<string, any> = {};
      getPhysicalItems(appState).forEach(item => {
        inv[item] = { open: 0, inOut: 0, sold: 0, rem: 0 };
      });

      snapshot.forEach((doc) => {
        const tx = doc.data();
        const isMyAction = tx.agentId === auth.currentUser?.uid;
        const isMyDeskTransfer = appState.currentDeskId && tx.deskId === appState.currentDeskId && (tx.type === 'transfer_in' || tx.type === 'transfer_out');

        // Mode Filtering
        if (reportMode === 'personal' && !isMyAction && !isMyDeskTransfer) return;

        const safeCashAmt = tx.cashAmt !== undefined ? tx.cashAmt : (tx.payment === 'Cash' ? tx.amount : 0);
        const safeMfsAmt = tx.mfsAmt !== undefined ? tx.mfsAmt : (tx.payment === 'MFS' ? tx.amount : 0);

        if (tx.type === 'adjustment' && tx.name === 'Physical Cash') {
          drops += safeCashAmt;
        } else if (tx.type !== 'adjustment' && tx.type !== 'transfer_out' && tx.type !== 'transfer_in') {
          cash += safeCashAmt;
          mfs += safeMfsAmt;
          if (tx.name === 'ERS Flexiload') {
            ers += tx.amount;
          } else {
            items[tx.name] = (items[tx.name] || 0) + Math.abs(tx.qty);
          }
        }

        // Inventory Calculation
        if (invGroups.includes(tx.trackAs)) {
          const q = Math.abs(tx.qty);
          if (!inv[tx.trackAs]) inv[tx.trackAs] = { open: 0, inOut: 0, sold: 0, rem: 0 };
          
          if (tx.type === 'transfer_in') { inv[tx.trackAs].inOut += q; inv[tx.trackAs].rem += q; }
          else if (tx.type === 'transfer_out') { inv[tx.trackAs].inOut -= q; inv[tx.trackAs].rem -= q; }
          else if (tx.type === 'adjustment') { inv[tx.trackAs].inOut += q; inv[tx.trackAs].rem += q; }
          else { inv[tx.trackAs].sold += q; inv[tx.trackAs].rem -= q; }
        }
      });

      setSalesStats({ cash, mfs, ers, total: cash + mfs });
      setItemsSold(items);
      setInventoryStats(inv);
      setFloorManagerDrops(drops);
      setLoading(false);
    });

    // 2. Fetch Session Data for Floor Mode (Vault & Opening Balances)
    if (reportMode === 'floor') {
      const sessQuery = query(collection(db, 'sessions'), where('dateStr', '==', dateStr));
      getDocs(sessQuery).then(snap => {
        let vault: any[] = [];
        let openCash = 0;
        snap.forEach(docSnap => {
          const s = docSnap.data();
          if (['closed', 'pending', 'rolled_over'].includes(s.status)) {
            vault.push({ id: docSnap.id, ...s });
          }
          openCash += parseFloat(s.openingBalances?.cash) || 0;
        });
        setVaultSessions(vault);
        setFloorOpeningCash(openCash);
      });
    }

    return () => unsubscribeTx();
  }, [reportMode, targetDate, appState.globalInventoryGroups]);

  const onShareReport = async () => {
    let reportText = `=== ${reportMode === 'floor' ? 'CENTER' : 'MY DAILY'} REPORT ===\nDate: ${targetDate}\n\n`;
    reportText += `[ SALES SUMMARY ]\n`;
    reportText += `Total Revenue: ${salesStats.total} Tk\n`;
    reportText += `Cash Collected: ${salesStats.cash} Tk\n`;
    reportText += `MFS Collected: ${salesStats.mfs} Tk\n`;
    reportText += `ERS Disbursed: ${salesStats.ers} Tk\n`;

    try {
      await Share.share({ message: reportText, title: 'Amolnama Report' });
    } catch (error) {
      Alert.alert("Error", "Could not share report.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Toggle Header */}
        {(appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') && (
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, reportMode === 'personal' && styles.toggleBtnActive]} 
              onPress={() => setReportMode('personal')}
            >
              <Text style={[styles.toggleText, reportMode === 'personal' && styles.toggleTextActive]}>Personal</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, reportMode === 'floor' && styles.toggleBtnActive]} 
              onPress={() => setReportMode('floor')}
            >
              <Text style={[styles.toggleText, reportMode === 'floor' && styles.toggleTextActive]}>Center</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image 
            source={{ uri: reportMode === 'floor' ? "https://ui-avatars.com/api/?name=Center&background=0ea5e9&color=fff" : (auth.currentUser?.photoURL || "https://ui-avatars.com/api/?name=User") }} 
            style={styles.profileAvatar} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{reportMode === 'floor' ? "Center Report" : (appState.userNickname || appState.userDisplayName)}</Text>
            <Text style={styles.profileEmail}>
              {reportMode === 'floor' ? `Opening: ${floorOpeningCash} Tk | Drops: ${floorManagerDrops} Tk` : (auth.currentUser?.email)}
            </Text>
            <View style={styles.revenueBadge}>
              <Text style={styles.revenueText}>Revenue: {salesStats.total} Tk</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sales Summary</Text>
            </View>

            <View style={styles.dashboardGrid}>
              <View style={[styles.dashCard, { borderColor: '#0ea5e9' }]}>
                <Text style={styles.dashLabel}>Cash Sales</Text>
                <Text style={[styles.dashValue, { color: '#0ea5e9' }]}>{salesStats.cash} Tk</Text>
              </View>
              <View style={[styles.dashCard, { borderColor: '#10b981' }]}>
                <Text style={styles.dashLabel}>MFS Sales</Text>
                <Text style={[styles.dashValue, { color: '#10b981' }]}>{salesStats.mfs} Tk</Text>
              </View>
              <View style={[styles.dashCard, styles.dashCardFull]}>
                <Text style={styles.dashLabelErs}>ERS / Flexiload</Text>
                <Text style={styles.dashValueErs}>{salesStats.ers} Tk</Text>
              </View>
            </View>

            {/* Inventory List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Items Sold</Text>
            </View>
            <View style={styles.listCard}>
              {Object.keys(itemsSold).length === 0 ? (
                <Text style={styles.emptyText}>No items sold yet.</Text>
              ) : Object.entries(itemsSold).map(([name, qty]) => (
                <View key={name} style={styles.listRow}>
                  <Text style={styles.rowName}>{name}</Text>
                  <Text style={styles.rowQty}>{qty}x</Text>
                </View>
              ))}
            </View>

            {/* Vault (Floor Mode Only) */}
            {reportMode === 'floor' && vaultSessions.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                  <Text style={styles.sectionTitle}>Closed Shift Vault</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vaultScroll}>
                  {vaultSessions.map(session => (
                    <TouchableOpacity key={session.id} style={styles.vaultCard}>
                      <Text style={styles.vaultName}>{session.openedBy?.split(' ')[0] || 'Agent'}</Text>
                      <Text style={styles.vaultStatus}>{session.status.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.shareBtn} onPress={onShareReport}>
              <Text style={styles.shareBtnText}>📤 Share Daily Report</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#ffffff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  toggleTextActive: { color: '#0f172a' },
  profileCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, gap: 16, alignItems: 'center' },
  profileAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#e2e8f0' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  profileEmail: { fontSize: 12, color: '#64748b', marginBottom: 10, fontWeight: '500' },
  revenueBadge: { backgroundColor: '#dcfce7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0' },
  revenueText: { fontSize: 13, fontWeight: '700', color: '#166534' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  dashCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  dashLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  dashValue: { fontSize: 20, fontWeight: '800' },
  dashCardFull: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', borderColor: '#fde68a', padding: 16, borderRadius: 16, borderWidth: 1 },
  dashLabelErs: { fontSize: 13, fontWeight: '800', color: '#92400e', textTransform: 'uppercase' },
  dashValueErs: { fontSize: 20, fontWeight: '800', color: '#92400e' },
  listCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rowQty: { fontSize: 15, fontWeight: '800', color: '#64748b' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 20, fontStyle: 'italic' },
  vaultScroll: { flexDirection: 'row', gap: 12 },
  vaultCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginRight: 12, alignItems: 'center', minWidth: 100 },
  vaultName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  vaultStatus: { fontSize: 10, fontWeight: '800', color: '#10b981', marginTop: 4 },
  shareBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  shareBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 }
});