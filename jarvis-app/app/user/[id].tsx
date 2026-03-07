import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { api } from '@/services/api';
import { useStore } from '@/store';
import { User } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>(); // This is user ID
    const router = useRouter();
    const token = useStore((state) => state.token);
    const showToast = useStore((state) => state.showToast);
    const chats = useStore((state) => state.chats);

    // Blocking
    const blockedUsers = useStore((state) => state.blockedUsers);
    const blockUser = useStore((state) => state.blockUser);
    const unblockUser = useStore((state) => state.unblockUser);
    const fetchBlockedUsers = useStore((state) => state.fetchBlockedUsers);
    const startCall = useStore((state) => state.startCall);
    const showAlert = useStore((state) => state.showAlert);

    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = parseInt(id || '0');
    const isBlocked = blockedUsers.includes(userId);

    const handleToggleBlock = async () => {
        try {
            if (isBlocked) {
                await unblockUser(userId);
                showToast('success', 'User Unblocked', `${userProfile?.username} has been unblocked.`);
            } else {
                await blockUser(userId);
                showToast('success', 'User Blocked', `${userProfile?.username} has been blocked.`);
            }
        } catch {
            showToast('error', 'Error', 'Failed to update block status');
        }
    };


    const { colors } = useAppTheme();

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!token || !id) return;

            setLoading(true);
            setError(null);

            // Fetch blocked users to ensure state is up to date
            fetchBlockedUsers();

            try {
                const profile = await api.auth.getUserProfile(token, parseInt(id));
                setUserProfile(profile);
            } catch (err: any) {
                console.error('Failed to fetch user profile:', err);
                setError('Failed to load user profile');
                showToast('error', 'Error', 'Failed to load user profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id, token, fetchBlockedUsers, showToast]);

    // Find the chat with this user to navigate back to it
    const chat = chats.find((c) => c.user_id === parseInt(id));

    const handleMessage = () => {
        if (chat) {
            router.push(`/chat/${chat.id}`);
        } else {
            showToast('info', 'Info', 'Start a conversation from contacts');
            router.back();
        }
    };

    const handleCall = (isVideo: boolean = false) => {
        if (chat) {
            startCall(chat.id, isVideo);
            router.push(`/call/${chat.id}`);
        } else {
            showToast('info', 'Info', 'Start a conversation from contacts to make calls');
        }
    };

    if (loading) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    if (error || !userProfile) {
        return (
            <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <FontAwesome name="exclamation-circle" size={48} color={colors.text} style={{ opacity: 0.5, marginBottom: 16 }} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error || 'User not found'}</Text>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.primary, marginTop: 20 }]}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileSection}>
                    <Avatar
                        source={userProfile.profile_picture}
                        size={120}
                        style={styles.avatar}
                    />
                    <Text style={[styles.name, { color: colors.text }]}>{userProfile.username}</Text>
                    {userProfile.phone_number && (
                        <Text style={[styles.number, { color: colors.text }]}>{userProfile.phone_number}</Text>
                    )}
                </View>

                {/* Actions Row */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
                        onPress={handleMessage}
                    >
                        <FontAwesome name="comment" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
                        onPress={() => handleCall(false)}
                    >
                        <FontAwesome name="phone" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
                        onPress={() => handleCall(true)}
                    >
                        <FontAwesome name="video-camera" size={24} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Video</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                    {userProfile.bio && (
                        <>
                            <View style={styles.item}>
                                <Text style={[styles.label, { color: colors.text }]}>About</Text>
                                <Text style={[styles.value, { color: colors.text }]}>{userProfile.bio}</Text>
                            </View>
                            <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />
                        </>
                    )}
                    {userProfile.phone_number && (
                        <View style={styles.item}>
                            <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
                            <Text style={[styles.value, { color: colors.text }]}>{userProfile.phone_number}</Text>
                            <Text style={styles.subValue}>Mobile</Text>
                        </View>
                    )}
                </View>

                {/* Operations */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                    <TouchableOpacity style={styles.item} onPress={() => {
                        if (isBlocked) {
                            showAlert(
                                'Unblock User',
                                `Are you sure you want to unblock ${userProfile.username}?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Unblock', onPress: handleToggleBlock }
                                ]
                            );
                        } else {
                            showAlert(
                                'Block User',
                                `Are you sure you want to block ${userProfile.username}?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Block', style: 'destructive', onPress: handleToggleBlock }
                                ]
                            );
                        }
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome name={isBlocked ? "unlock" : "ban"} size={20} color={isBlocked ? colors.text : "#ff4444"} style={{ marginRight: 15 }} />
                            <Text style={{ color: isBlocked ? colors.text : '#ff4444', fontSize: 16 }}>{isBlocked ? 'Unblock' : 'Block'} {userProfile.username}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={[styles.separator, { backgroundColor: colors.itemSeparator }]} />
                    <TouchableOpacity style={styles.item}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesome name="thumbs-down" size={20} color="#ff4444" style={{ marginRight: 15 }} />
                            <Text style={{ color: '#ff4444', fontSize: 16 }}>Report {userProfile.username}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    number: {
        fontSize: 16,
        opacity: 0.6,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    actionButton: {
        width: 100,
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        gap: 5,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginHorizontal: 15,
        borderRadius: 15,
        marginBottom: 20,
        overflow: 'hidden',
    },
    item: {
        padding: 15,
    },
    label: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 5,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    subValue: {
        fontSize: 12,
        color: 'gray',
        marginTop: 2,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 15,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
