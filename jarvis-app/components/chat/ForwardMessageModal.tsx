import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Chat, Message } from '@/types';

interface ForwardMessageModalProps {
    visible: boolean;
    onClose: () => void;
    message: Message | null;
    chats: Chat[];
    onForward: (chatIds: string[]) => void;
}

export const ForwardMessageModal = ({ visible, onClose, message, chats, onForward }: ForwardMessageModalProps) => {
    const { colors } = useAppTheme();
    const [selectedChats, setSelectedChats] = useState<string[]>([]);

    // Reset selected chats when modal closes
    useEffect(() => {
        if (!visible) {
            setSelectedChats([]);
        }
    }, [visible]);

    const toggleChatSelection = (chatId: string) => {
        setSelectedChats(prev =>
            prev.includes(chatId)
                ? prev.filter(id => id !== chatId)
                : [...prev, chatId]
        );
    };

    const handleForward = () => {
        if (selectedChats.length > 0) {
            onForward(selectedChats);
            setSelectedChats([]);
            onClose();
        }
    };

    const handleClose = () => {
        setSelectedChats([]);
        onClose();
    };

    const renderChatItem = ({ item }: { item: Chat }) => {
        const isSelected = selectedChats.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.border }]}
                onPress={() => toggleChatSelection(item.id)}
            >
                <View style={styles.chatInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.chatDetails}>
                        <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.lastMessage, { color: colors.tabIconDefault }]} numberOfLines={1}>
                            {item.lastMessage}
                        </Text>
                    </View>
                </View>
                <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary }
                ]}>
                    {isSelected && <MaterialCommunityIcons name="check" size={16} color="white" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Forward Message
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Selected Count */}
                {selectedChats.length > 0 && (
                    <View style={[styles.selectedBanner, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.selectedText, { color: colors.primary }]}>
                            {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''} selected
                        </Text>
                    </View>
                )}

                {/* Chat List */}
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    style={styles.list}
                />

                {/* Forward Button */}
                {selectedChats.length > 0 && (
                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <TouchableOpacity onPress={handleForward} style={styles.forwardButtonContainer}>
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                style={styles.forwardButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <MaterialCommunityIcons name="send" size={20} color="white" />
                                <Text style={styles.forwardButtonText}>
                                    Forward to {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 50,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 32,
    },
    selectedBanner: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    selectedText: {
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        flex: 1,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    chatInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    chatDetails: {
        flex: 1,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    forwardButtonContainer: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    forwardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    forwardButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
