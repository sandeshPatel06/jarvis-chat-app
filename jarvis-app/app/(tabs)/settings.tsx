import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
            <View style={[styles.iconBox, { backgroundColor: (color || colors.primary) + '15' }]}>
                <FontAwesome name={icon} size={20} color={color || colors.primary} />
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
            <FontAwesome name="chevron-right" size={14} color={colors.tabIconDefault} style={styles.chevron} />
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
        logout();
        router.replace('/auth/login');
    }, [logout, router]);

    const navigateTo = useCallback((path: any) => {
        router.push(path);
    }, [router]);


    return (
        <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Card */}
                <TouchableOpacity
                    onPress={() => router.push('/settings/profile')}
                    activeOpacity={0.9}
                    style={styles.profileCardWrapper}
                >
                    <View
                        style={[
                            styles.profileCard,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.cardBorder,
                                borderWidth: 1
                            }
                        ]}
                    >
                        <View style={styles.profileContent}>
                            <View style={styles.avatarWrapper}>
                                <Avatar
                                    source={user?.profile_picture}
                                    size={76}
                                    online={true}
                                    style={styles.avatar}
                                />
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'User'}</Text>
                                <Text style={[styles.status, { color: colors.textSecondary }]} numberOfLines={1}>{user?.bio || 'Available'}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.editBtn, { backgroundColor: colors.primary + '15' }]}
                                onPress={() => router.push('/settings/profile')}
                            >
                                <FontAwesome name="pencil" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Preferences</Text>
                    <SettingCard>
                        <SettingItem
                            icon="user"
                            title="Account"
                            subtitle="Privacy, security, change number"
                            onPress={() => navigateTo('/settings/account')}
                            color="#4FACFE"
                            colors={colors}
                        />
                        <SettingItem
                            icon="comment"
                            title="Chats"
                            subtitle="Theme, wallpapers, history"
                            onPress={() => navigateTo('/settings/chats')}
                            color="#00F2FE"
                            colors={colors}
                        />
                        <SettingItem
                            icon="bell"
                            title="Notifications"
                            subtitle="Messages, groups & calls"
                            onPress={() => navigateTo('/settings/notifications')}
                            color="#FA709A"
                            colors={colors}
                        />
                        <SettingItem
                            icon="database"
                            title="Storage"
                            subtitle="Network usage, auto-download"
                            onPress={() => navigateTo('/settings/storage')}
                            color="#FEE140"
                            colors={colors}
                        />
                    </SettingCard>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>General</Text>
                    <SettingCard>
                        <SettingItem
                            icon="globe"
                            title="App Language"
                            subtitle={user?.app_language === 'en' ? 'English' : (user?.app_language || 'English')}
                            onPress={() => navigateTo('/settings/language')}
                            color="#38F9D7"
                            colors={colors}
                        />
                        <SettingItem
                            icon="question-circle"
                            title="Help"
                            subtitle="Faq, contact us, privacy"
                            onPress={() => navigateTo('/settings/help')}
                            color="#A18CD1"
                            colors={colors}
                        />
                    </SettingCard>
                    <SettingItem
                        icon="lock"
                        title="App Lock"
                        subtitle="Secure app with biometric authentication"
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
                        colors={colors}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colors.error + '10' }]}
                    onPress={handleLogout}
                >
                    <FontAwesome name="sign-out" size={20} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.brand, { color: colors.textSecondary }]}>JARVIS AI</Text>
                    <Text style={[styles.version, { color: colors.textSecondary, opacity: 0.5 }]}>v1.0.0</Text>
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
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    pageTitle: {
        fontSize: 34,
        fontWeight: '900',
        marginBottom: 30,
        letterSpacing: -1,
    },
    profileCardWrapper: {
        marginBottom: 35,
    },
    profileCard: {
        borderRadius: 28,
        padding: 24,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 18,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.3,
    },
    status: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 4,
        fontWeight: '500',
    },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 16,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        // Borders are now handled by the shared SettingCard wrap
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 13,
        marginTop: 3,
        fontWeight: '500',
    },
    chevron: {
        opacity: 0.2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 22,
        marginTop: 10,
    },
    logoutText: {
        fontSize: 17,
        fontWeight: '800',
        marginLeft: 12,
    },
    footer: {
        marginTop: 50,
        alignItems: 'center',
    },
    brand: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 4,
    },
    version: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 6,
    }
});

