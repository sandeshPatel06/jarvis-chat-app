import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useStore } from '@/store';
import { Chat } from '@/types';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, LayoutAnimation, Platform } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';
import ChatItem from '@/components/chat/ChatItem';

export default function ChatsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

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
      (chat.id && chat.id.toLowerCase().includes(query)) // ID usually contains the phone number
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

      {/* Floating Search Bar (if searching) */}
      {isSearching && (
        <View style={styles.header}>
          <View style={[styles.headerSearchContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity onPress={toggleSearch} style={styles.headerIcon}>
              <FontAwesome name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <TextInput
              style={[styles.headerSearchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.headerIcon}>
                <FontAwesome name="times" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        getItemLayout={(_, index) => ({
          length: 84, // Approximate height of each item (64 avatar + 20 padding)
          offset: (84 + 10) * index, // 10 is separator height
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
  header: {
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerIcon: {
    padding: 5,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    marginRight: 10,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 150, // More space for FAB and floating tab bar
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    // shadowColor: "#000",
    // shadowOffset: {
    // 	width: 0,
    // 	height: 1,
    // },
    // shadowOpacity: 0.05,
    // shadowRadius: 2,
    // elevation: 1,
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
    backgroundColor: '#4ade80', // Green-400
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
    display: 'none', // Remove separator
  },
  fab: {
    position: 'absolute',
    bottom: '20%', // Above tab bar
    right: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 28,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
