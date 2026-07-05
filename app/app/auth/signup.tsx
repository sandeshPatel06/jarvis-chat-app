import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
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

export default function SignupScreen() {
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Details
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [inputFocused, setInputFocused] = useState<string | null>(null);

    const buttonScale = useRef(new Animated.Value(1)).current;

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let retVal = "";
        for (let i = 0; i < 12; i++) {
            retVal += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        setPassword(retVal);
        setIsPasswordVisible(true);
    };

    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors, isDark } = useAppTheme();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{3,15}$/;
    const isEmailValid = emailRegex.test(email.trim());

    // Validations
    const isUsernameValid = usernameRegex.test(username.trim());
    const isPasswordValid = password.length >= 6;

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start();
    };

    const handleRequestOTP = async () => {
        const cleanEmail = email.trim();
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
                showAlert('Info', 'User already exists. Logging you in...');
                setUser(response.user, response.token);
                router.replace('/(tabs)');
            } else {
                setStep(3);
            }
        } catch (error: any) {
            showAlert('Verification Failed', error.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteSignup = async () => {
        const cleanUsername = username.trim();
        if (!cleanUsername) {
            showAlert('Validation Error', 'Please choose a username.');
            return;
        }
        if (!isUsernameValid) {
            showAlert('Validation Error', 'Username must be 3-15 characters and contain only letters, numbers, or underscores.');
            return;
        }
        if (!password) {
            showAlert('Validation Error', 'Please choose a password.');
            return;
        }
        if (!isPasswordValid) {
            showAlert('Validation Error', 'Password must be at least 6 characters.');
            return;
        }

        animateButton();
        setLoading(true);
        try {
            const response = await api.auth.completeSignup({
                session_id: sessionId,
                username: cleanUsername,
                password,
                phone_number: phone.trim()
            });
            setUser(response.user, response.token);
            router.replace('/(tabs)');
        } catch (error: any) {
            showAlert('Signup Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const logoSize = Math.min(width * 0.22, 90);
    const contentWidth = isTablet ? '65%' : '100%';
    const contentMaxWidth = 440;
    const screenPadding = width * 0.06;

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
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
                            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your email to get started</Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address *</Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                    borderColor: inputFocused === 'email' ? colors.primary : (email ? (isEmailValid ? colors.success : colors.error) : (isDark ? colors.border : '#E0E0E8'))
                                }
                            ]}>
                                <Ionicons name="mail-outline" size={18} color={inputFocused === 'email' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="name@example.com"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                    onSubmitEditing={handleRequestOTP}
                                    onFocus={() => setInputFocused('email')}
                                    onBlur={() => setInputFocused(null)}
                                />
                                {isEmailValid && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
                            </View>
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity
                                onPress={handleRequestOTP}
                                disabled={loading || !isEmailValid}
                                style={[styles.submitButton, { shadowColor: colors.primary, opacity: (!isEmailValid || loading) ? 0.6 : 1 }]}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.gradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" size="small" /> : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Continue</Text>
                                            <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </>
                );
            case 2:
                return (
                    <>
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
                            <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Check your inbox for the verification code</Text>
                        </View>

                        <View style={[styles.otpBanner, { backgroundColor: isDark ? 'rgba(142,134,255,0.08)' : 'rgba(108,99,255,0.04)', borderColor: colors.primary + '20' }]}>
                            <Ionicons name="mail-open-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.otpBannerText, { color: colors.textSecondary }]}>
                                Verification code sent to{' '}
                                <Text style={{ color: colors.text, fontWeight: '700' }}>{email}</Text>
                            </Text>
                        </View>

                        <View style={[styles.inputWrapper, { marginBottom: 8 }]}>
                            <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }]}>Enter Code</Text>
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
                                    placeholder="••••••"
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
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" size="small" /> : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Verify Code</Text>
                                            <Ionicons name="checkmark-circle-outline" size={16} color="white" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </>
                );
            case 3:
                return (
                    <>
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
                            <Text style={[styles.title, { color: colors.text }]}>Setup Profile</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose a username and password</Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Username *</Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                    borderColor: inputFocused === 'username' ? colors.primary : (isDark ? colors.border : '#E0E0E8')
                                }
                            ]}>
                                <Ionicons name="at-outline" size={18} color={inputFocused === 'username' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="johndoe"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="next"
                                    onFocus={() => setInputFocused('username')}
                                    onBlur={() => setInputFocused(null)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                    borderColor: inputFocused === 'password' ? colors.primary : (isDark ? colors.border : '#E0E0E8')
                                }
                            ]}>
                                <Ionicons name="lock-closed-outline" size={18} color={inputFocused === 'password' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                    secureTextEntry={!isPasswordVisible}
                                    returnKeyType="next"
                                    onFocus={() => setInputFocused('password')}
                                    onBlur={() => setInputFocused(null)}
                                />
                                <TouchableOpacity
                                    onPress={generatePassword}
                                    style={{ marginRight: 8 }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="key-outline" size={18} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number (Optional)</Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: isDark ? colors.surfaceSecondary : '#F8F8FC',
                                    borderColor: inputFocused === 'phone' ? colors.primary : (isDark ? colors.border : '#E0E0E8')
                                }
                            ]}>
                                <Ionicons name="call-outline" size={18} color={inputFocused === 'phone' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+1 234 567 890"
                                    placeholderTextColor={colors.textSecondary + '60'}
                                    keyboardType="phone-pad"
                                    returnKeyType="done"
                                    onSubmitEditing={handleCompleteSignup}
                                    onFocus={() => setInputFocused('phone')}
                                    onBlur={() => setInputFocused(null)}
                                />
                            </View>
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity
                                onPress={handleCompleteSignup}
                                disabled={loading}
                                style={[styles.submitButton, { shadowColor: colors.primary }]}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.gradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" size="small" /> : (
                                        <View style={styles.buttonContent}>
                                            <Text style={styles.buttonText}>Complete Setup</Text>
                                            <Ionicons name="checkmark-done" size={16} color="white" style={{ marginLeft: 8 }} />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </>
                );
        }
    };

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
                        {renderStep()}
                    </View>

                    {step === 1 && (
                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                            <Link href="/auth/login" asChild>
                                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                    <Text style={[styles.link, { color: colors.primary }]}>Sign In</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}
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
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 12.5,
        fontWeight: '600',
        marginBottom: 6,
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
