import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../src/core/StateContext';
import { passStockFirewall } from '../../src/features/inventory';
import { addTransactionToCloud } from '../../src/features/transactions';

// Fallback catalog if global state hasn't loaded yet
const defaultCatalog = {
  "sim_no1": { name: 'No. 1 Plan', display: 'No. 1 Plan', price: 497, cat: 'new-sim', trackAs: 'No. 1 Plan', isActive: true, order: 1 },
  "sim_prime": { name: 'Prime', display: 'Prime', price: 400, cat: 'new-sim', trackAs: 'Prime', isActive: true, order: 2 },
  "sim_djuice": { name: 'Djuice', display: 'Djuice', price: 400, cat: 'new-sim', trackAs: 'Djuice', isActive: true, order: 3 },
  "sim_skitto": { name: 'Skitto', display: 'Skitto', price: 400, cat: 'new-sim', trackAs: 'Skitto Kit', isActive: true, order: 4 },
  "sim_esim_pre": { name: 'eSIM Prepaid', display: 'eSIM Prepaid', price: 400, cat: 'new-sim', trackAs: 'eSIM', isActive: true, order: 5 },
  "sim_esim_post": { name: 'eSIM Postpaid', display: 'eSIM Postpaid', price: 400, cat: 'new-sim', trackAs: 'eSIM', isActive: true, order: 6 },
  "sim_power": { name: 'Power Prime', display: 'Power Prime', price: 1499, cat: 'new-sim', trackAs: 'Power Prime', isActive: true, order: 7 },
  "sim_recycle": { name: 'Recycle SIM', display: 'Recycle SIM', price: 400, cat: 'new-sim', trackAs: 'Recycle SIM', isActive: true, order: 8 },
  "sim_my": { name: 'My SIM', display: 'My SIM', price: 400, cat: 'new-sim', trackAs: 'Regular Kit', isActive: true, order: 9 },
  "rep_regular": { name: 'Regular Replacement', display: 'Regular', price: 400, cat: 'paid-rep', trackAs: 'Regular Kit', isActive: true, order: 10 },
  "rep_skitto": { name: 'Skitto Replacement', display: 'Skitto', price: 400, cat: 'paid-rep', trackAs: 'Skitto Kit', isActive: true, order: 11 },
  "rep_esim": { name: 'eSIM Replacement', display: 'eSIM', price: 349, cat: 'paid-rep', trackAs: 'eSIM', isActive: true, order: 12 },
  "rep_skitto_esim": { name: 'Skitto eSIM Replacement', display: 'Skitto eSIM', price: 349, cat: 'paid-rep', trackAs: 'Skitto eSIM', isActive: true, order: 13 },
  "foc_regular": { name: 'FOC Regular', display: 'Regular', price: 0, cat: 'foc', trackAs: 'Regular Kit', isActive: true, order: 14 },
  "foc_skitto": { name: 'FOC Skitto', display: 'Skitto', price: 0, cat: 'foc', trackAs: 'Skitto Kit', isActive: true, order: 15 },
  "foc_esim": { name: 'FOC eSIM', display: 'eSIM', price: 0, cat: 'foc', trackAs: 'eSIM', isActive: true, order: 16 },
  "foc_skitto_esim": { name: 'FOC Skitto eSIM', display: 'Skitto eSIM', price: 0, cat: 'foc', trackAs: 'Skitto eSIM', isActive: true, order: 17 },
  "srv_recycle": { name: 'Recycle SIM Reissue', display: 'Recycle SIM Reissue', price: 115, cat: 'service', trackAs: '', isActive: true, order: 18 },
  "srv_itemized": { name: 'Itemized Bill', display: 'Itemized Bill', price: 230, cat: 'service', trackAs: '', isActive: true, order: 19 },
  "srv_owner": { name: 'Ownership Transfer', display: 'Ownership Transfer', price: 115, cat: 'service', trackAs: '', isActive: true, order: 20 },
  "srv_mnp": { name: 'MNP', display: 'MNP', price: 457.50, cat: 'service', trackAs: '', isActive: true, order: 21 },
  "foc_corp": { name: 'Corporate Replacement', display: 'Corporate Replacement', price: 0, cat: 'free-action', trackAs: '', isActive: true, order: 22 }
};

