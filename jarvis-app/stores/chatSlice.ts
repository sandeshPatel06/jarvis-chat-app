import { StateCreator } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
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
    fetchMessages: (chatId: string) => Promise<void>;
    markRead: (chatId: string, messageId: string) => void;
    markDelivered: (chatId: string, messageId: string) => void;
    editMessage: (chatId: string, messageId: string, newText: string) => void;
    deleteMessage: (chatId: string, messageId: string) => void;
    reactToMessage: (chatId: string, messageId: string, reaction: string) => void;
    muteChat: (chatId: string) => void;
    unmuteChat: (chatId: string) => void;
    isChatMuted: (chatId: string) => boolean;
    fetchCalls: (loadMore?: boolean) => Promise<void>;
    loadMoreMessages: (chatId: string) => Promise<void>;
    forwardMessage: (message: Message, chatIds: string[]) => Promise<void>;
    clearChat: (chatId: string) => Promise<void>;
    callsOffset: number;
    hasMoreCalls: boolean;
    calls: any[];
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

    addMessage: (message) => {
        const chatId = (message.conversation_id || message.conversation)?.toString();
        if (!chatId) return;

        set((state: any) => {
            const chats = [...state.chats];
            const chatIndex = chats.findIndex(c => c.id === chatId);
            
            if (chatIndex === -1) {
                // Should fetch chats if not found
                return state;
            }

            const chat = { ...chats[chatIndex] };
            const msgId = message.id.toString();
            
            // Check for temp ID and deduplicate
            const tempIdMatch = chat.messages.findIndex((m: any) => m.id.startsWith('temp_') && m.text === message.text);
            let newMessages = [...chat.messages];

            if (tempIdMatch !== -1) {
                newMessages[tempIdMatch] = { ...message, id: msgId };
            } else if (!newMessages.some(m => m.id === msgId)) {
                newMessages = [{ ...message, id: msgId }, ...newMessages];
            } else {
                return state; // Duplicate, no change
            }

            chat.messages = newMessages;
            chat.lastMessage = message.text || (message.file ? 'Attachment' : '');
            chat.lastMessageTime = new Date(message.timestamp);
            chat.unreadCount = state.activeChatId === chatId ? chat.unreadCount : (chat.unreadCount || 0) + 1;

            chats[chatIndex] = chat;
            return { chats };
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
        // Implementation remains similar but moved to slice
        const { token, addMessage } = get() as any;
        if (!token) return;
        
        try {
            const result = await api.chat.uploadFile(token, chatId, null, file, text, replyToId, duration);
            addMessage({ ...result, conversation_id: chatId });
        } catch (e) {
            console.error('File upload failed', e);
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
                const msg = {
                    id: m.id.toString(),
                    text: m.text,
                    sender: m.sender.username === user?.username ? 'me' : 'them',
                    timestamp: new Date(m.timestamp),
                    isRead: m.is_read,
                    file: m.file
                };

                if (msg.file) {
                    const url = getMediaUrl(msg.file);
                    if (url) {
                        downloadManager.enqueue(url, msg.id, (localUri) => {
                            set((state: any) => ({
                                chats: state.chats.map((c: any) => 
                                    c.id === chatId ? {
                                        ...c,
                                        messages: c.messages.map((rem: any) => rem.id === msg.id ? { ...rem, file: localUri } : rem)
                                    } : c
                                )
                            }));
                        }, () => {});
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
        const { sendMessage } = get() as any;
        for (const id of chatIds) {
            await sendMessage(id, message.text); // Basic forwarding
        }
    },

    clearChat: async (chatId) => {
        const { token } = get() as any;
        if (!token) return;
        await api.chat.clearMessages(token, chatId);
        set((state: any) => ({
            chats: state.chats.map((c: any) => c.id === chatId ? { ...c, messages: [], lastMessage: '' } : c)
        }));
        await database.clearChatMessages(chatId);
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
});

