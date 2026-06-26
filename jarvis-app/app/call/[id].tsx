import { ScreenWrapper } from '@/components/ScreenWrapper';
import { webrtcService } from '@/services/webrtc';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, BackHandler, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { Avatar } from '@/components/ui/Avatar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';


export default function CallScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const isLandscape = width > height;
    const isShortScreen = height < 700;
    const isTabletOrWeb = width >= 600;

    // Responsive measurements
    const avatarSize = isLandscape ? 80 : (isShortScreen ? 100 : 140);
    const avatarMarginBottom = isLandscape ? 10 : (isShortScreen ? 16 : 30);
    const callerNameSize = isLandscape ? 22 : (isShortScreen ? 26 : 32);
    const callerNameMarginBottom = isLandscape ? 4 : 10;
    const callStatusSize = isLandscape ? 14 : 18;
    const controlButtonSize = isLandscape ? 46 : 56;
    const endCallButtonSize = isLandscape ? 60 : 76;

    // Granular selectors to isolate re-renders
    const localStream = useStore((state: any) => state.callState.localStream);
    const remoteStream = useStore((state: any) => state.callState.remoteStream);
    const isCalling = useStore((state: any) => state.callState.isCalling);
    const isVideo = useStore((state: any) => state.callState.isVideo) ?? true;
    const connectionState = useStore((state: any) => state.callState.connectionState);
    const endCall = useStore((state: any) => state.endCall);
    const setIsMinimized = useStore((state: any) => state.setIsMinimized);
    const appIsActive = useStore((state: any) => state.appIsActive);
    const chat = useStore(useCallback((state: any) => state.chats.find((c: any) => c.id === id) || null, [id]));
    const startTime = useStore((state: any) => state.callState.startTime);
    const callHasStarted = useRef(isCalling);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isEnding, setIsEnding] = useState(false);
    const [duration, setDuration] = useState('00:00');

    // Animation for pulsing avatar
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const endRedirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIsMinimized(false);
    }, [setIsMinimized]);

    useEffect(() => {
        if (isCalling) {
            setIsEnding(false);
            callHasStarted.current = true;
        }
    }, [isCalling]);

    useEffect(() => {
        pulseLoopRef.current?.stop();
        pulseLoopRef.current = null;

        const isRinging = !remoteStream && (connectionState === 'connecting' || connectionState === 'new' || !connectionState);
        if (appIsActive && isCalling && isRinging && !isEnding) {
            pulseLoopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            );
            pulseLoopRef.current.start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }

        return () => {
            pulseLoopRef.current?.stop();
            pulseLoopRef.current = null;
        };
    }, [appIsActive, isCalling, remoteStream, connectionState, isEnding, pulseAnim]);

    useEffect(() => {
        const backAction = () => {
            if (isCalling) {
                setIsMinimized(true);
                router.back();
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

        return () => backHandler.remove();
    }, [isCalling, router, setIsMinimized]);

    useEffect(() => {
        if (!isCalling && callHasStarted.current && !isEnding) {
            setIsEnding(true);
            endRedirectTimeoutRef.current = setTimeout(() => {
                router.replace('/(tabs)');
            }, 3000);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCalling, router]);

    useEffect(() => {
        let interval: any;
        if (appIsActive && startTime && !isEnding) {
            interval = setInterval(() => {
                const now = Date.now();
                const diff = Math.floor((now - startTime) / 1000);
                const mm = Math.floor(diff / 60).toString().padStart(2, '0');
                const ss = (diff % 60).toString().padStart(2, '0');
                setDuration(`${mm}:${ss}`);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [appIsActive, startTime, isEnding]);

    const handleEndCall = useCallback(() => {
        setIsEnding(true);
        endCall();
        if (endRedirectTimeoutRef.current) {
            clearTimeout(endRedirectTimeoutRef.current);
        }
        endRedirectTimeoutRef.current = setTimeout(() => {
            router.replace('/(tabs)');
        }, 3000);
    }, [endCall, router]);

    useEffect(() => {
        return () => {
            pulseLoopRef.current?.stop();
            if (endRedirectTimeoutRef.current) {
                clearTimeout(endRedirectTimeoutRef.current);
                endRedirectTimeoutRef.current = null;
            }
        };
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            webrtcService.toggleAudio(!next);
            return next;
        });
    }, []);

    const toggleVideo = useCallback(() => {
        setIsVideoEnabled(prev => {
            const next = !prev;
            webrtcService.toggleVideo(next);
            return next;
        });
    }, []);

    const switchCamera = useCallback(() => {
        webrtcService.switchCamera();
    }, []);

    const toggleSpeaker = useCallback(() => {
        setIsSpeakerOn(prev => {
            const next = !prev;
            webrtcService.toggleSpeaker(next);
            return next;
        });
    }, []);

    const renderCallStatus = () => {
        if (connectionState === 'connected' || remoteStream) return duration;
        if (connectionState === 'connecting') return 'Connecting...';
        return 'Ringing...';
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']} withExtraTopPadding={false}>
            {/* Background elements */}
            {isVideo && remoteStream && !isEnding ? (
                <RTCView
                    key={remoteStream.toURL()}
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteStreamGlow}
                    objectFit="cover"
                    mirror={false}
                    zOrder={0}
                />
            ) : (
                <LinearGradient
                    colors={['#0f2027', '#203a43', '#2c5364']}
                    style={styles.gradientBackground}
                />
            )}

            {/* Main Content Area */}
            <View style={styles.contentContainer}>
                {isEnding ? (
                    <View style={styles.statusContainer}>
                        <FontAwesome name="phone-square" size={60} color="#ff4b4b" style={styles.statusIcon} />
                        <Text style={[styles.connectingText, { color: '#ff4b4b' }]}>Call Ended</Text>
                    </View>
                ) : isVideo && remoteStream ? null : (
                    // Voice Call / Connection UI
                    <View style={[styles.voiceCallContainer, isLandscape && { flexDirection: 'row', alignItems: 'center', gap: 30 }]}>
                        <View style={[styles.avatarWrapper, { marginBottom: isLandscape ? 0 : avatarMarginBottom }]}>
                            {/* Animated Pulse Ring */}
                            <Animated.View style={[
                                styles.pulseRing,
                                {
                                    width: avatarSize + 20,
                                    height: avatarSize + 20,
                                    borderRadius: (avatarSize + 20) / 2,
                                    transform: [{ scale: pulseAnim }],
                                    opacity: pulseAnim.interpolate({
                                        inputRange: [1, 1.3],
                                        outputRange: [0.5, 0]
                                    })
                                }
                            ]} />
                            <Avatar
                                source={chat?.avatar}
                                size={avatarSize}
                                style={styles.premiumAvatar}
                            />
                        </View>
                        
                        <View style={isLandscape ? { alignItems: 'flex-start' } : { alignItems: 'center' }}>
                            <Text style={[styles.callerName, { fontSize: callerNameSize, marginBottom: callerNameMarginBottom }]}>{chat?.name || 'Unknown'}</Text>
                            <Text style={[styles.callStatus, { fontSize: callStatusSize }]}>{renderCallStatus()}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Local Stream (PIP) - Only for video calls */}
            {isVideo && localStream && isVideoEnabled && !isEnding && (
                <View 
                    style={[
                        styles.localStreamContainer, 
                        remoteStream ? {
                            top: Math.max(insets.top, 16),
                            right: 20,
                            width: isTabletOrWeb ? 150 : 110,
                            height: isTabletOrWeb ? 220 : 160,
                        } : styles.localStreamFull
                    ]}
                >
                    <RTCView
                        key={localStream.toURL()}
                        streamURL={localStream.toURL()}
                        style={styles.localStream}
                        objectFit="cover"
                        mirror={true}
                        zOrder={1} // Ensure it's on top
                    />
                </View>
            )}

            {/* Premium Controls */}
            {!isEnding && (
                <BlurView 
                    intensity={80} 
                    tint="dark" 
                    style={[
                        styles.controlsContainer, 
                        { 
                            paddingBottom: Math.max(insets.bottom, 24),
                            paddingTop: isLandscape ? 15 : 30,
                            borderWidth: width >= 550 ? 1 : 0,
                        }
                    ]}
                >
                    <TouchableOpacity 
                        style={[
                            styles.controlButton, 
                            { 
                                width: controlButtonSize, 
                                height: controlButtonSize, 
                                borderRadius: controlButtonSize / 2,
                                backgroundColor: isMuted ? '#fff' : 'rgba(255,255,255,0.15)' 
                            }
                        ]} 
                        onPress={toggleMute}
                    >
                        <FontAwesome name={isMuted ? "microphone-slash" : "microphone"} size={isLandscape ? 18 : 22} color={isMuted ? '#000' : '#fff'} />
                    </TouchableOpacity>

                    {isVideo && (
                        <TouchableOpacity 
                            style={[
                                styles.controlButton, 
                                { 
                                    width: controlButtonSize, 
                                    height: controlButtonSize, 
                                    borderRadius: controlButtonSize / 2,
                                    backgroundColor: !isVideoEnabled ? '#fff' : 'rgba(255,255,255,0.15)' 
                                }
                            ]} 
                            onPress={toggleVideo}
                        >
                            <FontAwesome name="video-camera" size={isLandscape ? 18 : 22} color={!isVideoEnabled ? '#000' : '#fff'} />
                            {!isVideoEnabled && <View style={[styles.slashLine, { width: controlButtonSize * 0.7 }]} />}
                        </TouchableOpacity>
                    )}

                    {/* Main End Call Button */}
                    <TouchableOpacity 
                        style={[
                            styles.endCallButton,
                            {
                                width: endCallButtonSize,
                                height: endCallButtonSize,
                                borderRadius: endCallButtonSize / 2,
                            }
                        ]} 
                        onPress={handleEndCall}
                    >
                        <MaterialIcons name="call-end" size={isLandscape ? 28 : 36} color="white" />
                    </TouchableOpacity>

                    {isVideo && (
                        <TouchableOpacity 
                            style={[
                                styles.controlButton, 
                                { 
                                    width: controlButtonSize, 
                                    height: controlButtonSize, 
                                    borderRadius: controlButtonSize / 2,
                                    backgroundColor: 'rgba(255,255,255,0.15)' 
                                }
                            ]} 
                            onPress={switchCamera}
                        >
                            <MaterialIcons name="flip-camera-ios" size={isLandscape ? 20 : 24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[
                            styles.controlButton, 
                            { 
                                width: controlButtonSize, 
                                height: controlButtonSize, 
                                borderRadius: controlButtonSize / 2,
                                backgroundColor: isSpeakerOn ? '#fff' : 'rgba(255,255,255,0.15)' 
                            }
                        ]} 
                        onPress={toggleSpeaker}
                    >
                        <MaterialIcons name={isSpeakerOn ? "volume-up" : "volume-off"} size={isLandscape ? 20 : 26} color={isSpeakerOn ? '#000' : '#fff'} />
                    </TouchableOpacity>
                </BlurView>
            )}

            {!isEnding && (
                <TouchableOpacity
                    style={[
                        styles.minimizeButton,
                        {
                            top: Math.max(insets.top, 16),
                        }
                    ]}
                    onPress={() => {
                        setIsMinimized(true);
                        router.back();
                    }}
                >
                    <MaterialIcons name="keyboard-arrow-down" size={36} color="white" />
                </TouchableOpacity>
            )}

        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    gradientBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    remoteStreamGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    statusContainer: {
        alignItems: 'center',
    },
    statusIcon: {
        marginBottom: 24,
        shadowColor: '#ff4b4b',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    connectingText: {
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    voiceCallContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    pulseRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    premiumAvatar: {
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 70,
    },
    callerName: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 10,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    callStatus: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 1,
    },
    localStreamContainer: {
        position: 'absolute',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.7)',
        backgroundColor: '#1a1a1a',
        zIndex: 5,
    },
    localStreamPip: {
        top: 60,
        right: 20,
        width: 110,
        height: 160,
    },
    localStreamFull: {
        ...StyleSheet.absoluteFillObject,
        top: 0,
        right: 0,
        width: '100%',
        height: '100%',
        borderRadius: 0,
        borderWidth: 0,
        zIndex: 1,
    },
    localStream: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        width: '100%',
        maxWidth: 550,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomWidth: 0,
        zIndex: 10,
    },
    controlButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    endCallButton: {
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    slashLine: {
        position: 'absolute',
        height: 2.5,
        backgroundColor: '#000',
        transform: [{ rotate: '45deg' }],
        borderRadius: 2,
    },
    minimizeButton: {
        position: 'absolute',
        left: 20,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 25,
        zIndex: 10,
    },
});
