import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function AccountSettingsScreen() {
    const { colors } = useAppTheme();
    const deleteAccount = useStore((state) => state.deleteAccount);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

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

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Coming Soon Options — disabled */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
                    <SettingCard style={{ opacity: 0.45 }}>
                        <SettingRow
                            title="Two-Step Verification"
                            subtitle="Coming soon"
                            icon="lock-outline"
                            color="#6C63FF"
                            showChevron={false}
                        />
                        <SettingRow
                            title="Change Number"
                            subtitle="Coming soon"
                            icon="phone-outline"
                            color="#FA709A"
                            showChevron={false}
                        />
                        <SettingRow
                            title="Request Account Info"
                            subtitle="Coming soon"
                            icon="file-document-outline"
                            color="#FEE140"
                            showChevron={false}
                            isLast
                        />
                    </SettingCard>
                    <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '30' }]}>
                        <Text style={[styles.comingSoonText, { color: colors.primary }]}>
                            🚀  These features are coming soon
                        </Text>
                    </View>
                </View>

                {/* Delete Account — fully active */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Danger Zone</Text>
                    <SettingCard>
                        <SettingRow
                            title="Delete My Account"
                            subtitle="Permanently remove all your data"
                            icon="delete-outline"
                            onPress={handleDeleteAccount}
                            color={colors.error}
                            isLast
                        />
                    </SettingCard>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Deleting your account is permanent and cannot be undone. All messages and data will be lost.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>
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
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    comingSoonBadge: {
        marginTop: 12,
        marginHorizontal: 4,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    comingSoonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    hint: {
        fontSize: 12,
        marginTop: 12,
        marginLeft: 4,
        lineHeight: 18,
        fontWeight: '600',
        opacity: 0.5,
    },
});
