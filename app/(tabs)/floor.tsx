import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/src/config/firebase';
import { useAppState } from '@/src/core/StateContext';
import { joinDesk } from '@/src/features/desk';
import { bootSystemRollover } from '@/src/features/rollover'; // IMPORT THE SCRIPT
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FloorScreen() {
  const { appState, updateAppState } = useAppState();
  const [desks, setDesks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function initializeAndLoadFloor() {
      setLoading(true);
      try {
        // 1. RUN THE ROLLOVER SCRIPT FIRST
        // By this point, Firebase Auth is fully synced with Firestore
        await bootSystemRollover();

        // 2. THEN FETCH THE DESKS
        const desksSnapshot = await getDocs(collection(db, 'desks'));
        const deskData = desksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDesks(deskData);
      } catch (error) {
        console.error("Error loading desks:", error);
      } finally {
        setLoading(false);
      }
    }
    
    initializeAndLoadFloor();
  }, []);

  const handleDeskSelect = (desk: any) => {
    let actionText = desk.status === 'open' ? 'join' : 'open';
    
    Alert.alert(
      "Confirm Workspace",
      `Are you sure you want to ${actionText} ${desk.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          style: "default",
          onPress: () => joinDesk(desk, appState, updateAppState, router) 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={{marginTop: 12, color: '#64748b', fontWeight: '600'}}>Syncing Floor Data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Live Floor Map</Text>
      <Text style={styles.sectionLabel}>Shared Floor Desks</Text>
      
      {desks.map((desk) => (
        <TouchableOpacity 
          key={desk.id} 
          style={styles.card} 
          onPress={() => handleDeskSelect(desk)}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconBox}>
              <IconSymbol name="tray.fill" size={24} color="#475569" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.deskName}>{desk.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: desk.status === 'open' ? '#10b981' : '#94a3b8' }]} />
                <Text style={[styles.statusText, { color: desk.status === 'open' ? '#10b981' : '#94a3b8' }]}>
                  {desk.status === 'open' ? 'Active' : 'Closed'}
                </Text>
              </View>
            </View>
          </View>
          <IconSymbol name="chevron.right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24, marginTop: 60 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#ffffff', padding: 16, marginBottom: 12, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  textContainer: { justifyContent: 'center' },
  deskName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: '600' }
});