import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';

interface VoicePlayerProps {
    audioUri: string;
    duration: number;
}

export const VoicePlayer = ({ audioUri, duration }: VoicePlayerProps) => {
    const { colors } = useAppTheme();
    const player = useAudioPlayer(audioUri);
    const [position, setPosition] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (player.playing) {
                setPosition(player.currentTime);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [player.playing]);

    const togglePlayback = () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const changeSpeed = () => {
        const speeds = [1.0, 1.5, 2.0];
        const currentIndex = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIndex + 1) % speeds.length];

        player.setPlaybackRate(nextSpeed);
        setPlaybackSpeed(nextSpeed);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
                <MaterialCommunityIcons
                    name={player.playing ? 'pause' : 'play'}
                    size={24}
                    color="white"
                />
            </TouchableOpacity>

            <View style={styles.progressContainer}>
                <View style={styles.waveform}>
                    {[...Array(20)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.waveBar,
                                {
                                    height: Math.random() * 20 + 10,
                                    backgroundColor: i < (position / duration) * 20 ? colors.primary : 'rgba(255,255,255,0.3)',
                                }
                            ]}
                        />
                    ))}
                </View>
                <Text style={styles.time}>
                    {formatTime(position)} / {formatTime(duration)}
                </Text>
            </View>

            <TouchableOpacity onPress={changeSpeed} style={styles.speedButton}>
                <Text style={styles.speedText}>{playbackSpeed}x</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
        minWidth: 200,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    progressContainer: {
        flex: 1,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        gap: 2,
    },
    waveBar: {
        flex: 1,
        borderRadius: 2,
    },
    time: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    speedButton: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    speedText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '600',
    },
});
