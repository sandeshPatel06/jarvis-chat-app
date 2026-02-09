import { getApp, getApps } from '@react-native-firebase/app';
import {
    getMessaging,
    setBackgroundMessageHandler,
    onNotificationOpenedApp,
    onMessage,
    getInitialNotification,
    onTokenRefresh,
    requestPermission,
    AuthorizationStatus,
    getToken
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, AndroidStyle, EventType } from '@notifee/react-native';

import { handleIncomingCallFCM } from '@/helper/backgroundCallHelper';
// import { registerForPushNotificationsAsync } from '../utils/notifications'; // Deprecated in favor of FCM
import { getMediaUrl } from '@/utils/media';
import { api } from './api';
import { useStore } from '@/store';

// ============================================================================
// CENTRALIZED NOTIFICATION HANDLER
// ============================================================================
async function handleRemoteMessage(remoteMessage: any, context: 'foreground' | 'background') {
    console.log(`[Firebase ${context}] 📩 Message received in ${context} state`);
    console.log(`[Firebase ${context}] Message structure:`, JSON.stringify(remoteMessage, null, 2));

    try {
        const { data, notification: firebaseNotification } = remoteMessage;

        // 1. Handle Incoming Call
        // Check for 'incoming_call' in both possible field locations
        if (data?.type === 'incoming_call') {
            console.log(`[Firebase ${context}] 📞 Incoming call detected`);

            const fcmData = {
                type: data.type,
                // Align backend 'call_uuid' or 'uuid' with frontend 'callUUID'
                callUUID: data.call_uuid || data.uuid || data.callUUID || Date.now().toString(),
                callerId: data.handle || data.callerId || data.sender_id || 'Unknown',
                callerName: data.caller_name || data.sender_name || firebaseNotification?.title || 'Unknown Caller',
            };

            await handleIncomingCallFCM(fcmData);
            console.log(`[Firebase ${context}] ✅ Call handled successfully`);
        }
        // 2. Handle New Message
        else if (data?.type === 'message' || data?.conversation_id || firebaseNotification) {
            console.log(`[Firebase ${context}] 💬 New message detected`);

            // If we are in foreground, we might want to skip showing the notification 
            // if the user is already in that chat. 
            const state = useStore.getState();
            if (context === 'foreground' && state.activeChatId === data?.conversation_id) {
                console.log(`[Firebase ${context}] Skip showing notification: user currently in this chat`);
                return;
            }

            const channelId = await notifee.createChannel({
                id: 'messages',
                name: 'Messages',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
            });

            // Standardize field extraction with multiple fallbacks
            const senderName = data?.sender_name || firebaseNotification?.title || 'New Message';
            const messageText = data?.text || data?.body || firebaseNotification?.body || 'You have a new message';
            const avatarUrl = data?.sender_avatar ? getMediaUrl(data.sender_avatar) : null;

            await notifee.displayNotification({
                id: data?.message_id || Date.now().toString(),
                title: senderName,
                body: messageText,
                data: {
                    type: 'message',
                    conversation_id: data?.conversation_id,
                    message_id: data?.message_id,
                },
                android: {
                    channelId,
                    importance: AndroidImportance.HIGH,
                    largeIcon: avatarUrl || undefined,
                    style: {
                        type: AndroidStyle.MESSAGING,
                        person: {
                            name: senderName,
                            icon: avatarUrl || undefined,
                        },
                        messages: [
                            {
                                text: messageText,
                                timestamp: Date.now(),
                                person: {
                                    name: senderName,
                                    icon: avatarUrl || undefined,
                                },
                            },
                        ],
                    },
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    actions: [
                        {
                            title: 'Reply',
                            pressAction: {
                                id: 'reply',
                            },
                            input: {
                                placeholder: 'Type a message...',
                            },
                        },
                        {
                            title: 'Mark as Read',
                            pressAction: {
                                id: 'mark_as_read',
                            },
                        },
                    ],
                },
            });
            console.log(`[Firebase ${context}] ✅ Message notification displayed`);
        } else {
            console.log(`[Firebase ${context}] ⚠️ Unknown notification type or missing data`);
        }
    } catch (error) {
        console.error(`[Firebase ${context}] ❌ Error handling ${context} message:`, error);
    }
}

/**
 * Firebase Cloud Messaging Setup
 */

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
    // initializeApp(); // Usually handled by auto-init, but kept for reference
}

const app = getApp();
const messaging = getMessaging(app);

// ============================================================================
// BACKGROUND MESSAGE HANDLER (HEADLESS TASK)
// ============================================================================
setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    await handleRemoteMessage(remoteMessage, 'background');
});

console.log('[Firebase] ✅ Background message handler registered (headless task)');


