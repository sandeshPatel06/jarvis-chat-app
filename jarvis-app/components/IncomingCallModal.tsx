import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing
} from 'react-native-reanimated';
import { getMediaUrl } from '@/utils/media';
import { LinearGradient } from 'expo-linear-gradient';

const PulseCircle = ({ delay = 0 }: { delay?: number }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        scale.value = withDelay(delay, withRepeat(withTiming(1.4, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false));
        opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false));
    }, [delay, scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={[styles.pulseCircle, animatedStyle]} />;
};

export default function IncomingCallModal() {
    const { callState, acceptCall, endCall, chats } = useStore();
    const { incomingCall } = callState;
    const router = useRouter();

    const chat = incomingCall ? chats.find(c => String(c.id) === String(incomingCall.chatId)) : null;
    const rawAvatar = incomingCall?.callerAvatar || chat?.avatar;
    const avatarUri = rawAvatar ? getMediaUrl(rawAvatar) : null;

    const handleAccept = async () => {
        if (!incomingCall) return;
        await acceptCall();
        if (useStore.getState().callState.isCalling) {
            router.push(`/call/${incomingCall.chatId}`);
        }
    };

    const handleDecline = () => {
        endCall();
    };

    if (!incomingCall) return null;

    return (
        <Modal
            transparent
            visible={!!incomingCall}
            animationType="fade"
            onRequestClose={handleDecline}
        >
            <View style={styles.overlay}>
                {/* Immersive background matching the CallScreen */}
                <LinearGradient
                    colors={['rgba(15, 32, 39, 0.95)', 'rgba(32, 58, 67, 0.95)', 'rgba(44, 83, 100, 0.95)']}
                    style={StyleSheet.absoluteFill}
                />
                <BlurView
                    intensity={60}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.container}>
                    <View style={styles.callerInfo}>
                        <View style={styles.avatarWrapper}>
                            <PulseCircle />
                            <PulseCircle delay={750} />
                            <View style={styles.premiumAvatar}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                ) : (
                                    <FontAwesome name="user" size={60} color="white" />
                                )}
                            </View>
                        </View>
                        <Text style={styles.callerName}>{incomingCall.callerName || chat?.name || 'Unknown Caller'}</Text>
                        <Text style={styles.callStatus}>
                            Incoming {incomingCall.isVideo ? 'Video' : 'Voice'} Call...
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <View style={styles.actionButtonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.declineButton]}
                                onPress={handleDecline}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="call-end" size={40} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.buttonText}>Decline</Text>
                        </View>

                        <View style={styles.actionButtonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={handleAccept}
                                activeOpacity={0.8}
                            >
                                <Animated.View>
                                    <MaterialIcons name="call" size={40} color="white" />
                                </Animated.View>
                            </TouchableOpacity>
                            <Text style={styles.buttonText}>Accept</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callerInfo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    avatarWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    pulseCircle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    premiumAvatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    callerName: {
        color: '#ffffff',
        fontSize: 34,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    callStatus: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 20,
        fontWeight: '500',
        letterSpacing: 1,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        paddingBottom: 80,
    },
    actionButtonContainer: {
        alignItems: 'center',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: 15,
    },
    acceptButton: {
        backgroundColor: '#34C759', // iOS green
        shadowColor: '#34C759',
    },
    declineButton: {
        backgroundColor: '#FF3B30', // iOS red
        shadowColor: '#FF3B30',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
});
