import { Feather } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../src/config/firebase';
import { useAppState } from '../../src/core/StateContext';
import { addTransactionToCloud } from '../../src/features/transactions';

export default function ERSScreen() {
  const appState = useAppState();
  const [displayValue, setDisplayValue] = useState('0');
  const [isHubVisible, setIsHubVisible] = useState(false);

  const handleKeyPress = (val: string) => {
    setDisplayValue((prev) => {
      if (prev === '0') return val === '00' ? '0' : val;
      if ((prev + val).length > 5) return prev;
      return prev + val;
    });
  };

  const handleBackspace = () => {
    setDisplayValue((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const handleSave = async (paymentMethod: string) => {
    const amount = parseInt(displayValue);
    if (amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }
    const success = await addTransactionToCloud('ERS', 'ERS Flexiload', amount, 1, paymentMethod, appState);
    if (success) setDisplayValue('0');
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: () => signOut(auth) 
      }
    ]);
  };

  const handleSwitchDesk = async () => {
    Alert.alert("Release Desk Lock", "This will unassign you from your current desk. You will need to join a desk again from the Floor Map. Proceed?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Release & Switch", 
        onPress: async () => {
          if (!auth.currentUser) return;
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), { 
              assignedDeskId: null, 
              assignedDate: null 
            }, { merge: true });
            
            appState.updateAppState({ 
              currentDeskId: null, 
              currentSessionId: null, 
              currentDeskName: '' 
            });
            
            setIsHubVisible(false);
            Alert.alert("Success", "Desk lock released.");
          } catch (e) {
            Alert.alert("Error", "Could not release desk lock.");
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        {/* Top App Header */}
        <TouchableOpacity style={styles.header} onPress={() => setIsHubVisible(true)} activeOpacity={0.7}>
          <View style={styles.headerLeft}>
            <Image 
              source={{ uri: appState.currentUser?.photoURL || "https://ui-avatars.com/api/?name=User&background=e2e8f0&color=64748b" }} 
              style={styles.profileCircle} 
            />
            <Text style={styles.headerTitle}>{appState.userNickname || appState.userDisplayName || 'ERS'}</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Feather name="chevron-down" size={18} color="#64748b" />
          </View>
        </TouchableOpacity>

        {/* ERS Display */}
        <View style={styles.displayWrapper}>
          <Text style={styles.currency}>Tk</Text>
          <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>{Number(displayValue).toLocaleString('en-IN')}</Text>
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((key) => (
            <TouchableOpacity key={key} style={styles.keypadBtn} onPress={() => handleKeyPress(key)} activeOpacity={0.7}>
              <Text style={styles.keypadBtnText}>{key}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.keypadBtn, styles.backspaceBtn]} onPress={handleBackspace} activeOpacity={0.7}>
            <Text style={styles.backspaceText}>⌫</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.actionBtn, styles.cashBtn]} onPress={() => handleSave('Cash')} activeOpacity={0.8}>
            <Feather name="credit-card" size={28} color="#ffffff" style={{ marginBottom: 6 }} />
            <Text style={styles.actionBtnText}>CASH</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.mfsBtn]} onPress={() => handleSave('MFS')} activeOpacity={0.8}>
            <Feather name="smartphone" size={28} color="#ffffff" style={{ marginBottom: 6 }} />
            <Text style={styles.actionBtnText}>MFS</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE HUB MODAL */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isHubVisible}
          onRequestClose={() => setIsHubVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.hubContent}>
              <View style={styles.hubHeader}>
                <Text style={styles.hubTitle}>Profile Hub</Text>
                <TouchableOpacity onPress={() => setIsHubVisible(false)}>
                  <Feather name="x" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.userInfoSection}>
                  <Image 
                    source={{ uri: appState.currentUser?.photoURL || "https://ui-avatars.com/api/?name=User" }} 
                    style={styles.hubAvatar} 
                  />
                  <Text style={styles.hubUserName}>{appState.userNickname || appState.userDisplayName}</Text>
                  <Text style={styles.hubUserEmail}>{appState.currentUser?.email}</Text>
                  
                  {/* Role Badge - Replicated logic from legacy auth.js */}
                  <View style={[
                    styles.roleBadge, 
                    (appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') 
                      ? { backgroundColor: '#e0f2fe' } 
                      : { backgroundColor: '#f1f5f9' }
                  ]}>
                    <Text style={[
                      styles.roleText, 
                      (appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') 
                        ? { color: '#0284c7' } 
                        : { color: '#475569' }
                    ]}>
                      {appState.currentUserRole === 'admin' ? 'Center Admin' : 
                       appState.currentUserRole === 'manager' ? 'Center Manager' : 'Floor Agent'}
                    </Text>
                  </View>
                </View>

                <View style={styles.hubActionList}>
                  <Text style={styles.hubActionLabel}>Account Actions</Text>
                  
                  <TouchableOpacity style={styles.hubActionBtn} onPress={handleSwitchDesk}>
                    <View style={[styles.hubIconBox, { backgroundColor: '#fef3c7' }]}>
                      <Feather name="refresh-cw" size={20} color="#d97706" />
                    </View>
                    <Text style={styles.hubActionText}>Switch Desk / Release Lock</Text>
                  </TouchableOpacity>

                  {(appState.currentUserRole === 'admin' || appState.currentUserRole === 'manager') && (
                    <TouchableOpacity style={styles.hubActionBtn}>
                      <View style={[styles.hubIconBox, { backgroundColor: '#ede9fe' }]}>
                        <Feather name="settings" size={20} color="#7c3aed" />
                      </View>
                      <Text style={styles.hubActionText}>Admin Settings</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.hubActionBtn, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                    <View style={[styles.hubIconBox, { backgroundColor: '#fee2e2' }]}>
                      <Feather name="log-out" size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.hubActionText, { color: '#ef4444' }]}>Log Out</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  displayWrapper: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', padding: 24, backgroundColor: '#ffffff', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  currency: { fontSize: 24, color: '#64748b', fontWeight: 'bold', marginBottom: 4 },
  display: { fontSize: 64, color: '#0f172a', fontWeight: '800', letterSpacing: -1 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  keypadBtn: { width: '31%', backgroundColor: '#ffffff', paddingVertical: 20, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
  keypadBtnText: { fontSize: 26, fontWeight: '700', color: '#334155' },
  backspaceBtn: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  backspaceText: { fontSize: 26, fontWeight: '800', color: '#ef4444' },
  actionContainer: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  cashBtn: { backgroundColor: '#059669' },
  mfsBtn: { backgroundColor: '#7c3aed' },
  actionBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  // Profile Hub Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  hubContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '70%' },
  hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  hubTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  userInfoSection: { alignItems: 'center', marginBottom: 32 },
  hubAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, borderWidth: 3, borderColor: '#f1f5f9' },
  hubUserName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  hubUserEmail: { fontSize: 14, color: '#64748b', fontWeight: '500', marginBottom: 16 },
  roleBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  hubActionList: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  hubActionLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  hubActionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hubIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  hubActionText: { fontSize: 16, fontWeight: '600', color: '#334155' }
});