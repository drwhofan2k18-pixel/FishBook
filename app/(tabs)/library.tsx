import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCatches, type CatchesFilters } from '@/lib/catches';
import CatchCard from '@/components/catch-card';
import { getPendingSyncCount } from '@/lib/offline-db';
import { clusterCatchLocations, getUserCatchLocations, type SpotCluster } from '@/lib/recommendations';
import { useAuth } from '@/lib/auth-context';

type SortOption = 'date' | 'weight' | 'species';

export default function LibraryScreen() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [hotSpots, setHotSpots] = useState<SpotCluster[]>([]);

  useEffect(() => {
    if (user?.id) {
      getUserCatchLocations(user.id).then(locs => {
        setHotSpots(clusterCatchLocations(locs));
      });
    }
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo<CatchesFilters>(
    () => ({
      search: debouncedSearch || undefined,
      sortBy,
      habitat: activeFilter !== 'All' ? activeFilter.toLowerCase() : undefined,
    }),
    [debouncedSearch, sortBy, activeFilter],
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useCatches(filters);

  const allCatches = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const handleCatchPress = useCallback((id: string) => {
    router.push(`/catch/${id}`);
  }, []);

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'weight', label: 'Weight' },
    { key: 'species', label: 'Species' },
  ];

  const filterOptions = ['All', 'Freshwater', 'Saltwater'];

  const pendingSync = getPendingSyncCount();

  const renderHeader = () => (
    <View>
      {pendingSync > 0 && (
        <View style={styles.syncBanner}>
          <Ionicons name="cloud-upload-outline" size={16} color="#FF9500" />
          <Text style={styles.syncBannerText}>
            {pendingSync} catch{pendingSync > 1 ? 'es' : ''} pending sync
          </Text>
        </View>
      )}

      {hotSpots.length > 0 && !debouncedSearch && (
        <View style={styles.hotSpotsSection}>
          <Text style={styles.hotSpotsTitle}>Your Hot Spots</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotSpotsScroll}>
            {hotSpots.map((spot, i) => (
              <View key={i} style={styles.hotSpotCard}>
                <Ionicons name="flame" size={16} color="#FF9500" />
                <Text style={styles.hotSpotText}>{spot.water_body || 'Unamed Water'}</Text>
                <Text style={styles.hotSpotCount}>{spot.catch_count} catches</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search catches..."
          placeholderTextColor="#8E8E93"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {filterOptions.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.toolActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortPicker(!showSortPicker)}
          >
            <Ionicons name="funnel-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid-outline" size={18} color={viewMode === 'grid' ? '#007AFF' : '#8E8E93'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list-outline" size={18} color={viewMode === 'list' ? '#007AFF' : '#8E8E93'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showSortPicker && (
        <View style={styles.sortPicker}>
          {sortOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
            style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
            onPress={() => { setSortBy(opt.key as SortOption); setShowSortPicker(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && <Ionicons name="checkmark" size={18} color="#007AFF" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {debouncedSearch ? (
        <Text style={styles.resultCount}>{allCatches.length} result{allCatches.length !== 1 ? 's' : ''}</Text>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading catches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load catches</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={allCatches}
        renderItem={({ item }) => (
          <CatchCard catchItem={item} onPress={handleCatchPress} variant={viewMode} />
        )}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={`${viewMode}-${sortBy}`}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fish-outline" size={56} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No catches yet</Text>
            <Text style={styles.emptySubtext}>
              {debouncedSearch
                ? 'No catches match your search'
                : 'Go to the Catch tab to log your first one!'}
            </Text>
            {!debouncedSearch && (
              <TouchableOpacity
                style={styles.logCatchButton}
                onPress={() => router.push('/(tabs)/camera')}
              >
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.logCatchText}>Log Your First Catch</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  syncBannerText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  hotSpotsSection: {
    marginBottom: 20,
  },
  hotSpotsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
    marginLeft: 4,
  },
  hotSpotsScroll: {
    gap: 12,
    paddingRight: 16,
  },
  hotSpotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hotSpotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  hotSpotCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  toolActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  viewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  viewButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  sortPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sortOptionActive: {
    backgroundColor: '#E8F0FE',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  gridRow: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  logCatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  logCatchText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
