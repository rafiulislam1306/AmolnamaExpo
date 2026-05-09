import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>User Name</Text>
            <Text style={styles.profileEmail}>email@example.com</Text>
            <View style={styles.revenueBadge}>
              <Text style={styles.revenueText}>Revenue: 0 Tk</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sales Dashboard</Text>
        </View>

        <View style={styles.dashboardGrid}>
          <View style={styles.dashCard}>
            <Text style={styles.dashLabel}>Cash Sales</Text>
            <Text style={styles.dashValue}>0 Tk</Text>
          </View>
          <View style={styles.dashCard}>
            <Text style={styles.dashLabel}>MFS Sales</Text>
            <Text style={styles.dashValue}>0 Tk</Text>
          </View>
          <View style={[styles.dashCard, styles.dashCardFull]}>
            <Text style={styles.dashLabelErs}>ERS / Flexiload</Text>
            <Text style={styles.dashValueErs}>0 Tk</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.trashBtn}>
          <Text style={styles.trashBtnText}>🗑️ View Trash</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  profileCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, gap: 16, alignItems: 'center' },
  profileAvatar: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#e2e8f0' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#64748b', marginBottom: 10 },
  revenueBadge: { backgroundColor: '#dcfce7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0' },
  revenueText: { fontSize: 13, fontWeight: '700', color: '#166534' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  dashCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  dashLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  dashValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  dashCardFull: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  dashLabelErs: { fontSize: 13, fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' },
  dashValueErs: { fontSize: 22, fontWeight: '800', color: '#0369a1' },
  trashBtn: { width: '100%', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', alignItems: 'center', marginVertical: 16 },
  trashBtnText: { color: '#64748b', fontWeight: '600' }
});