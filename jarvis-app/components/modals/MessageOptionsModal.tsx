import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Sharing from 'expo-sharing';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Message } from '@/types';

interface MessageOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    message: Message | null;
    onReply?: (message: Message) => void;
    onCopy?: (message: Message) => void;
    onEdit?: (message: Message) => void;
    onDelete?: (message: Message) => void;
    onPin?: (message: Message) => void;
    onUnpin?: (message: Message) => void;
    onReact?: (message: Message) => void;
    onSaveToGallery?: (message: Message) => void;
}

export const MessageOptionsModal: React.FC<MessageOptionsModalProps> = ({ 
    visible, 
    onClose, 
    message,
    onReply,
    onCopy,
    onEdit,
    onDelete,
    onPin,
    onUnpin,
    onReact,
    onSaveToGallery
}) => {
    const { colors } = useAppTheme();
    const showAlert = useStore(state => state.showAlert);

    if (!message) return null;

    const handleShare = async () => {
        if (!message.file || !message.file.startsWith('file://')) {
            showAlert('Error', 'No local file available to share');
            return;
        }

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showAlert('Error', 'Sharing is not available on this device');
                return;
            }

            await Sharing.shareAsync(message.file);
            onClose();
        } catch (error) {
            console.error('Share error:', error);
            showAlert('Error', 'Failed to share file');
        }
    };

    const isMediaMessage = message.file_type?.startsWith('image/') || message.file_type?.startsWith('video/');
    const isMe = message.sender === 'me';

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
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { onReact?.(message); }}
                    >
                        <FontAwesome name="smile-o" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>React</Text>
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { onReply?.(message); onClose(); }}
                    >
                        <FontAwesome name="reply" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Reply</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { onCopy?.(message); onClose(); }}
                    >
                        <FontAwesome name="copy" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Copy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { 
                            if (message.is_pinned) onUnpin?.(message); 
                            else onPin?.(message);
                            onClose();
                        }}
                    >
                        <FontAwesome name="thumb-tack" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>
                            {message.is_pinned ? 'Unpin' : 'Pin'}
                        </Text>
                    </TouchableOpacity>

                    {isMe && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { onEdit?.(message); onClose(); }}
                        >
                            <FontAwesome name="edit" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Edit</Text>
                        </TouchableOpacity>
                    )}

                    {isMediaMessage && (
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { onSaveToGallery?.(message); onClose(); }}
                        >
                            <FontAwesome name="download" size={20} color={colors.text} />
                            <Text style={[styles.menuText, { color: colors.text }]}>Save to Gallery</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleShare}
                    >
                        <FontAwesome name="share" size={20} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Share</Text>
                    </TouchableOpacity>

                    <View style={[styles.separator, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => { onDelete?.(message); onClose(); }}
                    >
                        <FontAwesome name="trash" size={20} color={colors.error} />
                        <Text style={[styles.menuText, { color: colors.error }]}>Delete</Text>
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
