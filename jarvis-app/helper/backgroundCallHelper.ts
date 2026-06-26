import notifee, { AndroidImportance, AndroidVisibility, AndroidCategory } from '@notifee/react-native';
import { getMediaUrl } from '@/utils/media';

/**
 * Handles incoming call data from FCM and displays a notification.
 */
const CALL_CHANNEL_ID = 'jarvis_voice_calls_v2';

export async function handleIncomingCallFCM(data: any) {
    console.log('[BackgroundCallHelper] 📞 Handling incoming call FCM data:', data);

    const { callUUID, callerName, callerAvatar, isVideo } = data;
    const chatId = data.chatId || data.chat_id || data.conversation_id || null;
    const offer = data.offer && typeof data.offer === 'object'
        ? data.offer
        : (typeof data.offerSdp === 'string' && data.offerSdp.trim()
            ? {
                type: typeof data.offerType === 'string' && data.offerType.trim() ? data.offerType : 'offer',
                sdp: data.offerSdp,
            }
            : null);
    let avatarUrl = callerAvatar ? getMediaUrl(callerAvatar) : null;

    if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('file')) {
        avatarUrl = null;
    }

    // Create a channel with a new ID to bypass any previously cached OS configurations
    const channelId = await notifee.createChannel({
        id: CALL_CHANNEL_ID,
        name: 'Incoming Voice/Video Calls',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        bypassDnd: true, // Allow calls to bypass Do Not Disturb mode
        sound: 'default',
    });

    // Display a robust, un-swipeable incoming call notification
    const androidConfig: any = {
        channelId,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        ongoing: true, // Prevents the user or OS from swiping away the notification while it's ringing
        autoCancel: false,
        lightUpScreen: true, // Forces the screen to wake up (crucial for lock screen)
        pressAction: {
            id: 'default',
            launchActivity: 'default',
        },
        actions: [
            {
                title: 'Answer',
                pressAction: { id: 'answer_call', launchActivity: 'default' },
            },
            {
                title: 'Decline',
                pressAction: { id: 'decline_call' },
            },
        ],
        fullScreenAction: {
            id: 'full_screen',
            launchActivity: 'default',
        },
        category: AndroidCategory.CALL,
    };

    if (avatarUrl) {
        androidConfig.largeIcon = avatarUrl;
    }

    await notifee.displayNotification({
        id: callUUID || 'incoming_call',
        title: 'Incoming Call',
        body: `${callerName || 'Someone'} is calling you...`,
        android: androidConfig,
        ios: {
            sound: 'default',
            interruptionLevel: 'timeSensitive',
        },
        data: {
            callUUID,
            type: 'incoming_call',
            chatId,
            callerName: callerName || 'Someone',
            callerAvatar: callerAvatar || '',
            isVideo: isVideo ? 'true' : 'false',
            offerType: offer?.type || '',
            offerSdp: offer?.sdp || '',
        },
    });
}
