import { ScreenWrapper } from '@/components/ScreenWrapper';
import { webrtcService } from '@/services/webrtc';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, BackHandler, Animated, Easing } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { Avatar } from '@/components/ui/Avatar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function CallScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    // Granular selectors to isolate re-renders
    const localStream = useStore((state: any) => state.callState.localStream);
    const remoteStream = useStore((state: any) => state.callState.remoteStream);
    const isCalling = useStore((state: any) => state.callState.isCalling);
    const isVideo = useStore((state: any) => state.callState.isVideo) ?? true;
    const connectionState = useStore((state: any) => state.callState.connectionState);
    const endCall = useStore((state: any) => state.endCall);
    const setIsMinimized = useStore((state: any) => state.setIsMinimized);
    const chat = useStore(useCallback((state: any) => state.chats.find((c: any) => c.id === id) || null, [id]));
    const callHasStarted = useRef(isCalling);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isEnding, setIsEnding] = useState(false);

    // Animation for pulsing avatar
    const pulseAnim = useRef(new Animated.Value(1)).current;

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
        const isRinging = !remoteStream && (connectionState === 'connecting' || connectionState === 'new' || !connectionState);
        if (isCalling && isRinging && !isEnding) {
            Animated.loop(
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
            ).start();
        } else {
            pulseAnim.setValue(1);
            Animated.timing(pulseAnim).stop();
        }
    }, [isCalling, remoteStream, connectionState, isEnding]);

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
            const timer = setTimeout(() => {
                router.replace('/(tabs)');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isCalling, isEnding, router]);

    const handleEndCall = useCallback(() => {
        setIsEnding(true);
        endCall();
        setTimeout(() => {
            router.replace('/(tabs)');
        }, 3000);
    }, [endCall, router]);

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
        if (connectionState === 'connected' || remoteStream) return '00:00';
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
                    <View style={styles.voiceCallContainer}>
                        <View style={styles.avatarWrapper}>
                            {/* Animated Pulse Ring */}
                            <Animated.View style={[
                                styles.pulseRing,
                                {
                                    transform: [{ scale: pulseAnim }],
                                    opacity: pulseAnim.interpolate({
                                        inputRange: [1, 1.3],
                                        outputRange: [0.5, 0]
                                    })
                                }
                            ]} />
                            <Avatar
                                source={chat?.avatar}
                                size={140}
                                style={styles.premiumAvatar}
                            />
                        </View>
                        
                        <Text style={styles.callerName}>{chat?.name || 'Unknown'}</Text>
                        <Text style={styles.callStatus}>{renderCallStatus()}</Text>
                    </View>
                )}
            </View>

            {/* Local Stream (PIP) - Only for video calls */}
            {isVideo && localStream && isVideoEnabled && !isEnding && (
                <View style={[styles.localStreamContainer, remoteStream ? styles.localStreamPip : styles.localStreamFull]}>
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
                <BlurView intensity={80} tint="dark" style={styles.controlsContainer}>
                    <TouchableOpacity 
                        style={[styles.controlButton, { backgroundColor: isMuted ? '#fff' : 'rgba(255,255,255,0.15)' }]} 
                        onPress={toggleMute}
                    >
                        <FontAwesome name={isMuted ? "microphone-slash" : "microphone"} size={22} color={isMuted ? '#000' : '#fff'} />
                    </TouchableOpacity>

                    {isVideo && (
                        <TouchableOpacity 
                            style={[styles.controlButton, { backgroundColor: !isVideoEnabled ? '#fff' : 'rgba(255,255,255,0.15)' }]} 
                            onPress={toggleVideo}
                        >
                            <FontAwesome name="video-camera" size={22} color={!isVideoEnabled ? '#000' : '#fff'} />
                            {!isVideoEnabled && <View style={styles.slashLine} />}
                        </TouchableOpacity>
                    )}

                    {/* Main End Call Button */}
                    <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
                        <MaterialIcons name="call-end" size={36} color="white" />
                    </TouchableOpacity>

                    {isVideo && (
                        <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]} onPress={switchCamera}>
                            <MaterialIcons name="flip-camera-ios" size={24} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.controlButton, { backgroundColor: isSpeakerOn ? '#fff' : 'rgba(255,255,255,0.15)' }]} 
                        onPress={toggleSpeaker}
                    >
                        <MaterialIcons name={isSpeakerOn ? "volume-up" : "volume-off"} size={26} color={isSpeakerOn ? '#000' : '#fff'} />
                    </TouchableOpacity>
                </BlurView>
            )}

            {!isEnding && (
                <TouchableOpacity
                    style={styles.minimizeButton}
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
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
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
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        zIndex: 10,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    endCallButton: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#ff3b30',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    slashLine: {
        position: 'absolute',
        width: '70%',
        height: 2.5,
        backgroundColor: '#000',
        transform: [{ rotate: '45deg' }],
        borderRadius: 2,
    },
    minimizeButton: {
        position: 'absolute',
        top: 50,
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
