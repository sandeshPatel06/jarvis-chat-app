import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { useRouter, Stack } from 'expo-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, View } from 'react-native';
import CallLogItem from '@/components/calls/CallLogItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CallsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  // Store
  const calls = useStore((state) => state.calls);
  const fetchCalls = useStore((state) => state.fetchCalls);
  const user = useStore((state) => state.user);
  const hasMoreCalls = useStore((state) => state.hasMoreCalls);
  const bulkDeleteCalls = useStore((state) => state.bulkDeleteCalls);
  const clearCallHistory = useStore((state) => state.clearCallHistory);
  const startCall = useStore((state) => state.startCall);
  const showAlert = useStore((state) => state.showAlert);

  // Local State
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'missed'>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCalls(false);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreCalls) return;
    setIsLoadingMore(true);
    await fetchCalls(true);
    setIsLoadingMore(false);
  };

  const handleBulkDelete = () => {
    const count = selectedCalls.size;
    showAlert(
        'Delete Calls', 
        `Delete ${count} selected call record(s)?`, 
        [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await bulkDeleteCalls(Array.from(selectedCalls));
                        exitSelectionMode();
                    } catch {
                        showAlert('Error', 'Failed to delete calls');
                    }
                }
            }
        ]
    );
  };

  const handleClearHistory = () => {
    showAlert(
        'Clear History', 
        'Delete all call records?', 
        [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete All', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await clearCallHistory();
                    } catch {
                        showAlert('Error', 'Failed to clear history');
                    }
                }
            }
        ]
    );
  };

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedCalls(new Set());
  }, []);

  const toggleSelection = useCallback((id: number) => {
    setSelectedCalls(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
            next.delete(id);
            if (next.size === 0) setIsSelectionMode(false);
        } else {
            next.add(id);
            setIsSelectionMode(true);
        }
        return next;
    });
  }, []);

  const onLongPress = useCallback((item: any) => {
    toggleSelection(item.id);
  }, [toggleSelection]);

  const filteredCalls = useMemo(() => {
    if (filter === 'all') return calls;
    if (filter === 'incoming') return calls.filter(c => c.caller.username !== user?.username);
    if (filter === 'outgoing') return calls.filter(c => c.caller.username === user?.username);
    if (filter === 'missed') {
      return calls.filter(c => {
        const isOutgoing = c.caller.username === user?.username;
        const isMissedStatus = c.status === 'missed' || c.status === 'no_answer' || c.status === 'rejected' || c.status === 'cancelled';
        return !isOutgoing && isMissedStatus;
      });
    }
    return calls;
  }, [calls, filter, user]);

  const handleCall = useCallback(async (username: string, isVideo: boolean = false) => {
    const token = useStore.getState().token;
    if (!token) return;

    let chat = useStore.getState().chats.find(c => c.name === username);
    if (!chat) {
      try {
        const conversation = await api.chat.createConversation(token, username);
        await useStore.getState().fetchChats();
        chat = useStore.getState().chats.find(c => c.id === conversation.id);
      } catch (error) {
        console.error('Failed to start call conversation:', error);
        showAlert('Error', 'Failed to start callback conversation');
        return;
      }
    }

    if (chat) {
      startCall(chat.id, isVideo);
      router.push(`/call/${chat.id}`);
    } else {
      showAlert('Error', 'Failed to start call');
    }
  }, [startCall, router, showAlert]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <CallLogItem
        item={item}
        user={user}
        colors={colors}
        isSelectionMode={isSelectionMode}
        isSelected={selectedCalls.has(item.id)}
        onPress={handleCall}
        onLongPress={onLongPress}
      />
    );
  }, [user, colors, handleCall, onLongPress, isSelectionMode, selectedCalls]);

  const FilterTab = ({ label, value, icon }: { label: string, value: typeof filter, icon: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.filterTab,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        filter === value && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]}
      onPress={() => setFilter(value)}
    >
      <View style={styles.filterTabContent}>
        <MaterialCommunityIcons 
          name={icon} 
          size={16} 
          color={filter === value ? 'white' : colors.textSecondary} 
          style={{ marginRight: 6 }}
        />
        <Text style={[
          styles.filterText,
          filter === value ? { color: 'white' } : { color: colors.textSecondary }
        ]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper style={styles.container} withExtraTopPadding={false}>
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
                  <TouchableOpacity onPress={exitSelectionMode} style={styles.headerIconButton}>
                      <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[styles.headerTitle, { color: colors.text, flex: 1, marginLeft: 16 }]}>
                      {selectedCalls.size} Selected
                  </Text>
                  {selectedCalls.size > 0 && (
                      <TouchableOpacity onPress={handleBulkDelete} style={styles.headerIconButton}>
                          <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.error || 'red'} />
                      </TouchableOpacity>
                  )}
              </View>
          ) : (
              <View style={styles.headerTitleContainer}>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Calls</Text>
                  <TouchableOpacity onPress={handleClearHistory} style={styles.headerIconButton}>
                      <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
              </View>
          )}
      </View>

      {/* Scrollable Filter Header */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterTab label="All" value="all" icon="phone-outline" />
          <FilterTab label="Incoming" value="incoming" icon="call-received" />
          <FilterTab label="Outgoing" value="outgoing" icon="call-made" />
          <FilterTab label="Missed" value="missed" icon="call-missed" />
        </ScrollView>
      </View>

      {filteredCalls.length === 0 ? (
        <View style={styles.emptyContent}>
            <MaterialCommunityIcons 
                name="phone-off-outline" 
                size={64} 
                color={colors.textSecondary} 
                style={{ opacity: 0.3, marginBottom: 20 }} 
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Call History</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {filter === 'all' 
                    ? "Your recent calls will appear here." 
                    : `No ${filter} calls found in your history.`}
            </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ItemSeparatorComponent={() => (
            <View style={[
              styles.separator,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
            ]} />
          )}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} /> : null
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    paddingHorizontal: 24,
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
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScrollWrapper: {
    backgroundColor: 'transparent',
  },
  filterScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 10,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 120,
  },
  separator: {
    height: 1,
    marginHorizontal: 24,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },
});
