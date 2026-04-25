import { StateCreator } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as database from '@/services/database';
import { api } from '@/services/api';
import { Chat, Message } from '@/types';
import { getMediaUrl, getLocalMediaUri, downloadMedia } from '@/utils/media';
import { scheduleLocalNotification } from '@/utils/notifications';
import { downloadManager } from '@/services/downloadManager';
import { AppState } from '@/store';
import { handleWebSocketMessage } from '@/utils/websocket';

export interface ChatSlice {
    chats: Chat[];
    activeChatId: string | null;
    socket: WebSocket | null;
    typingUsers: Record<string, string | null>;
    mutedChats: string[];
    setActiveChat: (chatId: string | null) => void;
    setTyping: (chatId: string, username: string | null) => void;
    sendTyping: (chatId: string) => void;
    connectWebSocket: () => void;
    addMessage: (message: any) => void;
    sendMessage: (chatId: string, text: string, replyToId?: string) => Promise<void>;
    sendFileMessage: (chatId: string, file: any, text?: string, replyToId?: string, duration?: number) => Promise<void>;
    syncMessages: () => Promise<void>;
    fetchChats: () => Promise<void>;
    restoreChats: (conversationIds: number[], restoreDate?: string) => Promise<void>;
    fetchMessages: (chatId: string) => Promise<void>;
    markRead: (chatId: string, messageId: string) => void;
    markDelivered: (chatId: string, messageId: string) => void;
    editMessage: (chatId: string, messageId: string, newText: string) => void;
    deleteMessage: (chatId: string, messageId: string) => void;
    reactToMessage: (chatId: string, messageId: string, reaction: string) => void;
    muteChat: (chatId: string) => void;
    unmuteChat: (chatId: string) => void;
    isChatMuted: (chatId: string) => boolean;
    pinMessage: (chatId: string, messageId: string) => void;
    unpinMessage: (chatId: string, messageId: string) => void;
    fetchCalls: (loadMore?: boolean) => Promise<void>;
    loadMoreMessages: (chatId: string) => Promise<void>;
    forwardMessage: (message: Message, chatIds: string[]) => Promise<void>;
    clearChat: (chatId: string) => Promise<void>;
    clearLocalMessages: (chatId: string) => void;
    deleteChat: (chatId: string) => Promise<void>;
    deleteChats: (chatIds: string[]) => Promise<void>;
    toggleMessagePin: (chatId: string, messageId: string, isPinned: boolean) => void;
    callsOffset: number;
    hasMoreCalls: boolean;
    calls: any[];
    deleteCall: (callId: number) => Promise<void>;
    clearCallHistory: () => Promise<void>;
    bulkDeleteCalls: (callIds: number[]) => Promise<void>;
    updateMessageRead: (messageId: string, chatId?: string) => void;
    updateMessageDelivered: (messageId: string, chatId?: string) => void;
}

let reconnectTimeout: any = null;
let reconnectAttempts = 0;

