import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

interface Species {
  id: number;
  common_name: string;
  scientific_name: string;
  family: string | null;
  habitat: string[] | null;
  is_game_fish: boolean | null;
  conservation_status: string | null;
}

export default function SpeciesGuideScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('species')
      .select('id, common_name, scientific_name, family, habitat, is_game_fish, conservation_status')
      .order('common_name')
      .limit(100);

    if (debouncedQuery) {
      q = q.or(`common_name.ilike.%${debouncedQuery}%,scientific_name.ilike.%${debouncedQuery}%`);
    }

    if (activeFilter === 'Game Fish') {
      q = q.eq('is_game_fish', true);
    } else if (activeFilter === 'Freshwater') {
      q = q.contains('habitat', ['freshwater']);
    } else if (activeFilter === 'Saltwater') {
      q = q.contains('habitat', ['saltwater']);
    }

    const { data, error } = await q;
    if (!error) setSpecies(data ?? []);
    setLoading(false);
  }, [debouncedQuery, activeFilter]);

  useEffect(() => { fetchSpecies(); }, [fetchSpecies]);

  const filters = ['All', 'Game Fish', 'Freshwater', 'Saltwater'];

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Least Concern': return colors.success;
      case 'Near Threatened': return colors.warning;
      case 'Vulnerable': return colors.danger;
      case 'Endangered': return 'colors.pink';
      case 'Critically Endangered': return 'colors.purple';
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Species Guide</Text>
        <Text style={styles.subtitle}>{species.length} species</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={species}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.speciesCard}
              onPress={() => router.push(`/species/${item.id}`)}
            >
              <View style={styles.speciesIcon}>
                <Ionicons name="fish-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.speciesInfo}>
                <Text style={styles.commonName}>{item.common_name}</Text>
                <Text style={styles.scientificName}>{item.scientific_name}</Text>
                <View style={styles.tagRow}>
                  {item.family && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.family}</Text>
                    </View>
                  )}
                  {item.conservation_status && (
                    <View style={[styles.tag, { backgroundColor: getStatusColor(item.conservation_status) + '20' }]}>
                      <Text style={[styles.tagText, { color: getStatusColor(item.conservation_status) }]}>
                        {item.conservation_status}
                      </Text>
                    </View>
                  )}
                  {item.is_game_fish && (
                    <View style={[styles.tag, { backgroundColor: 'colors.gold20' }]}>
                      <Text style={[styles.tagText, { color: 'colors.goldDark' }]}>Game Fish</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No species found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 14, height: 44, margin: 16, marginBottom: 8, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.divider },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.textOnPrimary },
  listContent: { padding: 16, paddingTop: 4 },
  speciesCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  speciesIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  speciesInfo: { flex: 1 },
  commonName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  scientificName: { fontSize: 13, fontStyle: 'italic', color: colors.textSecondary, marginTop: 1 },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 11, color: colors.textBody, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
});
