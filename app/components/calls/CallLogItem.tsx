import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { useStore } from '@/store';

interface CallLogItemProps {
    item: any;
    user: any;
    colors: any;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onPress: (username: string, isVideo: boolean) => void;
    onLongPress: (item: any) => void;
}

const CallLogItem = ({ item, user, colors, onPress, onLongPress, isSelectionMode, isSelected }: CallLogItemProps) => {
    const isOutgoing = item.caller.username === user?.username;
    const otherParty = isOutgoing ? item.receiver : item.caller;

    // Determine status flags
    const isMissed = item.status === 'missed' || item.status === 'no_answer' || item.status === 'rejected' || item.status === 'cancelled';
    const isAnswered = !isMissed && (item.duration > 0 || item.status === 'answered' || item.status === 'completed' || item.status === 'connected');

    let statusIcon: "call-made" | "call-received" | "call-missed" = "call-received";
    let statusColor = colors.primary;

    if (isOutgoing) {
        statusIcon = "call-made";
        if (isMissed || item.duration === 0) {
            statusColor = colors.error || '#FF3B30'; // Red for failed/unanswered outgoing
        } else {
            statusColor = colors.success || '#4CD964'; // Green for successful outgoing
        }
    } else {
        if (isMissed) {
            statusIcon = "call-missed";
            statusColor = colors.error || '#FF3B30'; // Red for missed incoming
        } else {
            statusIcon = "call-received";
            statusColor = colors.primary; // Primary tint for answered incoming
        }
    }

    const chat = useStore((state) => state.chats.find(c => 
        (c.user_id && String(c.user_id) === String(otherParty.id)) ||
        c.name === otherParty.username
    ));
    const displayName = otherParty.display_name || chat?.name || otherParty.username;

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={() => onLongPress(item)}
            onPress={() => isSelectionMode ? onLongPress(item) : onPress(otherParty.username, item.is_video)}
            style={[
                styles.callCard,
                { 
                    backgroundColor: isSelected ? colors.primary + '15' : 'transparent',
                }
            ]}
        >
            {isSelectionMode && (
                <View style={styles.selectionIndicator}>
                    <MaterialCommunityIcons 
                        name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                        size={24} 
                        color={isSelected ? colors.primary : colors.textSecondary} 
                    />
                </View>
            )}

            <View style={styles.avatarContainer}>
                <Avatar
                    source={otherParty.profile_picture}
                    size={52}
                    style={styles.avatar}
                    online={otherParty.is_online}
                />
            </View>

            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {displayName}
                </Text>
                <View style={styles.detailsRow}>
                    <MaterialCommunityIcons
                        name={statusIcon}
                        size={14}
                        color={statusColor}
                    />
                    <Text style={[styles.detailsText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.is_video ? 'Video' : 'Voice'} • {new Date(item.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        {isAnswered && item.duration > 0 && ` • ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                    </Text>
                </View>
            </View>

            {!isSelectionMode && (
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: colors.primary + '12' }]}
                        onPress={() => onPress(otherParty.username, item.is_video)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons 
                            name={item.is_video ? "video" : "phone"} 
                            size={18} 
                            color={colors.primary} 
                        />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    callCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    selectionIndicator: {
        marginRight: 14,
    },
    avatarContainer: {
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    detailsText: {
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        marginLeft: 10,
    },
    actionButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default React.memo(CallLogItem);
