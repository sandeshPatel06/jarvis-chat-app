import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { Stack } from 'expo-router';
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
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <Stack.Screen 
                options={{
                    headerTitle: 'App Language',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Device Language</Text>
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
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Available Languages</Text>
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

                <View style={styles.hintContainer}>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                        Changing the language will update the entire app interface.
                    </Text>
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
        marginBottom: 16,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    hintContainer: {
        marginTop: 8,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    hint: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
        opacity: 0.5,
        textAlign: 'center',
    }
});
