import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <SettingCard>
                        <SettingRow
                            title="Security notifications"
                            icon="shield"
                            isSwitch
                            switchValue={user?.security_notifications_enabled ?? false}
                            onSwitchChange={handleToggleSecurity}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Two-step verification"
                            icon="lock"
                            isSwitch
                            switchValue={user?.two_step_verification_enabled ?? false}
                            onSwitchChange={handleToggleTwoStep}
                            color="#6C63FF"
                        />
                        <SettingRow
                            title="Change number"
                            icon="phone"
                            onPress={() => { }}
                            color="#FA709A"
                        />
                        <SettingRow
                            title="Request account info"
                            icon="file-text-o"
                            onPress={() => { }}
                            color="#FEE140"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <SettingCard>
                        <SettingRow
                            title="Delete my account"
                            icon="trash-o"
                            onPress={handleDeleteAccount}
                            color={colors.error}
                            isLast
                        />
                    </SettingCard>
                </View>

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Your account security is our top priority. Enable two-step verification for maximum protection.
                </Text>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    rowTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 24,
        paddingHorizontal: 30,
        lineHeight: 18,
        opacity: 0.6,
        fontWeight: '500',
    }
});
