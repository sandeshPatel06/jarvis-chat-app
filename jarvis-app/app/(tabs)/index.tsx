import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useStore } from '@/store';
import { requestFirebasePermission } from '@/services/firebaseMessaging';
import { Chat } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    View,
    Text,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatItem from '@/components/chat/ChatItem';

export default function ChatsScreen() {
    const router = useRouter();
    const { colors, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();

    // Specific selectors to avoid unnecessary re-renders
    const chats = useStore(useCallback((state) => state.chats, []));
    const deleteChats = useStore(useCallback((state) => state.deleteChats, []));
    const user = useStore(useCallback((state) => state.user, []));
    const showAlert = useStore(useCallback((state) => state.showAlert, []));
    const connectWebSocket = useStore(useCallback((state) => state.connectWebSocket, []));
    const animationsEnabled = useStore(useCallback((state) => state.animationsEnabled, []));
    const params = useLocalSearchParams();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Memoized search filter
    const filteredChats = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return chats;
        return chats.filter(chat =>
            (chat.name && chat.name.toLowerCase().includes(query)) ||
            (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)) ||
            (chat.phoneNumber && chat.phoneNumber.toLowerCase().includes(query)) ||
            (chat.id && chat.id.toLowerCase().includes(query))
        );
    }, [chats, searchQuery]);

    // Listen for search trigger from header button
    useEffect(() => {
        if (params.triggerSearch) {
            setIsSearching(true);
        }
    }, [params.triggerSearch]);

    useEffect(() => {
        void requestFirebasePermission();
    }, []);

    useEffect(() => {
        if (animationsEnabled) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
    }, [searchQuery, isSelectionMode, chats, animationsEnabled]);

    useEffect(() => {
        if (user) {
            connectWebSocket();
        }
    }, [user, connectWebSocket]);

    const formatTime = useCallback((date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, []);

    const handleLongPress = useCallback((chatId: string) => {
        setIsSelectionMode(true);
        setSelectedChats(new Set([chatId]));
    }, []);

    const handlePress = useCallback((chatId: string) => {
        if (isSelectionMode) {
            setSelectedChats(prev => {
                const newSelected = new Set(prev);
                if (newSelected.has(chatId)) {
                    newSelected.delete(chatId);
                    if (newSelected.size === 0) {
                        setIsSelectionMode(false);
                    }
                } else {
                    newSelected.add(chatId);
                }
                return newSelected;
            });
        } else {
            router.push(`/chat/${chatId}`);
        }
    }, [isSelectionMode, router]);

    const handleCancelSelection = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedChats(new Set());
    }, []);

    const handleDeleteSelected = useCallback(() => {
        const ids = Array.from(selectedChats);
        showAlert(
            "Delete Chats",
            `Are you sure you want to delete ${ids.length} chats?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: () => {
                        deleteChats(ids);
                        setIsSelectionMode(false);
                        setSelectedChats(new Set());
                    }
                }
            ]
        );
    }, [selectedChats, showAlert, deleteChats]);

    const handleProfilePress = useCallback((userId?: number) => {
        if (userId) {
            router.push(`/user/${userId}`);
        }
    }, [router]);

    const renderItem = useCallback(({ item }: { item: Chat }) => {
        return (
            <ChatItem
                item={item}
                isSelected={selectedChats.has(item.id)}
                isSelectionMode={isSelectionMode}
                colors={colors}
                onPress={handlePress}
                onLongPress={handleLongPress}
                onProfilePress={handleProfilePress}
                formatTime={formatTime}
            />
        );
    }, [selectedChats, isSelectionMode, colors, handlePress, handleLongPress, handleProfilePress, formatTime]);

    const toggleSearch = () => {
        setIsSearching(!isSearching);
        if (isSearching) {
            setSearchQuery('');
        }
    };

    const renderEmptyState = () => {
        if (searchQuery) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={[
                        styles.emptyIconContainer,
                        { backgroundColor: isDark ? 'rgba(142,134,255,0.1)' : 'rgba(108,99,255,0.06)' }
                    ]}>
                        <MaterialCommunityIcons name="magnify-close" size={44} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        We couldn&apos;t find any chats matching &quot;{searchQuery}&quot;.
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <View style={[
                    styles.emptyIconContainer,
                    { backgroundColor: isDark ? 'rgba(142,134,255,0.1)' : 'rgba(108,99,255,0.06)' }
                ]}>
                    <MaterialCommunityIcons name="chat-processing-outline" size={44} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Chats Yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Start talking with friends, AI agents, or explore public rooms.
                </Text>
                <TouchableOpacity
                    style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/contacts/select')}
                >
                    <Text style={styles.emptyButtonText}>Start a Chat</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <ScreenWrapper
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top', 'left', 'right']}
            withExtraTopPadding={false}
        >
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Custom Unified Header */}
            <View style={[
                styles.customHeader,
                {
                    borderBottomColor: isDark ? colors.cardBorder : 'rgba(0,0,0,0.05)',
                }
            ]}>
                {isSelectionMode ? (
                    <View style={styles.headerTitleContainer}>
                        <TouchableOpacity onPress={handleCancelSelection} style={styles.headerIconButton}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text, flex: 1, marginLeft: 16 }]}>
                            {selectedChats.size} Selected
                        </Text>
                        <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerIconButton}>
                            <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error || 'red'} />
                        </TouchableOpacity>
                    </View>
                ) : isSearching ? (
                    <View style={styles.headerTitleContainer}>
                        <View style={[styles.headerSearchContainer, { backgroundColor: isDark ? colors.surface : '#F5F5FA' }]}>
                            <TouchableOpacity onPress={toggleSearch} style={styles.searchInnerIcon}>
                                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.headerSearchInput, { color: colors.text }]}
                                placeholder="Search chats..."
                                placeholderTextColor={colors.textSecondary + '80'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchInnerIcon}>
                                    <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={toggleSearch}
                                style={[styles.headerIconButton, { backgroundColor: isDark ? colors.surface : '#F5F5FA' }]}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons name="magnify" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <FlatList
                data={filteredChats}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={() => (
                    filteredChats.length > 0 ? (
                        <View style={styles.headerComponent}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>All Conversations</Text>
                            </View>
                        </View>
                    ) : null
                )}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => (
                    <View style={[
                        styles.separator,
                        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                    ]} />
                )}
                ListEmptyComponent={renderEmptyState}
                getItemLayout={(_, index) => ({
                    length: 80,
                    offset: (80 + 5) * index,
                    index,
                })}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            <TouchableOpacity
                style={[styles.fab, { bottom: 80 + insets.bottom }]}
                onPress={() => router.push('/contacts/select')}
                activeOpacity={0.85}
            >
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <FontAwesome name="plus" size={22} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    customHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.6,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 12,
        flex: 1,
        height: 42,
    },
    searchInnerIcon: {
        padding: 4,
    },
    headerSearchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
        paddingVertical: 0,
    },
    listContent: {
        paddingBottom: 120,
        flexGrow: 1,
    },
    separator: {
        height: 1,
        marginHorizontal: 28,
        marginVertical: 2,
    },
    headerComponent: {
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        opacity: 0.7,
    },
    fab: {
        position: 'absolute',
        right: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 6,
    },
    fabGradient: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Empty state styling
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 88,
        height: 88,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    emptyButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
});
