import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';
import {
    CHAT_FONT_SIZE_MAX,
    CHAT_FONT_SIZE_MIN,
    CHAT_FONT_SIZE_STEP,
    getChatFontSizeLabel,
} from '@/utils/chatPreferences';
import { autoSaveIncomingImageToGallery } from '@/utils/media';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ChatFontSizeSlider = ({
    value,
    onChange,
    animationsEnabled,
    colors,
}: {
    value: number;
    onChange: (value: number) => void;
    animationsEnabled: boolean;
    colors: any;
}) => {
    const [trackWidth, setTrackWidth] = useState(0);
    const [internalValue, setInternalValue] = useState(value);
    const thumbX = useRef(new Animated.Value(0)).current;
    const dragStartValue = useRef(value);
    const pendingValue = useRef(value);

    useEffect(() => {
        setInternalValue(value);
        pendingValue.current = value;
    }, [value]);

    useEffect(() => {
        if (!trackWidth) return;
        const ratio = (internalValue - CHAT_FONT_SIZE_MIN) / (CHAT_FONT_SIZE_MAX - CHAT_FONT_SIZE_MIN);
        const nextX = clamp(ratio, 0, 1) * trackWidth - 12;

        if (animationsEnabled) {
            Animated.spring(thumbX, {
                toValue: nextX,
                useNativeDriver: false,
                tension: 180,
                friction: 20,
            }).start();
        } else {
            thumbX.setValue(nextX);
        }
    }, [internalValue, trackWidth, animationsEnabled, thumbX]);

    const updateFromLocation = useCallback((locationX: number) => {
        if (!trackWidth) return;
        const ratio = clamp(locationX / trackWidth, 0, 1);
        const nextValue = clamp(
            CHAT_FONT_SIZE_MIN + Math.round(ratio * (CHAT_FONT_SIZE_MAX - CHAT_FONT_SIZE_MIN) / CHAT_FONT_SIZE_STEP) * CHAT_FONT_SIZE_STEP,
            CHAT_FONT_SIZE_MIN,
            CHAT_FONT_SIZE_MAX,
        );
        setInternalValue(nextValue);
        pendingValue.current = nextValue;
        onChange(nextValue);
    }, [onChange, trackWidth]);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            dragStartValue.current = internalValue;
            updateFromLocation(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (_, gestureState) => {
            if (!trackWidth) return;
            const range = CHAT_FONT_SIZE_MAX - CHAT_FONT_SIZE_MIN;
            const rawValue = dragStartValue.current + (gestureState.dx / trackWidth) * range;
            const nextValue = clamp(
                Math.round(rawValue / CHAT_FONT_SIZE_STEP) * CHAT_FONT_SIZE_STEP,
                CHAT_FONT_SIZE_MIN,
                CHAT_FONT_SIZE_MAX,
            );
            setInternalValue(nextValue);
            pendingValue.current = nextValue;
            onChange(nextValue);
        },
        onPanResponderRelease: () => {
            onChange(pendingValue.current);
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderTerminate: () => {
            onChange(pendingValue.current);
        },
    }), [internalValue, onChange, trackWidth, updateFromLocation]);

    const fillWidth = useMemo(() => {
        if (!trackWidth) return 0;
        const ratio = (internalValue - CHAT_FONT_SIZE_MIN) / (CHAT_FONT_SIZE_MAX - CHAT_FONT_SIZE_MIN);
        return clamp(ratio, 0, 1) * trackWidth;
    }, [internalValue, trackWidth]);

    return (
        <View style={styles.sliderWrap}>
            <View
                style={styles.sliderTrackOuter}
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                {...panResponder.panHandlers}
            >
                <View style={[styles.sliderTrack, { backgroundColor: colors.inputBackground }]}>
                    <Animated.View
                        style={[
                            styles.sliderFill,
                            {
                                width: fillWidth,
                                backgroundColor: colors.primary,
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.sliderThumb,
                            {
                                transform: [{ translateX: thumbX }],
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                            },
                        ]}
                    />
                </View>
            </View>

            <View style={styles.sliderScaleRow}>
                <Text style={[styles.sliderScaleLabel, { color: colors.textSecondary }]}>Small</Text>
                <Text style={[styles.sliderScaleLabel, { color: colors.textSecondary }]}>Large</Text>
            </View>
        </View>
    );
};

