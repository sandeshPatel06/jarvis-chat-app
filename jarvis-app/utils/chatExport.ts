import * as MailComposer from 'expo-mail-composer';
import { Message } from '@/types';
import { Alert } from 'react-native';

/**
 * Export chat messages as email
 * @param messages Array of messages to export
 * @param chatName Name of the chat/contact
 */
export const exportChatAsEmail = async (messages: Message[], chatName: string) => {
    try {
        // Check if email is available
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert(
                'Email Not Available',
                'Email is not configured on this device',
                [{ text: 'OK' }]
            );
            return;
        }

        // Format messages as email body
        const body = messages
            .map((m) => {
                const timestamp = new Date(m.timestamp).toLocaleString();
                const sender = m.sender === 'me' ? 'You' : chatName;
                let content = `[${timestamp}] ${sender}: ${m.text || ''}`;

                // Add file info if present
                if (m.file_name) {
                    content += `\n  📎 ${m.file_name}`;
                }

                return content;
            })
            .join('\n\n');

        // Compose email
        await MailComposer.composeAsync({
            subject: `Chat with ${chatName}`,
            body: body,
            isHtml: false,
        });
    } catch (error) {
        console.error('Email export error:', error);
        Alert.alert('Error', 'Failed to export chat');
    }
};

/**
 * Export a single message as email
 * @param message Message to export
 * @param chatName Name of the chat/contact
 */
export const exportMessageAsEmail = async (message: Message, chatName: string) => {
    try {
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert('Email Not Available', 'Email is not configured on this device');
            return;
        }

        const timestamp = new Date(message.timestamp).toLocaleString();
        const sender = message.sender === 'me' ? 'You' : chatName;
        const body = `[${timestamp}] ${sender}: ${message.text || ''}`;

        await MailComposer.composeAsync({
            subject: `Message from ${chatName}`,
            body: body,
            isHtml: false,
        });
    } catch (error) {
        console.error('Email export error:', error);
        Alert.alert('Error', 'Failed to export message');
    }
};
