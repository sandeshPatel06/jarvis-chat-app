import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { Stack } from 'expo-router';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function PrivacySettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const showAlert = useStore((state) => state.showAlert);

    const handleToggleReadReceipts = useCallback(async (value: boolean) => {
        try {
            await updateSettings({ privacy_read_receipts: value });
        } catch { }
    }, [updateSettings]);

    const handleChoiceSelection = useCallback((field: string, title: string) => {
        showAlert(
            title,
            'Who can see my ' + title.toLowerCase(),
            [
                { text: 'Everyone', onPress: () => updateSettings({ [field]: 'everyone' }) },
                { text: 'My Contacts', onPress: () => updateSettings({ [field]: 'contacts' }) },
                { text: 'Nobody', onPress: () => updateSettings({ [field]: 'nobody' }) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    }, [showAlert, updateSettings]);

    const formatChoice = (choice: string | undefined) => {
        if (!choice) return 'Everyone';
        return choice.charAt(0).toUpperCase() + choice.slice(1).replace('_', ' ');
    };

    const handleDisappearingMessagesSelection = useCallback(() => {
        showAlert(
            'Default message timer',
            'Start new chats with disappearing messages set to your timer',
            [
                { text: 'Off', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 0 }) },
                { text: '24 Hours', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 86400 }) },
                { text: '7 Days', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 604800 }) },
                { text: '90 Days', onPress: () => updateSettings({ privacy_disappearing_messages_timer: 7776000 }) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    }, [showAlert, updateSettings]);

    const formatTimer = (seconds: number | undefined) => {
        if (!seconds || seconds === 0) return 'Off';
        if (seconds === 86400) return '24 Hours';
        if (seconds === 604800) return '7 Days';
        if (seconds === 7776000) return '90 Days';
        return `${seconds} seconds`;
    };

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Privacy Settings',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Visibility</Text>
                    <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                        Control who can see your personal information and activity.
                    </Text>

                    <SettingCard>
                        <SettingRow
                            title="Last Seen & Online"
                            icon="clock-outline"
                            value={formatChoice(user?.privacy_last_seen)}
                            onPress={() => handleChoiceSelection('privacy_last_seen', 'Last Seen')}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Profile Photo"
                            icon="image-outline"
                            value={formatChoice(user?.privacy_profile_photo)}
                            onPress={() => handleChoiceSelection('privacy_profile_photo', 'Profile Photo')}
                            color="#6C63FF"
                        />
                        <SettingRow
                            title="Read Receipts"
                            icon="check-circle-outline"
                            isSwitch
                            switchValue={user?.privacy_read_receipts ?? true}
                            onSwitchChange={handleToggleReadReceipts}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        If you don&apos;t share your read receipts, you won&apos;t be able to see other people&apos;s read receipts.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Messages</Text>
                    <SettingCard>
                        <SettingRow
                            title="Default Message Timer"
                            icon="timer-outline"
                            value={formatTimer(user?.privacy_disappearing_messages_timer)}
                            onPress={handleDisappearingMessagesSelection}
                            color="#FA709A"
                            isLast
                        />
                    </SettingCard>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Start new chats with disappearing messages set to your preferred duration.
                    </Text>
                </View>

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
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    sectionDescription: {
        fontSize: 13,
        marginBottom: 16,
        marginLeft: 4,
        lineHeight: 18,
        fontWeight: '600',
        opacity: 0.5,
    },
    hint: {
        fontSize: 12,
        marginTop: 14,
        marginLeft: 8,
        lineHeight: 18,
        fontWeight: '600',
        opacity: 0.5,
    }
});
