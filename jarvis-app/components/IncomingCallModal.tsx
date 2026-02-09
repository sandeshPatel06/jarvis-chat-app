import { useAppTheme } from '@/hooks/useAppTheme';
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
} from 'react-native-reanimated';
import { getMediaUrl } from '@/utils/media';

const PulseCircle = ({ delay = 0 }: { delay?: number }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        scale.value = withDelay(delay, withRepeat(withTiming(2, { duration: 2000 }), -1, false));
        opacity.value = withDelay(delay, withRepeat(withTiming(0, { duration: 2000 }), -1, false));
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
    const { colors, isDark } = useAppTheme();
    const router = useRouter();

    const chat = incomingCall ? chats.find(c => c.id === incomingCall.chatId) : null;
    const avatarUri = chat?.avatar ? getMediaUrl(chat.avatar) : null;

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
                <BlurView
                    intensity={100}
                    tint={isDark ? "dark" : "light"}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.container}>
                    <View style={styles.callerInfo}>
                        <View style={styles.avatarWrapper}>
                            <PulseCircle />
                            <PulseCircle delay={1000} />
                            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                                {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                ) : (
                                    <FontAwesome name="user" size={50} color="white" />
                                )}
                            </View>
                        </View>
                        <Text style={[styles.callerName, { color: colors.text }]}>{chat?.name || 'Unknown Caller'}</Text>
                        <Text style={[styles.callStatus, { color: colors.textSecondary }]}>
                            Incoming {incomingCall.isVideo ? 'Video' : 'Voice'} Call...
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.declineButton, { backgroundColor: colors.error }]}
                            onPress={handleDecline}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name="call-end" size={32} color="white" />
                            <Text style={[styles.buttonText, { color: colors.text }]}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.acceptButton, { backgroundColor: colors.success }]}
                            onPress={handleAccept}
                            activeOpacity={0.8}
                        >
                            <Animated.View>
                                <MaterialIcons name="call" size={32} color="white" />
                            </Animated.View>
                            <Text style={[styles.buttonText, { color: colors.text }]}>Accept</Text>
                        </TouchableOpacity>
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
        width: '100%',
        height: '100%',
        justifyContent: 'space-between',
        paddingVertical: 100, // Increased padding
        paddingHorizontal: 50,
    },
    callerInfo: {
        alignItems: 'center',
        marginTop: 40,
    },
    avatarWrapper: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    pulseCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#6C63FF',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    callStatus: {
        fontSize: 18,
        fontWeight: '500',
        opacity: 0.8,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 40,
        paddingHorizontal: 20, // Added horizontal padding
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    declineButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        position: 'absolute',
        bottom: -35,
    },
});
