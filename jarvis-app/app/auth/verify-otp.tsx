import { Text, View } from '@/components/Themed';
import { api } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '@/store';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function VerifyOTPScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setUser, showAlert } = useStore();
    const { colors } = useAppTheme();

    const handleVerify = async () => {
        if (!otpCode || otpCode.length !== 6) {
            showAlert('Error', 'Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await api.auth.verifyOTP({ email, otp_code: otpCode });
            showAlert('Success', 'Verification successful!');

            // Save token and user to store (which handles SecureStore)
            setUser(response.user, response.token);

            // Redirect to home
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
                bottomOffset={100}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Verify OTP</Text>
                    <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>OTP Code</Text>
                        <TextInput
                            style={styles.input}
                            value={otpCode}
                            onChangeText={setOtpCode}
                            placeholder="123456"
                            placeholderTextColor="#666"
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                    </View>

                    <TouchableOpacity onPress={handleVerify} disabled={loading} style={styles.buttonContainer}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.button}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Verify</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} style={styles.footer}>
                        <Text style={[styles.link, { color: colors.primary }]}>Back to Signup</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
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
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
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
    link: {
        fontWeight: 'bold',
    },
});
