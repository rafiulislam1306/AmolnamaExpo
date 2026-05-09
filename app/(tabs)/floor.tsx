import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FloorScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Floor Map</Text>
          <TouchableOpacity style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapContainer}>
          <Text style={styles.placeholder}>Loading floor data...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  refreshBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  mapContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#94a3b8', fontStyle: 'italic' }
});