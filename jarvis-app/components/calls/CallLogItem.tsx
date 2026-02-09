import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getMediaUrl } from '@/utils/media';

interface CallLogItemProps {
    item: any;
    user: any;
    colors: any;
    onPress: (username: string, isVideo: boolean) => void;
}

const CallLogItem = ({ item, user, colors, onPress }: CallLogItemProps) => {
    const isOutgoing = item.caller.username === user?.username;
    const otherParty = isOutgoing ? item.receiver : item.caller;
    const isMissed = item.status === 'missed';

    return (
        <TouchableOpacity
            style={styles.callItem}
            onPress={() => onPress(otherParty.username, item.is_video)}
            activeOpacity={0.7}
        >
            <Image
                source={getMediaUrl(otherParty.profile_picture) ? { uri: getMediaUrl(otherParty.profile_picture)! } : require('@/assets/images/default-avatar.png')}
                style={styles.avatar}
            />
            <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{otherParty.username}</Text>
                <View style={styles.detailsRow}>
                    <MaterialIcons
                        name={isOutgoing ? "call-made" : (isMissed ? "call-missed" : "call-received")}
                        size={14}
                        color={isMissed ? '#FF3B30' : (isOutgoing ? '#4CD964' : colors.primary)}
                    />
                    <Text style={[styles.time, { color: 'gray' }]}>
                        {new Date(item.started_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        {item.duration > 0 && ` • ${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => onPress(otherParty.username, item.is_video)}>
                <FontAwesome name={item.is_video ? "video-camera" : "phone"} size={20} color={colors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    time: {
        fontSize: 13,
    },
});

export default React.memo(CallLogItem);
