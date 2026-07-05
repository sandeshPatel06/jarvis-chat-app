import React, { useRef } from 'react';
import { StyleSheet, View, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useStore } from '@/store';
import { useRouter, useSegments } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_WIDTH = 120;
const VIDEO_HEIGHT = 180;
const AUDIO_SIZE = 90;

export const CallMiniWindow = () => {
    const router = useRouter();
    const segments = useSegments();
    
    // Explicitly select parts of state to avoid unnecessary re-renders
    const isCalling = useStore((state: any) => state.callState.isCalling);
    const isMinimized = useStore((state: any) => state.callState.isMinimized);
    const remoteStream = useStore((state: any) => state.callState.remoteStream);
    const localStream = useStore((state: any) => state.callState.localStream);
    const activeChatId = useStore((state: any) => state.callState.activeChatId);
    const isVideo = useStore((state: any) => state.callState.isVideo) ?? true;
    const chats = useStore((state: any) => state.chats);

    const width = isVideo ? VIDEO_WIDTH : AUDIO_SIZE;
    const height = isVideo ? VIDEO_HEIGHT : AUDIO_SIZE;

    // Draggable position state
    const pan = useRef(new Animated.ValueXY({ 
        x: SCREEN_WIDTH - width - 20, 
        y: SCREEN_HEIGHT - height - 120 
    })).current;
    
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

                const now = Date.now();
                const DOUBLE_TAP_DELAY = 300;
                // Double tap check
                if (now - lastTap.current < DOUBLE_TAP_DELAY && Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    useStore.getState().setIsMinimized(false);
                    router.push(`/call/${activeChatId}`);
                    return;
                }
                lastTap.current = now;

                const finalX = (pan.x as any)._value;
                const finalY = (pan.y as any)._value;

                // Snap logic: keep within safe screen bounds
                const boundedX = Math.max(10, Math.min(finalX, SCREEN_WIDTH - width - 10));
                const boundedY = Math.max(50, Math.min(finalY, SCREEN_HEIGHT - height - 80));

                Animated.spring(pan, {
                    toValue: { x: boundedX, y: boundedY },
                    useNativeDriver: false,
                    friction: 8,
                    tension: 50,
                }).start();
            },
        })
    ).current;

    const isOnCallScreen = segments[0] === 'call';
    if (!isCalling || !isMinimized || isOnCallScreen) return null;

    const chat = chats.find((c: any) => c.id === activeChatId);

    const handleExpand = () => {
        Haptics.selectionAsync();
        useStore.getState().setIsMinimized(false);
        router.push(`/call/${activeChatId}`);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width,
                    height,
                    borderRadius: isVideo ? 16 : AUDIO_SIZE / 2,
                    transform: pan.getTranslateTransform(),
                },
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity 
                activeOpacity={0.85} 
                style={styles.innerContainer}
                onPress={handleExpand}
            >
                {isVideo ? (
                    // -------- VIDEO CALL PIP --------
                    <View style={styles.videoContainer}>
                        {remoteStream ? (
                            <RTCView
                                key={remoteStream.toURL()}
                                streamURL={remoteStream.toURL()}
                                style={styles.stream}
                                objectFit="cover"
                                zOrder={10}
                            />
                        ) : (
                            <LinearGradient
                                colors={['#0f2027', '#203a43', '#2c5364']}
                                style={styles.placeholderGradient}
                            >
                                <Avatar source={chat?.avatar} size={60} />
                            </LinearGradient>
                        )}
                        {localStream && (
                            <View style={styles.localStreamPip}>
                                <RTCView
                                    streamURL={localStream.toURL()}
                                    style={styles.stream}
                                    objectFit="cover"
                                    mirror={true}
                                    zOrder={11}
                                />
                            </View>
                        )}
                        <View style={styles.expandOverlayVideo}>
                            <MaterialIcons name="open-in-full" size={18} color="rgba(255,255,255,0.9)" />
                        </View>
                    </View>
                ) : (
                    // -------- AUDIO CALL PIP (Floating Head) --------
                    <LinearGradient
                        colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
                        style={[styles.audioContainer, { borderRadius: AUDIO_SIZE / 2 }]}
                    >
                        <View style={[styles.audioAvatarWrapper, { borderRadius: AUDIO_SIZE / 2 }]}>
                            <Avatar source={chat?.avatar} size={AUDIO_SIZE - 6} />
                            <View style={styles.badge}>
                                <FontAwesome name="phone" size={12} color="#fff" />
                            </View>
                        </View>
                        
                        <View style={styles.expandOverlayAudio}>
                            <MaterialIcons name="open-in-full" size={14} color="rgba(255,255,255,0.9)" />
                        </View>
                    </LinearGradient>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        backgroundColor: 'transparent',
        zIndex: 99999, // Ensure it sits on top of everything
    },
    innerContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    videoContainer: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: '#000',
    },
    stream: {
        width: '100%',
        height: '100%',
    },
    placeholderGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    localStreamPip: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 35,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: '#000',
    },
    expandOverlayVideo: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 12,
        padding: 4,
    },
    expandOverlayAudio: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -12 }, { translateY: -12 }], // Center it approximately
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        padding: 4,
        opacity: 0, // Hidden by default, could be shown on hover if web, or just transparent
    },
    audioContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 10,
    },
    audioAvatarWrapper: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    badge: {
        position: 'absolute',
        bottom: 0,
        right: 4,
        backgroundColor: '#34C759',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
    },
});
