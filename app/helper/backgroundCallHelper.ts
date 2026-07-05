import notifee, { AndroidImportance, AndroidVisibility, AndroidCategory } from '@notifee/react-native';
import { getMediaUrl } from '@/utils/media';

/**
 * Handles incoming call data from FCM and displays a notification.
 */
const CALL_CHANNEL_ID = 'jarvis_voice_calls_v5';

const CALL_VIBRATION_PATTERN: number[] = [];
for (let i = 0; i < 30; i++) {
    CALL_VIBRATION_PATTERN.push(500, 1000);
}

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
        vibrationPattern: CALL_VIBRATION_PATTERN,
        bypassDnd: true, // Allow calls to bypass Do Not Disturb mode
        sound: 'default',
    });

    const largeIcon = avatarUrl || require('@/assets/images/logo.png');

    // Display a robust, un-swipeable incoming call notification
    const androidConfig: any = {
        channelId,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        color: '#6C63FF', // App brand color
        vibrationPattern: CALL_VIBRATION_PATTERN,
        ongoing: true, // Prevents the user or OS from swiping away the notification while it's ringing
        autoCancel: false,
        lightUpScreen: true, // Forces the screen to wake up (crucial for lock screen)
        smallIcon: 'ic_launcher',
        largeIcon: largeIcon,
        pressAction: {
            id: 'default',
            launchActivity: 'default',
        },
        actions: [
            {
                title: 'Accept',
                icon: 'ic_menu_call',
                pressAction: { id: 'answer_call', launchActivity: 'default' },
            },
            {
                title: 'Decline',
                icon: 'ic_menu_close_clear_cancel',
                pressAction: { id: 'decline_call' },
            },
        ],
        fullScreenAction: {
            id: 'full_screen',
            launchActivity: 'default',
        },
        category: AndroidCategory.CALL,
    };

    await notifee.displayNotification({
        id: callUUID || 'incoming_call',
        title: `${isVideo ? 'Video Call' : 'Voice Call'} from ${callerName || 'Someone'}`,
        android: androidConfig,
        ios: {
            sound: 'default',
            interruptionLevel: 'timeSensitive',
            categoryId: 'incoming_call_category',
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
