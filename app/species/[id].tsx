import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatWeight, formatLength, useUnitStore } from '@/lib/units';

interface SpeciesData {
  id: number;
  common_name: string;
  scientific_name: string;
  family: string | null;
  habitat: string[] | null;
  description: string | null;
  min_weight_kg: number | null;
  max_weight_kg: number | null;
  min_length_cm: number | null;
  max_length_cm: number | null;
  conservation_status: string | null;
  is_game_fish: boolean | null;
  region_ranges: { regions?: string[]; continents?: string[] } | null;
}

interface UserCatch {
  id: string;
  weight_kg: number | null;
  length_cm: number | null;
  caught_at: string;
  location_name: string | null;
}

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const units = useUnitStore();
  const [species, setSpecies] = useState<SpeciesData | null>(null);
  const [userCatches, setUserCatches] = useState<UserCatch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: sp } = await supabase
        .from('species')
        .select('*')
        .eq('id', parseInt(id, 10))
        .single();
      setSpecies(sp as SpeciesData);

      if (user?.id && sp) {
        const { data: catches } = await supabase
          .from('catches')
          .select('id, weight_kg, length_cm, caught_at, location_name')
          .eq('user_id', user.id)
          .eq('final_species_id', sp.id)
          .order('caught_at', { ascending: false })
          .limit(20);
        setUserCatches((catches ?? []) as UserCatch[]);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!species) {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>Species not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const habitatLabel = species.habitat?.includes('saltwater') ? 'Saltwater' : species.habitat?.includes('freshwater') ? 'Freshwater' : species.habitat?.[0] ?? 'Unknown';

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Least Concern': return '#34C759';
      case 'Near Threatened': return '#FF9500';
      case 'Vulnerable': return '#FF3B30';
      case 'Endangered': return '#FF2D55';
      case 'Critically Endangered': return '#AF52DE';
      default: return '#8E8E93';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{species.common_name}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.imagePlaceholder}>
        <Ionicons name="fish-outline" size={64} color="#C7C7CC" />
      </View>

      <Text style={styles.scientificName}>{species.scientific_name}</Text>

      <View style={styles.pillsRow}>
        <View style={[styles.pill, styles.pillBlue]}>
          <Text style={styles.pillText}>{habitatLabel}</Text>
        </View>
        {species.family && (
          <View style={[styles.pill, styles.pillGreen]}>
            <Text style={styles.pillText}>{species.family}</Text>
          </View>
        )}
        {species.conservation_status && (
          <View style={[styles.pill, { backgroundColor: getStatusColor(species.conservation_status) + '20' }]}>
            <Text style={[styles.pillText, { color: getStatusColor(species.conservation_status) }]}>
              {species.conservation_status}
            </Text>
          </View>
        )}
        {species.is_game_fish && (
          <View style={[styles.pill, { backgroundColor: '#FFD60A20' }]}>
            <Text style={[styles.pillText, { color: '#B8860B' }]}>Game Fish</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Size & Weight</Text>
        <View style={styles.sizeRow}>
          <View style={styles.sizeItem}>
            <Ionicons name="resize-outline" size={20} color="#007AFF" />
            <Text style={styles.sizeLabel}>Length</Text>
            <Text style={styles.sizeValue}>
              {species.min_length_cm != null && species.max_length_cm != null
                ? `${formatLength(species.min_length_cm, units.length)} - ${formatLength(species.max_length_cm, units.length)}`
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.sizeDivider} />
          <View style={styles.sizeItem}>
            <Ionicons name="scale-outline" size={20} color="#FF9500" />
            <Text style={styles.sizeLabel}>Weight</Text>
            <Text style={styles.sizeValue}>
              {species.min_weight_kg != null && species.max_weight_kg != null
                ? `${formatWeight(species.min_weight_kg, units.weight)} - ${formatWeight(species.max_weight_kg, units.weight)}`
                : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {species.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.description}>{species.description}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Catches</Text>
        <View style={styles.yourCatchesRow}>
          <Ionicons name="fish" size={24} color="#007AFF" />
          <Text style={styles.yourCatchesText}>
            You've caught <Text style={styles.yourCatchesBold}>{userCatches.length}</Text> of this species
          </Text>
        </View>
        {userCatches.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.userCatchRow}
            onPress={() => router.push(`/catch/${c.id}`)}
          >
            <Text style={styles.userCatchDate}>
              {c.caught_at ? new Date(c.caught_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
            </Text>
            <Text style={styles.userCatchMeta}>
              {c.weight_kg ? formatWeight(c.weight_kg, units.weight) : ''}
              {c.length_cm ? ` · ${formatLength(c.length_cm, units.length)}` : ''}
              {c.location_name ? ` · ${c.location_name}` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
          </TouchableOpacity>
        ))}
      </View>

      {species.region_ranges?.regions && species.region_ranges.regions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Range</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="globe-outline" size={40} color="#8E8E93" />
            <Text style={styles.mapText}>Range Map</Text>
          </View>
          <Text style={styles.rangeDetail}>
            {species.region_ranges.regions.join(', ')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillBlue: {
    backgroundColor: '#E8F0FE',
  },
  pillGreen: {
    backgroundColor: '#E8F5E9',
  },
  pillOrange: {
    backgroundColor: '#FFF3E0',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sizeLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sizeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sizeDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E5EA',
  },
  description: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 24,
  },
  yourCatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yourCatchesText: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C43',
  },
  yourCatchesBold: {
    fontWeight: '700',
    color: '#007AFF',
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 6,
  },
  rangeDetail: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
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
  userCatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    marginTop: 8,
    gap: 8,
  },
  userCatchDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    width: 90,
  },
  userCatchMeta: {
    flex: 1,
    fontSize: 13,
    color: '#8E8E93',
  },
});
