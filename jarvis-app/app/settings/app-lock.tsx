import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
    const [, setIsLoading] = useState(true); // Keep setter but ignore value if strict

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
            // Authenticate before changing the setting
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: value ? 'Enable App Lock' : 'Disable App Lock',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                setIsAppLockEnabled(value);
                await AsyncStorage.setItem('appLockEnabled', String(value));
            } else {
                // If cancelled or failed, don't toggle
            }
        } catch (error) {
            console.error('Error toggling app lock:', error);
            showAlert('Error', 'Failed to update App Lock setting');
        }
    }, [isSupported, showAlert]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>App Lock</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <FontAwesome name="lock" size={60} color={colors.primary} />
                </View>

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Secure your chats with Face ID, Touch ID, or your device passcode.
                    When enabled, you&apos;ll need to authenticate to open Jarvis Chat.
                </Text>

                <SettingCard>
                    <SettingRow
                        title="App Lock"
                        icon="shield"
                        isSwitch
                        switchValue={isAppLockEnabled}
                        onSwitchChange={toggleAppLock}
                        color="#4FACFE"
                    />
                    {isAppLockEnabled && (
                        <SettingRow
                            title="Set / Change PIN"
                            icon="key"
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
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
    },
    content: {
        padding: 20,
    },
    iconContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 20,
        opacity: 0.8,
    },
    warning: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 15,
    }
});
