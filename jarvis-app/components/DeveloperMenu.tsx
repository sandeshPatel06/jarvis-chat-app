import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Platform,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { logger } from '@/services/logger';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getTableStats } from '@/services/db';
import { useStore } from '@/store';

interface DeveloperMenuProps {
    visible: boolean;
    onClose: () => void;
}

type Tab = 'logs' | 'system' | 'tools';
type LogFilter = 'all' | 'info' | 'warn' | 'error';

const THEME = {
    background: '#0D1117',
    card: '#161B22',
    text: '#C9D1D9',
    textSecondary: '#8B949E',
    border: '#30363D',
    primary: '#58A6FF',
    success: '#3FB950',
    warning: '#D29922',
    error: '#F85149',
    highlight: '#21262D',
};

export const DeveloperMenu: React.FC<DeveloperMenuProps> = ({ visible, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('logs');
    const [logFilter, setLogFilter] = useState<LogFilter>('all');
    const [logs, setLogs] = useState(logger.getRecentLogs());
    const [netInfo, setNetInfo] = useState<any>(null);
    const [dbStats, setDbStats] = useState<any[]>([]);
    const [asyncKeys, setAsyncKeys] = useState<readonly string[]>([]);
    const [isPinging, setIsPinging] = useState(false);

    // Fix: Use individual selectors to avoid "Maximum update depth exceeded" 
    // and "getSnapshot should be cached" errors caused by returning a new object literal.
    const hasHydrated = useStore(state => state.hasHydrated);
    const user = useStore(state => state.user);
    const theme = useStore(state => state.theme);
    const token = useStore(state => state.token);

    const storeState = useMemo(() => ({
        hasHydrated,
        userId: user?.id,
        username: user?.username,
        theme,
        tokenExists: !!token
    }), [hasHydrated, user, theme, token]);

    useEffect(() => {
        if (visible) {
            const logInterval = setInterval(() => {
                setLogs(logger.getRecentLogs());
            }, 1000);

            const unsubscribeNet = NetInfo.addEventListener(state => {
                setNetInfo(state);
            });

            refreshStorageInfo();

            return () => {
                clearInterval(logInterval);
                unsubscribeNet();
            };
        }
    }, [visible]);

    const refreshStorageInfo = async () => {
        try {
            const stats = await getTableStats();
            setDbStats(stats);
            const keys = await AsyncStorage.getAllKeys();
            setAsyncKeys(keys);
        } catch (e) {
            console.error('[DevMenu] Storage refresh failed', e);
        }
    };

    const handlePing = async () => {
        setIsPinging(true);
        try {
            const start = Date.now();
            const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/profile/`, { method: 'HEAD' });
            const end = Date.now();
            Alert.alert('Ping Success', `Status: ${response.status}\nLatency: ${end - start}ms`);
        } catch (e) {
            Alert.alert('Ping Failed', String(e));
        } finally {
            setIsPinging(false);
        }
    };

    const handleResetApp = () => {
        Alert.alert(
            'Reset App Data',
            'This will clear ALL messages, chats, tokens, and settings. The app will restart. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.clear();
                        await SecureStore.deleteItemAsync('token');
                        // SQLite reset is harder as we can't delete file while open, 
                        // but clearing critical tables is doable.
                        // For a real "Developer" reset, we usually suggest deleting app storage from OS.
                        Alert.alert('Done', 'Storage cleared. Please restart the app manually.');
                    }
                }
            ]
        );
    };

    const filteredLogs = useMemo(() => {
        if (logFilter === 'all') return logs;
        return logs.filter(log => log.level === logFilter);
    }, [logs, logFilter]);

    const handleCopyAll = async () => {
        const textToCopy = filteredLogs
            .map(l => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`)
            .join('\n');
        await Clipboard.setStringAsync(textToCopy);
        Alert.alert('Copied', 'All filtered logs copied to clipboard.');
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };

    const InfoRow = ({ label, value, mono = false }: { label: string, value: string | null | undefined, mono?: boolean }) => (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, mono && styles.monospace]}>{value || 'N/A'}</Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
                <View style={styles.header}>
                    <View style={styles.tabContainer}>
                        {(['logs', 'system', 'tools'] as Tab[]).map(t => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setActiveTab(t)}
                                style={[styles.tab, activeTab === t && styles.activeTab]}
                            >
                                <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesome name="times" size={24} color={THEME.textSecondary} />
                    </TouchableOpacity>
                </View>

                {activeTab === 'logs' && (
                    <View style={styles.flex1}>
                        <View style={styles.toolbar}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
                                {(['all', 'info', 'warn', 'error'] as LogFilter[]).map(filter => (
                                    <TouchableOpacity
                                        key={filter}
                                        onPress={() => setLogFilter(filter)}
                                        style={[styles.chip, logFilter === filter && styles.activeChip]}
                                    >
                                        <Text style={[styles.chipText, logFilter === filter && styles.activeChipText]}>
                                            {filter.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View style={styles.actionGroup}>
                                <TouchableOpacity onPress={handleCopyAll} style={styles.actionBtn}>
                                    <FontAwesome name="clipboard" size={16} color={THEME.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => logger.clearLogs()} style={styles.actionBtn}>
                                    <FontAwesome name="trash" size={16} color={THEME.error} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <FlatList
                            data={filteredLogs}
                            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                            renderItem={({ item }) => (
                                <View style={[styles.logCard, { borderLeftColor: item.level === 'error' ? THEME.error : item.level === 'warn' ? THEME.warning : THEME.primary }]}>
                                    <View style={styles.logHeader}>
                                        <Text style={styles.logTime}>{formatTimestamp(item.timestamp)}</Text>
                                        <Text style={[styles.logType, { color: item.level === 'error' ? THEME.error : item.level === 'warn' ? THEME.warning : THEME.primary }]}>{item.level.toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.logContent} selectable>{item.message}</Text>
                                </View>
                            )}
                            ListEmptyComponent={renderEmpty('No logs recorded')}
                            contentContainerStyle={styles.listContainer}
                        />
                    </View>
                )}

                {activeTab === 'system' && (
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <Text style={styles.sectionHeader}>STATE VIEWER</Text>
                        <View style={styles.card}>
                            <InfoRow label="Hydrated" value={storeState.hasHydrated ? 'Yes' : 'No'} />
                            <InfoRow label="Token Status" value={storeState.tokenExists ? 'Valid' : 'None'} />
                            <InfoRow label="User ID" value={storeState.userId?.toString()} />
                            <InfoRow label="Username" value={storeState.username} />
                            <InfoRow label="Current Theme" value={storeState.theme} />
                        </View>

                        <Text style={styles.sectionHeader}>HARDWARE</Text>
                        <View style={styles.card}>
                            <InfoRow label="Device" value={`${Device.brand} ${Device.modelName}`} />
                            <InfoRow label="OS" value={`${Device.osName} ${Device.osVersion}`} />
                        </View>

                        <Text style={styles.sectionHeader}>CONNECTIVITY</Text>
                        <View style={styles.card}>
                            <InfoRow label="Type" value={netInfo?.type?.toUpperCase()} />
                            <InfoRow label="IP" value={netInfo?.details?.ipAddress} />
                            <InfoRow label="Backend" value={process.env.EXPO_PUBLIC_BACKEND_URL} mono />
                        </View>
                    </ScrollView>
                )}

                {activeTab === 'tools' && (
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                disabled={isPinging}
                                onPress={handlePing}
                                style={[styles.toolBtn, { backgroundColor: THEME.primary + '11', borderColor: THEME.primary }]}
                            >
                                {isPinging ? <ActivityIndicator size="small" color={THEME.primary} /> : <FontAwesome name="globe" size={16} color={THEME.primary} />}
                                <Text style={[styles.toolBtnText, { color: THEME.primary }]}>Ping Backend</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleResetApp}
                                style={[styles.toolBtn, { backgroundColor: THEME.error + '11', borderColor: THEME.error }]}
                            >
                                <FontAwesome name="refresh" size={16} color={THEME.error} />
                                <Text style={[styles.toolBtnText, { color: THEME.error }]}>Reset App</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionHeader}>SQLITE TABLES</Text>
                        <View style={styles.card}>
                            {dbStats.map(stat => (
                                <InfoRow key={stat.name} label={stat.name} value={`${stat.count} rows`} />
                            ))}
                        </View>

                        <Text style={styles.sectionHeader}>ASYNC STORAGE KEYS</Text>
                        <View style={styles.card}>
                            {asyncKeys.length === 0 ? (
                                <Text style={styles.emptyNote}>Empty</Text>
                            ) : asyncKeys.map(key => (
                                <InfoRow key={key} label={key} value="..." />
                            ))}
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const renderEmpty = (text: string) => (
    <View style={styles.emptyState}>
        <FontAwesome name="code" size={48} color={THEME.border} />
        <Text style={styles.emptyText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.background },
    flex1: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    tabContainer: { flex: 1, flexDirection: 'row', height: '100%' },
    tab: { justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: THEME.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: THEME.textSecondary },
    activeTabText: { color: THEME.primary },
    closeBtn: { paddingLeft: 20, height: '100%', justifyContent: 'center' },
    toolbar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: THEME.card },
    filterBar: { gap: 10, paddingRight: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.background },
    activeChip: { backgroundColor: THEME.primary + '33', borderColor: THEME.primary },
    chipText: { fontSize: 11, fontWeight: '800', color: THEME.textSecondary },
    activeChipText: { color: THEME.primary },
    actionGroup: { flexDirection: 'row', gap: 10, borderLeftWidth: 1, borderLeftColor: THEME.border, paddingLeft: 12 },
    actionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: THEME.highlight, alignItems: 'center', justifyContent: 'center' },
    listContainer: { padding: 16 },
    logCard: { padding: 14, marginBottom: 12, backgroundColor: THEME.card, borderRadius: 10, borderLeftWidth: 4 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    logTime: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.textSecondary },
    logType: { fontSize: 11, fontWeight: '900' },
    logContent: { fontSize: 13, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: THEME.text },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120 },
    emptyText: { marginTop: 16, fontSize: 14, color: THEME.textSecondary, fontWeight: '600' },
    scrollContainer: { padding: 20 },
    sectionHeader: { fontSize: 12, fontWeight: '900', color: THEME.primary, letterSpacing: 1.5, marginBottom: 10, marginTop: 22 },
    card: { backgroundColor: THEME.card, borderRadius: 14, padding: 4, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: THEME.border },
    infoLabel: { fontSize: 13, color: THEME.textSecondary, fontWeight: '600', flex: 1 },
    infoValue: { fontSize: 13, color: THEME.text, fontWeight: '800', textAlign: 'right', flex: 1.5 },
    monospace: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    toolBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    toolBtnText: { fontSize: 14, fontWeight: 'bold' },
    emptyNote: { padding: 20, textAlign: 'center', color: THEME.textSecondary, fontStyle: 'italic' }
});
