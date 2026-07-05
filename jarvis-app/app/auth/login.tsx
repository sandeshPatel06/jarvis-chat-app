import { api } from '@/services/api';
import { useStore } from '@/store';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
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

export default function LoginScreen() {
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [identifierFocused, setIdentifierFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const buttonScale = useRef(new Animated.Value(1)).current;

    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors, isDark } = useAppTheme();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;

    // Client-side validations
    const isIdentifierValid = emailRegex.test(identifier.trim()) || phoneRegex.test(identifier.trim());
    const isPasswordValid = password.length >= 6;

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
    };

    const handlePasswordLogin = async () => {
        const cleanIdentifier = identifier.trim();
        if (!cleanIdentifier) {
            showAlert('Validation Error', 'Please enter your email address or phone number.');
            return;
        }
        if (!isIdentifierValid) {
            showAlert('Validation Error', 'Please enter a valid email address or phone number.');
            return;
        }
        if (!password) {
            showAlert('Validation Error', 'Please enter your password.');
            return;
        }
        if (!isPasswordValid) {
            showAlert('Validation Error', 'Password must be at least 6 characters.');
            return;
        }

        animateButton();
        setLoading(true);
        try {
            const data = await api.auth.login({ identifier: cleanIdentifier, password });
            setUser(data.user, data.token);
            router.replace('/(tabs)');
        } catch (error: any) {
            showAlert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        const cleanEmail = identifier.trim();
        if (!cleanEmail) {
            showAlert('Validation Error', 'Please enter your email address.');
            return;
        }
        if (!emailRegex.test(cleanEmail)) {
            showAlert('Validation Error', 'Please enter a valid email address.');
            return;
        }

        animateButton();
        setLoading(true);
        try {
            const response = await api.auth.requestOTP(cleanEmail);
            setSessionId(response.session_id);
            setStep(2);
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) {
            showAlert('Validation Error', 'Verification code must be exactly 6 digits.');
            return;
        }
        animateButton();
        setLoading(true);
        try {
            const response = await api.auth.verifyOTP({ session_id: sessionId, otp_code: otpCode });
            if (response.user_exists) {
                setUser(response.user, response.token);
                router.replace('/(tabs)');
            } else {
                showAlert('Info', 'Email verified, but no account found. Please sign up.');
                router.push('/auth/signup');
            }
        } catch (error: any) {
            showAlert('Verification Failed', error.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    // Responsive sizing formulas based on screen dimensions
    const logoSize = Math.min(width * 0.22, 90);
    const contentWidth = isTablet ? '65%' : '100%';
    const contentMaxWidth = 440;
    const screenPadding = width * 0.06;

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <KeyboardAwareScrollView
                bottomOffset={Platform.OS === 'ios' ? 40 : 0}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingHorizontal: screenPadding },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.innerContainer}>
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
                            <Image
                                source={require('@/assets/images/logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={[styles.title, { color: colors.text }]}>
                            Welcome back
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            {loginMode === 'password'
                                ? 'Sign in to continue to Jarvis'
                                : step === 1 ? 'Enter your email to receive a code' : `Code sent to ${identifier}`}
                        </Text>
                    </View>

                    {/* Content Card */}
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
                        {/* Mode Toggle */}
                        <View style={[styles.toggleContainer, { backgroundColor: isDark ? colors.surfaceVariant : '#F0F0F5' }]}>
                            {(['password', 'otp'] as const).map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.toggleButton,
                                        loginMode === mode && {
                                            backgroundColor: isDark ? colors.surfaceSecondary : '#FFFFFF',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: isDark ? 0.3 : 0.08,
                                            shadowRadius: 4,
                                            elevation: 2,
                                        }
                                    ]}
                                    onPress={() => { setLoginMode(mode); setStep(1); setOtpCode(''); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={mode === 'password' ? 'lock-closed-outline' : 'mail-outline'}
                                        size={14}
                                        color={loginMode === mode ? colors.primary : colors.textSecondary}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[
                                        styles.toggleText,
                                        { color: loginMode === mode ? colors.primary : colors.textSecondary }
                                    ]}>
                                        {mode === 'password' ? 'Password' : 'One-Time Code'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Password Mode */}
                        {loginMode === 'password' && (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email or Phone</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        {
                                            backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                            borderColor: identifierFocused ? colors.primary : (isDark ? colors.border : '#E0E0E8'),
                                        }
                                    ]}>
                                        <Ionicons name="person-outline" size={18} color={identifierFocused ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={identifier}
                                            onChangeText={setIdentifier}
                                            placeholder="you@example.com"
                                            placeholderTextColor={colors.textSecondary + '60'}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="email-address"
                                            returnKeyType="next"
                                            onFocus={() => setIdentifierFocused(true)}
                                            onBlur={() => setIdentifierFocused(false)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Password</Text>
                                        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[
                                        styles.inputContainer,
                                        {
                                            backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                            borderColor: passwordFocused ? colors.primary : (isDark ? colors.border : '#E0E0E8'),
                                        }
                                    ]}>
                                        <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor={colors.textSecondary + '60'}
                                            secureTextEntry={!isPasswordVisible}
                                            returnKeyType="done"
                                            onSubmitEditing={handlePasswordLogin}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={styles.eyeButton}
                                        >
                                            <Ionicons
                                                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                                                size={20}
                                                color={colors.textSecondary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                    <TouchableOpacity
                                        onPress={handlePasswordLogin}
                                        disabled={loading}
                                        style={[styles.submitButton, { shadowColor: colors.primary }]}
                                        activeOpacity={0.88}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.secondary]}
                                            style={styles.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading
                                                ? <ActivityIndicator color="white" size="small" />
                                                : (
                                                    <View style={styles.buttonContent}>
                                                        <Text style={styles.buttonText}>Sign In</Text>
                                                        <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                                                    </View>
                                                )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            </>
                        )}

                        {/* OTP Mode Step 1 */}
                        {loginMode === 'otp' && step === 1 && (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        {
                                            backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                            borderColor: identifierFocused ? colors.primary : (isDark ? colors.border : '#E0E0E8'),
                                        }
                                    ]}>
                                        <Ionicons name="mail-outline" size={18} color={identifierFocused ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={identifier}
                                            onChangeText={setIdentifier}
                                            placeholder="you@example.com"
                                            placeholderTextColor={colors.textSecondary + '60'}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            returnKeyType="send"
                                            onSubmitEditing={handleRequestOTP}
                                            onFocus={() => setIdentifierFocused(true)}
                                            onBlur={() => setIdentifierFocused(false)}
                                        />
                                    </View>
                                </View>
                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                    <TouchableOpacity
                                        onPress={handleRequestOTP}
                                        disabled={loading}
                                        style={[styles.submitButton, { shadowColor: colors.primary }]}
                                        activeOpacity={0.88}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.secondary]}
                                            style={styles.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading
                                                ? <ActivityIndicator color="white" size="small" />
                                                : (
                                                    <View style={styles.buttonContent}>
                                                        <Text style={styles.buttonText}>Send Code</Text>
                                                        <Ionicons name="send-outline" size={14} color="white" style={{ marginLeft: 8 }} />
                                                    </View>
                                                )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            </>
                        )}

                        {/* OTP Mode Step 2 */}
                        {loginMode === 'otp' && step === 2 && (
                            <>
                                <View style={[styles.otpBanner, { backgroundColor: isDark ? 'rgba(142,134,255,0.08)' : 'rgba(108,99,255,0.04)', borderColor: colors.primary + '20' }]}>
                                    <Ionicons name="mail-open-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.otpBannerText, { color: colors.textSecondary }]}>
                                        Verification code sent to{' '}
                                        <Text style={{ color: colors.text, fontWeight: '700' }}>{identifier}</Text>
                                    </Text>
                                </View>

                                <View style={[styles.inputWrapper, { marginBottom: 8 }]}>
                                    <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
                                        Enter Code
                                    </Text>
                                    <View style={[
                                        styles.inputContainer,
                                        styles.otpContainer,
                                        {
                                            backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                            borderColor: colors.primary + '50',
                                        }
                                    ]}>
                                        <TextInput
                                            style={[styles.input, styles.otpInput, { color: colors.text }]}
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                            placeholder="•••••"
                                            placeholderTextColor={colors.textSecondary + '40'}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            autoFocus
                                            returnKeyType="done"
                                            onSubmitEditing={handleVerifyOTP}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setStep(1)}
                                        style={styles.changeEmailRow}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Text style={[styles.changeEmailText, { color: colors.primary }]}>Change Email Address</Text>
                                    </TouchableOpacity>
                                </View>

                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                    <TouchableOpacity
                                        onPress={handleVerifyOTP}
                                        disabled={loading || otpCode.length !== 6}
                                        style={[styles.submitButton, { shadowColor: colors.primary, opacity: otpCode.length !== 6 && !loading ? 0.6 : 1 }]}
                                        activeOpacity={0.88}
                                    >
                                        <LinearGradient
                                            colors={[colors.primary, colors.secondary]}
                                            style={styles.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            {loading
                                                ? <ActivityIndicator color="white" size="small" />
                                                : (
                                                    <View style={styles.buttonContent}>
                                                        <Text style={styles.buttonText}>Verify & Sign In</Text>
                                                        <Ionicons name="checkmark-circle-outline" size={16} color="white" style={{ marginLeft: 8 }} />
                                                    </View>
                                                )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            </>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            New to Jarvis?{' '}
                        </Text>
                        <Link href="/auth/signup" asChild>
                            <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                <Text style={[styles.link, { color: colors.primary }]}>Create account</Text>
                            </TouchableOpacity>
                        </Link>
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
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        marginBottom: 24,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 9,
        paddingVertical: 10,
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    inputWrapper: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 12.5,
        fontWeight: '600',
        marginBottom: 6,
    },
    forgotText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1.5,
    },
    otpContainer: {
        justifyContent: 'center',
    },
    inputIcon: {
        marginRight: 10,
    },
    eyeButton: {
        padding: 4,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    },
    otpInput: {
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: Platform.OS === 'ios' ? 14 : 10,
        fontWeight: '800',
        paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        paddingLeft: Platform.OS === 'ios' ? 14 : 10,
    },
    otpBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    otpBannerText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
    changeEmailRow: {
        alignItems: 'center',
        marginTop: 10,
    },
    changeEmailText: {
        fontSize: 12,
        fontWeight: '600',
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        backgroundColor: 'transparent',
    },
    footerText: {
        fontSize: 13.5,
        fontWeight: '500',
    },
    link: {
        fontSize: 13.5,
        fontWeight: '800',
    },
});
