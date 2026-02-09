import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import * as Device from 'expo-device';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';
import { DeveloperMenu } from '@/components/DeveloperMenu';

export default function HelpSettingsScreen() {
    const { colors } = useAppTheme();
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();
    const [clickCount, setClickCount] = React.useState(0);
    const [devMenuVisible, setDevMenuVisible] = React.useState(false);

    const handleDevMenuTrigger = useCallback(() => {
        setClickCount(prev => {
            const next = prev + 1;
            if (next === 7) {
                setDevMenuVisible(true);
                return 0;
            }
            return next;
        });
    }, []);

    const handleHelpCenter = useCallback(async () => {
        try {
            await WebBrowser.openBrowserAsync('https://support.jarvis-chat.com');
        } catch {
            showAlert('Error', 'Could not open help center. Please try again later.');
        }
    }, [showAlert]);

    const handleContactUs = useCallback(async () => {
        const url = 'mailto:support@jarvis-chat.com?subject=Jarvis AI Support Request';
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                showAlert('Contact Us', 'Please email us at support@jarvis-chat.com');
            }
        } catch {
            showAlert('Contact Us', 'Please email us at support@jarvis-chat.com');
        }
    }, [showAlert]);

    const handlePrivacyPolicy = useCallback(() => {
        router.push('/settings/privacy');
    }, [router]);

    const handleAppInfo = useCallback(() => {
        const deviceInfo = `Device: ${Device.modelName || 'Unknown Device'}\nOS: ${Device.osName} ${Device.osVersion || ''}`;
        showAlert('App Info', `Jarvis AI v1.0.0\nDeveloped by High-Tech Services\nBuild 2026.01.27\n\n${deviceInfo}`);
    }, [showAlert]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Help</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Support</Text>
                    <SettingCard>
                        <SettingRow
                            title="Help Center"
                            icon="question-circle"
                            onPress={handleHelpCenter}
                            color="#4FACFE"
                        />
                        <SettingRow
                            title="Contact us"
                            icon="envelope"
                            onPress={handleContactUs}
                            color="#6C63FF"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Legal & Info</Text>
                    <SettingCard>
                        <SettingRow
                            title="Terms and Privacy Policy"
                            icon="file-text"
                            onPress={handlePrivacyPolicy}
                            color="#38F9D7"
                        />
                        <SettingRow
                            title="App info"
                            icon="info-circle"
                            onPress={handleAppInfo}
                            color="#A18CD1"
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>from</Text>
                    <TouchableOpacity onPress={handleDevMenuTrigger} activeOpacity={1}>
                        <Text style={[styles.footerBrand, { color: colors.primary }]}>HIGH-TECH SERVICES</Text>
                    </TouchableOpacity>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
                </View>
            </ScrollView>
            <DeveloperMenu
                visible={devMenuVisible}
                onClose={() => setDevMenuVisible(false)}
            />
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
        paddingVertical: 20,
        paddingHorizontal: 20,
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
    footer: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.5,
    },
    footerBrand: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: 4,
    },
    version: {
        fontSize: 12,
        marginTop: 12,
        fontWeight: '500',
        opacity: 0.5,
    }
});
