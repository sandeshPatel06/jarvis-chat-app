import { Text, View } from '@/components/Themed';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useStore } from '@/store';
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

export default function SignupScreen() {
    const { width } = useWindowDimensions();
    const isSmallDevice = width < 375;
    
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Details
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    
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
                        <View style={styles.header}>
                             <View style={styles.logoContainer}>
                                <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your email to get started</Text>
                        </View>
                        
                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address *</Text>
                            <View style={[
                                styles.inputContainer, 
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: email ? (isEmailValid ? colors.success : colors.error) : colors.border }
                            ]}>
                                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="name@example.com"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {isEmailValid && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={handleRequestOTP} 
                            disabled={loading || !isEmailValid}
                            style={[styles.submitButton, (!isEmailValid || loading) && { opacity: 0.6 }]}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continue</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                );
            case 2:
                return (
                    <>
                        <View style={styles.header}>
                             <View style={styles.logoContainer}>
                                <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Check your inbox for the 6-digit code</Text>
                        </View>

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
                                Sent to {email}
                            </Text>
                        </View>

                        <TouchableOpacity onPress={handleVerifyOTP} disabled={loading || otpCode.length !== 6} style={styles.submitButton}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                            <Text style={{ color: colors.primary, fontWeight: '600' }}>Change Email</Text>
                        </TouchableOpacity>
                    </>
                );
            case 3:
                return (
                    <>
                        <View style={styles.header}>
                             <View style={styles.logoContainer}>
                                <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Set Profile</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Almost there! Just a few more details</Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Username *</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                <Ionicons name="at-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="johndoe"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    secureTextEntry={!isPasswordVisible}
                                />
                                <TouchableOpacity 
                                    onPress={generatePassword}
                                    style={{ marginRight: 10 }}
                                >
                                    <Ionicons name="key-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                                    <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputWrapper}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number (Optional)</Text>
                            <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: colors.border }]}>
                                <Ionicons name="call-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="+1234567890"
                                    placeholderTextColor={colors.textSecondary + '80'}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleCompleteSignup} disabled={loading} style={styles.submitButton}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.gradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Complete Signup</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                );
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
                <View style={styles.content}>
                    {renderStep()}

                    {step === 1 && (
                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                            <Link href="/auth/login" asChild>
                                <TouchableOpacity>
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
    content: {
        backgroundColor: 'transparent',
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
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
    inputWrapper: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
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
        paddingLeft: 14,
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

