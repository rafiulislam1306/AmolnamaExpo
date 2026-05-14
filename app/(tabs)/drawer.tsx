import { db } from '@/src/config/firebase';
import { useAppState } from '@/src/core/StateContext';
import { COLORS } from '@/src/core/theme';
import { deleteTransaction } from '@/src/features/transactions';
import { Feather } from '@expo/vector-icons';
import { addDoc, collection, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const getStrictDate = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function DrawerScreen() {
  const { appState } = useAppState();
  
  // Real-time Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeDesks, setActiveDesks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI Toggles
  const [showCashActions, setShowCashActions] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');

  // Inventory Modals State
  const [modalType, setModalType] = useState<'main_stock' | 'return_stock' | 'desk_transfer' | 'cash' | null>(null);
  const [transferQty, setTransferQty] = useState('');
  const [transferItem, setTransferItem] = useState('');
  const [transferDirection, setTransferDirection] = useState<'send' | 'pull'>('send');
  const [targetDeskId, setTargetDeskId] = useState('');
  const [targetSessionId, setTargetSessionId] = useState('');
  const [targetDeskName, setTargetDeskName] = useState('');

  // Cash Modal State (To match PWA exactly)
  const [cashActionType, setCashActionType] = useState<'drop_manager' | 'expense' | 'handset_cash' | 'receive_float'>('drop_manager');
  const [cashAmount, setCashAmount] = useState('');

  // --- 1. REAL-TIME LISTENER ---
  useEffect(() => {
    if (!appState.currentSessionId) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'transactions'), where('sessionId', '==', appState.currentSessionId), where('isDeleted', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, docId: doc.id, ...doc.data() }));
      txs.sort((a, b) => b.id - a.id);
      setTransactions(txs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [appState.currentSessionId]);

  // Fetch active desks for Transfer modal
  const fetchActiveDesks = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'sessions'), where('status', '==', 'open')));
      const desks = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(s => s.deskId !== appState.currentDeskId); // Exclude my own desk
      setActiveDesks(desks);
    } catch (e) {
      console.error("Failed to load desks", e);
    }
  };

  // --- 2. REPORT MATH ---
  const openingCash = appState.currentOpeningCash || 0;
  let cashSales = 0, adjustments = 0, mfsTotal = 0, ersTotal = 0, ersCount = 0;
  
  transactions.forEach(tx => {
    const safeCashAmt = tx.cashAmt || 0;
    const safeMfsAmt = tx.mfsAmt || 0;
    mfsTotal += safeMfsAmt;
    if (tx.type === 'adjustment') adjustments += safeCashAmt;
    else if (tx.type !== 'transfer_out' && tx.type !== 'transfer_in') {
      cashSales += safeCashAmt;
      if (tx.name === 'ERS Flexiload') { ersTotal += tx.amount; ersCount += Math.abs(tx.qty); }
    }
  });

  const expectedCash = openingCash + cashSales + adjustments;
  const adjColor = adjustments < 0 ? COLORS.dangerText : COLORS.textPrimary;
  const adjString = adjustments > 0 ? `+${adjustments}` : `${adjustments}`;

  // --- 3. FIREBASE TRANSFER LOGIC ---
  const executeInventoryAction = async () => {
    const qty = parseInt(transferQty);
    if (!transferItem || isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid Input", "Please select an item and enter a valid quantity.");
      return;
    }

    setIsProcessing(true);
    const d = new Date();
    const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const dateStr = getStrictDate();
    const baseTx = {
      name: transferItem, trackAs: transferItem, amount: 0, qty, cashAmt: 0, mfsAmt: 0, isDeleted: false,
      time: timeStr, dateStr, agentId: appState.currentUser?.uid || 'unknown',
      agentName: appState.userNickname || appState.userDisplayName || 'Agent', timestamp: serverTimestamp()
    };

    try {
      if (modalType === 'main_stock' || modalType === 'return_stock') {
        const isReceiving = modalType === 'main_stock';
        await addDoc(collection(db, 'transactions'), {
          ...baseTx,
          id: Date.now(), receiptNo: `INV-${Date.now().toString().slice(-4)}`,
          type: isReceiving ? 'transfer_in' : 'transfer_out',
          payment: isReceiving ? 'Received from Main Stock' : 'Returned to Main Stock',
          deskId: appState.currentDeskId, sessionId: appState.currentSessionId
        });
        Alert.alert("Success", `${qty}x ${transferItem} ${isReceiving ? 'Added' : 'Returned'}`);
      
      } else if (modalType === 'desk_transfer') {
        if (!targetDeskId) { Alert.alert("Error", "Select a target desk."); setIsProcessing(false); return; }
        
        const receiptNo = `TRF-${Date.now().toString().slice(-4)}`;
        
        // Transaction for My Desk
        const myTx = {
          ...baseTx, id: Date.now(), receiptNo, deskId: appState.currentDeskId, sessionId: appState.currentSessionId,
          type: transferDirection === 'send' ? 'transfer_out' : 'transfer_in',
          payment: transferDirection === 'send' ? `Sent to ${targetDeskName}` : `Pulled from ${targetDeskName}`
        };
        
        // Transaction for Their Desk
        const theirTx = {
          ...baseTx, id: Date.now() + 1, receiptNo, deskId: targetDeskId, sessionId: targetSessionId, isRemoteTransfer: true,
          type: transferDirection === 'send' ? 'transfer_in' : 'transfer_out',
          payment: transferDirection === 'send' ? `Received from ${appState.currentDeskName}` : `Pulled by ${appState.currentDeskName}`
        };

        await addDoc(collection(db, 'transactions'), myTx);
        await addDoc(collection(db, 'transactions'), theirTx);
        Alert.alert("Transfer Complete", `${qty}x ${transferItem} transferred!`);
      }

      closeModals();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Transaction failed to save.");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCashAction = async () => {
    const val = parseInt(cashAmount);
    if (isNaN(val) || val <= 0) { Alert.alert("Invalid", "Enter valid amount."); return; }
    
    setIsProcessing(true);
    const isOutflow = cashActionType === 'drop_manager' || cashActionType === 'expense';
    const finalAmount = isOutflow ? -Math.abs(val) : Math.abs(val);
    
    let paymentLabel = 'Manager Drop';
    if (cashActionType === 'expense') paymentLabel = 'Expense / Donation';
    if (cashActionType === 'handset_cash') paymentLabel = 'Receive Handset Cash';
    if (cashActionType === 'receive_float') paymentLabel = 'Receive Cash Float';

    try {
      await addDoc(collection(db, 'transactions'), {
        id: Date.now(), receiptNo: `ADJ-${Date.now().toString().slice(-4)}`,
        type: 'adjustment', name: 'Physical Cash', trackAs: 'Physical Cash', amount: finalAmount, qty: 1, 
        payment: paymentLabel, cashAmt: finalAmount, mfsAmt: 0, isDeleted: false,
        dateStr: getStrictDate(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        deskId: appState.currentDeskId, sessionId: appState.currentSessionId,
        agentId: appState.currentUser?.uid || 'unknown', agentName: appState.userNickname || 'Agent', timestamp: serverTimestamp()
      });
      Alert.alert("Success", `${paymentLabel} of ${Math.abs(finalAmount)} Tk recorded!`);
      closeModals();
    } catch (e) { Alert.alert("Error", "Failed to save."); }
    setIsProcessing(false);
  };

  const openModal = (type: any) => {
    setTransferQty(''); setTransferItem(''); setCashAmount('');
    if (type === 'desk_transfer') fetchActiveDesks();
    setModalType(type);
  };

  const closeModals = () => setModalType(null);

  // --- UI RENDER ---
  if (!appState.currentSessionId) return <View style={styles.center}><Text style={{color: COLORS.textSecondary}}>No Active Desk</Text></View>;
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>;

  const inventoryGroups = appState.globalInventoryGroups || ['Blank 4G SIM', 'Router', 'Modem']; // Fallback for testing

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.ledgerTitle}>{appState.currentDeskName}</Text>
        </View>

        {/* Dashboard Card */}
        <View style={styles.adminFormCard}>
          <View style={styles.dashboardRow}><Text style={styles.dashLabel}>Opening Cash</Text><Text style={styles.dashValue}>{openingCash} Tk</Text></View>
          <View style={styles.dashboardRow}><Text style={styles.dashLabel}>+ Cash Sales</Text><Text style={styles.dashValue}>+{cashSales} Tk</Text></View>
          
          <TouchableOpacity style={styles.expandableRow} activeOpacity={0.7} onPress={() => setShowCashActions(!showCashActions)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.dashLabel}>+/- Cash Actions</Text><Feather name={showCashActions ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textSecondary} /></View>
            <Text style={[styles.dashValue, { color: adjColor }]}>{adjString} Tk</Text>
          </TouchableOpacity>
          
          {showCashActions && (
            <View style={styles.expandedContent}>
              {transactions.filter(t => t.type === 'adjustment').map(t => (
                <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{t.payment}</Text><Text style={{ fontSize: 13, fontWeight: '500', color: t.cashAmt < 0 ? COLORS.dangerText : COLORS.successText }}>{t.cashAmt > 0 ? '+' : ''}{t.cashAmt} Tk</Text></View>
              ))}
            </View>
          )}
          <View style={styles.expectedRow}><Text style={styles.expectedLabel}>Expected Cash</Text><Text style={styles.expectedValue}>{expectedCash} Tk</Text></View>
        </View>

        {/* 4-Button Action Grid */}
        <Text style={styles.sectionHeader}>DESK ACTIONS</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => openModal('cash')}>
            <View style={[styles.actionIconBox, { backgroundColor: COLORS.successBg }]}><Feather name="dollar-sign" size={20} color={COLORS.successText} /></View>
            <Text style={styles.actionText}>Cash Actions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => openModal('desk_transfer')}>
            <View style={[styles.actionIconBox, { backgroundColor: COLORS.purpleBg }]}><Feather name="repeat" size={20} color={COLORS.purpleText} /></View>
            <Text style={styles.actionText}>Desk Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => openModal('main_stock')}>
            <View style={[styles.actionIconBox, { backgroundColor: COLORS.infoBg }]}><Feather name="arrow-down-left" size={20} color={COLORS.infoText} /></View>
            <Text style={styles.actionText}>+ Main Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => openModal('return_stock')}>
            <View style={[styles.actionIconBox, { backgroundColor: COLORS.dangerBg }]}><Feather name="arrow-up-right" size={20} color={COLORS.dangerText} /></View>
            <Text style={styles.actionText}>− Return Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger */}
        <View style={styles.ledgerHeader}>
          <Text style={styles.ledgerTitle}>Desk Ledger</Text>
        </View>
        <View style={styles.historyLog}>
          {transactions.slice(0, 15).map((tx, index) => {
            const isOutflow = tx.type === 'adjustment' || tx.type === 'transfer_out';
            const dotColor = tx.type === 'adjustment' ? '#ef4444' : (tx.type.includes('transfer') ? '#8b5cf6' : '#10b981');
            return (
              <TouchableOpacity key={tx.id} style={[styles.historyItem, index === transactions.length - 1 && { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                  <View style={[styles.historyIconBox, { backgroundColor: `${dotColor}15`, borderColor: `${dotColor}30` }]}><Text style={[styles.historyIconText, { color: dotColor }]}>{tx.qty}x</Text></View>
                  <View style={{ flex: 1, paddingTop: 2 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{tx.name}</Text>
                    <Text style={styles.historyMeta}>{tx.time} • {tx.payment}</Text>
                  </View>
                  <Text style={[styles.historyAmount, { color: isOutflow ? COLORS.dangerText : COLORS.textPrimary }]}>{isOutflow ? '− ' : ''}{Math.abs(tx.amount || 0)}</Text>
                </View>
                {expandedTxId === tx.id && (
                  <View style={styles.txActions}>
                    <TouchableOpacity style={[styles.btnOutline, { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerBg }]} onPress={() => deleteTransaction(tx, appState)}>
                      <Feather name="trash-2" size={14} color={COLORS.dangerText} />
                      <Text style={[styles.btnOutlineText, { color: COLORS.dangerText }]}>Trash</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* --- ALL MODALS COMBINED --- */}
      <Modal visible={modalType !== null} transparent animationType="slide" onRequestClose={closeModals}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            
            {/* Modal Header */}
            <Text style={[styles.qtyHeader, { color: modalType === 'cash' ? COLORS.successText : (modalType === 'return_stock' ? COLORS.dangerText : (modalType === 'desk_transfer' ? COLORS.purpleText : COLORS.infoText)) }]}>
              {modalType === 'cash' ? 'Cash Actions' : modalType === 'main_stock' ? 'Receive Main Stock' : modalType === 'return_stock' ? 'Return to Vault' : 'Transfer Stock'}
            </Text>

            {/* Cash Action Body */}
            {modalType === 'cash' && (
              <View>
                <Text style={styles.adminLabel}>Action Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                  {[{id:'drop_manager', l:'Manager Drop'}, {id:'expense', l:'Expense'}, {id:'receive_float', l:'Add Float'}].map(opt => (
                    <TouchableOpacity key={opt.id} style={[styles.filterPill, cashActionType === opt.id && styles.filterPillActive]} onPress={() => setCashActionType(opt.id as any)}>
                      <Text style={[styles.filterText, cashActionType === opt.id && styles.filterTextActive]}>{opt.l}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.adminLabel}>Amount (Tk)</Text>
                <TextInput style={styles.settingsInput} keyboardType="number-pad" placeholder="0" value={cashAmount} onChangeText={setCashAmount} />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: COLORS.successText, marginTop: 16 }]} onPress={executeCashAction} disabled={isProcessing}>
                  <Text style={styles.saveBtnText}>{isProcessing ? 'SAVING...' : 'SAVE ACTION'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Inventory Action Body (Main, Return, Transfer) */}
            {modalType && modalType !== 'cash' && (
              <View>
                {modalType === 'desk_transfer' && (
                  <View style={{marginBottom: 16}}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <TouchableOpacity style={[styles.filterPill, transferDirection === 'send' && styles.filterPillActive, {flex: 1, alignItems:'center'}]} onPress={() => setTransferDirection('send')}>
                        <Text style={[styles.filterText, transferDirection === 'send' && styles.filterTextActive]}>Push (Send)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.filterPill, transferDirection === 'pull' && styles.filterPillActive, {flex: 1, alignItems:'center'}]} onPress={() => setTransferDirection('pull')}>
                        <Text style={[styles.filterText, transferDirection === 'pull' && styles.filterTextActive]}>Pull (Take)</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.adminLabel}>{transferDirection === 'send' ? 'Destination Desk' : 'Source Desk'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {activeDesks.length === 0 ? <Text style={{color: COLORS.textSecondary}}>No other desks open</Text> : activeDesks.map(desk => (
                        <TouchableOpacity key={desk.deskId} style={[styles.filterPill, targetDeskId === desk.deskId && styles.filterPillActive]} onPress={() => {setTargetDeskId(desk.deskId); setTargetSessionId(desk.id); setTargetDeskName(desk.deskName);}}>
                          <Text style={[styles.filterText, targetDeskId === desk.deskId && styles.filterTextActive]}>{desk.deskName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.adminLabel}>Physical Item</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                  {inventoryGroups.map(item => (
                    <TouchableOpacity key={item} style={[styles.filterPill, transferItem === item && styles.filterPillActive]} onPress={() => setTransferItem(item)}>
                      <Text style={[styles.filterText, transferItem === item && styles.filterTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.adminLabel}>Quantity</Text>
                <TextInput style={styles.settingsInput} keyboardType="number-pad" placeholder="0" value={transferQty} onChangeText={setTransferQty} />

                <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
                  <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#e2e8f0', flex: 0.5}]} onPress={closeModals}>
                    <Text style={[styles.saveBtnText, {color: COLORS.textSecondary}]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: modalType === 'return_stock' ? COLORS.dangerText : (modalType === 'desk_transfer' ? COLORS.purpleText : COLORS.infoText) }]} onPress={executeInventoryAction} disabled={isProcessing}>
                    <Text style={styles.saveBtnText}>{isProcessing ? 'PROCESSING...' : 'CONFIRM'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  agentsText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  
  adminFormCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 16, elevation: 1 },
  dashboardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 16 },
  expandableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 16 },
  dashLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  dashValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  expandedContent: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#fafafa' },
  expectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  expectedLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  expectedValue: { fontSize: 22, fontWeight: '500', color: COLORS.textPrimary },

  grid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridCard: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: 12 },
  gridLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  gridValue: { fontSize: 20, fontWeight: '500', color: COLORS.textPrimary },
  gridCurrency: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '400' },

  sectionHeader: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionCard: { width: '48%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, flexDirection: 'column', gap: 12 },
  actionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  ledgerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  ledgerTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  historyLog: { backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 16, elevation: 1, marginBottom: 24 },
  historyItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyIconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  historyIconText: { fontSize: 15, fontWeight: '800' },
  historyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  historyMeta: { fontSize: 13, color: COLORS.textSecondary },
  historyAmount: { fontSize: 17, fontWeight: '800', paddingTop: 2 },
  txActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 16, borderWidth: 1, borderRadius: 12 },
  btnOutlineText: { fontSize: 13, fontWeight: '600' },

  // Modals & Forms
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 5, backgroundColor: COLORS.border, borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  qtyHeader: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  adminLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, marginTop: 12, textTransform: 'uppercase' },
  settingsInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  
  filterPill: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  filterPillActive: { backgroundColor: COLORS.textPrimary, borderColor: COLORS.textPrimary },
  filterText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  filterTextActive: { color: COLORS.surface },
  
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});