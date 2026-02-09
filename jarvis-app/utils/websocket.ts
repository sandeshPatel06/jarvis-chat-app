import { Message } from '@/types';
import * as database from '@/services/database';
import * as Notifications from 'expo-notifications';

// We define a simplified version of the store getters/setters we need
interface StoreActions {
    setTyping: (chatId: string, username: string | null) => void;
    updateMessageRead: (messageId: string, chatId?: string) => void;
    updateMessageDelivered: (messageId: string, chatId?: string) => void;
    markDelivered: (chatId: string, messageId: string) => void;
    addMessage: (message: Message) => void;
    getActiveChatId: () => string | null;
    getChats: () => any[]; // Typed loosely to avoid circular dep
    setChats: (chats: any[]) => void;
    getCurrentUser: () => any;
}

export const handleWebSocketMessage = async (event: WebSocketMessageEvent, actions: StoreActions) => {
    console.log('[WS] Message received:', event.data);
    try {
        const data = JSON.parse(event.data);
        if (data.type === 'user_typing') {
            const { conversation_id, sender_username } = data;
            actions.setTyping(conversation_id, sender_username);

            setTimeout(() => {
                actions.setTyping(conversation_id, null);
            }, 3000);
        } else if (data.type === 'message_read') {
            const { message_id, conversation_id } = data;
            actions.updateMessageRead(message_id, conversation_id);
        } else if (data.type === 'message_delivered') {
            const { message_id, conversation_id } = data;
            actions.updateMessageDelivered(message_id, conversation_id);
        } else if (data.type === 'message_edited') {
            const { message_id, conversation_id, new_text } = data;
            const chats = actions.getChats();
            const updatedChats = chats.map((chat) => {
                if (chat.id === conversation_id) {
                    const newMessages = chat.messages.map((msg: Message) =>
                        msg.id === message_id ? { ...msg, text: new_text } : msg
                    );
                    const lastMsg = newMessages[newMessages.length - 1];
                    return { ...chat, messages: newMessages, lastMessage: lastMsg ? lastMsg.text : '' };
                }
                return chat;
            });
            actions.setChats(updatedChats);
        } else if (data.type === 'message_deleted') {
            const { message_id, conversation_id } = data;
            const chats = actions.getChats();
            const updatedChats = chats.map((chat) => {
                if (chat.id === conversation_id) {
                    const newMessages = chat.messages.filter((msg: Message) => msg.id !== message_id);
                    const lastMsg = newMessages.length > 0 ? newMessages[newMessages.length - 1].text : '';
                    return { ...chat, messages: newMessages, lastMessage: lastMsg };
                }
                return chat;
            });
            actions.setChats(updatedChats);
        } else if (data.type === 'message_reaction') {
            const { message_id, conversation_id, reactions } = data;
            const chats = actions.getChats();
            const updatedChats = chats.map((chat) => {
                if (chat.id === conversation_id) {
                    const newMessages = chat.messages.map((msg: Message) =>
                        msg.id === message_id ? { ...msg, reactions: reactions } : msg
                    );
                    return { ...chat, messages: newMessages };
                }
                return chat;
            });
            actions.setChats(updatedChats);

            // Reaction Notification
            if (actions.getActiveChatId() !== conversation_id) {
                try {
                    const chat = chats.find(c => c.id === conversation_id);
                    const senderName = chat?.name || 'Someone';

                    Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'New Reaction',
                            body: `${senderName} reacted ${reactions[0]} to a message`,
                            data: { chatId: conversation_id },
                        },
                        trigger: null,
                    });
                } catch (error) {
                }
            }
        } else if (data.message) {
            const msg = data.message;
            msg.timestamp = new Date(msg.timestamp);
            msg.isRead = msg.is_read || false;
            msg.isDelivered = msg.is_delivered || false;

            const currentUser = actions.getCurrentUser();
            const senderUsername = typeof msg.sender === 'object' ? msg.sender.username : msg.sender;
            msg.sender = senderUsername === currentUser?.username ? 'me' : 'them';

            actions.addMessage(msg);

            if (msg.sender === 'them') {
                actions.markDelivered(msg.conversation_id, msg.id);

                // Check if user is in this chat
                if (actions.getActiveChatId() !== msg.conversation_id) {
                    // Increment unread count
                    const chats = actions.getChats();
                    const updatedChats = chats.map((c) =>
                        c.id === msg.conversation_id
                            ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                            : c
                    );
                    actions.setChats(updatedChats);

                    try {
                        let body = msg.text;
                        if (msg.reply_to) {
                            body = `Replying to you: ${msg.text}`;
                        }

                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: 'New Message',
                                body: body,
                                data: { chatId: msg.conversation_id },
                            },
                            trigger: null,
                        });
                    } catch (error) {
                    }
                }
            }

            // Save to DB
            database.saveMessage(msg, msg.conversation_id);
        }
    } catch (err) {
        console.error('[WS] Parse error:', err);
    }
};
