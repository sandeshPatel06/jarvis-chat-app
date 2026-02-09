import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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
    const router = useRouter();

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
    <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <FontAwesome name="chevron-left" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy</Text>
            <View style={{ width: 40 }} />
        </View>

        <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Visibility</Text>
                <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                    Control who can see your personal information and activity.
                </Text>

                <SettingCard>
                    <SettingRow
                        title="Last Seen"
                        icon="clock-o"
                        value={formatChoice(user?.privacy_last_seen)}
                        onPress={() => handleChoiceSelection('privacy_last_seen', 'Last Seen')}
                        color="#4FACFE"
                    />
                    <SettingRow
                        title="Profile Photo"
                        icon="image"
                        value={formatChoice(user?.privacy_profile_photo)}
                        onPress={() => handleChoiceSelection('privacy_profile_photo', 'Profile Photo')}
                        color="#6C63FF"
                    />
                    <SettingRow
                        title="Read Receipts"
                        icon="check-circle"
                        isSwitch
                        switchValue={user?.privacy_read_receipts ?? true}
                        onSwitchChange={handleToggleReadReceipts}
                        color="#38F9D7"
                        isLast
                    />
                </SettingCard>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    If you don&apos;t share your Last Seen, you won&apos;t be able to see other people&apos;s Last Seen.
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Messages</Text>
                <SettingCard>
                    <SettingRow
                        title="Default message timer"
                        icon="hourglass-end"
                        value={formatTimer(user?.privacy_disappearing_messages_timer)}
                        onPress={handleDisappearingMessagesSelection}
                        color="#FA709A"
                        isLast
                    />
                </SettingCard>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Start new chats with disappearing messages set to your timer.
                </Text>
            </View>
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
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    sectionDescription: {
        fontSize: 13,
        marginBottom: 16,
        marginLeft: 4,
        lineHeight: 18,
        fontWeight: '500',
        opacity: 0.7,
    },
    hint: {
        fontSize: 12,
        marginTop: 12,
        marginLeft: 8,
        lineHeight: 16,
        fontWeight: '500',
        opacity: 0.5,
    }
});
