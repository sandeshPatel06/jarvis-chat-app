import { ScreenWrapper } from '@/components/ScreenWrapper';
import { webrtcService } from '@/services/webrtc';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, BackHandler } from 'react-native';
import { RTCView } from 'react-native-webrtc';

export default function CallScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    // Granular selectors to isolate re-renders
    const localStream = useStore((state: any) => state.callState.localStream);
    const remoteStream = useStore((state: any) => state.callState.remoteStream);
    const isCalling = useStore((state: any) => state.callState.isCalling);
    const endCall = useStore((state: any) => state.endCall);
    const setIsMinimized = useStore((state: any) => state.setIsMinimized);
    const chat = useStore(useCallback((state: any) => state.chats.find((c: any) => c.id === id) || null, [id]));
    const callHasStarted = useRef(isCalling);

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isEnding, setIsEnding] = useState(false);

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
        if (remoteStream) {
            // Add fresh listeners to existing tracks if needed (though we do this in webrtc.ts)
        }
    }, [remoteStream, localStream]);

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
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isCalling, isEnding, router]);

    const handleEndCall = useCallback(() => {
        setIsEnding(true);
        endCall();
        setTimeout(() => {
            router.replace('/(tabs)');
        }, 1000);
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

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'left', 'right', 'bottom']} withExtraTopPadding={false}>
            <View style={styles.remoteStreamContainer}>
                {isEnding ? (
                    <View style={styles.connectingContainer}>
                        <FontAwesome name="phone-square" size={60} color="red" style={{ marginBottom: 20 }} />
                        <Text style={[styles.connectingText, { color: 'red' }]}>Call Ended</Text>
                        <Text style={styles.remoteName}>{chat?.name || 'Unknown'}</Text>
                    </View>
                ) : remoteStream ? (
                    <RTCView
                        key={remoteStream.toURL()} // Force re-render on stream change
                        streamURL={remoteStream.toURL()}
                        style={styles.remoteStream}
                        objectFit="cover"
                        mirror={false}
                        zOrder={0} // Ensure it's behind local stream
                    />
                ) : (
                    <View style={styles.connectingContainer}>
                        <Text style={styles.connectingText}>Connecting...</Text>
                        <Text style={styles.remoteName}>{chat?.name || 'Unknown'}</Text>
                    </View>
                )}
            </View>

            {/* Local Stream (PIP) */}
            {localStream && isVideoEnabled && (
                <View style={styles.localStreamContainer}>
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

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: isMuted ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleMute}>
                    <FontAwesome name={isMuted ? "microphone-slash" : "microphone"} size={24} color={isMuted ? 'black' : 'white'} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'red', width: 70, height: 70, borderRadius: 35 }]} onPress={handleEndCall}>
                    <MaterialIcons name="call-end" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: !isVideoEnabled ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleVideo}>
                    <FontAwesome name={!isVideoEnabled ? "video-camera" : "video-camera"} size={24} color={!isVideoEnabled ? 'black' : 'white'} />
                    {!isVideoEnabled && <View style={styles.slashLine} />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={switchCamera}>
                    <MaterialIcons name="flip-camera-ios" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, { backgroundColor: isSpeakerOn ? 'white' : 'rgba(255,255,255,0.2)' }]} onPress={toggleSpeaker}>
                    <MaterialIcons name={isSpeakerOn ? "volume-up" : "volume-off"} size={24} color={isSpeakerOn ? 'black' : 'white'} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => {
                        setIsMinimized(true);
                        router.back();
                    }}
                >
                    <MaterialIcons name="close-fullscreen" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    remoteStreamContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    remoteStream: {
        width: '100%',
        height: '100%',
    },
    connectingContainer: {
        alignItems: 'center',
    },
    connectingText: {
        color: 'white',
        fontSize: 18,
        marginBottom: 10,
    },
    remoteName: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    localStreamContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 100,
        height: 150,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        backgroundColor: '#000',
    },
    localStream: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slashLine: {
        position: 'absolute',
        width: '80%',
        height: 2,
        backgroundColor: 'black',
        transform: [{ rotate: '45deg' }],
    },
});
