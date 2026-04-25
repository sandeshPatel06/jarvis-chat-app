import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { useRouter, Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function AccountSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const deleteAccount = useStore((state) => state.deleteAccount);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleToggleSecurity = useCallback(async (value: boolean) => {
        try {
            await updateSettings({ security_notifications_enabled: value });
        } catch { }
    }, [updateSettings]);

    const handleToggleTwoStep = useCallback(async (value: boolean) => {
        try {
            await updateSettings({ two_step_verification_enabled: value });
        } catch { }
    }, [updateSettings]);

    const handleDeleteAccount = useCallback(() => {
        showAlert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount();
                            router.replace('/auth/login');
                        } catch { }
                    }
                }
            ]
        );
    }, [showAlert, deleteAccount, router]);

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Account Settings',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <SettingCard>
                        <SettingRow
                            title="Security Notifications"
                            icon="shield-check-outline"
                            isSwitch
                            switchValue={user?.security_notifications_enabled ?? false}
                            onSwitchChange={handleToggleSecurity}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Two-Step Verification"
                            icon="lock-outline"
                            isSwitch
                            switchValue={user?.two_step_verification_enabled ?? false}
                            onSwitchChange={handleToggleTwoStep}
                            color="#6C63FF"
                        />
                        <SettingRow
                            title="Change Number"
                            icon="phone-outline"
                            onPress={() => { }}
                            color="#FA709A"
                        />
                        <SettingRow
                            title="Request Account Info"
                            icon="file-document-outline"
                            onPress={() => { }}
                            color="#FEE140"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <SettingCard>
                        <SettingRow
                            title="Delete My Account"
                            icon="delete-outline"
                            onPress={handleDeleteAccount}
                            color={colors.error}
                            isLast
                        />
                    </SettingCard>
                </View>

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Your account security is our top priority. Enable two-step verification for maximum protection.
                </Text>

                <View style={{ height: 100 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    section: {
        marginBottom: 24,
    },
    hint: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 30,
        lineHeight: 20,
        opacity: 0.6,
        fontWeight: '600',
    }
});
