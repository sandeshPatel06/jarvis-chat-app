import notifee, { AndroidImportance, AndroidVisibility, EventType, AndroidCategory } from '@notifee/react-native';

/**
 * Handles incoming call data from FCM and displays a notification.
 */
export async function handleIncomingCallFCM(data: any) {
    console.log('[BackgroundCallHelper] 📞 Handling incoming call FCM data:', data);

    const { callUUID, callerName } = data;

    // Create a channel with a new ID to bypass any previously cached OS configurations
    const channelId = await notifee.createChannel({
        id: 'jarvis_voice_calls',
        name: 'Incoming Voice/Video Calls',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        bypassDnd: true, // Allow calls to bypass Do Not Disturb mode
    });

    // Display a robust, un-swipeable incoming call notification
    await notifee.displayNotification({
        id: callUUID || 'incoming_call',
        title: 'Incoming Call',
        body: `${callerName || 'Someone'} is calling you...`,
        android: {
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
        },
        data: {
            callUUID,
            type: 'incoming_call',
        },
    });
}

