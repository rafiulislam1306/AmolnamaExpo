import { COLORS } from '@/src/core/theme';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.06)',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'ERS',
          // FIX: Swapped Feather for MaterialIcons which actually has a calculator
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="calculate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <Feather size={24} name="shopping-bag" color={color} />,
        }}
      />
      <Tabs.Screen
        name="drawer"
        options={{
          title: 'Drawer',
          tabBarIcon: ({ color }) => <Feather size={24} name="inbox" color={color} />,
        }}
      />
      <Tabs.Screen
        name="floor"
        options={{
          title: 'Floor',
          tabBarIcon: ({ color }) => <Feather size={24} name="grid" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Center',
          tabBarIcon: ({ color }) => <Feather size={24} name="pie-chart" color={color} />,
        }}
      />
    </Tabs>
  );
}