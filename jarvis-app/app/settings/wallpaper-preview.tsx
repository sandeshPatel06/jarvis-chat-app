import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { ChatHeader, MessageItem } from '@/components/chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// Dummy Data
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
        text: 'Hey! Check out this new wallpaper setup. 🎨',
        sender: 'them',
        timestamp: new Date(Date.now() - 60000),
        isRead: true,
    },
    {
        id: '2',
        text: 'Wow, it looks amazing! The colors pop nicely.',
        sender: 'me',
        timestamp: new Date(Date.now() - 30000),
        isRead: true,
        isDelivered: true,
    },
    {
        id: '3',
        text: 'Glad you like it! You can crop it or change it anytime.',
        sender: 'them',
        timestamp: new Date(),
        isRead: true,
    },
];

export default function WallpaperPreviewScreen() {
    const { uri } = useLocalSearchParams<{ uri: string }>();
    const router = useRouter();
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();
    const updateSettings = useStore((state) => state.updateSettings);

    const handleSetWallpaper = () => {
        if (uri) {
            updateSettings({ chat_wallpaper: uri });
            // Go back 2 steps (to Chat Settings) or just back to Wallpaper? 
            // Usually back to Wallpaper list is fine, or back to settings.
            // Let's go back 2 steps? No, simple back is enough, user sees "Check" icon.
            router.dismissTo('/settings/chats');
            // Or router.back() twice? 
            // Ideally we want to exit the flow.
            router.back();
            router.back();
        }
    };

    const handleCancel = () => {
        router.back();
    };

    // Determine background style
    const isImage = uri && !uri.startsWith('#');
    const backgroundColor = (uri && uri.startsWith('#')) ? uri : colors.background;

    return (
        <ScreenWrapper
            style={[styles.container, { backgroundColor }]}
            edges={['left', 'right']}
            withExtraTopPadding={false}
        >
            <Stack.Screen 
                options={{
                    headerShown: false,
                }}
            />

            {/* Background Layer */}
            {isImage && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Image
                        source={{ uri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                </View>
            )}

            {/* Visual Mock Overlay */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: isImage ? 'rgba(0,0,0,0.2)' : 'transparent' }]} pointerEvents="none" />

            {/* Header (Visual Mock) */}
            <View pointerEvents="none" style={{ marginTop: insets.top }}>
                <ChatHeader
                    chat={DUMMY_CHAT as any}
                    typingUser={null}
                    onOptionsPress={() => { }}
                    onPinnedPress={() => { }}
                    style={{ backgroundColor: 'transparent' }}
                />
            </View>

            {/* Content Body */}
            <View style={styles.body}>
                {DUMMY_MESSAGES.map((msg) => (
                    <MessageItem
                        key={msg.id}
                        item={msg as any}
                        onLongPress={() => { }}
                        onSwipeReply={() => { }}
                        onSwipeForward={() => { }}
                    />
                ))}
            </View>

            {/* Mock Input Bar */}
            <View style={[styles.inputContainer, { backgroundColor: 'transparent', borderTopWidth: 0, paddingBottom: insets.bottom + 20 }]}>
                <View style={[styles.inputField, { backgroundColor: colors.background + '90', borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSecondary }}>Type a message...</Text>
                </View>
                <View style={[styles.sendButton, { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons name="send" size={20} color="white" />
                </View>
            </View>

            {/* Action Overlay (Bottom Tool Bar) */}
            <View style={[styles.actionOverlay]}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background + 'B0' }]} onPress={handleCancel}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleSetWallpaper}>
                    <Text style={{ color: 'white', fontWeight: '800' }}>Set Wallpaper</Text>
                </TouchableOpacity>
            </View>

        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    body: {
        flex: 1,
        padding: 15,
        justifyContent: 'center', // Center messages to show context
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 10,
        borderTopWidth: 0.5,
    },
    inputField: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionOverlay: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});
