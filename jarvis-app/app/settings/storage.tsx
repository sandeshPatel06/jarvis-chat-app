import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function StorageSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const handleToggle = useCallback(async (value: boolean) => {
        try {
            await updateSettings({ storage_auto_download_media: value });
        } catch { }
    }, [updateSettings]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Storage and Data</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Media Auto-download</Text>
                    <SettingCard>
                        <SettingRow
                            title="Auto-download Media"
                            subtitle="Download incoming photos and videos"
                            icon="download"
                            isSwitch
                            switchValue={user?.storage_auto_download_media ?? true}
                            onSwitchChange={handleToggle}
                            color="#4FACFE"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Network Usage</Text>
                    <SettingCard>
                        <SettingRow
                            title="Manage Storage"
                            value="0 KB"
                            icon="hdd-o"
                            onPress={() => { }}
                            color="#6C63FF"
                        />
                        <SettingRow
                            title="Network Usage"
                            value="0 KB sent • 0 KB received"
                            icon="exchange"
                            onPress={() => { }}
                            color="#38F9D7"
                            isLast
                        />
                    </SettingCard>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 0.5,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
});
