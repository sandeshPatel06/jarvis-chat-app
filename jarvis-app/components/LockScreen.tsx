import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MASTER_PIN = '0707';

export const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const { colors } = useAppTheme();
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handleAuthenticate = useCallback(async () => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) return;

            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) return;

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Jarvis Chat',
                fallbackLabel: 'Use Passcode',
                cancelLabel: 'Cancel',
            });

            if (result.success) {
                onUnlock();
            }
        } catch (authError) {
            console.error('Authentication error:', authError);
        }
    }, [onUnlock]);

    useEffect(() => {
        // Auto-trigger authentication on mount
        handleAuthenticate();
    }, [handleAuthenticate]);

    const handlePinPress = (value: string) => {
        if (error) setError(false);
        if (value === 'backspace') {
            setPin(prev => prev.slice(0, -1));
            return;
        }

        if (pin.length < 4) {
            const newPin = pin + value;
            setPin(newPin);
            if (newPin.length === 4) {
                // Check against master PIN or stored user PIN
                AsyncStorage.getItem('userPin').then((storedPin) => {
                    if (newPin === MASTER_PIN || (storedPin && newPin === storedPin)) {
                        onUnlock();
                    } else {
                        setError(true);
                        Vibration.vibrate();
                        setTimeout(() => {
                            setPin('');
                            setError(false);
                        }, 500);
                    }
                });
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '20']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.card, borderColor: error ? colors.error : 'transparent', borderWidth: error ? 2 : 0 }]}>
                        <FontAwesome name="lock" size={40} color={error ? colors.error : colors.primary} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>
                        Jarvis Chat Locked
                    </Text>

                    {/* PIN Dots */}
                    <View style={styles.pinContainer}>
                        {[...Array(4)].map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.pinDot,
                                    {
                                        backgroundColor: i < pin.length ? colors.primary : colors.border,
                                        borderColor: error ? colors.error : colors.primary,
                                    }
                                ]}
                            />
                        ))}
                    </View>

                    {/* Keypad */}
                    <View style={styles.keypad}>
                        {[
                            ['1', '2', '3'],
                            ['4', '5', '6'],
                            ['7', '8', '9'],
                            ['fingers', '0', 'backspace']
                        ].map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.keypadRow}>
                                {row.map((item) => {
                                    if (item === 'fingers') {
                                        return (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.keypadButton}
                                                onPress={handleAuthenticate}
                                            >
                                                <MaterialCommunityIcons name="fingerprint" size={28} color={colors.primary} />
                                            </TouchableOpacity>
                                        );
                                    }
                                    if (item === 'backspace') {
                                        return (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.keypadButton}
                                                onPress={() => handlePinPress('backspace')}
                                            >
                                                <MaterialCommunityIcons name="backspace-outline" size={24} color={colors.text} />
                                            </TouchableOpacity>
                                        );
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={item}
                                            style={styles.keypadButton}
                                            onPress={() => handlePinPress(item)}
                                        >
                                            <Text style={[styles.keypadText, { color: colors.text }]}>{item}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 30,
        textAlign: 'center',
    },
    pinContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        gap: 15,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    keypad: {
        width: '100%',
        paddingHorizontal: 20,
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    keypadButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)', // Subtle background
    },
    keypadText: {
        fontSize: 28,
        fontWeight: '500',
    },
});
