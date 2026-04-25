import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function NotificationsSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);

    const handleToggle = useCallback(async (field: string, value: boolean) => {
        try {
            await updateSettings({ [field]: value });
        } catch { }
    }, [updateSettings]);

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Notifications',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Messages</Text>
                    <SettingCard>
                        <SettingRow
                            title="Show Notifications"
                            subtitle="Get alerts for new messages"
                            icon="bell-outline"
                            isSwitch
                            switchValue={user?.notifications_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_enabled', v)}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Notification Sound"
                            subtitle="Play sounds for incoming messages"
                            icon="volume-high"
                            isSwitch
                            switchValue={user?.notifications_sound ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_sound', v)}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Groups</Text>
                    <SettingCard>
                        <SettingRow
                            title="Group Notifications"
                            subtitle="Get alerts for group messages"
                            icon="account-group-outline"
                            isSwitch
                            switchValue={user?.notifications_groups_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_groups_enabled', v)}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                </View>

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    System-wide notification settings can be further managed in your device settings.
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
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 14,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    hint: {
        fontSize: 12,
        marginTop: 14,
        marginLeft: 8,
        lineHeight: 18,
        fontWeight: '600',
        opacity: 0.5,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});
