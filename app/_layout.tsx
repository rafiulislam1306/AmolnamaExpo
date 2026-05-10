import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStateProvider } from '../src/core/StateContext';
import { initAuth } from '../src/features/auth';
import LoginScreen from './login';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Start listening to Firebase Auth state
    initAuth(
      (loggedInUser) => {
        setUser(loggedInUser);
        setIsReady(true);
      },
      () => {
        setUser(null);
        setIsReady(true);
      }
    );
  }, []);

  if (!isReady) return null; // Show blank screen during Firebase handshake

  // If no user is found, strictly render the Login screen only
  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'left', 'right']}>
          <LoginScreen />
          <StatusBar style="dark" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // If user is found, render the Navigation Stack (Tabs) WRAPPED in the AppStateProvider
  return (
    <AppStateProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </AppStateProvider>
  );
}