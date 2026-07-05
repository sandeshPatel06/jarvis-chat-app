import React from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Message } from '@/types';
import { getMediaUrl } from '@/utils/media';

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
        if (!message.file) {
            showAlert('Error', 'No file available to share');
            return;
        }

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showAlert('Error', 'Sharing is not available on this device');
                return;
            }

            let uriToShare = typeof message.file === 'string' ? message.file : (message.file as any)?.uri;
            if (!uriToShare) {
                showAlert('Error', 'No file available to share');
                return;
            }

            if (!uriToShare.startsWith('file://')) {
                const fullUrl = getMediaUrl(uriToShare) || uriToShare;
                const ext = message.file_type?.startsWith('video/')
                    ? '.mp4'
                    : message.file_type?.startsWith('audio/')
                        ? '.m4a'
                        : message.file_type?.includes('pdf')
                            ? '.pdf'
                            : '.jpg';
                const targetUri = (cacheDirectory || documentDirectory) + `share_${Date.now()}${ext}`;
                const downloadResult = await downloadAsync(fullUrl, targetUri);
                if (downloadResult.status !== 200) {
                    throw new Error(`Download failed with status ${downloadResult.status}`);
                }
                uriToShare = downloadResult.uri;
            }

            await Sharing.shareAsync(uriToShare);
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
                <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        borderRadius: 18,
        paddingVertical: 10,
        minWidth: 240,
        borderWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
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
