import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();
    const [showFontSizeModal, setShowFontSizeModal] = React.useState(false);

    const fontSizes = ['Small', 'Medium', 'Large'];

    const handleWallpaperSelection = useCallback(() => {
        router.push('/settings/wallpaper');
    }, [router]);

    const handleToggle = useCallback(async (key: string, value: boolean) => {
        try {
            await updateSettings({ [key]: value });
        } catch { }
    }, [updateSettings]);

    const ThemeButton = ({ mode, icon, label }: { mode: 'light' | 'dark' | 'system', icon: any, label: string }) => {
        const isActive = theme === mode;
        return (
            <TouchableOpacity 
                onPress={() => setTheme(mode)}
                style={[
                    styles.themeCard, 
                    { 
                        backgroundColor: isActive ? colors.primary + '15' : colors.card,
                        borderColor: isActive ? colors.primary : colors.border
                    }
                ]}
            >
                <View style={[styles.themeIconCircle, { backgroundColor: isActive ? colors.primary : colors.inputBackground }]}>
                    <MaterialCommunityIcons name={icon} size={22} color={isActive ? '#fff' : colors.textSecondary} />
                </View>
                <Text style={[styles.themeLabel, { color: isActive ? colors.primary : colors.text, fontWeight: isActive ? '800' : '600' }]}>
                    {label}
                </Text>
                {isActive && (
                    <View style={styles.activeDot}>
                        <MaterialCommunityIcons name="check-circle" size={16} color={colors.primary} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Theme</Text>
                    <View style={styles.themeGrid}>
                        <ThemeButton mode="light" icon="weather-sunny" label="Light" />
                        <ThemeButton mode="dark" icon="weather-night" label="Dark" />
                        <ThemeButton mode="system" icon="brightness-auto" label="Full Auto" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Chat Appearance</Text>
                    <SettingCard>
                        <SettingRow
                            title="Wallpaper"
                            subtitle="Set a custom background for chats"
                            icon="image-outline"
                            value={user?.chat_wallpaper || 'Default'}
                            onPress={handleWallpaperSelection}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Chat Preferences</Text>
                    <SettingCard>
                        <SettingRow
                            title="Enter is Send"
                            subtitle="The enter key will send your message"
                            icon="keyboard-return"
                            isSwitch
                            switchValue={user?.chat_enter_is_send ?? false}
                            onSwitchChange={(v) => handleToggle('chat_enter_is_send', v)}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Media Visibility"
                            subtitle="Show newly downloaded media in gallery"
                            icon="eye-outline"
                            isSwitch
                            switchValue={user?.chat_media_visibility ?? true}
                            onSwitchChange={(v) => handleToggle('chat_media_visibility', v)}
                            color="#F093FB"
                        />
                        <SettingRow
                            title="Font Size"
                            subtitle="Adjust chat message text size"
                            icon="format-size"
                            value={user?.chat_font_size || 'Medium'}
                            onPress={() => setShowFontSizeModal(true)}
                            color="#FF9A9E"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Experience</Text>
                    <SettingCard>
                        <SettingRow
                            title="Fluid Animations"
                            subtitle="Premium micro-animations"
                            icon="auto-fix"
                            isSwitch
                            switchValue={animationsEnabled}
                            onSwitchChange={setAnimationsEnabled}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Font Size Modal */}
            <Modal
                visible={showFontSizeModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFontSizeModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowFontSizeModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Chat Font Size</Text>
                        {fontSizes.map((size) => (
                            <TouchableOpacity
                                key={size}
                                style={styles.modalOption}
                                onPress={async () => {
                                    await handleToggle('chat_font_size', size as any);
                                    setShowFontSizeModal(false);
                                }}
                            >
                                <Text style={[styles.optionText, { 
                                    color: user?.chat_font_size === size ? colors.primary : colors.text,
                                    fontWeight: user?.chat_font_size === size ? 'bold' : 'normal'
                                }]}>{size}</Text>
                                {user?.chat_font_size === size && (
                                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
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
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    themeGrid: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between',
    },
    themeCard: {
        flex: 1,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1.5,
        justifyContent: 'center',
        position: 'relative',
    },
    themeIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    themeLabel: {
        fontSize: 13,
    },
    activeDot: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '90%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 20,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
