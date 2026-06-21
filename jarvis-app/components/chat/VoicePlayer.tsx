import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';

interface VoicePlayerProps {
    audioUri: string;
    duration: number;
}

export const VoicePlayer = ({ audioUri, duration }: VoicePlayerProps) => {
    const { colors } = useAppTheme();
    const player = useAudioPlayer(audioUri);
    const playerRef = useRef(player);
    const appIsActive = useStore((state: any) => state.appIsActive);
    const [position, setPosition] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    const waveformBars = useMemo(() => {
        const seedSource = `${audioUri}:${duration}`;
        let seed = 0;

        for (let i = 0; i < seedSource.length; i += 1) {
            seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
        }

        const nextRandom = () => {
            seed = (1664525 * seed + 1013904223) >>> 0;
            return seed / 0xffffffff;
        };

        return Array.from({ length: 20 }, () => 10 + nextRandom() * 20);
    }, [audioUri, duration]);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    useEffect(() => {
        if (!player.playing || !appIsActive) {
            if (!appIsActive && player.playing) {
                player.pause();
            }
            return;
        }

        const interval = setInterval(() => {
            setPosition(playerRef.current.currentTime);
        }, 100);

        return () => clearInterval(interval);
    }, [player.playing, appIsActive, player]);

    useEffect(() => {
        setPosition(0);
    }, [audioUri]);

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
                    {waveformBars.map((barHeight, i) => (
                        <View
                            key={i}
                            style={[
                                styles.waveBar,
                                {
                                    height: barHeight,
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
