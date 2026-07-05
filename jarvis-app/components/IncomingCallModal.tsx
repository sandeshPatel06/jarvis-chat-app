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

const BreathingAvatar = ({ avatarUri }: { avatarUri: string | null }) => {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, [scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={[styles.avatarWrapper, animatedStyle]}>
            <PulseCircle />
            <PulseCircle delay={750} />
            <View style={styles.premiumAvatar}>
                {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                    <FontAwesome name="user" size={60} color="white" />
                )}
            </View>
        </Animated.View>
    );
};

const BreathingAcceptButton = ({ onPress, disabled, isWaiting }: { onPress: () => void; disabled: boolean; isWaiting: boolean }) => {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (!disabled && !isWaiting) {
            scale.value = withRepeat(
                withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            scale.value = 1;
        }
    }, [disabled, isWaiting, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            disabled={disabled}
        >
            <Animated.View style={[styles.button, styles.acceptButton, disabled && styles.acceptButtonDisabled, animatedStyle]}>
                <MaterialIcons name="call" size={40} color="white" />
            </Animated.View>
        </TouchableOpacity>
    );
};

export default function IncomingCallModal() {
    const { callState, acceptCall, endCall, chats } = useStore();
    const { incomingCall } = callState;
    const router = useRouter();
    const isWaitingForOffer = !!incomingCall?.awaitingOffer;

    const chat = incomingCall ? chats.find(c => String(c.id) === String(incomingCall.chatId)) : null;
    const rawAvatar = incomingCall?.callerAvatar || chat?.avatar;
    const avatarUri = rawAvatar ? getMediaUrl(rawAvatar) : null;

    const handleAccept = () => {
        if (!incomingCall) return;
        router.push(`/call/${incomingCall.chatId}`);
        void acceptCall();
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
                {/* Premium gradient background */}
                <LinearGradient
                    colors={['#0F0C1B', '#15102A', '#0A0714']}
                    style={StyleSheet.absoluteFill}
                />
                <BlurView
                    intensity={60}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.container}>

                    {/* Caller Info Block */}
                    <View style={styles.callerInfo}>
                        <BreathingAvatar avatarUri={avatarUri} />

                        {/* Glassmorphic Caller Card */}
                        <View style={styles.callerCard}>
                            <Text style={styles.callerName}>
                                {incomingCall.isVideo ? 'Video Call' : 'Voice Call'} from {incomingCall.callerName || chat?.name || 'Someone'}
                            </Text>
                            {isWaitingForOffer ? (
                                <Text style={styles.callHint}>Reconnecting...</Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Action buttons */}
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
                            <BreathingAcceptButton
                                onPress={handleAccept}
                                disabled={isWaitingForOffer}
                                isWaiting={isWaitingForOffer}
                            />
                            <Text style={styles.buttonText}>{isWaitingForOffer ? 'Waiting' : 'Accept'}</Text>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 60,
    },

    callerInfo: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    avatarWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 35,
    },
    pulseCircle: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(142, 134, 255, 0.25)',
    },
    premiumAvatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: '#8E86FF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1C1C1E',
        elevation: 15,
        shadowColor: '#8E86FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    callerCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        paddingVertical: 24,
        paddingHorizontal: 40,
        width: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    callerName: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    callStatus: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 18,
        fontWeight: '500',
        letterSpacing: 0.8,
    },
    callHint: {
        color: 'rgba(255, 255, 255, 0.72)',
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        paddingBottom: 40,
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
        backgroundColor: '#32D74B',
        shadowColor: '#32D74B',
        shadowOpacity: 0.4,
    },
    acceptButtonDisabled: {
        backgroundColor: 'rgba(50, 215, 75, 0.45)',
        shadowColor: 'transparent',
    },
    declineButton: {
        backgroundColor: '#FF453A',
        shadowColor: '#FF453A',
        shadowOpacity: 0.4,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
});
