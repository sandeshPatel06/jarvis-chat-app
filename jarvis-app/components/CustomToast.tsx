import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';

const CustomToast = () => {
    const toast = useStore((state) => state.toast);
    const hideToast = useStore((state) => state.hideToast);
    const { colors } = useAppTheme();

    const [isVisible, setIsVisible] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (toast) {
            setIsVisible(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setIsVisible(false);
                    hideToast();
                });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [toast, fadeAnim, hideToast]);

    if (!isVisible || !toast) return null;

    const { type, text1, text2 } = toast;

    const toastStyles = {
        success: {
            backgroundColor: colors.success + '20',
            borderColor: colors.success,
            textColor: colors.success,
        },
        error: {
            backgroundColor: colors.error + '20',
            borderColor: colors.error,
            textColor: colors.error,
        },
        info: {
            backgroundColor: colors.primary + '20',
            borderColor: colors.primary,
            textColor: colors.primary,
        },
    };

    const { backgroundColor, borderColor, textColor } = toastStyles[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor,
                    borderColor,
                    opacity: fadeAnim,
                    transform: [{ translateY: 0 }],
                },
            ]}
        >
            <View style={styles.content}>
                {text1 && <Text style={[styles.text1, { color: textColor }]}>{text1}</Text>}
                {text2 && <Text style={[styles.text2, { color: textColor }]}>{text2}</Text>}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        top: '10%', // Moved a bit higher for better visibility
        left: 20,
        right: 20,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: 14,
        paddingHorizontal: 18,
        zIndex: 10000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 10,
    },
    content: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    text1: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    text2: {
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },
});

export default CustomToast;
