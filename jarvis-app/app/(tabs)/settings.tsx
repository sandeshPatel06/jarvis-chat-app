import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingCard from '@/components/settings/SettingCard';
import SettingRow from '@/components/settings/SettingRow';
import { Avatar } from '@/components/ui/Avatar';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors } = useAppTheme();
    const user = useStore(useCallback((state: any) => state.user, []));
    const logout = useStore(useCallback((state: any) => state.logout, []));
    const showAlert = useStore(useCallback((state: any) => state.showAlert, []));

    const handleLogout = useCallback(() => {
        showAlert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Logout', 
                    style: 'destructive', 
                    onPress: () => {
                        logout();
                        router.replace('/auth/login');
                    }
                }
            ]
        );
    }, [logout, router, showAlert]);

    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <KeyboardAwareScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Profile Header */}
                <TouchableOpacity
                    onPress={() => router.push('/settings/profile')}
                    activeOpacity={0.9}
                    style={styles.profileCardWrapper}
                >
                    <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <Avatar
                            source={user?.profile_picture}
                            size={70}
                            style={styles.avatar}
                        />
                        <View style={styles.profileInfo}>
                            <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'Jarvis User'}</Text>
                            <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={1}>
                                {user?.bio || 'Living in the future'}
                            </Text>
                        </View>
                        <View style={[styles.editIconCircle, { backgroundColor: colors.primary + '15' }]}>
                            <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account & Security</Text>
                    <SettingCard>
                        <SettingRow
                            icon="account-outline"
                            title="Account"
                            subtitle="Privacy, security, change number"
                            onPress={() => router.push('/settings/account')}
                            color="#4FACFE"
                        />
                        <SettingRow
                            icon="chat-processing-outline"
                            title="Chats"
                            subtitle="Theme, wallpapers, chat history"
                            onPress={() => router.push('/settings/chats')}
                            color="#1AD1FF"
                        />
                        <SettingRow
                            icon="bell-ring-outline"
                            title="Notifications"
                            subtitle="Messages, groups & calls"
                            onPress={() => router.push('/settings/notifications')}
                            color="#FF6B6B"
                        />
                        <SettingRow
                            icon="database-outline"
                            title="Storage & Data"
                            subtitle="Network usage, auto-download"
                            onPress={() => router.push('/settings/storage')}
                            color="#FFD93D"
                            isLast
                        />
                    </SettingCard>
                </View>

                {/* General Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
                    <SettingCard>
                        <SettingRow
                            icon="translate"
                            title="App Language"
                            subtitle={user?.app_language === 'en' ? 'English' : (user?.app_language || 'English')}
                            onPress={() => router.push('/settings/language')}
                            color="#20BF6B"
                        />
                        <SettingRow
                            icon="fingerprint"
                            title="App Lock"
                            subtitle="Secure with biometric lock"
                            onPress={() => {
                                import('expo-local-authentication').then(async (LocalAuth) => {
                                    const hasHardware = await LocalAuth.hasHardwareAsync();
                                    if (!hasHardware) {
                                        showAlert('Not Supported', 'Biometric authentication is not available on this device');
                                        return;
                                    }
                                    router.push('/settings/app-lock');
                                });
                            }}
                            color="#A55EEA"
                        />
                        <SettingRow
                            icon="help-circle-outline"
                            title="Help & Support"
                            subtitle="FAQ, contact us, privacy policy"
                            onPress={() => router.push('/settings/help')}
                            color="#45AAF2"
                            isLast
                        />
                    </SettingCard>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colors.error + '10' }]}
                    onPress={handleLogout}
                >
                    <MaterialCommunityIcons name="logout-variant" size={22} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.brand, { color: colors.text, opacity: 0.9 }]}>JARVIS CHAT</Text>
                    <Text style={[styles.version, { color: colors.textSecondary }]}>VERSION 1.2.0 • PRO</Text>
                </View>

                <View style={{ height: 120 }} />
            </KeyboardAwareScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    profileCardWrapper: {
        marginBottom: 32,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 22, // Squircle style
    },
    profileInfo: {
        flex: 1,
        marginLeft: 20,
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    status: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '600',
    },
    editIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        opacity: 0.7,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 20,
        marginTop: 8,
        marginBottom: 40,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '800',
        marginLeft: 10,
    },
    footer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    brand: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 3,
    },
    version: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 6,
        opacity: 0.4,
    }
});

