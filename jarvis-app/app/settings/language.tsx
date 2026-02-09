import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Localization from 'expo-localization';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingRow from '@/components/settings/SettingRow';
import SettingCard from '@/components/settings/SettingCard';

export default function LanguageSettingsScreen() {
    const { colors } = useAppTheme();
    const user = useStore((state) => state.user);
    const updateSettings = useStore((state) => state.updateSettings);
    const router = useRouter();

    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'es', name: 'Spanish', native: 'Español' },
        { code: 'fr', name: 'French', native: 'Français' },
        { code: 'de', name: 'German', native: 'Deutsch' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    ];

    const systemLocale = Localization.getLocales()[0];
    const systemLanguageName = languages.find(l => l.code === systemLocale.languageCode)?.name || systemLocale.languageCode;

    const handleSelect = useCallback(async (code: string) => {
        try {
            await updateSettings({ app_language: code });
        } catch { }
    }, [updateSettings]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>App Language</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Device Language</Text>
                    <SettingCard>
                        <SettingRow
                            title="System Default"
                            subtitle={systemLanguageName || undefined}
                            isSelected={user?.app_language === systemLocale.languageCode}
                            onPress={() => handleSelect(systemLocale.languageCode || 'en')}
                            isLast
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Available Languages</Text>
                    <SettingCard>
                        {languages.map((lang, index) => (
                            <SettingRow
                                key={lang.code}
                                title={lang.name}
                                subtitle={lang.native}
                                isSelected={user?.app_language === lang.code}
                                onPress={() => handleSelect(lang.code)}
                                isLast={index === languages.length - 1}
                            />
                        ))}
                    </SettingCard>
                </View>

                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Changing the language will update the entire app interface.
                </Text>
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
    hint: {
        fontSize: 12,
        marginTop: 12,
        marginLeft: 8,
        lineHeight: 16,
        fontWeight: '500',
        opacity: 0.5,
        textAlign: 'center',
        paddingHorizontal: 40,
    }
});
