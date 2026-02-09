import { Text, View } from '@/components/Themed';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useStore } from '@/store';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function SignupScreen() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Details
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors } = useAppTheme();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);

    const handleRequestOTP = async () => {
        if (!isEmailValid) return;
        setLoading(true);
        try {
            const response = await api.auth.requestOTP(email);
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
        if (!username || !password) {
            showAlert('Error', 'Username and password are required');
            return;
        }
        setLoading(true);
        try {
            const response = await api.auth.completeSignup({
                session_id: sessionId,
                username,
                password,
                phone_number: phone
            });
            setUser(response.user, response.token);
            router.replace('/(tabs)');
        } catch (error: any) {
            showAlert('Signup Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <Text style={styles.title}>Welcome</Text>
                        <Text style={styles.subtitle}>Enter your email to get started</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address *</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { borderColor: email ? (isEmailValid ? '#4CAF50' : '#F44336') : 'rgba(255,255,255,0.1)' }
                                ]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="name@example.com"
                                placeholderTextColor="#666"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleRequestOTP}
                            disabled={loading || !isEmailValid}
                            style={[styles.buttonContainer, (!isEmailValid || loading) && { opacity: 0.5 }]}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.button}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                );
            case 2:
                return (
                    <>
                        <Text style={styles.title}>Verify OTP</Text>
                        <Text style={styles.subtitle}>OTP has been sent to your email. Please check your inbox.</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>6-Digit Code</Text>
                            <TextInput
                                value={otpCode}
                                onChangeText={setOtpCode}
                                placeholder="123456"
                                placeholderTextColor="#666"
                                keyboardType="number-pad"
                                maxLength={6}
                                textAlign="center"
                                style={[styles.input, { fontSize: 24, letterSpacing: 8 }]}
                            />
                        </View>
                        <TouchableOpacity onPress={handleVerifyOTP} disabled={loading || otpCode.length !== 6} style={styles.buttonContainer}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.button}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                            <Text style={{ color: colors.primary }}>Change Email</Text>
                        </TouchableOpacity>
                    </>
                );
            case 3:
                return (
                    <>
                        <Text style={styles.title}>Complete Account</Text>
                        <Text style={styles.subtitle}>Set your username and password</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Username *</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="johndoe"
                                placeholderTextColor="#666"
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password *</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor="#666"
                                secureTextEntry
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Phone Number (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+1234567890"
                                placeholderTextColor="#666"
                                keyboardType="phone-pad"
                            />
                        </View>
                        <TouchableOpacity onPress={handleCompleteSignup} disabled={loading} style={styles.buttonContainer}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.button}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Finish Signup</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                );
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
                    {renderStep()}

                    {step === 1 && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <Link href="/auth/login" asChild>
                                <TouchableOpacity>
                                    <Text style={[styles.link, { color: colors.primary }]}>Log In</Text>
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
        marginBottom: 15,
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
    backButton: {
        alignItems: 'center',
        marginTop: 20,
    }
});
