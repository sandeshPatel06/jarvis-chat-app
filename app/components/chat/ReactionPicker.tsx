import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectReaction: (emoji: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ReactionPicker = ({ visible, onClose, onSelectReaction }: ReactionPickerProps) => {
    const { colors } = useAppTheme();

    const handleReaction = (emoji: string) => {
        onSelectReaction(emoji);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />

                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={styles.centeredView}
                >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
                            <Text style={[styles.title, { color: colors.text }]}>React to message</Text>

                            <View style={styles.reactionsRow}>
                                {REACTIONS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[styles.reactionButton, { backgroundColor: colors.background }]}
                                        onPress={() => handleReaction(emoji)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    centeredView: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerContainer: {
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        minWidth: 300,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    reactionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    reactionButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    reactionEmoji: {
        fontSize: 28,
    },
});
