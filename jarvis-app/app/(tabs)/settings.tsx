import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import SettingCard from '@/components/settings/SettingCard';
import { Avatar } from '@/components/ui/Avatar';

const SettingItem = React.memo(({ icon, title, subtitle, onPress, badge, color, colors }: any) => {
    return (
        <TouchableOpacity
            style={styles.cardItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: (color || colors.primary) + '12' }]}>
                <MaterialCommunityIcons name={icon} size={22} color={color || colors.primary} />
            </View>
            <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {badge && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{badge}</Text>
                </View>
            )}
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} style={styles.chevron} />
        </TouchableOpacity>
    );
});
SettingItem.displayName = 'SettingItem';

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
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
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
                        <SettingItem
                            icon="account-outline"
                            title="Account"
                            subtitle="Privacy, security, change number"
                            onPress={() => router.push('/settings/account')}
                            color="#4FACFE"
                            colors={colors}
                        />
                        <SettingItem
                            icon="chat-processing-outline"
                            title="Chats"
                            subtitle="Theme, wallpapers, chat history"
                            onPress={() => router.push('/settings/chats')}
                            color="#1AD1FF"
                            colors={colors}
                        />
                        <SettingItem
                            icon="bell-ring-outline"
                            title="Notifications"
                            subtitle="Messages, groups & calls"
                            onPress={() => router.push('/settings/notifications')}
                            color="#FF6B6B"
                            colors={colors}
                        />
                        <SettingItem
                            icon="database-outline"
                            title="Storage & Data"
                            subtitle="Network usage, auto-download"
                            onPress={() => router.push('/settings/storage')}
                            color="#FFD93D"
                            colors={colors}
                        />
                    </SettingCard>
                </View>

                {/* General Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
                    <SettingCard>
                        <SettingItem
                            icon="translate"
                            title="App Language"
                            subtitle={user?.app_language === 'en' ? 'English' : (user?.app_language || 'English')}
                            onPress={() => router.push('/settings/language')}
                            color="#20BF6B"
                            colors={colors}
                        />
                        <SettingItem
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
                            colors={colors}
                        />
                        <SettingItem
                            icon="help-circle-outline"
                            title="Help & Support"
                            subtitle="FAQ, contact us, privacy policy"
                            onPress={() => router.push('/settings/help')}
                            color="#45AAF2"
                            colors={colors}
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
            </ScrollView>
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
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 12,
        marginTop: 3,
        fontWeight: '600',
    },
    chevron: {
        opacity: 0.3,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        marginRight: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
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

