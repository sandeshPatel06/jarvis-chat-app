import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Text, View } from '@/components/Themed';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useStore } from '@/store';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import CallLogItem from '@/components/calls/CallLogItem';

export default function CallsScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  // Store
  const calls = useStore((state) => state.calls);
  const fetchCalls = useStore((state) => state.fetchCalls);
  const startCall = useStore((state) => state.startCall);
  const user = useStore((state) => state.user);
  const hasMoreCalls = useStore((state) => state.hasMoreCalls);

  // Local State
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    } else {
      alert('Could not redial. Chat not found.');
    }
  }, [startCall, router]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <CallLogItem
        item={item}
        user={user}
        colors={colors}
        onPress={handleCall}
      />
    );
  }, [user, colors, handleCall]);

  const FilterTab = ({ label, value }: { label: string, value: typeof filter }) => (
    <TouchableOpacity
      style={[
        styles.filterTab,
        filter === value && { backgroundColor: colors.primary, borderColor: colors.primary }
      ]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterText,
        filter === value ? { color: 'white' } : { color: colors.text }
      ]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper style={styles.container} edges={['left', 'right']} withExtraTopPadding={false}>

      {/* Filter Header */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <FilterTab label="All" value="all" />
        <FilterTab label="Received" value="incoming" />
        <FilterTab label="Dialed" value="outgoing" />
      </View>

      {filteredCalls.length === 0 ? (
        <View style={styles.emptyContent}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <FontAwesome name="phone" size={40} color={colors.tabIconDefault} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No {filter !== 'all' ? filter : 'Recent'} Calls</Text>
          <Text style={styles.emptySubtitle}>Calls will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCalls}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: 74,
            offset: 74 * index,
            index,
          })}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} style={{ padding: 20 }} /> : null
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 120, // Enough room for floating tab bar
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    lineHeight: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
