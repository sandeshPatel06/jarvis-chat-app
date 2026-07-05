import React from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    Text,
    Dimensions,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { ChatHeader, MessageItem } from '@/components/chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dummy preview data
const DUMMY_CHAT = {
    id: 'preview',
    name: 'Jarvis Preview',
    avatar: null,
    is_online: true,
    last_seen: new Date(),
};

const DUMMY_MESSAGES = [
    {
        id: '1',
        text: 'Hey! How does this wallpaper look? 🎨',
        sender: 'them',
        timestamp: new Date(Date.now() - 90000),
        isRead: true,
    },
    {
        id: '2',
        text: 'It looks amazing! The colors are perfect ✨',
        sender: 'me',
        timestamp: new Date(Date.now() - 60000),
        isRead: true,
        isDelivered: true,
    },
    {
        id: '3',
        text: 'Set it and let\'s keep chatting 🚀',
        sender: 'them',
        timestamp: new Date(Date.now() - 30000),
        isRead: true,
    },
    {
        id: '4',
        text: 'Looks great on my side too! 👌',
        sender: 'me',
        timestamp: new Date(),
        isRead: true,
        isDelivered: true,
    },
];

export default function WallpaperPreviewScreen() {
    const { uri } = useLocalSearchParams<{ uri: string }>();
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const updateSettings = useStore((state) => state.updateSettings);
    const showToast = useStore((state) => state.showToast);

    const isImage = uri && !uri.startsWith('#');
    const isColor = uri && uri.startsWith('#');
    const backgroundColor = isColor ? uri : colors.background;

    const handleSetWallpaper = () => {
        if (uri) {
            updateSettings({ chat_wallpaper: uri });
            showToast('success', 'Wallpaper set!', 'Your chat background has been updated');
            // Go back to wallpaper list cleanly
            if (router.canGoBack()) {
                router.back();
            }
        }
    };

    const handleCancel = () => {
        router.back();
    };

    return (
        <View style={[styles.root, { backgroundColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Full-screen wallpaper layer */}
            {isImage && (
                <Image
                    source={{ uri }}
                    style={styles.wallpaperImage}
                    resizeMode="cover"
                />
            )}

            {/* Subtle dark overlay for image wallpapers so messages are readable */}
            {isImage && (
                <View
                    style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)' },
                    ]}
                    pointerEvents="none"
                />
            )}

            {/* ── Chat Header (mock, non-interactive) ── */}
            <View
                pointerEvents="none"
                style={[styles.headerWrapper, { paddingTop: insets.top }]}
            >
                {/* Back button simulation */}
                <View style={styles.backButtonPlaceholder}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={isImage ? '#fff' : colors.text} />
                </View>
                <ChatHeader
                    chat={DUMMY_CHAT as any}
                    typingUser={null}
                    onOptionsPress={() => {}}
                    onPinnedPress={() => {}}
                    style={{ backgroundColor: 'transparent', flex: 1 }}
                />
            </View>

            {/* ── Dummy Messages ── */}
            <View style={styles.messagesArea} pointerEvents="none">
                {DUMMY_MESSAGES.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        item={msg as any}
                        onLongPress={() => {}}
                        onSwipeReply={() => {}}
                        onSwipeForward={() => {}}
                    />
                ))}
            </View>

            {/* ── Mock Input Bar ── */}
            <View style={[styles.inputBar, { paddingBottom: 8 }]} pointerEvents="none">
                <View style={[styles.inputPill, { backgroundColor: isImage ? 'rgba(255,255,255,0.18)' : colors.card, borderColor: isImage ? 'rgba(255,255,255,0.25)' : colors.border }]}>
                    <MaterialCommunityIcons name="emoticon-outline" size={22} color={colors.textSecondary} />
                    <Text style={[styles.inputPlaceholder, { color: colors.textSecondary }]}>Type a message...</Text>
                    <MaterialCommunityIcons name="attachment" size={22} color={colors.textSecondary} />
                </View>
                <View style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons name="microphone" size={20} color="#fff" />
                </View>
            </View>

            {/* ── Action Bar (Glassmorphic) ── */}
            <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
                {Platform.OS === 'ios' ? (
                    <BlurView
                        intensity={isDark ? 60 : 80}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFillObject}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isDark ? 'rgba(18,18,20,0.92)' : 'rgba(255,255,255,0.92)' }]} />
                )}

                <View style={styles.actionContent}>
                    {/* Cancel */}
                    <TouchableOpacity
                        id="wallpaper-cancel-btn"
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons name="close" size={20} color={colors.text} />
                        <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>

                    {/* Set Wallpaper */}
                    <TouchableOpacity
                        id="wallpaper-set-btn"
                        style={styles.setBtn}
                        onPress={handleSetWallpaper}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#4FACFE', '#00F2FE']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.setGradient}
                        >
                            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
                            <Text style={styles.setText}>Set Wallpaper</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const ACTION_BAR_HEIGHT = 100;

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    wallpaperImage: {
        ...StyleSheet.absoluteFillObject,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    headerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonPlaceholder: {
        paddingLeft: 8,
        paddingRight: 0,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
    },
    messagesArea: {
        flex: 1,
        paddingHorizontal: 12,
        paddingBottom: ACTION_BAR_HEIGHT + 12,
        justifyContent: 'flex-end',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 8,
        gap: 8,
        marginBottom: ACTION_BAR_HEIGHT - 16,
    },
    inputPill: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputPlaceholder: {
        flex: 1,
        fontSize: 15,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 20,
    },
    actionContent: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    cancelBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '700',
    },
    setBtn: {
        flex: 2,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4FACFE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    setGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 16,
    },
    setText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