export const createChatSlice: StateCreator<AppState, [], [], ChatSlice> = (set, get) => ({
    chats: [],
    activeChatId: null,
    socket: null,
    typingUsers: {},
    mutedChats: [],
    setActiveChat: (chatId) => set({ activeChatId: chatId }),
    setTyping: (chatId, username) => set((state) => ({
        typingUsers: { ...state.typingUsers, [chatId]: username }
    })),
    sendTyping: (chatId) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'typing', conversation_id: chatId }));
        }
    },
    connectWebSocket: () => {
        const { token, socket, connectWebSocket } = get() as any;
        if (socket || !token) return;

        const wsUrl = process.env.EXPO_PUBLIC_WS_URL;
        if (!wsUrl) return;

        console.log('[WS] Connecting...');
        const ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => {
            console.log('[WS] Connected');
            reconnectAttempts = 0;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            (get() as any).syncMessages();
        };

        ws.onmessage = async (e) => {
            const state = get() as any;
            const signalingTypes = ['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate', 'call_ended'];
            const data = JSON.parse(e.data);
            
            if (signalingTypes.includes(data.type)) {
                return state.handleSignalingMessage(data);
            }

            await handleWebSocketMessage(e as any, {
                setTyping: state.setTyping,
                updateMessageRead: state.updateMessageRead,
                updateMessageDelivered: state.updateMessageDelivered,
                markDelivered: state.markDelivered,
                addMessage: state.addMessage,
                getActiveChatId: () => state.activeChatId,
                getChats: () => state.chats,
                setChats: (chats) => set({ chats } as any),
                getCurrentUser: () => state.user,
                toggleMessagePin: state.toggleMessagePin,
                clearLocalMessages: state.clearLocalMessages,
            });
        };

        ws.onclose = () => {
            console.log('[WS] Disconnected');
            set({ socket: null } as any);

            // EXPONENTIAL BACKOFF RECONNECT
            const delay = Math.min(30000, Math.pow(2, reconnectAttempts) * 1000);
            reconnectAttempts++;
            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
                const state = get() as any;
                if (state.token && !state.socket) {
                    connectWebSocket();
                }
            }, delay);
        };

        set({ socket: ws } as any);
    },

    addMessage: (payload) => {
        const chatId = (payload.conversation_id || payload.conversation)?.toString();
        if (!chatId) return;

        set((state: any) => {
            const chats = [...state.chats];
            let chatIndex = chats.findIndex(c => c.id.toString() === chatId);
            
            // 1. Standardize message data
            const msgId = payload.id ? payload.id.toString() : `temp_${Date.now()}`;
            const message = { 
                ...payload,
                id: msgId,
                timestamp: payload.timestamp instanceof Date ? payload.timestamp : new Date(payload.timestamp),
                sender: (payload.sender === 'me' || payload.sender_id === state.user?.id || (typeof payload.sender === 'object' && payload.sender.username === state.user?.username)) ? 'me' : 'them',
                isRead: !!(payload.is_read || payload.isRead),
                isDelivered: !!(payload.is_delivered || payload.isDelivered),
                reactions: payload.reactions || [],
                reply_to: payload.reply_to || payload.reply_to_json || null
            };

            // 2. Create placeholder if chat doesn't exist
            if (chatIndex === -1) {
                console.log(`[ChatSlice] 🆕 Creating new chat entry for ID: ${chatId}`);
                const newChat: Chat = {
                    id: chatId,
                    name: payload.sender_name || 'New Chat',
                    avatar: null,
                    lastMessage: message.text || (message.file ? 'Attachment' : ''),
                    lastMessageTime: message.timestamp,
                    unreadCount: state.activeChatId === chatId ? 0 : 1,
                    messages: [message],
                };
                chats.push(newChat);
                // Sort chats after adding new one
                chats.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
                return { chats: [...chats] };
            }

            const chat = { ...chats[chatIndex] };
            
            // 3. Check for temp ID and deduplicate
            const tempIdMatch = chat.messages.findIndex((m: any) => 
                (payload.tempId && m.id === payload.tempId) ||
                (m.id?.toString().startsWith('temp_') && 
                 (m.text === message.text || (message.file && m.file)))
            );
            
            let newMessages = [...chat.messages];

            if (tempIdMatch !== -1) {
                // Replace optimistic message with the real one from server
                console.log(`[ChatSlice] ✨ Replacing temp message ${newMessages[tempIdMatch].id} with real ID: ${msgId}`);
                newMessages[tempIdMatch] = { 
                    ...message, 
                    isUploading: false,
                    error: false
                };
            } else if (!newMessages.some(m => m.id.toString() === msgId)) {
                // Add new message to the list
                newMessages.push(message);
            } else {
                // Update existing message
                const existingIdx = newMessages.findIndex(m => m.id.toString() === msgId);
                newMessages[existingIdx] = { ...newMessages[existingIdx], ...message };
            }

            // Standardize Sorting: Newest messages at index 0 for inverted list
            newMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // 4. Update chat preview
            chat.messages = [...newMessages];
            
            let lastText = message.text || '';
            if (!lastText && message.file_type) {
                if (message.file_type.startsWith('image/')) lastText = '📸 Photo';
                else if (message.file_type.startsWith('video/')) lastText = '🎥 Video';
                else if (message.file_type.startsWith('audio/')) lastText = '🎵 Audio';
                else lastText = '📁 Document';
            } else if (!lastText && message.file) {
                lastText = '📎 Attachment';
            }
            
            chat.lastMessage = lastText;
            chat.lastMessageTime = message.timestamp;
            
            if (state.activeChatId !== chatId && !msgId.startsWith('temp_')) {
                chat.unreadCount = (chat.unreadCount || 0) + 1;
            }

            chats[chatIndex] = chat;
            
            // 5. Final Sort of chats list
            chats.sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

            return { chats: [...chats] };
        });
    },

    sendMessage: async (chatId, text, replyToId) => {
        const { socket, user, addMessage } = get() as any;
        const tempId = `temp_${Date.now()}`;
        const newMessage = {
            id: tempId,
            text,
            sender: 'me',
            timestamp: new Date(),
            conversation_id: chatId,
            reply_to_id: replyToId
        };

        // Optimistic update
        addMessage(newMessage);

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                message: text,
                conversation_id: chatId,
                reply_to_id: replyToId
            }));
        } else {
            // Save as unsent for later sync
            await database.saveMessage(newMessage as any, chatId, true);
        }
    },

    sendFileMessage: async (chatId, file, text, replyToId, duration) => {
        const { token, addMessage } = get() as any;
        if (!token) return;

        const tempId = `temp_file_${Date.now()}`;
        
        // 1. Optimistic Update: Show the file immediately using its local URI
        const optimisticMessage = {
            id: tempId,
            text: text || '',
            sender: 'me' as const,
            timestamp: new Date(),
            conversation_id: chatId,
            file: file.uri, // Use local path
            file_type: file.mimeType || 'image/jpeg',
            file_name: file.name || 'file',
            isUploading: true,
            error: false,
            duration: duration
        };

        addMessage(optimisticMessage);
        
        // Also save optimistic to DB as "unsent"
        await database.saveMessage(optimisticMessage as any, chatId, true);

        try {
            // 2. Perform actual upload in background
            const result = await api.chat.uploadFile(token, chatId, null, file, text, replyToId, duration);
            
            // 3. Update store (result will be used to replace tempId)
            const finalMessage = { 
                ...result, 
                id: result.id.toString(),
                timestamp: new Date(result.timestamp),
                conversation_id: chatId,
                tempId: tempId, 
                file: file.uri,
                isUploading: false,
                error: false
            };
            
            addMessage(finalMessage);
            
            // Save to local DB as final
            await database.saveMessage(finalMessage as any, chatId);
        } catch (e) {
            console.error('File upload failed', e);
            // Update message in store to show error
            set((state: any) => ({
                chats: state.chats.map((c: any) => 
                    c.id.toString() === chatId.toString() ? {
                        ...c,
                        messages: c.messages.map((m: any) => m.id === tempId ? { ...m, isUploading: false, error: true } : m)
                    } : c
                )
            }));
            throw e;
        }
    },

    syncMessages: async () => {
        const { socket } = get();
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const unsent = await database.getUnsentMessages();
        for (const msg of unsent) {
            socket.send(JSON.stringify({
                message: msg.text,
                conversation_id: msg.conversation_id,
                reply_to_id: msg.reply_to?.id
            }));
            await database.deleteUnsentMessage(msg.id);
        }
    },

    fetchChats: async () => {
        const { token, user } = get() as any;
        // 1. Initial load from DB
        const local = await database.getConversations();
        if (local.length > 0) set({ chats: local } as any);

        if (!token) return;
        try {
            const remote = await api.chat.getConversations(token);
            const mapped = remote.map((c: any) => {
                const p = c.participants.find((u: any) => u.username !== user?.username);
                return {
                    id: c.id.toString(),
                    name: p?.username || 'Unknown',
                    avatar: p?.profile_picture || null,
                    lastMessage: c.last_message?.text || '',
                    lastMessageTime: c.last_message ? new Date(c.last_message.timestamp) : new Date(),
                    unreadCount: c.unread_count || 0,
                    messages: [],
                    user_id: p?.id
                };
            });
            set({ chats: mapped } as any);
            for (const chat of mapped) await database.saveConversation(chat);
        } catch (e) {
            console.error('Fetch chats failed', e);
        }
    },
    
    restoreChats: async (conversationIds, restoreDate) => {
        const { token, fetchChats } = get() as any;
        if (!token) return;
        try {
            await api.chat.restoreChats(token, conversationIds, restoreDate);
            await fetchChats();
        } catch (error) {
            console.error('Error restoring chats:', error);
            throw error;
        }
    },

    fetchMessages: async (chatId) => {
        const { token, user } = get() as any;
        const local = await database.getMessages(chatId);
        set((state: any) => ({
            chats: state.chats.map((c: any) => c.id === chatId ? { ...c, messages: local } : c)
        }));

        if (!token) return;
        try {
            const remote = await api.chat.getMessages(token, chatId, 20, 0);
            const mapped = await Promise.all(remote.map(async (m: any) => {
                const msgId = m.id.toString();
                
                // Construct standard message object
                const msg: any = {
                    id: msgId,
                    text: m.text,
                    sender: (m.sender?.username === user?.username || m.sender === user?.username) ? 'me' : 'them',
                    timestamp: new Date(m.timestamp),
                    isRead: !!m.is_read,
                    isDelivered: !!m.is_delivered,
                    file: m.file,
                    file_type: m.file_type,
                    file_name: m.file_name,
                    reactions: m.reactions || [],
                    reply_to: m.reply_to || null
                };

                // SMART CHECK: If message has a file, check if it already exists locally
                if (msg.file) {
                    const urlWithoutQuery = msg.file.split('?')[0];
                    const extensionMatch = urlWithoutQuery.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
                    const ext = extensionMatch ? extensionMatch[1] : 'jpg';
                    
                    const localUri = await getLocalMediaUri(msgId, ext);
                    
                    if (localUri) {
                        // File exists! Use local URI immediately 
                        console.log(`[ChatSlice] 📦 Using cached file for ${msgId}: ${localUri}`);
                        msg.file = localUri;
                    } else if (!msg.file.startsWith('file://')) {
                        // File doesn't exist locally, enqueue download
                        const url = getMediaUrl(msg.file);
                        if (url) {
                            downloadManager.enqueue(url, msgId, (downloadedUri) => {
                                set((state: any) => ({
                                    chats: state.chats.map((c: any) => 
                                        c.id.toString() === chatId.toString() ? {
                                            ...c,
                                            messages: c.messages.map((rem: any) => rem.id.toString() === msgId ? { ...rem, file: downloadedUri } : rem)
                                        } : c
                                    )
                                }));
                            }, () => {});
                        }
                    }
                }
                return msg;
            }));
            set((state: any) => ({
                chats: state.chats.map((c: any) => c.id === chatId ? { ...c, messages: mapped } : c)
            }));
        } catch (e) {
            console.error('Fetch messages failed', e);
        }
    },

    markRead: (chatId, messageId) => {
        const { socket, user } = get() as any;
        if (user?.privacy_read_receipts === false) return;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'mark_read', message_id: messageId, conversation_id: chatId }));
        }
    },

    markDelivered: (chatId, messageId) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'mark_delivered', message_id: messageId, conversation_id: chatId }));
        }
    },

    editMessage: (chatId, messageId, newText) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'edit_message', message_id: messageId, conversation_id: chatId, new_text: newText }));
        }
    },

    deleteMessage: (chatId, messageId) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'delete_message', message_id: messageId, conversation_id: chatId }));
        }
    },

    reactToMessage: (chatId, messageId, reaction) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'react_message', message_id: messageId, reaction }));
        }
    },

    muteChat: (chatId) => set(s => {
        const muted = [...s.mutedChats, chatId];
        AsyncStorage.setItem('mutedChats', JSON.stringify(muted));
        return { mutedChats: muted };
    }),

    unmuteChat: (chatId) => set(s => {
        const muted = s.mutedChats.filter(id => id !== chatId);
        AsyncStorage.setItem('mutedChats', JSON.stringify(muted));
        return { mutedChats: muted };
    }),

    isChatMuted: (chatId) => get().mutedChats.includes(chatId),

    calls: [],
    callsOffset: 0,
    hasMoreCalls: true,
    fetchCalls: async (loadMore = false) => {
        const { token, callsOffset, hasMoreCalls } = get() as any;
        if (!token || (loadMore && !hasMoreCalls)) return;
        const currentOffset = loadMore ? callsOffset : 0;
        try {
            const newCalls = await api.chat.getCalls(token, 20, currentOffset);
            set((state: any) => ({
                calls: loadMore ? [...state.calls, ...newCalls] : newCalls,
                callsOffset: currentOffset + newCalls.length,
                hasMoreCalls: newCalls.length >= 20
            }));
        } catch (e) { console.error(e); }
    },

    loadMoreMessages: async (chatId) => {
        // Implementation for pagination
    },

    forwardMessage: async (message, chatIds) => {
        const { sendMessage, sendFileMessage } = get() as any;
        for (const id of chatIds) {
            if (message.file) {
                const file = {
                    uri: message.file,
                    name: message.file_name || 'Forwarded File',
                    mimeType: message.file_type || 'application/octet-stream',
                    size: 0
                };
                await sendFileMessage(id, file, message.text || '');
            } else {
                await sendMessage(id, message.text);
            }
        }
    },

    clearChat: async (chatId) => {
        const { token } = get() as any;
        if (!token) return;
        await api.chat.clearMessages(token, chatId);
        get().clearLocalMessages(chatId);
        await database.clearChatMessages(chatId);
    },

    clearLocalMessages: (chatId) => {
        set((state: any) => ({
            chats: state.chats.map((c: any) => c.id === chatId ? { ...c, messages: [], lastMessage: '' } : c)
        }));
    },

    updateMessageRead: (messageId, chatId) => {
        set((state: any) => ({
            chats: state.chats.map((c: any) => {
                if (chatId ? c.id === chatId : true) {
                    return {
                        ...c,
                        messages: c.messages.map((m: any) => m.id === messageId ? { ...m, isRead: true } : m)
                    };
                }
                return c;
            })
        }));
    },

    updateMessageDelivered: (messageId, chatId) => {
        set((state: any) => ({
            chats: state.chats.map((c: any) => {
                if (chatId ? c.id === chatId : true) {
                    return {
                        ...c,
                        messages: c.messages.map((m: any) => m.id === messageId ? { ...m, isDelivered: true } : m)
                    };
                }
                return c;
            })
        }));
    },

    deleteChat: async (chatId) => {
        const { token } = get() as any;
        if (!token) return;
        try {
            await api.chat.deleteConversation(token, chatId);
            set((state: any) => ({
                chats: state.chats.filter((c: any) => c.id !== chatId)
            }));
            await database.deleteConversation(chatId);
        } catch (e) {
            console.error('Delete chat failed', e);
            throw e;
        }
    },

    deleteChats: async (chatIds) => {
        const { deleteChat } = get();
        for (const id of chatIds) {
            await deleteChat(id);
        }
    },

    pinMessage: (chatId, messageId) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'pin_message', message_id: messageId, conversation_id: chatId }));
        }
    },

    unpinMessage: (chatId, messageId) => {
        const { socket } = get() as any;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'unpin_message', message_id: messageId, conversation_id: chatId }));
        }
    },

    toggleMessagePin: (chatId, messageId, isPinned) => {
        set((state: any) => ({
            chats: state.chats.map((c: any) => {
                if (c.id === chatId) {
                    return {
                        ...c,
                        messages: c.messages.map((m: any) => 
                            m.id === messageId ? { ...m, is_pinned: isPinned } : m
                        )
                    };
                }
                return c;
            })
        }));
    },

    deleteCall: async (callId) => {
        const { token } = get() as any;
        if (!token) return;
        try {
            await api.chat.deleteCall(token, callId);
            set((state: any) => ({
                calls: state.calls.filter((c: any) => c.id !== callId)
            }));
        } catch (e) { console.error(e); }
    },

    clearCallHistory: async () => {
        const { token } = get() as any;
        if (!token) return;
        try {
            await api.chat.clearCallHistory(token);
            set({ calls: [] });
        } catch (e) { console.error(e); }
    },

    bulkDeleteCalls: async (callIds) => {
        const { token } = get() as any;
        if (!token) return;
        try {
            await api.chat.bulkDeleteCalls(token, callIds);
            set((state: any) => ({
                calls: state.calls.filter((c: any) => !callIds.includes(c.id))
            }));
        } catch (e) { console.error(e); }
    },
});

