import { StateCreator } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { api } from '@/services/api';
import { AppState } from '@/store'; // We'll update store.ts to export this interface

export interface AuthSlice {
    user: User | null;
    token: string | null;
    theme: 'system' | 'light' | 'dark';
    hasHydrated: boolean;
    setUser: (user: User | null, token: string | null) => void;
    updateUser: (user: User) => void;
    setTheme: (theme: 'system' | 'light' | 'dark') => void;
    setHydrated: (state: boolean) => void;
    logout: () => Promise<void>;
    updateSettings: (settings: Partial<User>) => Promise<void>;
    deleteAccount: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
    user: null,
    token: null,
    theme: 'system',
    hasHydrated: false,
    setHydrated: (state) => set({ hasHydrated: state }),
    setUser: (user, token) => {
        set({ user, token });
        if (token) {
            SecureStore.setItemAsync('token', token).catch(console.error);
        } else {
            SecureStore.deleteItemAsync('token').catch(console.error);
        }
        
        if (user) {
            // SECURITY: Store user object in SecureStore instead of AsyncStorage
            SecureStore.setItemAsync('user', JSON.stringify(user)).catch(console.error);
        } else {
            SecureStore.deleteItemAsync('user').catch(console.error);
        }
    },
    updateUser: (user) => {
        set({ user });
        SecureStore.setItemAsync('user', JSON.stringify(user)).catch(console.error);
    },
    setTheme: (theme) => {
        set({ theme });
        AsyncStorage.setItem('theme', theme).catch(console.error);
    },
    logout: async () => {
        // Access other slices via get() if needed
        const state = get() as any;
        if (state.socket) state.socket.close();

        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');

        set({ 
            user: null, 
            token: null, 
            chats: [], 
            calls: [], 
            socket: null, 
            activeChatId: null, 
            hasHydrated: true 
        } as any);
    },
    updateSettings: async (settings) => {
        const { token, user, showToast } = get() as any;
        if (!token || !user) return;
        try {
            const updatedUser = await api.auth.updateProfile(token, settings);
            get().updateUser(updatedUser);
        } catch (e) {
            console.error('Update settings failed', e);
            if (showToast) showToast('error', 'Update Failed', 'Could not save your settings.');
            throw e;
        }
    },
    deleteAccount: async () => {
        const { token, logout, showToast } = get() as any;
        if (!token) return;
        try {
            await api.auth.deleteAccount(token);
            await logout();
        } catch (e) {
            console.error('Delete account failed', e);
            if (showToast) showToast('error', 'Action Failed', 'Could not delete your account.');
            throw e;
        }
    },
});
