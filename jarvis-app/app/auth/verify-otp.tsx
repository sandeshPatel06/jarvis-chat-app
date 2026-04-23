import { Text, View } from '@/components/Themed';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function VerifyOTPScreen() {
    const { width } = useWindowDimensions();
    const isSmallDevice = width < 375;
    
    const { email, session_id } = useLocalSearchParams<{ email: string, session_id: string }>();
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors, isDark } = useAppTheme();

    const handleVerify = async () => {
        if (!otpCode || otpCode.length !== 6) {
            showAlert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }

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
                        <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Identity Check</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        We&apos;ve sent a code to {email}
                    </Text>
                </View>

                <View style={styles.content}>
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
                                autoFocus
                            />
                        </View>
                        <TouchableOpacity style={styles.resendButton}>
                            <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                                Didn&apos;t receive code? <Text style={{ color: colors.primary, fontWeight: '700' }}>Resend</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleVerify} disabled={loading || otpCode.length !== 6} style={styles.submitButton}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.gradient}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Verify Account</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={20} color={colors.primary} />
                        <Text style={[styles.backText, { color: colors.primary }]}>Back to Signup</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: 20,
    },
    content: {
        backgroundColor: 'transparent',
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
    },
    inputWrapper: {
        marginBottom: 30,
        backgroundColor: 'transparent',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        height: 65,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    otpInput: {
        fontSize: 30,
        textAlign: 'center',
        paddingLeft: 16, // Offset for letterSpacing
        letterSpacing: 16,
        fontWeight: '800',
        paddingVertical: 0,
        textAlignVertical: 'center',
    },
    resendButton: {
        marginTop: 15,
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
    },
    backText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '700',
    },
});

