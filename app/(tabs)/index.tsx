import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../src/core/StateContext';
import { addTransactionToCloud } from '../../src/features/transactions';

export default function ERSScreen() {
  const appState = useAppState();
  const [displayValue, setDisplayValue] = useState('0');

  const handleKeyPress = (val: string) => {
    setDisplayValue((prev) => {
      if (prev === '0') {
        return val === '00' ? '0' : val;
      }
      // Limit to 5 digits like the legacy web app
      if ((prev + val).length > 5) return prev;
      return prev + val;
    });
  };

  const handleBackspace = () => {
    setDisplayValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleSave = async (paymentMethod: string) => {
    const amount = parseInt(displayValue);
    if (amount <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }
    
    // Call our new native transaction engine
    const success = await addTransactionToCloud('ERS', 'ERS Flexiload', amount, 1, paymentMethod, appState);
    
    // Only reset the keypad if the save was successful (e.g., desk was actually open)
    if (success) {
      setDisplayValue('0');
    }
  };

  const openProfileHub = () => {
    Alert.alert('Profile Hub', 'This will open your profile and admin settings soon.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        
        {/* Top App Header */}
        <TouchableOpacity style={styles.header} onPress={openProfileHub} activeOpacity={0.7}>
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
  actionBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 }
});