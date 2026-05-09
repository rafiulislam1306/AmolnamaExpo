import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogleNative } from '../src/features/auth';

export default function LoginScreen() {

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogleNative();
      // If successful, the Root Layout will automatically see the user and switch to Tabs
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Amolnama</Text>
          <Text style={styles.subtitle}>Your daily ledger, simplified.</Text>
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.errorText}></Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  header: { 
    marginBottom: 40, 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 40, 
    fontWeight: '800', 
    color: '#0ea5e9', 
    marginBottom: 8, 
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 18, 
    color: '#64748b' 
  },
  googleBtn: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    width: '100%', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 2 
  },
  googleBtnText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0f172a' 
  },
  errorText: {
    color: '#ef4444',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center'
  }
});