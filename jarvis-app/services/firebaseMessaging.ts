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
import * as SecureStore from 'expo-secure-store';

import { handleIncomingCallFCM } from '@/helper/backgroundCallHelper';
import { clearPendingCallIntent, consumePendingCallIntent, persistPendingCallIntent, type PendingCallIntent } from '@/services/pendingCallIntent';
import { getMediaUrl } from '@/utils/media';
import { api } from './api';
import { useStore } from '@/store';

interface NormalizedIncomingCallPayload {
    chatId: string;
    callUUID: string;
    callerName: string;
    callerAvatar: string;
    isVideo: boolean;
    offer: { type?: string; sdp?: string } | null;
    notificationId?: string;
}

const isTrue = (value: any) => value === true || value === 'true' || value === 1 || value === '1';

const parseIncomingCallOffer = (data: any): { type?: string; sdp?: string } | null => {
    if (!data) {
        return null;
    }

    if (data.offer && typeof data.offer === 'object') {
        return data.offer;
    }

    if (typeof data.offer === 'string' && data.offer.trim()) {
        try {
            const parsedOffer = JSON.parse(data.offer);
            if (parsedOffer && typeof parsedOffer === 'object') {
                return parsedOffer;
            }
        } catch {
        }
    }

    const offerType = data.offerType || data.offer_type;
    const offerSdp = data.offerSdp || data.offer_sdp;
    if (typeof offerSdp === 'string' && offerSdp.trim()) {
        return {
            type: typeof offerType === 'string' && offerType.trim() ? offerType : 'offer',
            sdp: offerSdp,
        };
    }

    return null;
};

const isIncomingCallPayload = (data: any) => {
    if (!data) return false;

    if (data.type === 'incoming_call') {
        return true;
    }

    return Boolean(
        data.callUUID ||
        data.call_uuid ||
        data.uuid ||
        data.offer ||
        data.isVideo !== undefined ||
        data.is_video !== undefined ||
        data.callerName ||
        data.caller_name ||
        data.callerAvatar ||
        data.caller_avatar
    );
};

const normalizeIncomingCallPayload = (payload: any, notificationId?: string): NormalizedIncomingCallPayload | null => {
    const data = payload?.data ?? payload ?? {};
    const firebaseNotification = payload?.notification;
    const chatId = data.chatId || data.chat_id || data.conversation_id;

    if (!chatId) {
        return null;
    }

    return {
        chatId: String(chatId),
        callUUID: String(data.callUUID || data.call_uuid || data.uuid || notificationId || Date.now()),
        callerName: data.callerName || data.caller_name || firebaseNotification?.title || 'Unknown Caller',
        callerAvatar: data.callerAvatar || data.caller_avatar || '',
        isVideo: isTrue(data.isVideo) || isTrue(data.is_video),
        offer: parseIncomingCallOffer(data),
        notificationId,
    };
};

const seedIncomingCallState = (payload: NormalizedIncomingCallPayload, source: 'notification' | 'fcm') => {
    useStore.getState().seedIncomingCall({
        chatId: payload.chatId,
        offer: payload.offer,
        isVideo: payload.isVideo,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        callUUID: payload.callUUID,
        source,
        awaitingOffer: !payload.offer,
    });
};

const buildPendingCallIntent = (
    payload: NormalizedIncomingCallPayload,
    source: PendingCallIntent['source'],
    action?: string
): PendingCallIntent => {
    return {
        type: 'incoming_call',
        chatId: payload.chatId,
        callUUID: payload.callUUID,
        callerName: payload.callerName,
        callerAvatar: payload.callerAvatar,
        isVideo: payload.isVideo,
        offer: payload.offer,
        action,
        source,
        notificationId: payload.notificationId || payload.callUUID,
        timestamp: Date.now(),
    };
};

const handleCallNotificationOpen = async (
    payload: NormalizedIncomingCallPayload | null,
    source: 'notification' | 'fcm',
    action?: string
) => {
    if (!payload) {
        return false;
    }

    if (source === 'notification') {
        await persistPendingCallIntent(buildPendingCallIntent(payload, source, action));
    }

    seedIncomingCallState(payload, source);
    return true;
};

