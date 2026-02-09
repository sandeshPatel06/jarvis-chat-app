import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, View as RNView } from 'react-native';
import { Text, View } from './Themed';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export default function CustomAlert() {
    const { alert, hideAlert } = useStore();
    const { colors, isDark } = useAppTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        if (alert) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [alert, fadeAnim, scaleAnim]);

    if (!alert) return null;

    const handleButtonPress = (onPress?: () => void) => {
        if (onPress) onPress();
        hideAlert();
    };

    const buttons = alert.buttons || [{ text: 'OK', onPress: () => { } }];

    return (
        <Modal
            transparent
            visible={!!alert}
            animationType="none"
            onRequestClose={hideAlert}
        >
            <RNView style={styles.overlay}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={hideAlert}
                >
                    <BlurView
                        intensity={isDark ? 30 : 50}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            backgroundColor: colors.card,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.content}>
                        <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{alert.message}</Text>
                    </View>

                    <View style={[styles.buttonContainer, { borderTopColor: colors.border }]}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    index > 0 && { borderLeftColor: colors.border, borderLeftWidth: StyleSheet.hairlineWidth },
                                    buttons.length > 2 && { borderLeftWidth: 0, borderTopWidth: index > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }
                                ]}
                                onPress={() => handleButtonPress(button.onPress)}
                            >
                                <Text
                                    style={[
                                        styles.buttonText,
                                        { color: button.style === 'destructive' ? colors.error : colors.primary },
                                        button.style === 'cancel' && { fontWeight: '400', color: colors.textSecondary }
                                    ]}
                                >
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </RNView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    alertContainer: {
        width: width * 0.75,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 10,
            }
        })
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    button: {
        flex: 1,
        minWidth: '45%',
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
    },
});
