import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Utility for handling local notifications and permissions.
 */

/**
 * Requests notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return true;
}

/**
 * Registers for push notifications and returns the token.
 */
export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        // alert('Failed to get push token for push notification!');
        return;
    }

    // Get the token that uniquely identifies this device
    try {
        const token = (await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Ensure you have this env var or use constants
        })).data;

        return token;
    } catch (error) {
        console.warn('Failed to get push token. Ensure Firebase is configured for Android:', error);
        return null;
    }
}

/**
 * Schedules a local notification.
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data to include with the notification
 */
export async function scheduleLocalNotification(
    title: string,
    body: string,
    data: Record<string, any> = {}
) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // null means immediate
        });
    } catch (error) {
        console.error('Failed to schedule notification:', error);
    }
}

/**
 * Configures how notifications are handled when the app is in the foreground.
 * @deprecated Use custom logic in _layout.tsx instead
 */
export function setForegroundNotificationHandler() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}
