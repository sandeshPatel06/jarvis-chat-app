import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as database from './services/database';

import { createAuthSlice, AuthSlice } from './stores/authSlice';
import { createChatSlice, ChatSlice } from './stores/chatSlice';
import { createCallSlice, CallSlice } from './stores/callSlice';
import { createUISlice, UISlice } from './stores/uiSlice';
import { DEFAULT_CHAT_FONT_SIZE, normalizeChatFontSize } from './utils/chatPreferences';

// Combined state type
export type AppState = AuthSlice & ChatSlice & CallSlice & UISlice & {
    initApp: () => Promise<void>;
};

const parseStoredBoolean = (value: string | null, fallback: boolean): boolean => {
    if (value == null) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const parseStoredFontSize = (value: string | null, fallback: number): number => {
    if (value == null) return fallback;
    try {
        return normalizeChatFontSize(JSON.parse(value));
    } catch {
        return fallback;
    }
};

export const useStore = create<AppState>()((set, get, ...args) => ({
    ...createAuthSlice(set, get, ...args),
    ...createChatSlice(set, get, ...args),
    ...createCallSlice(set, get, ...args),
    ...createUISlice(set, get, ...args),

    initApp: async () => {
        try {
            console.log('[Store] Initializing App...');
            // 1. Initialize SQLite
            await database.initDatabase();

            // 2. Load Secured State
            const token = await SecureStore.getItemAsync('token');
            const userStr = await SecureStore.getItemAsync('user'); // Now in SecureStore
            
            // 3. Load Public State
            const theme = (await AsyncStorage.getItem('theme')) as any;
            const mutedChatsStr = await AsyncStorage.getItem('mutedChats');
            const anims = await AsyncStorage.getItem('animationsEnabled');
            const localEnterIsSend = await AsyncStorage.getItem('chat_enter_is_send');
            const localMediaVisibility = await AsyncStorage.getItem('chat_media_visibility');
            const localFontSize = await AsyncStorage.getItem('chat_message_font_size');
            const localAppLanguage = await AsyncStorage.getItem('app_language');

            const parsedUser = userStr ? JSON.parse(userStr) : null;
            const chatEnterIsSend = localEnterIsSend != null
                ? parseStoredBoolean(localEnterIsSend, !!parsedUser?.chat_enter_is_send)
                : !!parsedUser?.chat_enter_is_send;
            const chatMediaVisibility = localMediaVisibility != null
                ? parseStoredBoolean(localMediaVisibility, parsedUser?.chat_media_visibility ?? true)
                : (parsedUser?.chat_media_visibility ?? true);
            const chatMessageFontSize = localFontSize != null
                ? parseStoredFontSize(localFontSize, normalizeChatFontSize(parsedUser?.chat_font_size ?? DEFAULT_CHAT_FONT_SIZE))
                : normalizeChatFontSize(parsedUser?.chat_font_size ?? DEFAULT_CHAT_FONT_SIZE);
            const appLanguage = localAppLanguage ?? parsedUser?.app_language ?? 'system';

            if (token && userStr) {
                console.log('[Store] Auth found, connecting WS');
                set({ token, user: parsedUser } as any);
                const state = get() as any;
                state.connectWebSocket();
                state.fetchChats(); 
            }

            if (theme) set({ theme } as any);
            if (mutedChatsStr) set({ mutedChats: JSON.parse(mutedChatsStr) } as any);
            if (anims) set({ animationsEnabled: JSON.parse(anims) } as any);
            set({
                chatEnterIsSend,
                chatMediaVisibility,
                chatMessageFontSize,
                appLanguage,
            } as any);

            set({ hasHydrated: true } as any);
        } catch (e) {
            console.error('[Store] App initialization failed:', e);
            set({ hasHydrated: true } as any);
        }
    }
}));
