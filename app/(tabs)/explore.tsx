import { db } from '@/src/config/firebase';
import { useAppState } from '@/src/core/StateContext';
import { COLORS } from '@/src/core/theme';
import { Feather } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

export default function StoreScreen() {
  const { appState, updateAppState } = useAppState();
  
  // Category & Modal State
  const [activeCategory, setActiveCategory] = useState('new-sim');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qtyAmount, setQtyAmount] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  // --- CATALOG DATA PREP ---
  // Using globalCatalog, fallback to mock if empty
  const rawCatalog = appState.globalCatalog && Object.keys(appState.globalCatalog).length > 0 
    ? Object.values(appState.globalCatalog) 
    : [
        { name: 'Banglalink New SIM', price: 200, cat: 'new-sim', order: 1, isActive: true },
        { name: '4G Upgrade (Free)', price: 0, cat: 'foc', order: 2, isActive: true },
        { name: 'SIM Replacement', price: 100, cat: 'paid-rep', order: 3, isActive: true },
        { name: 'Prepaid to Postpaid', price: 0, cat: 'service', order: 4, isActive: true },
      ];

  // Map PWA categories
  const categories = [
    { id: 'new-sim', label: 'New SIMs' },
    { id: 'paid-rep', label: 'Replacements' },
    { id: 'service', label: 'Services' },
    { id: 'foc', label: 'Free Actions' }, // Groups 'foc' and 'free-action'
  ];

  const filteredItems = rawCatalog
    .filter((item: any) => item.isActive !== false)
    .filter((item: any) => {
      if (activeCategory === 'foc') return item.cat === 'foc' || item.cat === 'free-action';
      return item.cat === activeCategory;
    })
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  // --- CORE TRANSACTION SAVER ---
  const saveTransaction = async (itemName: string, price: number, qty: number) => {
    if (!appState.currentSessionId) {
      Alert.alert("Desk Closed", "You must open your desk from the Floor Map first.");
      return;
    }
    
    // Check lock permission
    const itemData = rawCatalog.find((c:any) => c.name === itemName);
    const isLocked = itemData?.managerOnly && !['manager', 'center_manager', 'owner'].includes(appState.currentUserRole);
    if (isLocked) {
      Alert.alert("Access Denied", "🔒 Only a Center Manager can process this item.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    
    const amount = price * qty;
    const paymentMethod = (price > 0 && appState.isMfs) ? "MFS" : "Cash";
    const cashAmt = paymentMethod === 'Cash' ? amount : 0;
    const mfsAmt = paymentMethod === 'MFS' ? amount : 0;

    const d = new Date();
    const strictDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    const tx = {
      id: Date.now(),
      receiptNo: `TX-${Date.now().toString().slice(-6)}`,
      type: 'Item', name: itemName, trackAs: itemData?.trackAs || itemName, amount, qty, payment: paymentMethod, cashAmt, mfsAmt,
      isDeleted: false, dateStr: strictDate,
      time: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      deskId: appState.currentDeskId, sessionId: appState.currentSessionId,
      agentId: appState.currentUser?.uid || 'unknown',
      agentName: appState.userNickname || appState.userDisplayName || 'Agent',
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'transactions'), tx);
      Alert.alert("Success", `${qty}x ${itemName} Logged!`);
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Storage Error", "Could not save transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- INTERACTION LOGIC ---
  const handleItemPress = (item: any) => {
    saveTransaction(item.name, parseFloat(item.price) || 0, 1);
  };

  const handleItemLongPress = (item: any) => {
    Vibration.vibrate(50);
    setSelectedItem(item);
    setQtyAmount('1');
    setModalVisible(true);
  };

  const handleQtyPress = (num: string) => {
    Vibration.vibrate(10);
    if (qtyAmount === '0') setQtyAmount(num);
    else if (qtyAmount.length < 3) setQtyAmount(qtyAmount + num);
  };

  const handleQtyBackspace = () => {
    Vibration.vibrate(15);
    setQtyAmount(qtyAmount.length > 1 ? qtyAmount.slice(0, -1) : '0');
  };

  // UI Helpers
  const getIconProps = (cat: string) => {
    if (cat === 'new-sim') return { icon: 'credit-card', color: '#0ea5e9', bg: '#e0f2fe' };
    if (cat === 'paid-rep') return { icon: 'refresh-cw', color: '#8b5cf6', bg: '#f3e8ff' };
    if (cat === 'service') return { icon: 'star', color: '#f59e0b', bg: '#fef3c7' };
    return { icon: 'check-circle', color: '#10b981', bg: '#d1fae5' }; // FOC
  };

  return (
    <View style={styles.container}>
      
      {/* 1. Sticky Glass Panel Controls */}
      <View style={styles.glassPanel}>
        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Payment Mode</Text>
          <View style={styles.toggleSwitch}>
            <TouchableOpacity 
              style={[styles.toggleOption, !appState.isMfs && styles.toggleOptionActive]} 
              onPress={() => updateAppState({isMfs: false})}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, !appState.isMfs && styles.toggleTextActive]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleOption, appState.isMfs && styles.toggleOptionActive]} 
              onPress={() => updateAppState({isMfs: true})}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, appState.isMfs && styles.toggleTextActive]}>MFS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.storePill, activeCategory === cat.id && styles.storePillActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.storePillText, activeCategory === cat.id && styles.storePillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 2. Catalog List */}
      <ScrollView style={styles.scrollArea}>
        <View style={styles.listContainer}>
          {filteredItems.length === 0 ? (
            <Text style={{textAlign: 'center', padding: 20, color: COLORS.textSecondary}}>No items in this category.</Text>
          ) : (
            filteredItems.map((item: any, index: number) => {
              const { icon, color, bg } = getIconProps(item.cat);
              const isLocked = item.managerOnly && !['manager', 'center_manager', 'owner'].includes(appState.currentUserRole);
              const price = parseFloat(item.price) || 0;
              const isLast = index === filteredItems.length - 1;

              return (
                <TouchableOpacity 
                  key={item.key || index}
                  style={[
                    styles.dynamicItem, 
                    isLocked && { backgroundColor: '#f8fafc', opacity: 0.6 },
                    isLast && { borderBottomWidth: 0 }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleItemPress(item)}
                  onLongPress={() => handleItemLongPress(item)}
                  delayLongPress={400}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIconBox, { backgroundColor: isLocked ? '#f1f5f9' : bg }]}>
                      <Feather name={icon as any} size={20} color={isLocked ? '#94a3b8' : color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, isLocked && { color: '#94a3b8' }]} numberOfLines={1}>{item.display || item.name}</Text>
                      {isLocked && <Text style={styles.itemLockedText}>🔒 Center Manager Only</Text>}
                    </View>
                  </View>
                  
                  <View style={styles.itemRight}>
                    {price > 0 ? (
                      <Text style={styles.itemPriceText}>{price} <Text style={styles.itemPriceCurrency}>Tk</Text></Text>
                    ) : (
                      <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
                    )}
                    
                    {isLocked ? (
                      <Feather name="lock" size={20} color="#ef4444" style={{ marginLeft: 12 }} />
                    ) : (
                      <View style={styles.actionCircleIcon}>
                        <Feather name="chevron-right" size={16} color={COLORS.accent} />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <View style={{height: 40}}/>
      </ScrollView>

      {/* 3. Quantity Bottom Sheet Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.qtyHeader}>{selectedItem?.name}</Text>
            
            <View style={styles.displayWrapper}>
              <Text style={styles.currency}>Qty:</Text>
              <Text style={styles.display}>{qtyAmount}</Text>
            </View>
            
            <Text style={styles.qtyCalc}>
              {parseFloat(selectedItem?.price) === 0 
                ? 'Inventory Update (0 Tk)' 
                : `${parseInt(qtyAmount || '0')} x ${selectedItem?.price} = ${(parseInt(qtyAmount || '0') * parseFloat(selectedItem?.price))} Tk`}
            </Text>

            <View style={styles.keypad}>
              {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, rIdx) => (
                <View key={rIdx} style={styles.keypadRow}>
                  {row.map(num => (
                    <TouchableOpacity key={num} style={styles.keypadBtn} activeOpacity={0.7} onPress={() => handleQtyPress(num)}>
                      <Text style={styles.keypadText}>{num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <View style={styles.keypadRow}>
                <View style={[styles.keypadBtn, {backgroundColor: 'transparent', elevation: 0}]} />
                <TouchableOpacity style={styles.keypadBtn} activeOpacity={0.7} onPress={() => handleQtyPress('0')}>
                  <Text style={styles.keypadText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.keypadBtn, {backgroundColor: COLORS.dangerBg}]} activeOpacity={0.7} onPress={handleQtyBackspace}>
                  <Feather name="delete" size={28} color={COLORS.dangerText} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#e2e8f0', flex: 0.5}]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.saveBtnText, {color: COLORS.textSecondary}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => {
                saveTransaction(selectedItem.name, parseFloat(selectedItem.price)||0, parseInt(qtyAmount)||0);
              }}>
                <Text style={styles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // .glass-panel
  glassPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 50,
  },

  // Segmented Control (.toggle-container & .toggle-switch)
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  toggleSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    width: 180,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: COLORS.textPrimary,
  },

  // .store-pill
  pillScroll: {
    gap: 8,
    paddingRight: 16,
  },
  storePill: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  storePillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  storePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  storePillTextActive: {
    color: '#ffffff',
  },

  scrollArea: {
    flex: 1,
    padding: 16,
  },

  // .list-menu-group logic
  listContainer: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dynamicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  itemIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemLockedText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 4,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  itemPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  itemPriceCurrency: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  freeBadge: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },
  actionCircleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
  },

  // Modal / Bottom Sheet (.modal-overlay & .modal-content)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  qtyHeader: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.accent,
    marginBottom: 12,
  },
  qtyCalc: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  displayWrapper: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
  },
  currency: {
    fontSize: 20,
    color: COLORS.textSecondary,
    marginRight: 12,
    fontWeight: '600',
  },
  display: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  keypad: {
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  keypadBtn: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  }
});