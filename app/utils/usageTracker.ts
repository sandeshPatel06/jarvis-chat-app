import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const NETWORK_USAGE_KEY = 'jarvis_network_usage';

export interface NetworkUsage {
    sent: number;
    received: number;
}

export const addNetworkUsage = async (sent: number, received: number) => {
    try {
        const current = await getNetworkUsage();
        const updated: NetworkUsage = {
            sent: current.sent + sent,
            received: current.received + received
        };
        await AsyncStorage.setItem(NETWORK_USAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('[UsageTracker] Failed to add network usage', e);
    }
};

export const getNetworkUsage = async (): Promise<NetworkUsage> => {
    try {
        const data = await AsyncStorage.getItem(NETWORK_USAGE_KEY);
        return data ? JSON.parse(data) : { sent: 0, received: 0 };
    } catch {
        return { sent: 0, received: 0 };
    }
};

export const getAppStorageSize = async (): Promise<number> => {
    let total = 0;
    try {
        // 1. Media folder
        const mediaDir = `${FileSystem.documentDirectory}media`;
        const mediaDirInfo = await FileSystem.getInfoAsync(mediaDir);
        
        if (mediaDirInfo.exists && mediaDirInfo.isDirectory) {
            const files = await FileSystem.readDirectoryAsync(mediaDir);
            for (const f of files) {
                const info = await FileSystem.getInfoAsync(`${mediaDir}/${f}`);
                if (info.exists && !info.isDirectory) {
                    total += info.size;
                }
            }
        }

        // 2. Database
        // In Expo SQLite (legacy and new), the database file usually resides in the 'SQLite' directory
        const dbPath = `${FileSystem.documentDirectory}SQLite/jarvis.db`;
        const dbInfo = await FileSystem.getInfoAsync(dbPath);
        if (dbInfo.exists) {
            total += dbInfo.size;
        }
        
        // Also check for WAL files if WAL mode is enabled
        const walPath = `${FileSystem.documentDirectory}SQLite/jarvis.db-wal`;
        const walInfo = await FileSystem.getInfoAsync(walPath);
        if (walInfo.exists) {
            total += walInfo.size;
        }

        const shmPath = `${FileSystem.documentDirectory}SQLite/jarvis.db-shm`;
        const shmInfo = await FileSystem.getInfoAsync(shmPath);
        if (shmInfo.exists) {
            total += shmInfo.size;
        }

    } catch (e) {
        console.error('[UsageTracker] Failed to get storage size', e);
    }
    return total;
};

export const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const resetNetworkUsage = async () => {
    try {
        await AsyncStorage.removeItem(NETWORK_USAGE_KEY);
    } catch (e) {
        console.error('[UsageTracker] Failed to reset network usage', e);
    }
};
