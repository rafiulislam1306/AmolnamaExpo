import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../src/core/StateContext';

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

  // Use global catalog if available, otherwise fallback
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

  const handleItemPress = (item: any) => {
    // TODO: Link to transactions.ts instantSaveItem
    Alert.alert('Save Transaction', `Save 1x ${item.display || item.name} for ${item.price} Tk?`);
  };

  const handleItemLongPress = (item: any) => {
    // TODO: Link to transactions.ts selectItem
    Alert.alert('Quantity Mode', `Open quantity selector for ${item.name}`);
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
                delayLongPress={500}
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
});