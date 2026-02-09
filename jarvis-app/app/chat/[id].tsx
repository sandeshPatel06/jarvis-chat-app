import { View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Message } from '@/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    FlatList,
    Keyboard,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Text,
    TextInput,
    Image,
    ActivityIndicator,
    LayoutAnimation
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { ChatHeader, ChatInput, MessageItem, ForwardMessageModal } from '@/components/chat';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { cacheDirectory, documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import { getMediaUrl } from '@/utils/media';
import { api } from '@/services/api';


export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();

    const chat = useStore(useCallback((state: any) => state.chats.find((c: any) => c.id === id) || null, [id]));
    const sendMessage = useStore(useCallback((state: any) => state.sendMessage, []));
    const fetchMessages = useStore(useCallback((state: any) => state.fetchMessages, []));
    const loadMoreMessages = useStore(useCallback((state: any) => state.loadMoreMessages, []));
    const connectWebSocket = useStore(useCallback((state: any) => state.connectWebSocket, []));
    const typingUser = useStore(useCallback((state: any) => id ? state.typingUsers[id] : null, [id]));
    const sendTyping = useStore(useCallback((state: any) => state.sendTyping, []));

    const markRead = useStore(useCallback((state: any) => state.markRead, []));
    const editMessage = useStore(useCallback((state: any) => state.editMessage, []));
    const deleteMessage = useStore(useCallback((state: any) => state.deleteMessage, []));
    const reactToMessage = useStore(useCallback((state: any) => state.reactToMessage, []));
    const pinMessage = useStore(useCallback((state: any) => state.pinMessage, []));
    const unpinMessage = useStore(useCallback((state: any) => state.unpinMessage, []));
    const deleteChat = useStore(useCallback((state: any) => state.deleteChat, []));
    const forwardMessage = useStore(useCallback((state: any) => state.forwardMessage, []));
    const showAlert = useStore(useCallback((state: any) => state.showAlert, []));
    const showToast = useStore(useCallback((state: any) => state.showToast, []));
    const animationsEnabled = useStore(useCallback((state: any) => state.animationsEnabled, []));
    const chats = useStore(useCallback((state: any) => state.chats, []));
    const muteChat = useStore(useCallback((state: any) => state.muteChat, []));
    const unmuteChat = useStore(useCallback((state: any) => state.unmuteChat, []));
    const isChatMuted = useStore(useCallback((state: any) => state.isChatMuted, []));
    const clearChatMessages = useStore(useCallback((state: any) => state.clearChat, []));

    const [text, setText] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Message Context Menu State
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [customEmoji, setCustomEmoji] = useState('');

    // Chat Options
    const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Search State
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Forward Message State
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [messageToForward, setMessageToForward] = useState<Message | null>(null);

    // Message Selection State
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

    // Reaction Picker State
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [messageToReact, setMessageToReact] = useState<Message | null>(null);

    // Pinned Messages State
    const [pinnedMessagesVisible, setPinnedMessagesVisible] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const lastTypingSent = useRef<number>(0);

    /* -------------------- lifecycle -------------------- */
    useEffect(() => {
        if (id) {
            useStore.getState().setActiveChat(id);
            fetchMessages(id);
            connectWebSocket();
        }
        return () => {
            useStore.getState().setActiveChat(null);
        };
    }, [id, fetchMessages, connectWebSocket]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            if (animationsEnabled) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        });
        return () => {
            show.remove();
            hide.remove();
        };
    }, [animationsEnabled]);

    useEffect(() => {
        if (animationsEnabled && chats) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [chats, animationsEnabled]);

    useEffect(() => {
        if (chat?.messages) {
            chat.messages.forEach((msg: any) => {
                if (msg.sender === 'them' && !msg.isRead) {
                    markRead(chat.id, msg.id);
                }
            });
        }
    }, [chat?.messages, markRead, chat?.id]);



    /* -------------------- handlers -------------------- */
    const handleTextChange = useCallback((value: string) => {
        setText(value);
        if (!chat) return;
        const now = Date.now();
        if (value.length > 0 && now - lastTypingSent.current > 2000) {
            sendTyping(chat.id);
            lastTypingSent.current = now;
        }
    }, [chat, sendTyping]);

    const handleSend = useCallback(() => {
        if (!chat) return;
        if (text.trim()) {
            if (editingMessageId) {
                editMessage(chat.id, editingMessageId, text.trim());
                setEditingMessageId(null);
            } else {
                sendMessage(chat.id, text.trim(), replyingToMessage?.id);
                setReplyingToMessage(null);
            }
            setText('');
        }
    }, [chat, text, editingMessageId, replyingToMessage, editMessage, sendMessage]);

    const handleLongPressMessage = useCallback((message: Message) => {
        if (selectionMode) {
            toggleMessageSelection(message.id);
        } else {
            setSelectedMessage(message);
            setModalVisible(true);
        }
    }, [selectionMode]);

    const toggleMessageSelection = useCallback((messageId: string) => {
        setSelectedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            // Exit selection mode if no messages selected
            if (newSet.size === 0) {
                setSelectionMode(false);
            }
            return newSet;
        });
    }, []);

    const handleMessagePress = useCallback((message: Message) => {
        if (selectionMode) {
            toggleMessageSelection(message.id);
        }
    }, [selectionMode, toggleMessageSelection]);

    const enterSelectionMode = useCallback((messageId: string) => {
        setSelectionMode(true);
        setSelectedMessages(new Set([messageId]));
    }, []);

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false);
        setSelectedMessages(new Set());
    }, []);

    const deleteSelectedMessages = useCallback(() => {
        if (!chat) return;
        showAlert(
            'Delete Messages',
            `Delete ${selectedMessages.size} message(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        selectedMessages.forEach((msgId: string) => {
                            deleteMessage(chat.id, msgId);
                        });
                        exitSelectionMode();
                    }
                }
            ]
        );
    }, [chat, selectedMessages, deleteMessage, showAlert, exitSelectionMode]);

    const forwardSelectedMessages = useCallback(() => {
        if (selectedMessages.size === 1) {
            const msgId = Array.from(selectedMessages)[0];
            const message = chat?.messages.find(m => m.id === msgId);
            if (message) {
                setMessageToForward(message);
                setForwardModalVisible(true);
                exitSelectionMode();
            }
        }
    }, [chat, selectedMessages, exitSelectionMode]);

    const handleReact = useCallback((reaction: string) => {
        if (selectedMessage && chat) {
            reactToMessage(chat.id, selectedMessage.id, reaction);
            setModalVisible(false);
            setSelectedMessage(null);
            setShowEmojiPicker(false);
            setCustomEmoji('');
        }
    }, [chat, selectedMessage, reactToMessage]);

    const handleOpenEmojiPicker = () => {
        setShowEmojiPicker(true);
    };

    const handleCustomEmojiSubmit = () => {
        if (customEmoji.trim()) {
            handleReact(customEmoji.trim());
        }
    };

    const handleReplyOption = () => {
        if (selectedMessage) {
            setReplyingToMessage(selectedMessage);
            setModalVisible(false);
            setSelectedMessage(null);
        }
    };

    const handleCopyOption = async () => {
        if (selectedMessage) {
            await Clipboard.setStringAsync(selectedMessage.text);
            setModalVisible(false);
            setSelectedMessage(null);
            // Optional: show a small toast if available, or just close modal
        }
    };

    const handleEditOption = () => {
        if (selectedMessage) {
            const now = new Date();
            const msgTime = new Date(selectedMessage.timestamp);
            const diffMins = (now.getTime() - msgTime.getTime()) / 60000;

            if (diffMins <= 30) {
                setEditingMessageId(selectedMessage.id);
                setText(selectedMessage.text);
                setModalVisible(false);
                setSelectedMessage(null);
            } else {
                showAlert("Time Limit Exceeded", "You can only edit messages sent within the last 30 minutes.");
            }
        }
    };

    const handleDeleteOption = () => {
        if (selectedMessage) {
            const now = new Date();
            const msgTime = new Date(selectedMessage.timestamp);
            const diffMins = (now.getTime() - msgTime.getTime()) / 60000;

            if (diffMins <= 60) {
                showAlert(
                    "Delete Message",
                    "Are you sure you want to delete this message?",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                                deleteMessage(chat.id, selectedMessage.id);
                                setModalVisible(false);
                                setSelectedMessage(null);
                            }
                        }
                    ]
                );
            } else {
                showAlert("Time Limit Exceeded", "You can only delete messages sent within the last 1 hour.");
            }
        }
    };

    const handleSaveToGallery = async () => {
        if (!selectedMessage || !selectedMessage.file) return;

        try {
            // Request permission
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Denied', 'We need permission to save media to your gallery');
                return;
            }

            // Resolve full URL
            const fullUrl = getMediaUrl(selectedMessage.file);
            if (!fullUrl) {
                showAlert('Error', 'Invalid file URL');
                return;
            }

            // Determine file extension
            let ext = '.jpg';
            if (selectedMessage.file_type?.startsWith('video')) ext = '.mp4';
            else if (selectedMessage.file_type?.startsWith('audio')) ext = '.mp3';
            else if (selectedMessage.file_type?.includes('pdf')) ext = '.pdf';

            let uriToSave = '';

            if (fullUrl.startsWith('file://')) {
                uriToSave = fullUrl;
            } else {
                // @ts-ignore

                const fileUri = (cacheDirectory || documentDirectory) + 'temp_media_' + Date.now() + ext;
                const downloadResult = await downloadAsync(fullUrl, fileUri);
                if (downloadResult.status !== 200) throw new Error('Download status: ' + downloadResult.status);
                uriToSave = downloadResult.uri;
            }

            await MediaLibrary.saveToLibraryAsync(uriToSave);
            showAlert('Success', 'Media saved to gallery!');
            setModalVisible(false);
            setSelectedMessage(null);
        } catch (error) {
            console.error('Failed to save to gallery:', error);
            showAlert('Error', 'Failed to save media to gallery');
        }
    };

    const handleDeleteChat = useCallback(() => {
        if (!chat) return;
        showAlert(
            "Delete Chat",
            "Are you sure you want to delete this conversation? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteChat(chat.id);
                        router.back();
                    }
                }
            ]
        );
    }, [chat, showAlert, deleteChat, router]);

    const handleSwipeReply = useCallback((message: Message) => {
        setReplyingToMessage(message);
    }, []);

    const handleSwipeForward = useCallback((message: Message) => {
        setMessageToForward(message);
        setForwardModalVisible(true);
    }, []);

    const handleForwardSubmit = async (chatIds: string[]) => {
        if (messageToForward) {
            await forwardMessage(messageToForward, chatIds);
            setForwardModalVisible(false);
            setMessageToForward(null);
        }
    };

    const renderMessage = useCallback(({ item }: { item: Message }) => {
        return (
            <MessageItem
                item={item}
                onLongPress={handleLongPressMessage}
                onSwipeReply={handleSwipeReply}
                onSwipeForward={handleSwipeForward}
                selectionMode={selectionMode}
                isSelected={selectedMessages.has(item.id)}
                onPress={handleMessagePress}
            />
        );
    }, [handleLongPressMessage, handleSwipeReply, handleSwipeForward, selectionMode, selectedMessages, handleMessagePress]);

    const handleLoadMore = useCallback(async () => {
        if (!chat || loadingMore || chat.messages.length < 20) return;
        setLoadingMore(true);
        await loadMoreMessages(chat.id);
        setLoadingMore(false);
    }, [chat, loadingMore, loadMoreMessages]);

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={{ padding: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    /* -------------------- render -------------------- */
    const user = useStore(useCallback((state: any) => state.user, []));
    const { isDark } = useAppTheme();
    const wallpaper = user?.chat_wallpaper || 'default';

    // Determine background source
    let backgroundSource = null;
    let backgroundColor = colors.background;

    if (wallpaper === 'default') {
        // Use local assets for default wallpaper based on theme
        backgroundSource = isDark
            ? require('@/assets/images/chat-bg-dark.png')
            : require('@/assets/images/chat-bg.png');
    } else if (wallpaper.startsWith('#')) {
        backgroundColor = wallpaper;
    } else {
        backgroundSource = { uri: wallpaper };
    }

    return (
        <ScreenWrapper
            style={[styles.container, { backgroundColor }]}
            edges={['left', 'right']}
            withExtraTopPadding={false}
        >
            {/* Background Image Layer */}
            {backgroundSource && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Image
                        source={backgroundSource}
                        style={[StyleSheet.absoluteFillObject, { opacity: isDark ? 0.5 : 1 }]} // Slight opacity adjustment for dark mode if needed
                        resizeMode="cover"
                    />
                </View>
            )}

            {!chat ? (
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: colors.text }}>Chat not found</Text>
                </View>
            ) : (
                <>
                    <ChatHeader
                        chat={chat}
                        typingUser={typingUser}
                        onOptionsPress={() => setChatOptionsVisible(true)}
                        style={{ backgroundColor: backgroundSource ? 'transparent' : colors.background }}
                    />

                    {/* Search Bar */}
                    {searchVisible && (
                        <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholder="Search messages..."
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
                                    <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => {
                                setSearchVisible(false);
                                setSearchQuery('');
                            }}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Chat Options Modal */}
                    <Modal
                        transparent={true}
                        visible={chatOptionsVisible}
                        animationType="fade"
                        onRequestClose={() => setChatOptionsVisible(false)}
                    >
                        <Pressable style={styles.modalOverlay} onPress={() => setChatOptionsVisible(false)}>
                            <View style={[styles.chatOptionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                {/* View Contact Profile */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    if (chat.user_id) {
                                        router.push(`/user/${chat.user_id}`);
                                    } else {
                                        router.push(`/contact/${chat.id}`);
                                    }
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>View Profile</Text>
                                    <MaterialCommunityIcons name="account-outline" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Search in Chat */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    setSearchVisible(true);
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>Search</Text>
                                    <MaterialCommunityIcons name="magnify" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Mute Notifications */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    const isMuted = isChatMuted(chat.id);
                                    if (isMuted) {
                                        unmuteChat(chat.id);
                                        showToast('success', 'Unmuted', `Notifications for ${chat.name} are now enabled`);
                                    } else {
                                        muteChat(chat.id);
                                        showToast('success', 'Muted', `Notifications for ${chat.name} are now disabled`);
                                    }
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>
                                        {isChatMuted(chat.id) ? 'Unmute' : 'Mute'} Notifications
                                    </Text>
                                    <MaterialCommunityIcons
                                        name={isChatMuted(chat.id) ? "bell" : "bell-off-outline"}
                                        size={20}
                                        color={colors.text}
                                    />
                                </TouchableOpacity>

                                {/* Wallpaper */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    router.push('/settings/wallpaper');
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>Wallpaper</Text>
                                    <MaterialCommunityIcons name="image-outline" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Export Chat */}
                                <TouchableOpacity onPress={async () => {
                                    setChatOptionsVisible(false);
                                    try {
                                        const Share = await import('react-native').then((m: any) => m.Share);
                                        const messageText = chat.messages
                                            .map((m: any) => `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}: ${m.text}`)
                                            .reverse()
                                            .join('\n');
                                        await Share.share({
                                            message: `Chat with ${chat.name}\n\n${messageText}`,
                                            title: `Chat with ${chat.name}`
                                        });
                                    } catch (error) {
                                        console.error('Export error:', error);
                                        showAlert('Error', 'Failed to export chat');
                                    }
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>Export Chat</Text>
                                    <MaterialCommunityIcons name="export" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Clear Chat History */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    showAlert(
                                        'Clear Chat',
                                        'Are you sure you want to clear all messages in this chat? This cannot be undone.',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Clear',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        await clearChatMessages(chat.id);
                                                        showToast('success', 'Chat Cleared', 'All messages have been deleted');
                                                    } catch (error) {
                                                        showAlert('Error', 'Failed to clear chat. Please try again.');
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>Clear Chat</Text>
                                    <MaterialCommunityIcons name="broom" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Divider */}
                                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                                {/* Send SMS */}
                                <TouchableOpacity onPress={async () => {
                                    setChatOptionsVisible(false);
                                    try {
                                        // Get user phone number from chat.user_id
                                        if (!chat.user_id) {
                                            showAlert('Error', 'Cannot send SMS: User information not available');
                                            return;
                                        }

                                        const token = useStore.getState().token;
                                        if (!token) {
                                            showAlert('Error', 'Authentication required');
                                            return;
                                        }

                                        // Fetch user profile to get phone number
                                        const userProfile = await api.auth.getUserProfile(token, chat.user_id);

                                        if (!userProfile.phone_number) {
                                            showAlert('No Phone Number', 'This user does not have a phone number registered');
                                            return;
                                        }

                                        // Check if SMS is available on device
                                        const isAvailable = await import('expo-sms').then(m => m.isAvailableAsync());
                                        if (!isAvailable) {
                                            showAlert('SMS Not Available', 'SMS is not available on this device');
                                            return;
                                        }

                                        // Open SMS with pre-filled phone number and message
                                        const SMS = await import('expo-sms');
                                        const result = await SMS.sendSMSAsync(
                                            [userProfile.phone_number],
                                            `Hi ${chat.name}! Let's chat on Jarvis.`
                                        );

                                        // If SMS was sent successfully, you could optionally notify backend
                                        // For now, just show success feedback
                                        if (result.result === 'sent') {
                                            console.log('SMS sent successfully to', userProfile.phone_number);
                                        }
                                    } catch (error) {
                                        console.error('SMS error:', error);
                                        showAlert('Error', 'Failed to send SMS');
                                    }
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.text, fontSize: 16 }}>Send SMS</Text>
                                    <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.text} />
                                </TouchableOpacity>

                                {/* Divider */}
                                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                                {/* Delete Chat */}
                                <TouchableOpacity onPress={() => {
                                    setChatOptionsVisible(false);
                                    showAlert(
                                        'Delete Chat',
                                        'Are you sure you want to delete this chat?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: handleDeleteChat,
                                            },
                                        ]
                                    );
                                }} style={styles.menuOption}>
                                    <Text style={{ color: colors.error, fontSize: 16 }}>Delete Chat</Text>
                                    <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Modal>

                    {/* Message Options Modal */}
                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        animationType="fade"
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                                {selectedMessage && (
                                    <>
                                        {!showEmojiPicker ? (
                                            <View style={styles.reactionRow}>
                                                {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                                                    <TouchableOpacity key={emoji} onPress={() => handleReact(emoji)} style={styles.reactionButton}>
                                                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                <TouchableOpacity onPress={handleOpenEmojiPicker} style={styles.reactionButton}>
                                                    <Text style={{ fontSize: 24 }}>➕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.emojiPickerContainer}>
                                                <TextInput
                                                    style={[styles.emojiInput, { color: colors.text, borderColor: colors.border }]}
                                                    placeholder="Type or paste emoji..."
                                                    placeholderTextColor={colors.tabIconDefault}
                                                    value={customEmoji}
                                                    onChangeText={setCustomEmoji}
                                                    autoFocus
                                                    onSubmitEditing={handleCustomEmojiSubmit}
                                                />
                                                <TouchableOpacity onPress={handleCustomEmojiSubmit} style={[styles.emojiSubmitButton, { backgroundColor: colors.primary }]}>
                                                    <MaterialCommunityIcons name="send" size={20} color="white" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => { setShowEmojiPicker(false); setCustomEmoji(''); }} style={styles.emojiCancelButton}>
                                                    <MaterialCommunityIcons name="close" size={20} color={colors.text} />
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />

                                        {selectedMessage && (
                                            <>
                                                <TouchableOpacity onPress={handleReplyOption} style={styles.menuOption}>
                                                    <Text style={{ color: colors.text, fontSize: 16 }}>Reply</Text>
                                                    <MaterialCommunityIcons name="reply" size={20} color={colors.text} />
                                                </TouchableOpacity>

                                                <TouchableOpacity onPress={handleCopyOption} style={styles.menuOption}>
                                                    <Text style={{ color: colors.text, fontSize: 16 }}>Copy</Text>
                                                    <MaterialCommunityIcons name="content-copy" size={20} color={colors.text} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (selectedMessage) {
                                                            if (selectedMessage.is_pinned) {
                                                                unpinMessage(chat.id, selectedMessage.id);
                                                            } else {
                                                                pinMessage(chat.id, selectedMessage.id);
                                                            }
                                                            setModalVisible(false);
                                                            setSelectedMessage(null);
                                                        }
                                                    }}
                                                    style={styles.menuOption}
                                                >
                                                    <Text style={{ color: colors.text, fontSize: 16 }}>
                                                        {selectedMessage?.is_pinned ? 'Unpin' : 'Pin'}
                                                    </Text>
                                                    <MaterialCommunityIcons
                                                        name={selectedMessage?.is_pinned ? 'pin-off' : 'pin'}
                                                        size={20}
                                                        color={colors.text}
                                                    />
                                                </TouchableOpacity>

                                                {selectedMessage.file && (
                                                    <TouchableOpacity onPress={handleSaveToGallery} style={styles.menuOption}>
                                                        <Text style={{ color: colors.text, fontSize: 16 }}>Save to Gallery</Text>
                                                        <MaterialCommunityIcons name="download" size={20} color={colors.text} />
                                                    </TouchableOpacity>
                                                )}

                                                {selectedMessage.sender === 'me' && (
                                                    <>
                                                        <TouchableOpacity onPress={handleEditOption} style={styles.menuOption}>
                                                            <Text style={{ color: colors.text, fontSize: 16 }}>Edit</Text>
                                                            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity onPress={handleDeleteOption} style={styles.menuOption}>
                                                            <Text style={{ color: colors.error, fontSize: 16 }}>Delete</Text>
                                                            <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                                                        </TouchableOpacity>
                                                    </>
                                                )}
                                            </>
                                        )}
                                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.menuOption}>
                                            <Text style={{ color: colors.text, fontSize: 16 }}>Cancel</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </Pressable>
                    </Modal>

                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                    >
                        <FlatList
                            ref={flatListRef}
                            data={searchQuery ? chat.messages.filter((m: any) =>
                                m.text.toLowerCase().includes(searchQuery.toLowerCase())
                            ) : chat.messages}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderMessage}
                            inverted={true}
                            style={{ flex: 1, backgroundColor: 'transparent' }}
                            contentContainerStyle={styles.listContent}
                            keyboardDismissMode="interactive"
                            keyboardShouldPersistTaps="handled"
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={renderFooter}
                            initialNumToRender={15}
                            maxToRenderPerBatch={10}
                            windowSize={10}
                            removeClippedSubviews={Platform.OS === 'android'}
                        </FlatList>

                    {/* Selection Mode Toolbar */}
                    {selectionMode && (
                        <View style={[styles.selectionToolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                            <TouchableOpacity onPress={exitSelectionMode} style={styles.toolbarButton}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>

                            <Text style={[styles.selectionCount, { color: colors.text }]}>
                                {selectedMessages.size} selected
                            </Text>

                            <View style={styles.toolbarActions}>
                                {selectedMessages.size === 1 && (
                                    <TouchableOpacity onPress={forwardSelectedMessages} style={styles.toolbarButton}>
                                        <MaterialCommunityIcons name="share-variant" size={24} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={deleteSelectedMessages} style={styles.toolbarButton}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <ChatInput
                        chatId={chat.id}
                        text={text}
                        setText={handleTextChange}
                        handleSend={handleSend}
                        editingMessageId={editingMessageId}
                        setEditingMessageId={setEditingMessageId}
                        replyingToMessage={replyingToMessage}
                        setReplyingToMessage={setReplyingToMessage}
                        insets={insets}
                        keyboardVisible={keyboardVisible}
                    />
                </KeyboardAvoidingView>

            {/* Forward Message Modal */}
            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={() => setForwardModalVisible(false)}
                message={messageToForward}
                chats={chats.filter((c: any) => c.id !== chat.id)}
                onForward={handleForwardSubmit}
            />
        </>
    )
}
        </ScreenWrapper >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 15 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
    },
    reactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    reactionButton: {
        padding: 5,
    },
    emojiPickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    emojiInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
    },
    emojiSubmitButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiCancelButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    menuDivider: {
        height: 1,
        marginVertical: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 4,
    },
    chatOptionsContainer: {
        position: 'absolute',
        top: 60,
        right: 10,
        width: 150,
        borderRadius: 10,
        padding: 10,
        elevation: 5,
        borderWidth: 1,
    },
});
