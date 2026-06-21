import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatWeight, formatLength, useUnitStore } from '@/lib/units';
import { getCurrentPosition } from '@/lib/location';
import { getNearestWaterConditions, type WaterConditions } from '@/lib/usgs-water';
import { isStockableSpecies, getStockingSeason, getStockingInfoUrl, getSupportedStockingStates } from '@/lib/fish-stocking';
import { searchSpeciesInfo, type SearchResult } from '@/lib/brave-search';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

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

  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const units = useUnitStore();
  const [species, setSpecies] = useState<SpeciesData | null>(null);
  const [userCatches, setUserCatches] = useState<UserCatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [waterConditions, setWaterConditions] = useState<WaterConditions | null>(null);
  const [externalInfo, setExternalInfo] = useState<SearchResult[]>([]);

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

      try {
        const pos = await getCurrentPosition();
        if (pos) {
          const water = await getNearestWaterConditions(pos.latitude, pos.longitude);
          setWaterConditions(water);
        }
      } catch {}

      try {
        if (sp) {
          const search = await searchSpeciesInfo(sp.common_name);
          setExternalInfo(search.results.slice(0, 3));
        }
      } catch {}
    } catch {} finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!species) {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
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
      case 'Least Concern': return colors.success;
      case 'Near Threatened': return colors.warning;
      case 'Vulnerable': return colors.danger;
      case 'Endangered': return 'colors.pink';
      case 'Critically Endangered': return 'colors.purple';
      default: return colors.textSecondary;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{species.common_name}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.imagePlaceholder}>
        <Ionicons name="fish-outline" size={64} color={colors.textTertiary} />
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
          <View style={[styles.pill, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.pillText, { color: colors.goldDark }]}>Game Fish</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Size & Weight</Text>
        <View style={styles.sizeRow}>
          <View style={styles.sizeItem}>
            <Ionicons name="resize-outline" size={20} color={colors.primary} />
            <Text style={styles.sizeLabel}>Length</Text>
            <Text style={styles.sizeValue}>
              {species.min_length_cm != null && species.max_length_cm != null
                ? `${formatLength(species.min_length_cm, units.length)} - ${formatLength(species.max_length_cm, units.length)}`
                : 'N/A'}
            </Text>
          </View>
          <View style={styles.sizeDivider} />
          <View style={styles.sizeItem}>
            <Ionicons name="scale-outline" size={20} color={colors.warning} />
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

      {waterConditions && (waterConditions.water_temp_c != null || waterConditions.flow_rate_cfs != null) && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Ionicons name="water-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Water Conditions — {waterConditions.site_name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {waterConditions.water_temp_c != null && (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Temperature</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{waterConditions.water_temp_c}°C</Text>
              </View>
            )}
            {waterConditions.flow_rate_cfs != null && (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Flow Rate</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{waterConditions.flow_rate_cfs} cfs</Text>
              </View>
            )}
            {waterConditions.gauge_height_ft != null && (
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Gauge Height</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{waterConditions.gauge_height_ft} ft</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 8, textAlign: 'right' }}>Source: USGS Water Services</Text>
        </View>
      )}

      {isStockableSpecies(species.common_name) && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="leaf-outline" size={20} color={colors.success} />
            <Text style={styles.cardTitle}>Fish Stocking</Text>
          </View>
          <Text style={styles.description}>{getStockingSeason(species.common_name)}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
            Supported states: {getSupportedStockingStates().join(', ')}
          </Text>
        </View>
      )}

      {externalInfo.length > 0 && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>More Info</Text>
          </View>
          {externalInfo.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={{ paddingVertical: 8, borderBottomWidth: i < externalInfo.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}
              onPress={() => Linking.openURL(r.url)}
              accessibilityLabel={`Open ${r.title}`}
              accessibilityRole="link"
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                {r.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.yourCatchesRow}>
          <Ionicons name="fish" size={24} color={colors.primary} />
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
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {species.region_ranges?.regions && species.region_ranges.regions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Range</Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="globe-outline" size={40} color={colors.textSecondary} />
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: colors.textSecondary,
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
    backgroundColor: colors.cardBg,
  },
  pillGreen: {
    backgroundColor: 'colors.positiveBg',
  },
  pillOrange: {
    backgroundColor: 'colors.infoBg',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
  sizeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sizeDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.divider,
  },
  description: {
    fontSize: 15,
    color: colors.textBody,
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
    color: colors.textBody,
  },
  yourCatchesBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: colors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  rangeDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  userCatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    marginTop: 8,
    gap: 8,
  },
  userCatchDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 90,
  },
  userCatchMeta: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
