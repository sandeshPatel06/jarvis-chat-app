import React from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Chat } from '@/types';
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
        <View style={styles.wrapper}>
            <Pressable
                onPress={() => onPress(item.id)}
                onLongPress={() => onLongPress(item.id)}
                delayLongPress={300}
                style={({ pressed }) => [
                    styles.itemContainer,
                    {
                        backgroundColor: isSelected 
                            ? (colors.primary + '18') 
                            : (pressed ? (colors.primary + '08') : 'transparent'),
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                    }
                ]}
            >
                {isSelectionMode && (
                    <View style={styles.selectionWrapper}>
                        <MaterialCommunityIcons
                            name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                            size={24}
                            color={isSelected ? colors.primary : colors.textSecondary + '60'}
                        />
                    </View>
                )}
                
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={() => onProfilePress(item.user_id)}
                    disabled={!item.user_id}
                    activeOpacity={0.8}
                >
                    <Avatar
                        source={item.avatar}
                        size={56}
                        online={item.is_online}
                        style={styles.avatar}
                    />
                </TouchableOpacity>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={[styles.time, { color: colors.textSecondary + '90' }]}>
                            {formatTime(item.lastMessageTime)}
                        </Text>
                    </View>
                    
                    <View style={styles.messageRow}>
                        <Text 
                            numberOfLines={1} 
                            style={[
                                styles.message, 
                                { 
                                    color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                                    fontWeight: item.unreadCount > 0 ? '700' : '500' 
                                }
                            ]}
                        >
                            {formatAttachmentPreview(item.lastMessage)}
                        </Text>
                        
                        {item.unreadCount > 0 && (
                            <View style={styles.badgeWrapper}>
                                <LinearGradient
                                    colors={[colors.primary, colors.secondary]}
                                    style={styles.unreadBadge}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                </LinearGradient>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 12,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderRadius: 20,
    },
    selectionWrapper: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
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
        fontSize: 14,
        flex: 1,
        marginRight: 10,
    },
    badgeWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadText: {
        fontSize: 10,
        fontWeight: '800',
        color: 'white',
    },
});

export default React.memo(ChatItem);
