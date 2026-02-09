import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAppTheme } from '@/hooks/useAppTheme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary, // Use primary brand color
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0, // Remove default shadow
          height: 65 + insets.bottom,
          paddingBottom: insets.bottom + 20,
          paddingTop: 0,
          position: 'absolute', // Floating effect
          left: 20,
          right: 20,
          borderRadius: 30, // Pill shape
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.1, // Soft premium shadow
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          borderRadius: 30,
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 5,
          display: 'none', // Hide labels for cleaner look (optional, but requested "modern")
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0, // Cleaner look
          // Height will be automatic plus status bar height
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 28, // Even larger title for premium feel
          fontWeight: '800', // Bolder
        },
        headerTitleAlign: 'left',
        headerStatusBarHeight: insets.top, // Explicitly handle status bar height
        headerTitleContainerStyle: {
          paddingLeft: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          headerTitle: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="comments" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 20, gap: 20, paddingBottom: 10, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => {
                router.setParams({ triggerSearch: Date.now().toString() });
              }}>
                <FontAwesome name="search" size={25} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/settings/profile')}>
                <FontAwesome name="edit" size={25} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          headerTitle: 'Calls',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="phone" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 20, gap: 20, paddingBottom: 10 }}>
              <FontAwesome name="phone-square" size={20} color={colors.primary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          headerTitle: 'People',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="users" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="cog" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
