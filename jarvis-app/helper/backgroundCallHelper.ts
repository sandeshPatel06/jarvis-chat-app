import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

/**
 * Handles incoming call data from FCM and displays a notification.
 */
export async function handleIncomingCallFCM(data: any) {
    console.log('[BackgroundCallHelper] 📞 Handling incoming call FCM data:', data);

    const { callUUID, callerName, type } = data;

    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id: 'incoming_calls',
        name: 'Incoming Calls',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
    });

    // Display a notification
    await notifee.displayNotification({
        id: callUUID || 'incoming_call',
        title: 'Incoming Call',
        body: `${callerName || 'Someone'} is calling you...`,
        android: {
            channelId,
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'default',
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
            category: 'call' as any,
        },
        data: {
            callUUID,
            type: 'incoming_call',
        },
    });
}

/**
 * Handle notification events (like button presses)
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;

    if (type === EventType.ACTION_PRESS) {
        if (pressAction?.id === 'decline_call') {
            console.log('[BackgroundCallHelper] User declined call from notification');

            // Remove the notification
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
            }

            // TODO: Notify server that the call was declined
        }

        if (pressAction?.id === 'answer_call') {
            console.log('[BackgroundCallHelper] User answered call from notification');

            // Remove the notification
            if (notification?.id) {
                await notifee.cancelNotification(notification.id);
            }

            // Launch Activity will happen automatically via 'default' launchActivity
            // The app's root component should handle the 'answer_call' action if needed
            // or we can rely on IncomingCallModal being visible when app opens
        }
    }
});

/**
 * Handle foreground events
 */
notifee.onForegroundEvent(async ({ type, detail }) => {
    const { notification, pressAction } = detail;
    if (type === EventType.ACTION_PRESS && pressAction?.id === 'answer_call') {
        if (notification?.id) {
            await notifee.cancelNotification(notification.id);
        }
    }
});
