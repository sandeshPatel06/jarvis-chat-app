import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';

export default function ChangePinScreen() {
    const { colors } = useAppTheme();
    const router = useRouter();
    const showAlert = useStore((state) => state.showAlert);
    const [pin, setPin] = useState('');
    const [step, setStep] = useState<'enter_old' | 'enter_new' | 'confirm_new'>('enter_new');
    const [tempPin, setTempPin] = useState('');
    const [title, setTitle] = useState('Enter New PIN');

    const handlePinPress = (value: string) => {
        if (value === 'backspace') {
            setPin(prev => prev.slice(0, -1));
            return;
        }

        if (pin.length < 4) {
            const newPin = pin + value;
            setPin(newPin);
            if (newPin.length === 4) {
                handlePinSubmit(newPin);
            }
        }
    };

    const handlePinSubmit = async (enteredPin: string) => {
        if (step === 'enter_new') {
            setTempPin(enteredPin);
            setPin('');
            setStep('confirm_new');
            setTitle('Confirm New PIN');
        } else if (step === 'confirm_new') {
            if (enteredPin === tempPin) {
                await AsyncStorage.setItem('userPin', enteredPin);
                showAlert('Success', 'PIN set successfully');
                router.back();
            } else {
                Vibration.vibrate();
                showAlert('Error', 'PINs do not match');
                setPin('');
                setStep('enter_new');
                setTitle('Enter New PIN');
            }
        }
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Set PIN</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <FontAwesome name="lock" size={40} color={colors.primary} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>
                    {title}
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
                                    borderColor: colors.primary,
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
                        ['EMPTY', '0', 'backspace']
                    ].map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.keypadRow}>
                            {row.map((item) => {
                                if (item === 'EMPTY') {
                                    return <View key={item} style={styles.keypadButton} />;
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
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
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
        maxWidth: 350,
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
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    keypadText: {
        fontSize: 28,
        fontWeight: '500',
    },
});
