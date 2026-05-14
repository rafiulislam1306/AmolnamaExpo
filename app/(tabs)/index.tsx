import { db } from '@/src/config/firebase';
import { useAppState } from '@/src/core/StateContext';
import { COLORS } from '@/src/core/theme';
import { Feather } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

export default function ErsScreen() {
  const { appState } = useAppState();
  const [ersAmount, setErsAmount] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  // --- EXACT PWA KEYPAD LOGIC ---
  const handleErsPress = (num: string) => {
    Vibration.vibrate(10);
    if (ersAmount === '0') {
      if (num !== '00' && num !== '0') setErsAmount(num);
    } else {
      if ((ersAmount + num).length <= 5) setErsAmount(ersAmount + num);
    }
  };

  const handleErsBackspace = () => {
    Vibration.vibrate(15);
    setErsAmount(ersAmount.length > 1 ? ersAmount.slice(0, -1) : '0');
  };

  // --- TRANSACTION SAVER ---
  const saveErs = async (paymentMethod: 'Cash' | 'MFS') => {
    const amount = parseInt(ersAmount);
    if (amount <= 0) { 
      Alert.alert("Invalid Input", "Please enter a valid amount."); 
      return; 
    }
    if (!appState.currentSessionId) {
      Alert.alert("Desk Closed", "You must open your desk and verify your float before making transactions.");
      return;
    }
    if (isSaving) return;
    
    setIsSaving(true);
    let cashAmt = paymentMethod === 'Cash' ? amount : 0;
    let mfsAmt = paymentMethod === 'MFS' ? amount : 0;

    const d = new Date();
    const strictDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    const tx = {
      id: Date.now(),
      receiptNo: `TX-${Date.now().toString().slice(-6)}`,
      type: 'ERS', 
      name: 'ERS Flexiload', 
      trackAs: 'ERS Flexiload', 
      amount, 
      qty: 1, 
      payment: paymentMethod, 
      cashAmt, 
      mfsAmt,
      isDeleted: false,
      dateStr: strictDate,
      time: d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      deskId: appState.currentDeskId,
      sessionId: appState.currentSessionId,
      agentId: appState.currentUser?.uid || 'unknown',
      agentName: appState.userNickname || appState.userDisplayName || 'Agent',
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'transactions'), tx);
      // PWA Flash Message equivalent
      Alert.alert("Success", `ERS ${amount} Tk Logged!`); 
      setErsAmount('0');
    } catch (error) {
      Alert.alert("Storage Error", "Could not save locally. Check storage.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Display Wrapper (Mirrors .ers-display-wrapper) */}
      <View style={styles.displayWrapper}>
        <Text style={styles.currency}>Tk</Text>
        <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit>
          {Number(ersAmount).toLocaleString('en-IN')}
        </Text>
      </View>

      {/* 2. Keypad (Mirrors .keypad & .keypad-btn) */}
      <View style={styles.keypad}>
        {[['1','2','3'],['4','5','6'],['7','8','9']].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map(num => (
              <TouchableOpacity key={num} style={styles.keypadBtn} activeOpacity={0.7} onPress={() => handleErsPress(num)}>
                <Text style={styles.keypadText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.keypadRow}>
          <TouchableOpacity style={styles.keypadBtn} activeOpacity={0.7} onPress={() => handleErsPress('00')}>
            <Text style={styles.keypadText}>00</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keypadBtn} activeOpacity={0.7} onPress={() => handleErsPress('0')}>
            <Text style={styles.keypadText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.keypadBtn, styles.backspaceBtn]} activeOpacity={0.7} onPress={handleErsBackspace}>
            <Feather name="delete" size={32} color={COLORS.dangerText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Action Buttons (Mirrors .save-ers-btn) */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: '#10b981' }]} 
          activeOpacity={0.8} 
          onPress={() => saveErs('Cash')}
          disabled={isSaving}
        >
          <Feather name="dollar-sign" size={28} color="#ffffff" style={{ marginBottom: 6 }} />
          <Text style={styles.saveBtnText}>CASH</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: '#8b5cf6' }]} 
          activeOpacity={0.8} 
          onPress={() => saveErs('MFS')}
          disabled={isSaving}
        >
          <Feather name="smartphone" size={28} color="#ffffff" style={{ marginBottom: 6 }} />
          <Text style={styles.saveBtnText}>MFS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// EXACT translations of your CSS file
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    paddingTop: 60, // Gives breathing room at the top like the PWA header
    justifyContent: 'space-between',
  },
  
  // .ers-display-wrapper
  displayWrapper: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
  },
  // .ers-currency
  currency: {
    fontSize: 28,
    color: COLORS.textSecondary,
    marginRight: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  // .ers-display
  display: {
    fontSize: 72,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -2,
  },

  // .keypad
  keypad: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14, // Works in modern React Native to space items evenly!
    flex: 1,
    marginBottom: 14,
  },
  // .keypad-btn
  keypadBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  keypadText: {
    fontSize: 36,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  // .backspace-btn
  backspaceBtn: {
    backgroundColor: COLORS.dangerBg,
    elevation: 0,
    shadowOpacity: 0,
  },

  // Action row wrapper
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  // .save-ers-btn
  saveBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
});