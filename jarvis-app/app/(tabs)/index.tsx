import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { Chat } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import ChatItem from '@/components/chat/ChatItem';

export default function ChatsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  // Specific selectors to avoid unnecessary re-renders
  const chats = useStore(useCallback((state) => state.chats, []));
  const fetchChats = useStore(useCallback((state) => state.fetchChats, []));
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
    if (animationsEnabled) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [searchQuery, isSelectionMode, chats, animationsEnabled]);

  useEffect(() => {
    if (user) {
      connectWebSocket();
      fetchChats();
    }
  }, [user, connectWebSocket, fetchChats]);

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

  return (
    <ScreenWrapper
      style={styles.container}
      edges={isSearching || isSelectionMode ? ['top', 'left', 'right'] : ['left', 'right']}
      withExtraTopPadding={false}
    >
      <Stack.Screen
        options={{
          headerShown: !isSearching && !isSelectionMode,
          headerTitle: 'Chats',
        }}
      />

      {/* Selection Mode Header - only show when active */}
      {isSelectionMode && (
        <View style={[styles.header, { borderBottomColor: 'transparent' }]}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={handleCancelSelection} style={styles.headerIcon}>
              <FontAwesome name="times" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20 }]}>{selectedChats.size} Selected</Text>
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerIcon}>
              <FontAwesome name="trash" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Unique Header Search bar inside the scrollable area (or integrated) */}
      {isSearching && (
        <View style={[styles.searchOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.headerSearchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderBottomWidth: 1 }]}>
            <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.headerSearchInput, { color: colors.text }]}
              placeholder="Search conversations..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.headerIcon}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.headerComponent}>
            <View style={[styles.sectionHeader, { marginTop: 10, marginBottom: 8 }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>All Conversations</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        getItemLayout={(_, index) => ({
          length: 96,
          offset: (96 + 12) * index,
          index,
        })}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/contacts/select')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <FontAwesome name="plus" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerIcon: {
    padding: 6,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Platform.OS === 'ios' ? 44 : 20,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  listContent: {
    paddingBottom: 200,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  message: {
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  separator: {
    display: 'none',
  },
  headerComponent: {
    paddingVertical: 10,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 100, 
    right: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
