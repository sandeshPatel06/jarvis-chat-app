import React from 'react';
import { View, Text, Image, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Chat } from '@/types';
import { getMediaUrl } from '@/utils/media';
import { Avatar } from '@/components/ui/Avatar';

interface ChatItemProps {
    item: Chat;
    isSelected: boolean;
    isSelectionMode: boolean;
    colors: any;
    onPress: (id: string) => void;
    onLongPress: (id: string) => void;
    onProfilePress: (userId?: number) => void;
    formatTime: (date: Date) => string;
}

const ChatItem = ({
    item,
    isSelected,
    isSelectionMode,
    colors,
    onPress,
    onLongPress,
    onProfilePress,
    formatTime
}: ChatItemProps) => {
    // Format attachment preview with appropriate icon
    const formatAttachmentPreview = (message: string): string => {
        if (!message) return '';

        // Check if message contains file type indicators
        if (message.includes('image/') || message.toLowerCase().includes('photo')) {
            return '📷 Photo';
        }
        if (message.includes('video/')) {
            return '🎥 Video';
        }
        if (message.includes('audio/')) {
            return '🎵 Audio';
        }
        if (message.includes('application/') || message.toLowerCase().includes('document')) {
            return '📄 Document';
        }

        return message;
    };

    return (
        <View style={{ paddingHorizontal: 15 }}>
            <Pressable
                onPress={() => onPress(item.id)}
                onLongPress={() => onLongPress(item.id)}
                delayLongPress={300}
                style={({ pressed }) => [
                    styles.itemContainer,
                    {
                        backgroundColor: isSelected ? colors.primary + '20' : colors.card,
                        borderColor: colors.border,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        borderRadius: 20,
                    }
                ]}
            >
                {isSelectionMode && (
                    <View style={{ marginRight: 10 }}>
                        <FontAwesome
                            name={isSelected ? "check-circle" : "circle-thin"}
                            size={24}
                            color={isSelected ? colors.primary : colors.text}
                        />
                    </View>
                )}
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={() => onProfilePress(item.user_id)}
                    disabled={!item.user_id}
                >
                    <Avatar
                        source={item.avatar}
                        size={54}
                        online={item.is_online}
                        style={styles.avatar} // Pass style if needed, though size prop handles dimensions
                    />
                </TouchableOpacity>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.time, { color: colors.tabIconDefault }]}>{formatTime(item.lastMessageTime)}</Text>
                    </View>
                    <View style={styles.messageRow}>
                        <Text numberOfLines={1} style={[styles.message, { color: colors.text, opacity: 0.7 }]}>
                            {formatAttachmentPreview(item.lastMessage)}
                        </Text>
                        {item.unreadCount > 0 && (
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.unreadBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </LinearGradient>
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 15,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },

    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
    },
    time: {
        fontSize: 12,
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    message: {
        fontSize: 15,
        flex: 1,
        marginRight: 10,
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: 'white',
    },
});

export default React.memo(ChatItem);
