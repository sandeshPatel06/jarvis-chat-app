import React, { useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';
import { getAppStorageSize, getNetworkUsage, formatSize, NetworkUsage } from '@/utils/usageTracker';

export default function StorageSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const showToast = useStore((state) => state.showToast);
    const showAlert = useStore((state) => state.showAlert);

    const [storageSize, setStorageSize] = useState('Calculating...');
    const [networkUsage, setNetworkUsage] = useState<NetworkUsage>({ sent: 0, received: 0 });

    const loadStats = useCallback(async () => {
        const size = await getAppStorageSize();
        const network = await getNetworkUsage();
        setStorageSize(formatSize(size));
        setNetworkUsage(network);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    const handleToggle = useCallback(async (value: boolean) => {
        try {
            await updateSettings({ storage_auto_download_media: value });
        } catch { }
    }, [updateSettings]);

    const handleClearCache = () => {
        showAlert(
            'Clear Media Cache',
            'This will delete all downloaded photos and videos. They will be re-downloaded if you view them again. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Clear', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const mediaDir = `${FileSystem.documentDirectory}media`;
                            const exists = (await FileSystem.getInfoAsync(mediaDir)).exists;
                            if (exists) {
                                await FileSystem.deleteAsync(mediaDir, { idempotent: true });
                                await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
                            }
                            await loadStats();
                            showToast('success', 'Media cache cleared');
                        } catch {
                            showToast('error', 'Failed to clear cache');
                        }
                    }
                }
            ]
        );
    };

    const handleViewStorageDetails = async () => {
        await getAppStorageSize();
        // stats is total, but we can call internal logic if we had it.
        // For simplicity, we just show the total in a bit more detail.
        showAlert(
            'Storage Breakdown',
            `Your application is using ${storageSize} in total.\n\n` + 
            `• Database: Managed SQLite storage\n` +
            `• Media: Downloaded photos, videos & voice messages.`
        );
    };

    const handleViewNetworkDetails = () => {
        showAlert(
            'Network Usage',
            `Total Sent: ${formatSize(networkUsage.sent)}\n` +
            `Total Received: ${formatSize(networkUsage.received)}\n\n` +
            'This tracks all API calls and media transfers since the app was installed or stats were last reset.',
            [
                { text: 'OK', style: 'default' },
                { 
                    text: 'Reset Statistics', 
                    style: 'destructive',
                    onPress: async () => {
                        const { resetNetworkUsage } = await import('@/utils/usageTracker');
                        await resetNetworkUsage();
                        await loadStats();
                        showToast('success', 'Stats Reset');
                    }
                }
            ]
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'Storage and Data',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Media Auto-download</Text>
                    <SettingCard>
                        <SettingRow
                            title="Auto-download Media"
                            subtitle="Download incoming photos and videos automatically"
                            icon="cloud-download-outline"
                            isSwitch
                            switchValue={user?.storage_auto_download_media ?? true}
                            onSwitchChange={handleToggle}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Clear Media Cache"
                            subtitle="Free up space by removing downloaded files"
                            icon="trash-can-outline"
                            onPress={handleClearCache}
                            color="#F85149"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Usage Statistics</Text>
                    <SettingCard>
                        <SettingRow
                            title="Total Storage"
                            subtitle="SQLite Database + Media Files"
                            value={storageSize}
                            icon="database-outline"
                            onPress={handleViewStorageDetails}
                            color="#6C63FF"
                        />
                        <SettingRow
                            title="Network Traffic"
                            subtitle="Real-time data tracking"
                            value={`${formatSize(networkUsage.sent)} Sent • ${formatSize(networkUsage.received)} Recv`}
                            icon="chart-timeline-variant"
                            onPress={handleViewNetworkDetails}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 14,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
});
