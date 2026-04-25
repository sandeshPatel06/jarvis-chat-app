import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as database from './services/database';

import { createAuthSlice, AuthSlice } from './stores/authSlice';
import { createChatSlice, ChatSlice } from './stores/chatSlice';
import { createCallSlice, CallSlice } from './stores/callSlice';
import { createUISlice, UISlice } from './stores/uiSlice';

// Combined state type
export type AppState = AuthSlice & ChatSlice & CallSlice & UISlice & {
    initApp: () => Promise<void>;
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

            if (token && userStr) {
                console.log('[Store] Auth found, connecting WS');
                set({ token, user: JSON.parse(userStr) } as any);
                const state = get() as any;
                state.connectWebSocket();
                state.fetchChats(); 
            }

            if (theme) set({ theme } as any);
            if (mutedChatsStr) set({ mutedChats: JSON.parse(mutedChatsStr) } as any);
            if (anims) set({ animationsEnabled: JSON.parse(anims) } as any);

            set({ hasHydrated: true } as any);
        } catch (e) {
            console.error('[Store] App initialization failed:', e);
            set({ hasHydrated: true } as any);
        }
    }
}));