export default function ChatsSettingsScreen() {
    const { colors } = useAppTheme();
    const theme = useStore((state) => state.theme);
    const setTheme = useStore((state) => state.setTheme);
    const animationsEnabled = useStore((state) => state.animationsEnabled);
    const setAnimationsEnabled = useStore((state) => state.setAnimationsEnabled);
    const chatEnterIsSend = useStore((state) => state.chatEnterIsSend);
    const setChatEnterIsSend = useStore((state) => state.setChatEnterIsSend);
    const chatMediaVisibility = useStore((state) => state.chatMediaVisibility);
    const setChatMediaVisibility = useStore((state) => state.setChatMediaVisibility);
    const chatMessageFontSize = useStore((state) => state.chatMessageFontSize);
    const setChatMessageFontSize = useStore((state) => state.setChatMessageFontSize);
    const chats = useStore((state) => state.chats);
    const user = useStore((state) => state.user);
    const router = useRouter();
    const [localEnterIsSend, setLocalEnterIsSend] = useState<boolean | null>(null);

    const handleWallpaperSelection = useCallback(() => {
        router.push('/settings/wallpaper');
    }, [router]);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            try {
                const stored = await AsyncStorage.getItem('chat_enter_is_send');
                if (!mounted) return;

                if (stored == null) {
                    setLocalEnterIsSend(null);
                    return;
                }

                try {
                    setLocalEnterIsSend(JSON.parse(stored));
                } catch {
                    setLocalEnterIsSend(false);
                }
            } catch {
                if (mounted) setLocalEnterIsSend(null);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const currentWallpaper = user?.chat_wallpaper || 'default';
    const wallpaperLabel = currentWallpaper === 'default'
        ? 'Default'
        : currentWallpaper.startsWith('#')
            ? currentWallpaper.toUpperCase()
            : currentWallpaper.startsWith('http')
                ? 'Preset'
                : 'Custom';

    const sliderPreviewStyle = useMemo(() => ({
        fontSize: chatMessageFontSize,
        lineHeight: Math.round(chatMessageFontSize * 1.35),
    }), [chatMessageFontSize]);

    const fontSizeLabel = getChatFontSizeLabel(chatMessageFontSize);

    useEffect(() => {
        if (!chatMediaVisibility) {
            return;
        }

        void (async () => {
            for (const chat of chats) {
                for (const message of chat.messages || []) {
                    if (message?.sender !== 'them' || !message?.file_type?.startsWith('image/') || !message?.file) {
                        continue;
                    }

                    await autoSaveIncomingImageToGallery(
                        typeof message.file === 'string' ? message.file : (message.file as any)?.uri,
                        message.id.toString(),
                        message.file_type,
                    );
                }
            }
        })();
    }, [chatMediaVisibility, chats]);

    const ThemeButton = ({ mode, icon, label }: { mode: 'light' | 'dark' | 'system', icon: any, label: string }) => {
        const isActive = theme === mode;
        return (
            <TouchableOpacity
                onPress={() => setTheme(mode)}
                style={[
                    styles.themeCard,
                    {
                        backgroundColor: isActive ? colors.primary + '15' : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                    },
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

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                            value={wallpaperLabel}
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
                            title="Enter to Send"
                            subtitle="Saved on this device"
                            icon="keyboard-return"
                            isSwitch
                            switchValue={localEnterIsSend ?? chatEnterIsSend}
                            onSwitchChange={(value) => {
                                setLocalEnterIsSend(value);
                                setChatEnterIsSend(value);
                            }}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Media Visibility"
                            subtitle="Auto-save received images to your gallery"
                            icon="image-multiple-outline"
                            isSwitch
                            switchValue={chatMediaVisibility}
                            onSwitchChange={setChatMediaVisibility}
                            color="#F093FB"
                        />
                        <View style={styles.fontSliderSection}>
                            <View style={styles.fontSliderHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.fontSliderTitle, { color: colors.text }]}>Message Font Size</Text>
                                    <Text style={[styles.fontSliderSubtitle, { color: colors.textSecondary }]}>
                                        {fontSizeLabel} · {chatMessageFontSize}px
                                    </Text>
                                </View>
                                <View style={[styles.fontPreviewBadge, { backgroundColor: colors.primary + '18' }]}>
                                    <Text style={[styles.fontPreviewBadgeText, { color: colors.primary }]}>{fontSizeLabel}</Text>
                                </View>
                            </View>

                            <View style={[styles.fontPreviewCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                <Text style={[styles.fontPreviewText, { color: colors.text }, sliderPreviewStyle]}>
                                    The quick brown fox jumps over the lazy dog.
                                </Text>
                            </View>

                            <ChatFontSizeSlider
                                value={chatMessageFontSize}
                                onChange={setChatMessageFontSize}
                                animationsEnabled={animationsEnabled}
                                colors={colors}
                            />
                        </View>
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
    fontSliderSection: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 18,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(127,127,127,0.18)',
    },
    fontSliderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    fontSliderTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    fontSliderSubtitle: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '600',
    },
    fontPreviewBadge: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
    },
    fontPreviewBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    fontPreviewCard: {
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 16,
        marginBottom: 14,
    },
    fontPreviewText: {
        fontWeight: '600',
    },
    sliderWrap: {
        marginTop: 4,
    },
    sliderTrackOuter: {
        height: 34,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    sliderFill: {
        height: '100%',
        borderRadius: 999,
    },
    sliderThumb: {
        position: 'absolute',
        left: 0,
        top: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#fff',
        shadowOpacity: 0.24,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    sliderScaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    sliderScaleLabel: {
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.75,
    },
});
