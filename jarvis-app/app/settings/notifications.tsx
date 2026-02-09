import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function NotificationsSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const handleToggle = useCallback(async (field: string, value: boolean) => {
        try {
            await updateSettings({ [field]: value });
        } catch { }
    }, [updateSettings]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Messages</Text>
                    <SettingCard>
                        <SettingRow
                            title="Show Notifications"
                            subtitle="Get alerts for new messages"
                            icon="bell"
                            isSwitch
                            switchValue={user?.notifications_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_enabled', v)}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Sound"
                            subtitle="Play sounds for incoming messages"
                            icon="volume-up"
                            isSwitch
                            switchValue={user?.notifications_sound ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_sound', v)}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Groups</Text>
                    <SettingCard>
                        <SettingRow
                            title="Show Notifications"
                            subtitle="Get alerts for group messages"
                            icon="users"
                            isSwitch
                            switchValue={user?.notifications_groups_enabled ?? true}
                            onSwitchChange={(v: boolean) => handleToggle('notifications_groups_enabled', v)}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                </View>

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    System-wide notification settings can be managed in your device settings.
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
        padding: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    hint: {
        fontSize: 12,
        marginTop: 12,
        marginLeft: 8,
        lineHeight: 16,
        fontWeight: '500',
        opacity: 0.5,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});
