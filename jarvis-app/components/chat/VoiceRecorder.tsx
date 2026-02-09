import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useAudioRecorder, RecordingOptions } from 'expo-audio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface VoiceRecorderProps {
    onSend: (audioUri: string, duration: number) => void;
    onCancel: () => void;
}

export const VoiceRecorder = ({ onSend, onCancel }: VoiceRecorderProps) => {
    const { colors } = useAppTheme();
    const audioRecorder = useAudioRecorder(RecordingOptions.HIGH_QUALITY);
    const [duration, setDuration] = useState(0);
    const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const waveAnimation = useRef(new Animated.Value(1)).current;

    const startRecording = async () => {
        try {
            await audioRecorder.record();

            // Start duration counter
            durationInterval.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

            // Start wave animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(waveAnimation, {
                        toValue: 1.5,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(waveAnimation, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        try {
            const uri = await audioRecorder.stop();

            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }

            if (uri) {
                onSend(uri, duration);
            }

            setDuration(0);
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    };

    const cancelRecording = async () => {
        try {
            await audioRecorder.stop();
        } catch (err) {
            console.error('Error canceling recording', err);
        }

        if (durationInterval.current) {
            clearInterval(durationInterval.current);
        }

        setDuration(0);
        onCancel();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    React.useEffect(() => {
        startRecording();
        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
            }
        };
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
                <MaterialCommunityIcons name="close" size={24} color={colors.error} />
            </TouchableOpacity>

            <View style={styles.recordingInfo}>
                <Animated.View style={[
                    styles.waveIndicator,
                    {
                        backgroundColor: colors.error,
                        transform: [{ scale: waveAnimation }]
                    }
                ]} />
                <Text style={[styles.duration, { color: colors.text }]}>
                    {formatDuration(duration)}
                </Text>
            </View>

            <TouchableOpacity
                onPress={stopRecording}
                style={[styles.sendButton, { backgroundColor: colors.primary }]}
            >
                <MaterialCommunityIcons name="send" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        marginHorizontal: 8,
        marginBottom: 8,
    },
    cancelButton: {
        padding: 8,
    },
    recordingInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    waveIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    duration: {
        fontSize: 16,
        fontWeight: '600',
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
