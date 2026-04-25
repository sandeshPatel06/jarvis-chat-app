import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import { useRouter, Stack } from 'expo-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import CallLogItem from '@/components/calls/CallLogItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CallsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  // Store
  const calls = useStore((state) => state.calls);
  const fetchCalls = useStore((state) => state.fetchCalls);
  const user = useStore((state) => state.user);
  const hasMoreCalls = useStore((state) => state.hasMoreCalls);
  const bulkDeleteCalls = useStore((state) => state.bulkDeleteCalls);
  const clearCallHistory = useStore((state) => state.clearCallHistory);
  const startCall = useStore((state) => state.startCall);

  // Local State
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCalls, setSelectedCalls] = useState<Set<number>>(new Set());

  const showAlert = useStore((state) => state.showAlert);

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
    return calls;
  }, [calls, filter, user]);

  const handleCall = useCallback((username: string, isVideo: boolean = false) => {
    const chat = useStore.getState().chats.find(c => c.name === username);
    if (chat) {
      startCall(chat.id, isVideo);
      router.push(`/call/${chat.id}`);
    }
  }, [startCall, router]);

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

  const FilterTab = ({ label, value }: { label: string, value: typeof filter }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.filterTab,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        filter === value && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterText,
        filter === value ? { color: 'white' } : { color: colors.textSecondary }
      ]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>
      <Stack.Screen 
        options={{
            headerTitle: isSelectionMode ? `${selectedCalls.size} Selected` : 'Calls',
            headerLeft: isSelectionMode ? () => (
                <TouchableOpacity onPress={exitSelectionMode} style={{marginLeft: 16}}>
                    <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
            ) : undefined,
            headerRight: () => (
                <TouchableOpacity 
                    onPress={isSelectionMode ? handleBulkDelete : handleClearHistory} 
                    style={{marginRight: 16}}
                >
                    <MaterialCommunityIcons 
                        name={isSelectionMode ? "trash-can" : "trash-can-outline"} 
                        size={24} 
                        color={isSelectionMode ? colors.primary : colors.textSecondary} 
                    />
                </TouchableOpacity>
            )
        }}
      />
      {/* Filter Header */}
      <View style={styles.filterContainer}>
        <FilterTab label="All" value="all" />
        <FilterTab label="Incoming" value="incoming" />
        <FilterTab label="Outgoing" value="outgoing" />
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '800',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 120,
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
