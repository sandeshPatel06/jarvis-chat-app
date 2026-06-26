import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_CALL_INTENT_KEY = 'pendingIncomingCallIntent';

export interface PendingCallIntent {
    type: 'incoming_call';
    chatId: string;
    callUUID: string;
    callerName: string;
    callerAvatar: string;
    isVideo: boolean;
    offer?: {
        type?: string;
        sdp?: string;
    } | null;
    action?: string;
    source?: 'notification' | 'fcm';
    notificationId?: string;
    timestamp: number;
}

const isValidPendingCallIntent = (value: any): value is PendingCallIntent => {
    return (
        value?.type === 'incoming_call' &&
        typeof value?.chatId === 'string' &&
        value.chatId.length > 0 &&
        typeof value?.callUUID === 'string' &&
        value.callUUID.length > 0
    );
};

export async function persistPendingCallIntent(intent: PendingCallIntent) {
    try {
        await AsyncStorage.setItem(PENDING_CALL_INTENT_KEY, JSON.stringify(intent));
    } catch (error) {
        console.error('[PendingCallIntent] Failed to persist intent:', error);
    }
}

export async function consumePendingCallIntent(): Promise<PendingCallIntent | null> {
    try {
        const rawIntent = await AsyncStorage.getItem(PENDING_CALL_INTENT_KEY);
        if (!rawIntent) {
            return null;
        }

        await AsyncStorage.removeItem(PENDING_CALL_INTENT_KEY);

        const parsedIntent = JSON.parse(rawIntent);
        return isValidPendingCallIntent(parsedIntent) ? parsedIntent : null;
    } catch (error) {
        console.error('[PendingCallIntent] Failed to consume intent:', error);
        await AsyncStorage.removeItem(PENDING_CALL_INTENT_KEY).catch(() => {});
        return null;
    }
}

export async function clearPendingCallIntent() {
    try {
        await AsyncStorage.removeItem(PENDING_CALL_INTENT_KEY);
    } catch (error) {
        console.error('[PendingCallIntent] Failed to clear intent:', error);
    }
}
