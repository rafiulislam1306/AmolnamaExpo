import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DrawerScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
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
});