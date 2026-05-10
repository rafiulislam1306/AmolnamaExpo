import { Feather } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { useAppState } from '../../src/core/StateContext';
import { submitClosingReport } from '../../src/features/desk';
import { getPhysicalItems, passStockFirewall } from '../../src/features/inventory';
import { deleteTransaction, saveTxEdit } from '../../src/features/transactions';
import { exportLedgerCSV, forceCloseAllDesks } from '../../src/features/admin';
import { generateReceiptNo, getStrictDate } from '../../src/utils/helpers';

const CASH_ACTIONS = [
  { label: 'Manager Float (Cash In)', value: 'receive_float' },
  { label: 'Handset Cash (Cash In)', value: 'handset_cash' },
  { label: 'Manager Drop (Cash Out)', value: 'drop_manager' },
  { label: 'Expense / Donation (Cash Out)', value: 'expense' }
];

export default function DrawerScreen() {
  const appState = useAppState();
  const physicalItems = getPhysicalItems(appState);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Core Action Modals ---
  const [isCashModalVisible, setCashModalVisible] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashAction, setCashAction] = useState('receive_float');

  const [isMainStockModalVisible, setMainStockModalVisible] = useState(false);
  const [mainStockQty, setMainStockQty] = useState('');
  const [mainStockItem, setMainStockItem] = useState(physicalItems[0] || 'Item');

  const [isReturnStockModalVisible, setReturnStockModalVisible] = useState(false);
  const [returnStockQty, setReturnStockQty] = useState('');
  const [returnStockItem, setReturnStockItem] = useState(physicalItems[0] || 'Item');

  const [isDeskTransferModalVisible, setDeskTransferModalVisible] = useState(false);
  const [deskTransferQty, setDeskTransferQty] = useState('');
  const [deskTransferItem, setDeskTransferItem] = useState(physicalItems[0] || 'Item');
  const [activeDesks, setActiveDesks] = useState<any[]>([]);
  const [targetDesk, setTargetDesk] = useState<any>(null);
  const [transferDirection, setTransferDirection] = useState('send');

  // --- Edit Transaction Modal ---
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editTxData, setEditTxData] = useState<any>(null);
  const [editQty, setEditQty] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPayment, setEditPayment] = useState('Cash');
  const [editCashAmt, setEditCashAmt] = useState('');
  const [editMfsAmt, setEditMfsAmt] = useState('');

  // --- Native Reporting Engine (Ported from legacy reports.js) ---
  const reportTotals = useMemo(() => {
    let cashSales = 0;
    let mfsSales = 0;
    let ersTotal = 0;
    let adjustments = 0;

    transactions.forEach(tx => {
      const safeCashAmt = tx.cashAmt || 0;
      const safeMfsAmt = tx.mfsAmt || 0;

      if (tx.type === 'adjustment') {
        adjustments += safeCashAmt;
      } else if (tx.type !== 'transfer_out' && tx.type !== 'transfer_in') {
        cashSales += safeCashAmt;
        mfsSales += safeMfsAmt;
        if (tx.name === 'ERS Flexiload') {
          ersTotal += tx.amount;
        }
      }
    });

    const openingCash = appState.currentOpeningCash || 0;
    const expectedCash = openingCash + cashSales + adjustments;

    return { cashSales, mfsSales, ersTotal, expectedCash, openingCash };
  }, [transactions, appState.currentOpeningCash]);

  const handleShareReport = async () => {
    const reportText = `
=== AMOLNAMA DESK REPORT ===
Date: ${getStrictDate()}
Desk: ${appState.currentDeskName || 'Active Desk'}
--------------------------
Opening Cash: ${reportTotals.openingCash} Tk
(+) Cash Sales: ${reportTotals.cashSales} Tk
(+/-) Adjustments: ${reportTotals.expectedCash - reportTotals.openingCash - reportTotals.cashSales} Tk
--------------------------
EXPECTED CASH: ${reportTotals.expectedCash} Tk

Total MFS: ${reportTotals.mfsSales} Tk
Total ERS: ${reportTotals.ersTotal} Tk
    `.trim();

    try {
      await Share.share({ message: reportText });
    } catch (error) {
      Alert.alert("Error", "Could not open share menu.");
    }
  };

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
        txList.push({ docId: doc.id, ...doc.data() });
      });
      txList.sort((a, b) => (b.id || 0) - (a.id || 0));
      setTransactions(txList);
      setLoading(false);
    }, (error) => console.error("Error fetching native ledger:", error));

    return () => unsubscribe();
  }, []);

  const createBaseTx = () => {
    const now = new Date();
    return {
      id: Date.now(),
      receiptNo: generateReceiptNo(),
      time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      dateStr: getStrictDate(),
      deskId: appState.currentDeskId || 'unknown',
      sessionId: appState.currentSessionId || 'unknown',
      agentId: auth.currentUser?.uid || 'unknown',
      agentName: appState.userNickname || appState.userDisplayName || 'Agent',
      isDeleted: false
    };
  };

  const handleSaveCash = async () => {
    const amount = parseFloat(cashAmount) || 0;
    if (amount <= 0) return Alert.alert("Invalid Input", "Enter a valid amount.");
    
    const isCashIn = cashAction === 'receive_float' || cashAction === 'handset_cash';
    let txName = 'Cash Adjustment';
    let paymentLabel = '';

    if (cashAction === 'drop_manager') { txName = 'Manager Drop'; paymentLabel = 'Dropped to Manager'; }
    else if (cashAction === 'expense') { txName = 'Expense / Donation'; paymentLabel = 'Cash Out'; }
    else if (cashAction === 'handset_cash') { txName = 'Handset Cash'; paymentLabel = 'Cash In (Holding)'; }
    else if (cashAction === 'receive_float') { txName = 'Manager Float'; paymentLabel = 'Cash In (Float)'; }

    const tx = {
      ...createBaseTx(),
      type: 'adjustment', name: txName, trackAs: 'Physical Cash', amount: amount, qty: 1,
      payment: paymentLabel, cashAmt: isCashIn ? amount : -amount, mfsAmt: 0
    };

    try {
      await addDoc(collection(db, 'transactions'), tx);
      setCashModalVisible(false); setCashAmount(''); setCashAction('receive_float');
      Alert.alert("Success", `${txName} Logged!`);
    } catch (e) { Alert.alert("Error", "Failed to save."); }
  };

  const handleSaveMainStock = async () => {
    const qty = parseInt(mainStockQty) || 0;
    if (qty <= 0) return Alert.alert("Invalid Input", "Enter a valid quantity.");
    const tx = { ...createBaseTx(), type: 'transfer_in', name: mainStockItem, trackAs: mainStockItem, amount: 0, qty: qty, payment: 'Received from Main Stock', cashAmt: 0, mfsAmt: 0 };
    try {
      await addDoc(collection(db, 'transactions'), tx);
      setMainStockModalVisible(false); setMainStockQty('');
      Alert.alert("Success", `+${qty}x ${mainStockItem} Added!`);
    } catch (e) { Alert.alert("Error", "Failed to add stock."); }
  };

  const handleSaveReturnStock = async () => {
    const qty = parseInt(returnStockQty) || 0;
    if (qty <= 0) return Alert.alert("Invalid Input", "Enter a valid quantity.");
    if (!passStockFirewall(returnStockItem, qty, appState)) return;
    const tx = { ...createBaseTx(), type: 'transfer_out', name: returnStockItem, trackAs: returnStockItem, amount: 0, qty: qty, payment: 'Returned to Main Stock', cashAmt: 0, mfsAmt: 0 };
    try {
      await addDoc(collection(db, 'transactions'), tx);
      setReturnStockModalVisible(false); setReturnStockQty('');
      Alert.alert("Success", `-${qty}x ${returnStockItem} Returned!`);
    } catch (e) { Alert.alert("Error", "Failed to return stock."); }
  };

  const openDeskTransferModal = async () => {
    setDeskTransferModalVisible(true); setTargetDesk(null);
    try {
      const activeSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('status', '==', 'open')));
      let desks: any[] = [];
      for (const docSnap of activeSessionsSnap.docs) {
        let deskData = docSnap.data();
        if(deskData.deskId !== appState.currentDeskId) {
          let displayName = deskData.deskId.replace('_', ' ').toUpperCase();
          try {
            const deskSnap = await getDoc(doc(db, 'desks', deskData.deskId));
            if (deskSnap.exists() && deskSnap.data().name) displayName = deskSnap.data().name;
          } catch(e) {}
          desks.push({ id: deskData.deskId, sessionId: docSnap.id, name: displayName });
        }
      }
      setActiveDesks(desks);
    } catch (e) { Alert.alert("Error", "Could not fetch active desks."); }
  };

  const handleExecuteDeskTransfer = async () => {
    const qty = parseInt(deskTransferQty) || 0;
    if (qty <= 0) return Alert.alert("Invalid Input", "Enter valid quantity.");
    if (!targetDesk) return Alert.alert("Error", "Please select a target desk.");

    const baseTx = createBaseTx();
    let senderTx, receiverTx;

    if (transferDirection === 'send') {
      if (!passStockFirewall(deskTransferItem, qty, appState)) return;
      senderTx = { ...baseTx, type: 'transfer_out', name: deskTransferItem, trackAs: deskTransferItem, amount: 0, qty: qty, payment: `Sent to ${targetDesk.name}`, cashAmt: 0, mfsAmt: 0 };
      receiverTx = { ...baseTx, id: baseTx.id + 1, type: 'transfer_in', name: deskTransferItem, trackAs: deskTransferItem, amount: 0, qty: qty, payment: `Received from ${appState.currentDeskName || 'Agent'}`, cashAmt: 0, mfsAmt: 0, deskId: targetDesk.id, sessionId: targetDesk.sessionId, isRemoteTransfer: true };
    } else {
      senderTx = { ...baseTx, type: 'transfer_out', name: deskTransferItem, trackAs: deskTransferItem, amount: 0, qty: qty, payment: `Pulled by ${appState.currentDeskName || 'Agent'}`, cashAmt: 0, mfsAmt: 0, deskId: targetDesk.id, sessionId: targetDesk.sessionId, isRemoteTransfer: true };
      receiverTx = { ...baseTx, id: baseTx.id + 1, type: 'transfer_in', name: deskTransferItem, trackAs: deskTransferItem, amount: 0, qty: qty, payment: `Pulled from ${targetDesk.name}`, cashAmt: 0, mfsAmt: 0 };
    }
    try {
      await addDoc(collection(db, 'transactions'), senderTx);
      await addDoc(collection(db, 'transactions'), receiverTx);
      setDeskTransferModalVisible(false); setDeskTransferQty('');
      Alert.alert("Success", "Transfer complete!");
    } catch (e) { Alert.alert("Error", "Transfer failed."); }
  };

  // --- Edit Handlers ---
  const openEditTxModal = (tx: any) => {
    setEditTxData(tx);
    setEditQty(tx.qty.toString());
    setEditAmount(tx.amount.toString());
    
    if (tx.cashAmt > 0 && tx.mfsAmt > 0) {
        setEditPayment('Split');
        setEditCashAmt(tx.cashAmt.toString());
        setEditMfsAmt(tx.mfsAmt.toString());
    } else {
        setEditPayment(tx.payment);
        setEditCashAmt('');
        setEditMfsAmt('');
    }
    setEditModalVisible(true);
  };

  const handleExecuteEdit = async () => {
      let finalCash = 0; let finalMfs = 0;
      if (editPayment === 'Cash') finalCash = parseFloat(editAmount) || 0;
      else if (editPayment === 'MFS') finalMfs = parseFloat(editAmount) || 0;
      else if (editPayment === 'Split') {
          finalCash = parseFloat(editCashAmt) || 0;
          finalMfs = parseFloat(editMfsAmt) || 0;
      }

      const success = await saveTxEdit(
          editTxData, parseInt(editQty) || 0, parseFloat(editAmount) || 0, 
          editPayment, finalCash, finalMfs, appState
      );
      if (success) setEditModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Summary</Text>
          <TouchableOpacity onPress={handleShareReport}>
            <Feather name="share-2" size={20} color="#0ea5e9" />
          </TouchableOpacity>
        </View>

        {/* Ported Summary Dashboard */}
        <View style={styles.dashboardGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Expected Cash</Text>
            <Text style={styles.statValue}>{reportTotals.expectedCash} Tk</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total MFS</Text>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{reportTotals.mfsSales} Tk</Text>
          </View>
          <View style={styles.statCardSmall}>
            <Text style={styles.statLabel}>Cash Sales</Text>
            <Text style={styles.statValueSmall}>+{reportTotals.cashSales} Tk</Text>
          </View>
          <View style={styles.statCardSmall}>
            <Text style={styles.statLabel}>ERS Sent</Text>
            <Text style={[styles.statValueSmall, { color: '#f59e0b' }]}>{reportTotals.ersTotal} Tk</Text>
          </View>
        {/* Admin Danger Zone - Visible only to Admins/Managers */}
        {(appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') && (
          <View style={styles.adminSection}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: '#ef4444' }]}>Admin Tools</Text>
            </View>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.adminCard} onPress={() => exportLedgerCSV(getStrictDate())}>
                <Feather name="file-text" size={20} color="#64748b" />
                <Text style={styles.adminCardText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.adminCard, { borderColor: '#fca5a5' }]} onPress={forceCloseAllDesks}>
                <Feather name="power" size={20} color="#ef4444" />
                <Text style={[styles.adminCardText, { color: '#ef4444' }]}>Nuke Desks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
          <Text style={styles.headerTitle}>Desk Actions</Text>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setCashModalVisible(true)}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}><Text style={{ fontSize: 20 }}>💵</Text></View>
            <Text style={styles.actionText}>Cash Actions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={openDeskTransferModal}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}><Text style={{ fontSize: 20 }}>🔄</Text></View>
            <Text style={styles.actionText}>Desk Transfer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => setMainStockModalVisible(true)}>
            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}><Text style={{ fontSize: 20 }}>📦</Text></View>
            <Text style={styles.actionText}>+ Main Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => setReturnStockModalVisible(true)}>
            <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}><Text style={{ fontSize: 20 }}>↩️</Text></View>
            <Text style={styles.actionText}>− Return Stock</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.closeBtn, !appState.currentDeskId && { opacity: 0.5 }]} 
          disabled={!appState.currentDeskId}
          onPress={() => {
            Alert.alert("Close Shift", "This will permanently seal your shift and record the cash drop. Proceed?", [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", style: "destructive", onPress: () => submitClosingReport(appState, auth) }
              ]);
          }}
        >
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
                <View style={styles.txIconBox}><Text style={styles.txQty}>{tx.qty}x</Text></View>
                <View style={styles.txDetails}>
                  <Text style={styles.txName} numberOfLines={1}>{tx.name}</Text>
                  <Text style={styles.txMeta}>{tx.time} • {tx.payment}</Text>
                </View>
                <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: amtColor }]}>{amtPrefix}{Math.abs(tx.amount || 0)}</Text>
                    <View style={styles.txActions}>
                        <TouchableOpacity onPress={() => openEditTxModal(tx)} style={styles.iconBtn}>
                            <Feather name="edit-2" size={16} color="#0ea5e9" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTransaction(tx, appState)} style={styles.iconBtn}>
                            <Feather name="trash-2" size={16} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} /> 
      </ScrollView>

      {/* --- Action Modals (Cash, Main, Return, Desk Transfer) OMITTED FOR BREVITY BUT FULLY PRESERVED --- */}
      {/* 1. CASH MODAL */}
      <Modal animationType="slide" transparent={true} visible={isCashModalVisible} onRequestClose={() => setCashModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manager Cash Action</Text>
            <Text style={styles.inputLabel}>Amount (Tk)</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" placeholder="0" value={cashAmount} onChangeText={setCashAmount} />
            <Text style={styles.inputLabel}>Action Type</Text>
            <View style={styles.radioGroup}>
              {CASH_ACTIONS.map((option) => (
                <TouchableOpacity key={option.value} style={[styles.radioBtn, cashAction === option.value && styles.radioBtnActive]} onPress={() => setCashAction(option.value)}>
                  <Text style={[styles.radioText, cashAction === option.value && styles.radioTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCashModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveCash}><Text style={styles.modalSaveText}>Save Record</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. MAIN STOCK MODAL */}
      <Modal animationType="slide" transparent={true} visible={isMainStockModalVisible} onRequestClose={() => setMainStockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Main Stock</Text>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" placeholder="0" value={mainStockQty} onChangeText={setMainStockQty} />
            <Text style={styles.inputLabel}>Select Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {physicalItems.map((item: string) => (
                <TouchableOpacity key={item} style={[styles.pillBtn, mainStockItem === item && styles.pillBtnActive]} onPress={() => setMainStockItem(item)}>
                  <Text style={[styles.pillText, mainStockItem === item && styles.pillTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setMainStockModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMainStock}><Text style={styles.modalSaveText}>Add Stock</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. RETURN STOCK MODAL */}
      <Modal animationType="slide" transparent={true} visible={isReturnStockModalVisible} onRequestClose={() => setReturnStockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Return to Main Stock</Text>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" placeholder="0" value={returnStockQty} onChangeText={setReturnStockQty} />
            <Text style={styles.inputLabel}>Select Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {physicalItems.map((item: string) => (
                <TouchableOpacity key={item} style={[styles.pillBtn, returnStockItem === item && styles.pillBtnActive]} onPress={() => setReturnStockItem(item)}>
                  <Text style={[styles.pillText, returnStockItem === item && styles.pillTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReturnStockModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, {backgroundColor: '#ef4444'}]} onPress={handleSaveReturnStock}><Text style={styles.modalSaveText}>Return Stock</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. DESK TRANSFER MODAL */}
      <Modal animationType="slide" transparent={true} visible={isDeskTransferModalVisible} onRequestClose={() => setDeskTransferModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Desk-to-Desk Transfer</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.radioBtn, {flex: 1}, transferDirection === 'send' && styles.radioBtnActive]} onPress={() => setTransferDirection('send')}>
                <Text style={[styles.radioText, {textAlign: 'center'}, transferDirection === 'send' && styles.radioTextActive]}>Send Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.radioBtn, {flex: 1}, transferDirection === 'pull' && styles.radioBtnActive]} onPress={() => setTransferDirection('pull')}>
                <Text style={[styles.radioText, {textAlign: 'center'}, transferDirection === 'pull' && styles.radioTextActive]}>Pull Stock</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Target Desk</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {activeDesks.length === 0 ? <Text style={styles.emptyText}>No other desks open</Text> : activeDesks.map((desk) => (
                <TouchableOpacity key={desk.id} style={[styles.pillBtn, targetDesk?.id === desk.id && styles.pillBtnActive]} onPress={() => setTargetDesk(desk)}>
                  <Text style={[styles.pillText, targetDesk?.id === desk.id && styles.pillTextActive]}>{desk.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Quantity & Item</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" placeholder="0" value={deskTransferQty} onChangeText={setDeskTransferQty} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {physicalItems.map((item: string) => (
                <TouchableOpacity key={item} style={[styles.pillBtn, deskTransferItem === item && styles.pillBtnActive]} onPress={() => setDeskTransferItem(item)}>
                  <Text style={[styles.pillText, deskTransferItem === item && styles.pillTextActive]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeskTransferModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, {backgroundColor: '#8b5cf6'}]} onPress={handleExecuteDeskTransfer}><Text style={styles.modalSaveText}>Execute Transfer</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal animationType="slide" transparent={true} visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit: {editTxData?.name}</Text>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" value={editQty} onChangeText={setEditQty} />
            <Text style={styles.inputLabel}>Total Amount (Tk)</Text>
            <TextInput style={styles.textInput} keyboardType="numeric" value={editAmount} onChangeText={setEditAmount} />
            
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={[styles.radioGroup, { flexDirection: 'row', flexWrap: 'wrap' }]}>
              {['Cash', 'MFS', 'Split'].map((opt) => (
                <TouchableOpacity key={opt} style={[styles.radioBtn, { padding: 10 }, editPayment === opt && styles.radioBtnActive]} onPress={() => setEditPayment(opt)}>
                  <Text style={[styles.radioText, editPayment === opt && styles.radioTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {editPayment === 'Split' && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Cash Amount</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" value={editCashAmt} onChangeText={setEditCashAmt} />
                  </View>
                  <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>MFS Amount</Text>
                      <TextInput style={styles.textInput} keyboardType="numeric" value={editMfsAmt} onChangeText={setEditMfsAmt} />
                  </View>
              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleExecuteEdit}><Text style={styles.modalSaveText}>Update</Text></TouchableOpacity>
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
  txCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' },
  txIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txQty: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  txDetails: { flex: 1, justifyContent: 'center' },
  txName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  txMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  txRight: { alignItems: 'flex-end', gap: 6 },
  txAmount: { fontSize: 18, fontWeight: '800' },
  txActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
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
  pillBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, height: 40 },
  pillBtnActive: { backgroundColor: '#0f172a' },
  pillText: { color: '#64748b', fontWeight: '600' },
  pillTextActive: { color: '#ffffff' },
  modalActionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: '700', fontSize: 16 },
  modalSaveBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center' },
  modalSaveText: { color: '#ffffff', fontWeight: '700', fontSize: 16 }
});

header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48.5%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statCardSmall: { width: '48.5%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statValueSmall: { fontSize: 16, fontWeight: '700', color: '#475569' },
  adminSection: { marginTop: 10, padding: 12, backgroundColor: '#fff1f2', borderRadius: 20, marginBottom: 24, borderSize: 1, borderColor: '#fecaca' },
  adminCard: { flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', gap: 6, flexDirection: 'row', justifyContent: 'center' },
  adminCardText: { fontSize: 13, fontWeight: '700', color: '#475569' },