// ============================================================================
// FOREGROUND MESSAGE HANDLER
// ============================================================================
onMessage(messaging, async (remoteMessage) => {
    await handleRemoteMessage(remoteMessage, 'foreground');
});

console.log('[Firebase] ✅ Foreground message handler registered');

// ============================================================================
// NOTIFICATION OPENED HANDLER
// ============================================================================
onNotificationOpenedApp(messaging, (remoteMessage) => {
    const data = remoteMessage.data;
    console.log('[Firebase] 📱 Notification opened app from background:', remoteMessage);

    if (data?.type === 'incoming_call') {
        console.log('[Firebase] User tapped incoming call notification');
    } else if (data?.type === 'message' || data?.conversation_id) {
        // Router navigation should be handled by the specialized listener or root layout
        console.log('[Firebase] User tapped message notification');
    }
});

getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) {
        console.log('[Firebase] 📱 App opened from killed state by notification:', remoteMessage);
    }
});

// ============================================================================
// NOTIFEE BACKGROUND EVENTS (Reply/Mark Read)
// ============================================================================
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction, input } = detail;

    if (type === EventType.ACTION_PRESS) {
        if (pressAction?.id === 'reply' && input) {
            const conversationId = notification?.data?.conversation_id as string;
            const replyText = input as string;

            if (conversationId && replyText) {
                console.log(`[Notifee] Replying to ${conversationId}: ${replyText}`);
                try {
                    const state = useStore.getState();
                    const token = state.token;

                    if (token) {
                        await api.chat.uploadFile(token, conversationId, null, null, replyText);
                        console.log('[Notifee] Reply sent successfully');
                    }
                } catch (error) {
                    console.error('[Notifee] Failed to send background reply:', error);
                }
            }
        } else if (pressAction?.id === 'mark_as_read') {
            const conversationId = notification?.data?.conversation_id as string;
            const messageId = notification?.data?.message_id as string;

            if (conversationId && messageId) {
                console.log(`[Notifee] Marking as read: ${messageId} in ${conversationId}`);
                // Implementation for mark as read
            }
        }

        if (notification?.id) {
            await notifee.cancelNotification(notification.id);
        }
    }
});


// ============================================================================
// PERMISSIONS & TOKEN
// ============================================================================
export async function requestFirebasePermission(): Promise<boolean> {
    try {
        const authStatus = await requestPermission(messaging);
        const enabled =
            authStatus === AuthorizationStatus.AUTHORIZED ||
            authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('[Firebase] ✅ Notification permission granted:', authStatus);
        } else {
            console.log('[Firebase] ❌ Notification permission denied');
        }

        return enabled;
    } catch (error) {
        console.error('[Firebase] ❌ Error requesting permission:', error);
        return false;
    }
}

export async function getFCMToken(): Promise<string | null> {
    try {
        const token = await getToken(messaging);
        console.log('[Firebase] 🔑 FCM Token:', token);
        return token;
    } catch (error) {
        console.error('[Firebase] ❌ Error getting FCM token:', error);
        return null;
    }
}

// ============================================================================
// TOKEN SYNC WITH BACKEND
// ============================================================================
export async function syncTokenWithBackend() {
    try {
        const state = useStore.getState();
        const token = state.token;
        if (!token) return;

        const fcmToken = await getFCMToken();
        if (fcmToken) {
            console.log('[Firebase] 🔄 Syncing FCM Token with backend...');
            await api.auth.updateFCMToken(token, fcmToken);
            console.log('[Firebase] ✅ FCM Token synced');
        }
    } catch (error) {
        console.error('[Firebase] ❌ Failed to sync FCM token:', error);
    }
}

onTokenRefresh(messaging, async (token) => {
    console.log('[Firebase] 🔄 FCM Token refreshed:', token);
    await syncTokenWithBackend();
});

console.log('[Firebase] ✅ Firebase messaging service initialized');

export const setupForegroundHandler = () => {
    return onMessage(messaging, async (remoteMessage) => {
        await handleRemoteMessage(remoteMessage, 'foreground');
    });
};

export const setupTokenRefreshListener = () => {
    return onTokenRefresh(messaging, async (tokenVal) => {
        await syncTokenWithBackend();
    });
};

export const setupNotificationOpenedHandler = () => {
    onNotificationOpenedApp(messaging, (remoteMessage) => {
        console.log('[Firebase] 📱 Notification opened app from background:', remoteMessage);
    });

    getInitialNotification(messaging).then((remoteMessage) => {
        if (remoteMessage) {
            console.log('[Firebase] 📱 App opened from killed state by notification:', remoteMessage);
        }
    });
};

export default messaging;