// ============================================================================
// CENTRALIZED NOTIFICATION HANDLER
// ============================================================================
async function handleRemoteMessage(remoteMessage: any, context: 'foreground' | 'background') {
    console.log(`[Firebase ${context}] 📩 Message received in ${context} state`);
    console.log(`[Firebase ${context}] Message structure:`, JSON.stringify(remoteMessage, null, 2));

    try {
        const { data, notification: firebaseNotification } = remoteMessage;

        // 1. Handle Incoming Call
        // Prefer explicit call payloads before message handling so killed/background calls can ring.
        if (isIncomingCallPayload(data)) {
            console.log(`[Firebase ${context}] 📞 Incoming call detected`);

            const fcmData = normalizeIncomingCallPayload(remoteMessage);
            if (!fcmData) {
                console.warn(`[Firebase ${context}] Incoming-call payload missing chat identifier`);
                return;
            }

            if (context === 'foreground') {
                seedIncomingCallState(fcmData, 'fcm');
            } else {
                await handleIncomingCallFCM(fcmData);
            }
            console.log(`[Firebase ${context}] ✅ Call handled successfully`);
        }
        // 2. Handle New Message
        else if (data?.type === 'message' || data?.conversation_id || firebaseNotification) {
            console.log(`[Firebase ${context}] 💬 New message detected`);

            // Let the OS render notification payloads in background/killed state.
            // This avoids a duplicate banner when the backend already sent a system notification.
            if (context === 'background' && firebaseNotification) {
                console.log('[Firebase background] Skipping local message notification because OS notification is already present');
                return;
            }

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
            const senderName = data?.sender_name || 'Someone';
            const messageText = data?.text || data?.body || firebaseNotification?.body || 'You have a new message';

            let avatarUrl = data?.sender_avatar ? getMediaUrl(data.sender_avatar) : null;

            // Validate URL for Notifee (must be http/https or file://)
            if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('file')) {
                console.log('[Firebase] Invalid avatar URL for notification:', avatarUrl);
                avatarUrl = null;
            }

            // Construct Android config dynamically to avoid passing undefined/null for icons
            const person: any = {
                name: senderName,
            };

            const androidConfig: any = {
                channelId,
                importance: AndroidImportance.HIGH,
                style: {
                    type: AndroidStyle.MESSAGING,
                    person: person,
                    messages: [
                        {
                            text: messageText,
                            timestamp: Date.now(),
                            person: person,
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
            };

            // Only add icon properties if we have a valid URL
            if (avatarUrl) {
                androidConfig.largeIcon = avatarUrl;
                person.icon = avatarUrl;
            }

            await notifee.displayNotification({
                id: data?.message_id || Date.now().toString(),
                title: `New Message from ${senderName}`,
                body: messageText,
                data: {
                    type: 'message',
                    conversation_id: data?.conversation_id,
                    message_id: data?.message_id,
                },
                android: androidConfig,
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
// NOTIFEE BACKGROUND EVENTS (Reply/Mark Read / Call Actions)
// ============================================================================
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction, input } = detail;
    const actionId = pressAction?.id;
    const callPayload = normalizeIncomingCallPayload(notification?.data, notification?.id);

    if (callPayload && type === EventType.PRESS) {
        await persistPendingCallIntent(buildPendingCallIntent(callPayload, 'notification', actionId || 'press'));
        if (notification?.id) {
            await notifee.cancelNotification(notification.id);
        }
        return;
    }

    if (type === EventType.ACTION_PRESS) {
        if (callPayload && (actionId === 'answer_call' || actionId === 'default' || actionId === 'full_screen')) {
            console.log('[Notifee] User opened call notification in background');
            await persistPendingCallIntent(buildPendingCallIntent(callPayload, 'notification', actionId));
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
            }
            return;
        }

        if (callPayload && actionId === 'decline_call') {
            console.log('[Notifee] User declined call from notification');
            await clearPendingCallIntent();
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
            }
            return;
        }

        if (actionId === 'reply' && input) {
            const conversationId = notification?.data?.conversation_id as string;
            const replyText = input as string;

            if (conversationId && replyText) {
                console.log(`[Notifee] Replying to ${conversationId}: ${replyText}`);
                try {
                    const state = useStore.getState();
                    let token = state.token;
                    if (!token) {
                        token = await SecureStore.getItemAsync('token');
                    }

                    if (token) {
                        await api.chat.uploadFile(token, conversationId, null, null, replyText);
                        console.log('[Notifee] Reply sent successfully');
                    }
                } catch (error) {
                    console.error('[Notifee] Failed to send background reply:', error);
                }
            }
        } else if (actionId === 'mark_as_read') {
            const conversationId = notification?.data?.conversation_id as string;
            const messageId = notification?.data?.message_id as string;

            if (conversationId && messageId) {
                console.log(`[Notifee] Marking as read: ${messageId} in ${conversationId}`);
                try {
                    const state = useStore.getState();
                    let token = state.token;
                    if (!token) {
                        token = await SecureStore.getItemAsync('token');
                    }
                    if (token) {
                        await api.chat.markMessagesAsRead(token, conversationId);
                        console.log('[Notifee] Mark as read sent successfully');
                    }
                } catch (error) {
                    console.error('[Notifee] Failed to mark as read in background:', error);
                }
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

async function getFCMToken(): Promise<string | null> {
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

console.log('[Firebase] ✅ Firebase messaging service initialized');

export const setupForegroundHandler = () => {
    return onMessage(messaging, async (remoteMessage) => {
        await handleRemoteMessage(remoteMessage, 'foreground');
    });
};

export const setupTokenRefreshListener = () => {
    return onTokenRefresh(messaging, async (token) => {
        console.log('[Firebase] 🔄 FCM Token refreshed:', token);
        await syncTokenWithBackend();
    });
};

export const setupNotificationOpenedHandler = () => {
    const unsubscribeNotificationOpened = onNotificationOpenedApp(messaging, async (remoteMessage) => {
        console.log('[Firebase] 📱 Notification opened app from background:', remoteMessage);
        const payload = normalizeIncomingCallPayload(remoteMessage);
        if (await handleCallNotificationOpen(payload, 'fcm', 'open_app')) {
            await clearPendingCallIntent();
        }
    });

    const unsubscribeForegroundEvents = notifee.onForegroundEvent(async ({ type, detail }) => {
        const { notification, pressAction } = detail;
        const actionId = pressAction?.id;
        const callPayload = normalizeIncomingCallPayload(notification?.data, notification?.id);

        if (callPayload && type === EventType.PRESS) {
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
            }
            await clearPendingCallIntent();
            await handleCallNotificationOpen(callPayload, 'notification', actionId || 'press');
            return;
        }

        if (callPayload && type === EventType.ACTION_PRESS) {
            if (actionId === 'decline_call') {
                await clearPendingCallIntent();
                useStore.getState().clearIncomingCall();
                if (notification?.id) {
                    await notifee.cancelNotification(notification.id);
                }
                return;
            }

            if (actionId === 'answer_call' || actionId === 'default' || actionId === 'full_screen') {
                if (notification?.id) {
                    await notifee.cancelNotification(notification.id);
                }
                await clearPendingCallIntent();
                await handleCallNotificationOpen(callPayload, 'notification', actionId);
            }
        }
    });

    return () => {
        unsubscribeNotificationOpened();
        unsubscribeForegroundEvents();
    };
};

export const restorePendingCallIntent = async () => {
    try {
        const initialNotification = await notifee.getInitialNotification();
        const initialNotificationPayload = normalizeIncomingCallPayload(
            initialNotification?.notification?.data,
            initialNotification?.notification?.id
        );

        if (initialNotificationPayload) {
            if (initialNotification?.notification?.id) {
                await notifee.cancelNotification(initialNotification.notification.id);
            }
            await clearPendingCallIntent();
            seedIncomingCallState(initialNotificationPayload, 'notification');
            return;
        }

        const initialRemoteMessage = await getInitialNotification(messaging);
        const initialRemotePayload = normalizeIncomingCallPayload(initialRemoteMessage);
        if (initialRemotePayload) {
            await clearPendingCallIntent();
            seedIncomingCallState(initialRemotePayload, 'fcm');
            return;
        }

        const pendingCallIntent = await consumePendingCallIntent();
        if (pendingCallIntent) {
            if (pendingCallIntent.notificationId) {
                await notifee.cancelNotification(pendingCallIntent.notificationId).catch(() => {});
            }
            seedIncomingCallState(
                {
                    ...pendingCallIntent,
                    offer: pendingCallIntent.offer ?? null,
                },
                pendingCallIntent.source || 'notification'
            );
        }
    } catch (error) {
        console.error('[Firebase] ❌ Failed to restore pending call intent:', error);
    }
};

export default messaging;
