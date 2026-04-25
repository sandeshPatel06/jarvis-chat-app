import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: true,
        tabBarButton: (props) => (
          <TouchableOpacity
            {...props}
            activeOpacity={0.7}
            onPress={(e) => {
              Haptics.selectionAsync();
              props.onPress?.(e);
            }}
          />
        ),
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)',
              }
            ]}
          />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          height: 60 + insets.bottom,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom,
          elevation: 0,
        },
        tabBarItemStyle: {
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          display: 'none',
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 32,
          fontWeight: '800',
          letterSpacing: -0.5,
        },
        headerTitleAlign: 'left',
        headerStatusBarHeight: insets.top,
        headerLeftContainerStyle: { paddingLeft: 20 },
        headerRightContainerStyle: { paddingRight: 20 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={focused ? "chat" : "chat-outline"} 
                size={28} 
                color={color} 
              />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => router.setParams({ triggerSearch: Date.now().toString() })}
              >
                <FontAwesome name="search" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconButton}>
                <FontAwesome name="ellipsis-v" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={focused ? "account-group" : "account-group-outline"} 
                size={28} 
                color={color} 
              />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={focused ? "phone" : "phone-outline"} 
                size={28} 
                color={color} 
              />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={focused ? "cog" : "cog-outline"} 
                size={28} 
                color={color} 
              />
              {focused && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
