import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
    Text,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyOTPScreen() {
    const { width } = useWindowDimensions();
    const isSmallDevice = width < 375;
    const isTablet = width >= 768;

    const { email, session_id } = useLocalSearchParams<{ email: string, session_id: string }>();
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const textInputRef = useRef<TextInput>(null);
    const buttonScale = useRef(new Animated.Value(1)).current;

    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors, isDark } = useAppTheme();

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
    };

    const handleVerify = async () => {
        if (!otpCode || otpCode.length !== 6) {
            showAlert('Validation Error', 'Please enter a valid 6-digit verification code.');
            return;
        }

        animateButton();
        setLoading(true);
        try {
            if (!email || typeof email !== 'string') {
                showAlert('Error', 'Invalid email address');
                return;
            }
            const response = await api.auth.verifyOTP({ session_id: session_id || email, otp_code: otpCode });
            showAlert('Success', 'Verification successful!');

            if (response.token) {
                setUser(response.user, response.token);
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            showAlert('Verification Failed', error.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const logoSize = Math.min(width * 0.22, 90);
    const contentWidth = isTablet ? '65%' : '100%';
    const contentMaxWidth = 440;
    const screenPadding = width * 0.06;

    // Split code into individual digits
    const digits = otpCode.split('');
    const cells = Array(6).fill('');

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <KeyboardAwareScrollView
                bottomOffset={Platform.OS === 'ios' ? 40 : 0}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingHorizontal: screenPadding }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.innerContainer}>
                    <View style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? colors.surface : '#FFFFFF',
                            borderColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.06)',
                            width: contentWidth,
                            maxWidth: contentMaxWidth,
                            shadowColor: isDark ? '#000' : colors.primary,
                        }
                    ]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={[
                                styles.logoContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(142,134,255,0.1)' : 'rgba(108,99,255,0.06)',
                                    width: logoSize,
                                    height: logoSize,
                                    borderRadius: logoSize * 0.3,
                                }
                            ]}>
                                <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Identity Check</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                We sent a verification code to{' '}
                                <Text style={{ color: colors.text, fontWeight: '700' }}>{email}</Text>
                            </Text>
                        </View>

                        {/* Premium Aesthetic OTP Input Cells */}
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                            
                            {/* Hidden TextInput */}
                            <TextInput
                                ref={textInputRef}
                                value={otpCode}
                                onChangeText={setOtpCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                style={styles.hiddenInput}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                autoFocus
                            />

                            {/* Interactive Digit Cells */}
                            <TouchableOpacity 
                                activeOpacity={1} 
                                onPress={() => textInputRef.current?.focus()}
                                style={styles.otpGrid}
                            >
                                {cells.map((_, index) => {
                                    const char = digits[index] || '';
                                    const isCurrent = index === digits.length;
                                    const isFilled = index < digits.length;
                                    return (
                                        <View
                                            key={index}
                                            style={[
                                                styles.otpCell,
                                                {
                                                    backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                                    borderColor: (isFocused && isCurrent)
                                                        ? colors.primary
                                                        : (isFilled ? colors.primary + '50' : (isDark ? colors.border : '#E0E0E8'))
                                                }
                                            ]}
                                        >
                                            {isFocused && isCurrent ? (
                                                <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
                                            ) : (
                                                <Text style={[styles.otpCellText, { color: colors.text }]}>
                                                    {char}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.resendButton} activeOpacity={0.7}>
                                <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                                    Didn't receive the code?{' '}
                                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Resend</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity
                                onPress={handleVerify}
                                disabled={loading || otpCode.length !== 6}
                                style={[styles.submitButton, { shadowColor: colors.primary, opacity: otpCode.length !== 6 && !loading ? 0.6 : 1 }]}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.gradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" size="small" /> : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Verify Account</Text>
                                            <Ionicons name="checkmark-circle-outline" size={16} color="white" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            style={styles.backButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="arrow-back" size={16} color={colors.primary} />
                            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    innerContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: '8%',
    },
    header: {
        alignItems: 'center',
        marginBottom: '6%',
        backgroundColor: 'transparent',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        width: '60%',
        height: '60%',
    },
    title: {
        fontWeight: '800',
        fontSize: 26,
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 16,
    },
    card: {
        alignSelf: 'center',
        borderRadius: 20,
        padding: '6%',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 3,
    },
    inputWrapper: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 12.5,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    otpGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    otpCell: {
        flex: 1,
        aspectRatio: 1,
        marginHorizontal: 4,
        borderWidth: 1.5,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    otpCellText: {
        fontSize: 20,
        fontWeight: '800',
    },
    cursor: {
        width: 2,
        height: 20,
        borderRadius: 1,
    },
    resendButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    resendText: {
        fontSize: 12,
    },
    submitButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 4,
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    backText: {
        marginLeft: 6,
        fontSize: 13.5,
        fontWeight: '700',
    },
});
