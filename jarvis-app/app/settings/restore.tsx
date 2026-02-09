import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { Chat } from '@/types';
import { api } from '@/services/api';
import { getMediaUrl } from '@/utils/media';

export default function RestoreSettingsScreen() {
    const { colors, isDark } = useAppTheme();
    const router = useRouter();
    const token = useStore((state) => state.token);
    const restoreChats = useStore((state) => state.restoreChats);
    const showAlert = useStore((state) => state.showAlert);
    const [deletedChats, setDeletedChats] = useState<Chat[]>([]);
    const [selectedChatIds, setSelectedChatIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDeletedChats = useCallback(async () => {
        if (!token) return;
        try {
            const chats = await api.chat.getConversations(token, true); // true = deleted
            setDeletedChats(chats);
        } catch (e) {
            console.error(e);
            showAlert('Error', 'Failed to fetch deleted chats');
        } finally {
            setLoading(false);
        }
    }, [token, showAlert]);

    useEffect(() => {
        fetchDeletedChats();
    }, [fetchDeletedChats]);

    const toggleChatSelection = useCallback((chatId: string) => {
        const id = parseInt(chatId);
        setSelectedChatIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const handleRestore = useCallback(async () => {
        if (selectedChatIds.length === 0) {
            showAlert('Selection Required', 'Please select at least one chat to restore.');
            return;
        }

        try {
            await restoreChats(selectedChatIds, undefined);
            showAlert('Success', 'Selected chats have been restored', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch {
            showAlert('Error', 'Failed to restore chats');
        }
    }, [selectedChatIds, restoreChats, router, showAlert]);

    const renderItem = useCallback(({ item }: { item: Chat }) => {
        const isSelected = selectedChatIds.includes(parseInt(item.id));
        const avatarUrl = getMediaUrl(item.avatar);

        return (
            <TouchableOpacity
                style={[
                    styles.chatItem,
                    {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                        borderWidth: isDark ? 1 : 0,
                    }
                ]}
                onPress={() => toggleChatSelection(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.chatInfo}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={avatarUrl ? { uri: avatarUrl } : require('@/assets/images/default-avatar.png')}
                            style={styles.avatar}
                        />
                        {isSelected && (
                            <View style={[styles.selectionBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                                <FontAwesome name="check" size={10} color="white" />
                            </View>
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={[styles.chatName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.chatSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                            Deleted on {new Date(item.lastMessageTime).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <View style={[
                    styles.radio,
                    { borderColor: isSelected ? colors.primary : colors.tabIconDefault + '40' },
                    isSelected && { backgroundColor: colors.primary }
                ]}>
                    {isSelected && <FontAwesome name="check" size={12} color="white" />}
                </View>
            </TouchableOpacity>
        );
    }, [colors, isDark, selectedChatIds, toggleChatSelection]);

    return (
        <ScreenWrapper style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.itemSeparator }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Restore</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.descriptionContainer}>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Select conversations you would like to bring back to your active chats.
                </Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={deletedChats}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + '10' }]}>
                                <FontAwesome name="history" size={40} color={colors.primary} />
                            </View>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No recently deleted chats found.
                            </Text>
                        </View>
                    }
                />
            )}

            {selectedChatIds.length > 0 && (
                <View style={[styles.footer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity onPress={handleRestore} activeOpacity={0.9}>
                        <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            style={styles.restoreButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.restoreButtonText}>
                                Restore {selectedChatIds.length} Chat{selectedChatIds.length > 1 ? 's' : ''}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
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
    descriptionContainer: {
        paddingHorizontal: 32,
        paddingVertical: 24,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.7,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
    },
    chatInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    selectionBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatName: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 4,
    },
    chatSubtext: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.7,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        opacity: 0.6,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    restoreButton: {
        paddingVertical: 16,
        borderRadius: 18,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    restoreButtonText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 1,
    }
});
