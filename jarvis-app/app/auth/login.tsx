import { Text, View } from '@/components/Themed';
import { api } from '@/services/api';
import { useStore } from '@/store';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
    ActivityIndicator, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    useWindowDimensions,
    Platform,
    Image 
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const { width } = useWindowDimensions();
    const isSmallDevice = width < 375;
    
    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors, isDark } = useAppTheme();

    const handlePasswordLogin = async () => {
        if (!identifier || !password) {
            showAlert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const data = await api.auth.login({ identifier, password });
            setUser(data.user, data.token);
            router.replace('/(tabs)');
        } catch (error: any) {
            showAlert('Login Failed', error.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        if (!identifier) {
            showAlert('Error', 'Please enter your email');
            return;
        }
        setLoading(true);
        try {
            const response = await api.auth.requestOTP(identifier);
            setSessionId(response.session_id);
            setStep(2);
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) return;
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

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <KeyboardAwareScrollView
                bottomOffset={Platform.OS === 'ios' ? 100 : 0}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingHorizontal: isSmallDevice ? 20 : 40 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image 
                            source={require('@/assets/images/logo.png')} 
                            style={styles.logo} 
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Jarvis Chat</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {loginMode === 'password' ? 'Sign in to your account' : 'Verify your identity'}
                    </Text>
                </View>

                <View style={styles.content}>
                    {/* Mode Toggle */}
                    <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton, 
                                loginMode === 'password' && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }
                            ]}
                            onPress={() => { setLoginMode('password'); setStep(1); }}
                        >
                            <Text style={[styles.toggleText, { color: loginMode === 'password' ? colors.primary : colors.textSecondary }]}>Password</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.toggleButton, 
                                loginMode === 'otp' && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }
                            ]}
                            onPress={() => setLoginMode('otp')}
                        >
                            <Text style={[styles.toggleText, { color: loginMode === 'otp' ? colors.primary : colors.textSecondary }]}>OTP</Text>
                        </TouchableOpacity>
                    </View>

                    {loginMode === 'password' ? (
                        <>
                            <View style={styles.inputWrapper}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Email or Phone</Text>
                                <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={identifier}
                                        onChangeText={setIdentifier}
                                        placeholder="Enter your email or phone"
                                        placeholderTextColor={colors.textSecondary + '80'}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <View style={styles.labelRow}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                                    <TouchableOpacity>
                                        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot?</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your password"
                                        placeholderTextColor={colors.textSecondary + '80'}
                                        secureTextEntry={!isPasswordVisible}
                                    />
                                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                                        <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity 
                                onPress={handlePasswordLogin} 
                                disabled={loading} 
                                style={[styles.submitButton, { shadowColor: colors.primary }]}
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.gradient}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign In</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        step === 1 ? (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            value={identifier}
                                            onChangeText={setIdentifier}
                                            placeholder="Enter your email"
                                            placeholderTextColor={colors.textSecondary + '80'}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity onPress={handleRequestOTP} disabled={loading} style={styles.submitButton}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        style={styles.gradient}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputWrapper}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Verification Code</Text>
                                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                        <TextInput
                                            style={[styles.input, styles.otpInput, { color: colors.text }]}
                                            value={otpCode}
                                            onChangeText={setOtpCode}
                                            placeholder="000000"
                                            placeholderTextColor={colors.textSecondary + '80'}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                        />
                                    </View>
                                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                                        We&apos;ve sent a 6-digit code to {identifier}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={handleVerifyOTP} disabled={loading || otpCode.length !== 6} style={styles.submitButton}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        style={styles.gradient}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify & Sign In</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Change Email</Text>
                                </TouchableOpacity>
                            </>
                        )
                    )}

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>New to Jarvis? </Text>
                        <Link href="/auth/signup" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.link, { color: colors.primary }]}>Create an account</Text>
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
        justifyContent: 'center',
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: 'transparent',
    },
    logoContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    content: {
        backgroundColor: 'transparent',
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        marginBottom: 35,
        padding: 4,
        height: 50,
    },
    toggleButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputWrapper: {
        marginBottom: 24,
        backgroundColor: 'transparent',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 4,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        height: 60,
    },
    inputIcon: {
        marginRight: 14,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: Platform.OS === 'android' ? 0 : 4,
        textAlignVertical: 'center',
    },
    otpInput: {
        fontSize: 26,
        textAlign: 'center',
        paddingLeft: 14, // Offset for letterSpacing on some platforms
        letterSpacing: 14,
        fontWeight: '800',
        paddingVertical: 0,
    },
    infoText: {
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
    },
    submitButton: {
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 12,
        height: 56,
        elevation: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    backButton: {
        alignItems: 'center',
        marginTop: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
        backgroundColor: 'transparent',
    },
    footerText: {
        fontSize: 15,
        fontWeight: '500',
    },
    link: {
        fontSize: 15,
        fontWeight: '800',
    },
});

