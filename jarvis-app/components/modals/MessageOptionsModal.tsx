import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Message } from '@/types';

interface MessageOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    message: Message | null;
}

export const MessageOptionsModal: React.FC<MessageOptionsModalProps> = ({ visible, onClose, message }) => {
    const { colors } = useAppTheme();

    const handleSaveToGallery = async () => {
        if (!message?.file || !message.file.startsWith('file://')) {
            Alert.alert('Error', 'No local file available to save');
            return;
        }

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please grant photo library access to save images.',
                    [{ text: 'OK' }]
                );
                return;
            }

            await MediaLibrary.saveToLibraryAsync(message.file);
            Alert.alert('Success', 'Saved to gallery!');
            onClose();
        } catch (error) {
            console.error('Save to gallery error:', error);
            Alert.alert('Error', 'Failed to save to gallery');
        }
    };

    const handleShare = async () => {
        if (!message?.file || !message.file.startsWith('file://')) {
            Alert.alert('Error', 'No local file available to share');
            return;
        }

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            await Sharing.shareAsync(message.file);
            onClose();
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Error', 'Failed to share file');
        }
    };

    const isMediaMessage = message?.file_type?.startsWith('image/') || message?.file_type?.startsWith('video/');

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.menu, { backgroundColor: colors.card }]}>
                    {isMediaMessage && (
                        <>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleSaveToGallery}
                            >
                                <FontAwesome name="download" size={20} color={colors.text} />
                                <Text style={[styles.menuText, { color: colors.text }]}>
                                    Save to Gallery
                                </Text>
                            </TouchableOpacity>

                            <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleShare}
                    >
                        <FontAwesome name="share" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>
                            Share
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={onClose}
                    >
                        <FontAwesome name="times" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menu: {
        borderRadius: 12,
        padding: 8,
        minWidth: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    menuText: {
        fontSize: 16,
    },
    separator: {
        height: 1,
        marginHorizontal: 8,
    },
});
