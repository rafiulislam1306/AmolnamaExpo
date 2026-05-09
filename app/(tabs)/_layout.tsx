import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: { backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ERS',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="drawer"
        options={{
          title: 'Drawer',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="tray.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="floor"
        options={{
          title: 'Floor',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Rep.',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
