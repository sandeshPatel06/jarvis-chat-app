import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Message } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PinnedMessagesModalProps {
    visible: boolean;
    onClose: () => void;
    pinnedMessages: Message[];
    onUnpin: (messageId: string) => void;
    onJumpTo: (messageId: string) => void;
}

export const PinnedMessagesModal = ({ visible, onClose, pinnedMessages, onUnpin, onJumpTo }: PinnedMessagesModalProps) => {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();

    const renderPinnedMessage = ({ item }: { item: Message }) => (
        <View style={[styles.pinnedItem, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            <TouchableOpacity
                style={styles.messageContent}
                onPress={() => {
                    onJumpTo(item.id);
                    onClose();
                }}
            >
                <MaterialCommunityIcons name="pin" size={20} color={colors.primary} />
                <View style={styles.messageText}>
                    <Text style={[styles.sender, { color: colors.tabIconDefault }]}>
                        {item.sender === 'me' ? 'You' : item.sender}
                    </Text>
                    <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
                        {item.text}
                    </Text>
                    <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
                        {new Date(item.timestamp).toLocaleString()}
                    </Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onUnpin(item.id)} style={styles.unpinButton}>
                <MaterialCommunityIcons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: colors.card,
                            paddingTop: insets.top + 16,
                        }
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            Pinned Messages ({pinnedMessages.length})
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {pinnedMessages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="pin-off-outline" size={64} color={colors.tabIconDefault} />
                            <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                                No pinned messages
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={pinnedMessages}
                            renderItem={renderPinnedMessage}
                            keyExtractor={(item) => item.id}
                            style={styles.list}
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        paddingHorizontal: 16,
    },
    pinnedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
    },
    messageContent: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    messageText: {
        flex: 1,
    },
    sender: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    text: {
        fontSize: 14,
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 11,
    },
    unpinButton: {
        padding: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
});