export default function StoreScreen() {
  const appState = useAppState();
  const [activeCategory, setActiveCategory] = useState('new-sim');

  // Quantity Modal State
  const [isQtyModalVisible, setQtyModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qtyValue, setQtyValue] = useState('1');

  const catalogSource = appState.globalCatalog && Object.keys(appState.globalCatalog).length > 0 
    ? appState.globalCatalog 
    : defaultCatalog;

  const categories = [
    { id: 'new-sim', label: 'New SIMs' },
    { id: 'paid-rep', label: 'Replacements' },
    { id: 'service', label: 'Services' },
    { id: 'foc', label: 'Free Actions' },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'new-sim': return <Feather name="simcard" size={20} color="#0ea5e9" />;
      case 'paid-rep': return <MaterialCommunityIcons name="package-variant" size={20} color="#8b5cf6" />;
      case 'foc':
      case 'free-action': return <Feather name="check-circle" size={20} color="#10b981" />;
      case 'service': return <Feather name="layers" size={20} color="#f59e0b" />;
      default: return <Feather name="box" size={20} color="#64748b" />;
    }
  };

  // --- Transaction Handlers ---
  const handleItemPress = async (item: any) => {
    if (!passStockFirewall(item.name, 1, appState)) return;
    const paymentMethod = (item.price > 0 && appState.isMfs) ? "MFS" : "Cash";
    await addTransactionToCloud('Item', item.name, item.price, 1, paymentMethod, appState);
  };

  const handleItemLongPress = (item: any) => {
    setSelectedItem(item);
    setQtyValue('1');
    setQtyModalVisible(true);
  };

  const handleQtyKeyPress = (val: string) => {
    setQtyValue((prev) => {
      if (prev === '0') return val;
      if ((prev + val).length > 3) return prev; // Max 3 digits like web app
      return prev + val;
    });
  };

  const handleQtyBackspace = () => {
    setQtyValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleSaveQuantity = async () => {
    const qtyInt = parseInt(qtyValue) || 0;
    if (qtyInt <= 0) return Alert.alert("Invalid Input", "Quantity must be 1 or more.");
    if (!selectedItem) return;

    if (!passStockFirewall(selectedItem.name, qtyInt, appState)) return;

    const totalPrice = qtyInt * selectedItem.price;
    const paymentMethod = (selectedItem.price > 0 && appState.isMfs) ? "MFS" : "Cash";

    const success = await addTransactionToCloud('Item', selectedItem.name, totalPrice, qtyInt, paymentMethod, appState);
    if (success) {
      setQtyModalVisible(false);
      setSelectedItem(null);
    }
  };

  const filteredItems = Object.values(catalogSource)
    .filter((item: any) => {
        const uiCategory = item.cat === 'free-action' ? 'foc' : item.cat;
        return item.isActive !== false && uiCategory === activeCategory;
    })
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        {/* Sticky Store Controls */}
        <View style={styles.headerControls}>
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Payment Mode</Text>
            <View style={styles.toggleSwitch}>
              <TouchableOpacity 
                style={[styles.toggleOption, !appState.isMfs && styles.toggleOptionActive]}
                onPress={() => appState.updateAppState({ isMfs: false })}>
                <Text style={[styles.toggleText, !appState.isMfs && styles.toggleTextActive]}>Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleOption, appState.isMfs && styles.toggleOptionActive]}
                onPress={() => appState.updateAppState({ isMfs: true })}>
                <Text style={[styles.toggleText, appState.isMfs && styles.toggleTextActive]}>MFS</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.pillsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.storePill, activeCategory === cat.id && styles.storePillActive]}
                  onPress={() => setActiveCategory(cat.id)}>
                  <Text style={[styles.pillText, activeCategory === cat.id && styles.pillTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Dynamic Product List */}
        <ScrollView style={styles.listContainer}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item: any, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.itemRow}
                onPress={() => handleItemPress(item)}
                onLongPress={() => handleItemLongPress(item)}
                delayLongPress={400}
              >
                <View style={styles.itemLeft}>
                  <View style={styles.iconContainer}>
                    {getCategoryIcon(item.cat)}
                  </View>
                  <View>
                    <Text style={styles.itemName}>{item.display || item.name}</Text>
                    <Text style={styles.itemSubtext}>Tap to add • Hold for Qty</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  {item.price > 0 ? (
                    <Text style={styles.itemPrice}>{item.price} Tk</Text>
                  ) : (
                    <Text style={[styles.itemPrice, { color: '#10b981' }]}>Free</Text>
                  )}
                  <View style={styles.plusCircle}>
                    <Feather name="plus" size={16} color="#0f172a" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No items found in this category.</Text>
            </View>
          )}
          <View style={{ height: 100 }} /> 
        </ScrollView>
      </View>

      {/* Quantity Modal */}
      <Modal animationType="slide" transparent={true} visible={isQtyModalVisible} onRequestClose={() => setQtyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedItem?.display || selectedItem?.name}</Text>
            
            <View style={styles.qtyDisplayBox}>
              <Text style={styles.qtyDisplayText}>{qtyValue}</Text>
            </View>
            
            <Text style={styles.calcText}>
              {selectedItem?.price === 0 
                ? 'Inventory Update (0 Tk)' 
                : `${qtyValue || 0} x ${selectedItem?.price || 0} = ${(parseInt(qtyValue) || 0) * (selectedItem?.price || 0)} Tk`
              }
            </Text>

            <View style={styles.keypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <TouchableOpacity key={key} style={styles.keypadBtn} onPress={() => handleQtyKeyPress(key)}>
                  <Text style={styles.keypadBtnText}>{key}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.keypadBtn} onPress={() => setQtyModalVisible(false)}>
                <Text style={styles.keypadBtnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.keypadBtn} onPress={() => handleQtyKeyPress('0')}>
                <Text style={styles.keypadBtnText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.keypadBtn, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]} onPress={handleQtyBackspace}>
                <Text style={[styles.keypadBtnText, { color: '#ef4444' }]}>⌫</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveQuantity}>
              <Text style={styles.saveBtnText}>Save Quantity</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1 },
  headerControls: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingTop: 16, paddingBottom: 4, paddingHorizontal: 16, elevation: 2, zIndex: 50 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleLabel: { fontWeight: '700', color: '#64748b', fontSize: 16 },
  toggleSwitch: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 20, padding: 4 },
  toggleOption: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16 },
  toggleOptionActive: { backgroundColor: '#ffffff', elevation: 1 },
  toggleText: { fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#0f172a' },
  pillsWrapper: { paddingBottom: 12 },
  pillsContainer: { gap: 8 },
  storePill: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 20 },
  storePillActive: { backgroundColor: '#0f172a' },
  pillText: { fontWeight: '600', color: '#64748b' },
  pillTextActive: { color: '#ffffff' },
  listContainer: { flex: 1, backgroundColor: '#ffffff', margin: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  iconContainer: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontWeight: '600', color: '#0f172a', fontSize: 16 },
  itemSubtext: { fontSize: 12, color: '#94a3b8' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  plusCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateText: { color: '#94a3b8', fontStyle: 'italic' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end', paddingBottom: 20, paddingHorizontal: 16 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 16 },
  qtyDisplayBox: { backgroundColor: '#f1f5f9', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  qtyDisplayText: { fontSize: 40, fontWeight: '800', color: '#0f172a' },
  calcText: { textAlign: 'center', fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 24 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  keypadBtn: { width: '31%', backgroundColor: '#ffffff', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  keypadBtnText: { fontSize: 22, fontWeight: '700', color: '#334155' },
  saveBtn: { backgroundColor: '#0ea5e9', padding: 18, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 18 }
});