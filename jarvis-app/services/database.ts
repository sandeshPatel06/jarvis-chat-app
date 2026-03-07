import { getDb, initDatabase as initDb } from './db';
import { Chat, Message } from '@/types';

// Re-export initDatabase
export const initDatabase = initDb;

export const saveConversation = async (chat: Chat) => {
    const db = await getDb();
    try {
        await db.runAsync(
            `INSERT OR REPLACE INTO conversations (id, name, avatar, last_message, last_message_time, unread_count, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [chat.id, chat.name, chat.avatar || '', chat.lastMessage, chat.lastMessageTime.toISOString(), chat.unreadCount, chat.user_id || null]
        );
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
};

export const saveMessage = async (message: Message, conversationId: string, isUnsent: boolean = false) => {
    const db = await getDb();
    try {
        const fileValue = typeof message.file === 'string' ? message.file : (message.file ? String(message.file) : '');

        await db.runAsync(
            `INSERT OR REPLACE INTO messages (id, conversation_id, text, sender, timestamp, is_read, is_delivered, reactions, reply_to_json, is_unsent, file, file_type, file_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                message.id,
                conversationId,
                message.text,
                message.sender,
                message.timestamp.toISOString(),
                message.isRead ? 1 : 0,
                message.isDelivered ? 1 : 0,
                JSON.stringify(message.reactions || []),
                JSON.stringify(message.reply_to || null),
                isUnsent ? 1 : 0,
                fileValue,
                message.file_type || '',
                message.file_name || '',
            ]
        );
    } catch (error) {
        console.error('Error saving message:', error);
    }
};

export const getConversations = async (): Promise<Chat[]> => {
    const db = await getDb();
    try {
        const rows = await db.getAllAsync('SELECT * FROM conversations ORDER BY last_message_time DESC');
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            avatar: row.avatar || null,
            lastMessage: row.last_message,
            lastMessageTime: new Date(row.last_message_time),
            unreadCount: row.unread_count,
            user_id: row.user_id,
            messages: []
        }));
    } catch (error) {
        console.error('Error getting conversations:', error);
        return [];
    }
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
    const db = await getDb();
    try {
        const rows = await db.getAllAsync(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC',
            [conversationId]
        );
        return rows.map((row: any) => ({
            id: row.id,
            text: row.text,
            sender: row.sender as 'me' | 'them',
            timestamp: new Date(row.timestamp),
            isRead: !!row.is_read,
            isDelivered: !!row.is_delivered,
            reactions: JSON.parse(row.reactions || '[]'),
            reply_to: JSON.parse(row.reply_to_json || 'null'),
            isUnsent: !!row.is_unsent,
            file: row.file || null,
            file_type: row.file_type || null,
            file_name: row.file_name || null
        }));
    } catch (error) {
        console.error('Error getting messages:', error);
        return [];
    }
};

export const getUnsentMessages = async () => {
    const db = await getDb();
    try {
        const rows = await db.getAllAsync('SELECT * FROM messages WHERE is_unsent = 1 ORDER BY timestamp ASC');
        return rows.map((row: any) => ({
            ...row,
            timestamp: new Date(row.timestamp),
            reactions: JSON.parse(row.reactions || '[]'),
            reply_to: JSON.parse(row.reply_to_json || 'null')
        }));
    } catch (error) {
        console.error('Error getting unsent messages:', error);
        return [];
    }
};

export const deleteUnsentMessage = async (id: string) => {
    const db = await getDb();
    try {
        await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
    } catch (error) {
        console.error('Error deleting unsent message', error);
    }
};

export const markMessageSent = async (id: string, newId: string, timestamp: Date) => {
    const db = await getDb();
    try {
        await db.runAsync(
            'UPDATE messages SET id = ?, is_unsent = 0, timestamp = ? WHERE id = ?',
            [newId, timestamp.toISOString(), id]
        );
    } catch (error) {
        console.error('Error marking message sent', error);
    }
};

export const clearChatMessages = async (conversationId: string) => {
    const db = await getDb();
    try {
        await db.runAsync('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    } catch (error) {
        console.error('Error clearing chat messages:', error);
    }
};

