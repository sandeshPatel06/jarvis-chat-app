import { Text, View } from '@/components/Themed';

import { api } from '@/services/api';
import { useStore } from '@/store';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function LoginScreen() {
    const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
    const [step, setStep] = useState(1); // For OTP mode
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors } = useAppTheme();

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
                bottomOffset={100}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>

                    {/* Mode Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, loginMode === 'password' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={() => { setLoginMode('password'); setStep(1); }}
                        >
                            <Text style={[styles.toggleText, loginMode === 'password' && { color: colors.primary }]}>Password</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, loginMode === 'otp' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={() => setLoginMode('otp')}
                        >
                            <Text style={[styles.toggleText, loginMode === 'otp' && { color: colors.primary }]}>OTP</Text>
                        </TouchableOpacity>
                    </View>

                    {loginMode === 'password' ? (
                        <>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email or Phone</Text>
                                <TextInput
                                    style={styles.input}
                                    value={identifier}
                                    onChangeText={setIdentifier}
                                    placeholder="Enter your email or phone"
                                    placeholderTextColor="#666"
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#666"
                                    secureTextEntry
                                />
                            </View>
                            <TouchableOpacity onPress={handlePasswordLogin} disabled={loading} style={styles.buttonContainer}>
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.button}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                >
                                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Log In</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        step === 1 ? (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={identifier}
                                        onChangeText={setIdentifier}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#666"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>
                                <TouchableOpacity onPress={handleRequestOTP} disabled={loading} style={styles.buttonContainer}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        style={styles.button}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>6-Digit OTP</Text>
                                    <TextInput
                                        style={[styles.input, { fontSize: 24, letterSpacing: 8, textAlign: 'center' }]}
                                        value={otpCode}
                                        onChangeText={setOtpCode}
                                        placeholder="123456"
                                        placeholderTextColor="#666"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                    />
                                </View>
                                <TouchableOpacity onPress={handleVerifyOTP} disabled={loading || otpCode.length !== 6} style={styles.buttonContainer}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.secondary]}
                                        style={styles.button}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify & Login</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                                    <Text style={{ color: colors.primary }}>Back to Email</Text>
                                </TouchableOpacity>
                            </>
                        )
                    )}

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don&apos;t have an account? </Text>
                        <Link href="/auth/signup" asChild>
                            <TouchableOpacity>
                                <Text style={[styles.link, { color: colors.primary }]}>Sign Up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: 'transparent',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: 'gray',
        marginBottom: 40,
    },
    inputContainer: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 15,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonContainer: {
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },
    button: {
        padding: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        backgroundColor: 'transparent',
    },
    footerText: {
        color: 'gray',
    },
    link: {
        fontWeight: 'bold',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginBottom: 30,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    toggleText: {
        fontWeight: 'bold',
        color: 'gray',
    },
    backButton: {
        alignItems: 'center',
        marginTop: 20,
    }
});
