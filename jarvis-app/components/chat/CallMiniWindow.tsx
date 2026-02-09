import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useStore } from '@/store';
import { useRouter, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';


const MINI_WINDOW_WIDTH = 120;
const MINI_WINDOW_HEIGHT = 180;

export const CallMiniWindow = () => {
    const router = useRouter();
    const segments = useSegments();
    const { colors } = useAppTheme();
    const { callState, setIsMinimized, chats } = useStore();
    const { isCalling, isMinimized, remoteStream, localStream, activeChatId } = callState;

    const isOnCallScreen = segments[0] === 'call';
    if (!isCalling || !isMinimized || isOnCallScreen) return null;

    const chat = chats.find(c => c.id === activeChatId);
    const displayName = chat?.name || 'Call';

    const handleExpand = () => {
        setIsMinimized(false);
        router.push(`/call/${activeChatId}`);
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderColor: colors.primary }]}
            onPress={handleExpand}
            activeOpacity={0.9}
        >
            <View style={styles.streamContainer}>
                {remoteStream ? (
                    <RTCView
                        key={remoteStream.toURL()}
                        streamURL={remoteStream.toURL()}
                        style={styles.stream}
                        objectFit="cover"
                    />
                ) : (
                    <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
                        <MaterialIcons name="person" size={40} color={colors.tabIconDefault} />
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>
                )}

                {localStream && (
                    <View style={[styles.localStreamContainer, { borderColor: colors.border }]}>
                        <RTCView
                            streamURL={localStream.toURL()}
                            style={styles.stream}
                            objectFit="cover"
                            mirror={true}
                        />
                    </View>
                )}
            </View>

        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: MINI_WINDOW_WIDTH,
        height: MINI_WINDOW_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 1,
    },
    streamContainer: {
        flex: 1,
    },
    stream: {
        width: '100%',
        height: '100%',
    },
    localStreamContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 40,
        height: 60,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    name: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
