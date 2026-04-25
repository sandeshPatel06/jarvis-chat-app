import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '@/store';
import { api } from '@/services/api';

export interface Toast {
    type: 'success' | 'error' | 'info';
    text1: string;
    text2?: string;
    id: number;
}

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
    title: string;
    message: string;
    buttons?: AlertButton[];
}

export interface UISlice {
    theme: 'system' | 'light' | 'dark';
    animationsEnabled: boolean;
    toast: Toast | null;
    alert: AlertState | null;
    blockedUsers: number[];
    setTheme: (theme: 'system' | 'light' | 'dark') => void;
    setAnimationsEnabled: (enabled: boolean) => void;
    showToast: (type: 'success' | 'error' | 'info', text1: string, text2?: string) => void;
    hideToast: () => void;
    showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
    hideAlert: () => void;
    fetchBlockedUsers: () => Promise<void>;
    blockUser: (userId: number) => Promise<void>;
    unblockUser: (userId: number) => Promise<void>;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
    theme: 'system',
    animationsEnabled: true,
    toast: null,
    alert: null,
    blockedUsers: [],
    setTheme: (theme) => {
        set({ theme });
        AsyncStorage.setItem('theme', theme).catch(console.error);
    },
    setAnimationsEnabled: (enabled) => {
        set({ animationsEnabled: enabled });
        AsyncStorage.setItem('animationsEnabled', JSON.stringify(enabled)).catch(console.error);
    },
    showToast: (type, text1, text2) => set({ toast: { type, text1, text2, id: Date.now() } }),
    hideToast: () => set({ toast: null }),
    showAlert: (title, message, buttons) => set({ alert: { title, message, buttons } }),
    hideAlert: () => set({ alert: null }),
    fetchBlockedUsers: async () => {
        const { token } = get() as any;
        if (!token) return;
        try {
            const blocked = await api.auth.getBlockedUsers(token);
            set({ blockedUsers: blocked.map((u: any) => u.id) });
        } catch (e) {
            console.error('Fetch blocked users failed', e);
        }
    },
    blockUser: async (userId) => {
        const { token, fetchBlockedUsers } = get() as any;
        if (!token) return;
        try {
            await api.auth.blockUser(token, userId);
            await fetchBlockedUsers();
        } catch (e) {
            console.error('Block user failed', e);
        }
    },
    unblockUser: async (userId) => {
        const { token, fetchBlockedUsers } = get() as any;
        if (!token) return;
        try {
            await api.auth.unblockUser(token, userId);
            await fetchBlockedUsers();
        } catch (e) {
            console.error('Unblock user failed', e);
        }
    },
});
