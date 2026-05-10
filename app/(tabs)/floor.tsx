import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { useAppState } from '../../src/core/StateContext';
import { handleDeskSelect } from '../../src/features/desk';

export default function FloorScreen() {
  const appState = useAppState();
  const router = useRouter();
  const [desks, setDesks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFloorMap = async () => {
    setLoading(true);
    if (!auth.currentUser) return;

    try {
      const desksSnapshot = await getDocs(collection(db, 'desks'));
      const personalDeskId = 'personal_' + auth.currentUser.uid;
      const myFirstName = appState.userNickname || (appState.userDisplayName ? appState.userDisplayName.split(' ')[0] : 'Agent');
      const myDrawerName = `${myFirstName}'s Drawer`;
      
      let floorData: any[] = [];
      let foundPersonal = false;

      // Handle fresh database initialization if empty
      if (desksSnapshot.empty) {
        await setDoc(doc(db, 'desks', 'desk_1'), { name: 'Desk 1', status: 'closed', currentSessionId: null });
        await setDoc(doc(db, 'desks', 'desk_2'), { name: 'Desk 2', status: 'closed', currentSessionId: null });
        await setDoc(doc(db, 'desks', 'desk_3'), { name: 'Desk 3', status: 'closed', currentSessionId: null });
        fetchFloorMap();
        return;
      }

      desksSnapshot.forEach(docSnap => {
        const desk = docSnap.data();
        if (docSnap.id === personalDeskId) {
          foundPersonal = true;
          floorData.unshift({ id: docSnap.id, name: myDrawerName, ...desk, isMine: true });
        } else if (!desk.isPersonal && docSnap.id !== 'sandbox') {
          floorData.push({ id: docSnap.id, ...desk, isMine: false });
        }
      });

      if (!foundPersonal) {
        await setDoc(doc(db, 'desks', personalDeskId), { name: myDrawerName, status: 'closed', currentSessionId: null, isPersonal: true });
        floorData.unshift({ id: personalDeskId, name: myDrawerName, status: 'closed', currentSessionId: null, isMine: true });
      }

      setDesks(floorData);
    } catch (e) {
      Alert.alert("Error", "Could not load floor map.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorMap();
  }, []);

  const onJoinDesk = async (desk: any) => {
    const success = await handleDeskSelect(desk.id, desk.name, desk.status, desk.currentSessionId, appState, auth);
    if (success) {
      router.push('/drawer'); // Auto-route to Drawer tab on success
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Floor Map</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchFloorMap}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* My Workspace Section */}
            <Text style={styles.sectionTitle}>My Workspace</Text>
            {desks.filter(d => d.isMine).map(desk => (
              <TouchableOpacity 
                key={desk.id} 
                style={[styles.deskCard, { borderColor: '#c4b5fd', backgroundColor: '#faf5ff' }]} 
                onPress={() => onJoinDesk(desk)}
              >
                <View style={styles.deskLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#ede9fe' }]}>
                    <Feather name="monitor" size={24} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text style={styles.deskName}>{desk.name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: desk.status === 'open' ? '#10b981' : '#94a3b8' }]} />
                      <Text style={[styles.statusText, { color: desk.status === 'open' ? '#10b981' : '#94a3b8' }]}>
                        {desk.status === 'open' ? 'Active' : 'Closed'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}

            {/* Shared Floor Desks */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Shared Floor Desks</Text>
            {desks.filter(d => !d.isMine).map(desk => (
              <TouchableOpacity 
                key={desk.id} 
                style={styles.deskCard} 
                onPress={() => onJoinDesk(desk)}
              >
                <View style={styles.deskLeft}>
                  <View style={styles.iconBox}>
                    <Feather name="layers" size={24} color="#475569" />
                  </View>
                  <View>
                    <Text style={styles.deskName}>{desk.name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: desk.status === 'open' ? '#10b981' : '#94a3b8' }]} />
                      <Text style={[styles.statusText, { color: desk.status === 'open' ? '#10b981' : '#94a3b8' }]}>
                        {desk.status === 'open' ? 'Active' : 'Closed'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  refreshBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  refreshText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  deskCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  deskLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  deskName: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 13, fontWeight: '600' }
});