import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { useRouter, Stack } from 'expo-router';

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
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Chat Settings',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
                    <SettingCard>
                        <SettingRow
                            title="Theme"
                            icon="palette-outline"
                            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
                            onPress={handleThemeSelection}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Wallpaper"
                            icon="image-outline"
                            value={user?.chat_wallpaper || 'Default'}
                            onPress={handleWallpaperSelection}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Experience</Text>
                    <SettingCard>
                        <SettingRow
                            title="Fluid Animations"
                            icon="auto-fix"
                            isSwitch
                            switchValue={animationsEnabled}
                            onSwitchChange={setAnimationsEnabled}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Smooth layout transitions and premium micro-animations throughout the application.
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
    }
});
