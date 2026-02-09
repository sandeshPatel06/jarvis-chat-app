import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function ChatsSettingsScreen() {
    const { colors } = useAppTheme();
    const theme = useStore((state) => state.theme);
    const setTheme = useStore((state) => state.setTheme);
    const user = useStore((state) => state.user);
    const animationsEnabled = useStore((state) => state.animationsEnabled);
    const setAnimationsEnabled = useStore((state) => state.setAnimationsEnabled);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleWallpaperSelection = useCallback(() => {
        router.push('/settings/wallpaper');
    }, [router]);

    const handleThemeSelection = useCallback(() => {
        showAlert('Choose Theme', 'Select your preferred app theme', [
            { text: 'System Default', onPress: () => setTheme('system') },
            { text: 'Light Mode', onPress: () => setTheme('light') },
            { text: 'Dark Mode', onPress: () => setTheme('dark') },
            { text: 'Cancel', style: 'cancel' }
        ]);
    }, [showAlert, setTheme]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
                    <SettingCard>
                        <SettingRow
                            title="Theme"
                            icon="paint-brush"
                            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
                            onPress={handleThemeSelection}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Wallpaper"
                            icon="image"
                            value={user?.chat_wallpaper || 'Default'}
                            onPress={handleWallpaperSelection}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Experience</Text>
                    <SettingCard>
                        <SettingRow
                            title="Animations"
                            icon="magic"
                            isSwitch
                            switchValue={animationsEnabled}
                            onSwitchChange={setAnimationsEnabled}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Smooth layout transitions and micro-animations throughout the app.
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
    }
});
