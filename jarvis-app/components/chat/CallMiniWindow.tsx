import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated, PanResponder, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useStore } from '@/store';
import { useRouter, useSegments } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';


const MINI_WINDOW_WIDTH = 120;
const MINI_WINDOW_HEIGHT = 180;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

    // Draggable position state
    const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - MINI_WINDOW_WIDTH - 20, y: SCREEN_HEIGHT - MINI_WINDOW_HEIGHT - 100 })).current;
    const lastTap = useRef(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value,
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gesture) => {
                pan.flattenOffset();

                // Check for double tap to expand
                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;
                if (now - lastTap.current < DOUBLE_TAP_DELAY && Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
                    handleExpand();
                    return;
                }
                lastTap.current = now;

                // Snap to edges if needed
                const finalX = (pan.x as any)._value;
                const finalY = (pan.y as any)._value;

                // Keep within screen bounds
                const boundedX = Math.max(0, Math.min(finalX, SCREEN_WIDTH - MINI_WINDOW_WIDTH));
                const boundedY = Math.max(0, Math.min(finalY, SCREEN_HEIGHT - MINI_WINDOW_HEIGHT));

                Animated.spring(pan, {
                    toValue: { x: boundedX, y: boundedY },
                    useNativeDriver: false,
                    friction: 7,
                    tension: 40,
                }).start();
            },
        })
    ).current;

    const handleExpand = () => {
        setIsMinimized(false);
        router.push(`/call/${activeChatId}`);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { borderColor: colors.primary },
                {
                    transform: pan.getTranslateTransform(),
                },
            ]}
            {...panResponder.panHandlers}
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

        </Animated.View>
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
