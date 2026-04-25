import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';

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
    const isMissed = item.status === 'missed';

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onLongPress={() => onLongPress(item)}
            onPress={() => isSelectionMode ? onLongPress(item) : onPress(otherParty.username, item.is_video)}
            style={[
                styles.callCard,
                { 
                    backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder
                }
            ]}
        >
            {isSelectionMode && (
                <View style={styles.selectionIndicator}>
                    <MaterialCommunityIcons 
                        name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"} 
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
                />
            </View>

            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {otherParty.username}
                </Text>
                <View style={styles.detailsRow}>
                    <MaterialCommunityIcons
                        name={isOutgoing ? "call-made" : (isMissed ? "call-missed" : "call-received")}
                        size={14}
                        color={isMissed ? '#FF3B30' : (isOutgoing ? '#4CD964' : colors.primary)}
                    />
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                        {new Date(item.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        {item.duration > 0 && ` • ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                    </Text>
                </View>
            </View>

            {!isSelectionMode && (
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                        onPress={() => onPress(otherParty.username, item.is_video)}
                    >
                        <MaterialCommunityIcons 
                            name={item.is_video ? "video" : "phone"} 
                            size={22} 
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
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    selectionIndicator: {
        marginRight: 12,
    },
    avatarContainer: {
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 18,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    time: {
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        marginLeft: 10,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default React.memo(CallLogItem);
