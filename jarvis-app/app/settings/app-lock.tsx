import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingCard from '@/components/settings/SettingCard';
import SettingRow from '@/components/settings/SettingRow';
import { useStore } from '@/store';

export default function AppLockSettingsScreen() {
    const { colors } = useAppTheme();
    const router = useRouter();
    const showAlert = useStore((state) => state.showAlert);
    const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [, setIsLoading] = useState(true);

    useEffect(() => {
        checkSupport();
        loadSettings();
    }, []);

    const checkSupport = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsSupported(hasHardware && isEnrolled);
    };

    const loadSettings = async () => {
        try {
            const enabled = await AsyncStorage.getItem('appLockEnabled');
            setIsAppLockEnabled(enabled === 'true');
        } catch (error) {
            console.error('Failed to load app lock settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAppLock = useCallback(async (value: boolean) => {
        if (!isSupported && value) {
            showAlert('Not Supported', 'Biometric authentication is not available or not set up on this device.');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: value ? 'Enable App Lock' : 'Disable App Lock',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                setIsAppLockEnabled(value);
                await AsyncStorage.setItem('appLockEnabled', String(value));
            }
        } catch (error) {
            console.error('Error toggling app lock:', error);
            showAlert('Error', 'Failed to update App Lock setting');
        }
    }, [isSupported, showAlert]);

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'App Lock',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.iconContainer}>
                    <View style={[styles.lockCircle, { backgroundColor: colors.primary + '15' }]}>
                        <MaterialCommunityIcons name="shield-lock-outline" size={60} color={colors.primary} />
                    </View>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                        Secure your chats with Face ID, Touch ID, or your device passcode.
                        When enabled, you&apos;ll need to authenticate to open Jarvis Chat.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security Settings</Text>
                    <SettingCard>
                        <SettingRow
                            title="App Lock"
                            subtitle="Require authentication to open Jarvis"
                            icon="shield-outline"
                            isSwitch
                            switchValue={isAppLockEnabled}
                            onSwitchChange={toggleAppLock}
                            color="#4FACFE"
                        />
                        {isAppLockEnabled && (
                            <SettingRow
                                title="Set / Change PIN"
                                subtitle="Custom privacy protection"
                                icon="key-outline"
                                onPress={() => {
                                    router.push('/settings/change-pin');
                                }}
                                color="#F5A623"
                                isLast
                            />
                        )}
                    </SettingCard>
                    {!isSupported && (
                        <Text style={[styles.warning, { color: colors.error }]}>
                            Biometric authentication is not set up on this device.
                        </Text>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 40,
        paddingHorizontal: 20,
    },
    lockCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '600',
        opacity: 0.7,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    warning: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
        fontWeight: '600',
        opacity: 0.8,
    }
});
