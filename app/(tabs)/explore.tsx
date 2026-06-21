import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommunityHeatmap from '@/components/community-heatmap';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { getCurrentPosition } from '@/lib/location';
import { getNearestWaterConditions, type WaterConditions } from '@/lib/usgs-water';

export default function ExploreScreen() {

  const { colors } = useTheme();
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [waterConditions, setWaterConditions] = useState<WaterConditions | null>(null);

  const speciesFilters = ['All Species', 'Largemouth Bass', 'Rainbow Trout', 'Channel Catfish'];

  useEffect(() => {
    (async () => {
      try {
        const pos = await getCurrentPosition();
        if (pos) {
          const water = await getNearestWaterConditions(pos.latitude, pos.longitude);
          setWaterConditions(water);
        }
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Community catch zones — blurred for privacy</Text>
      </View>

      {waterConditions && (waterConditions.water_temp_c != null || waterConditions.flow_rate_cfs != null) && (
        <View style={styles.waterBar}>
          <Ionicons name="water-outline" size={16} color={colors.primary} />
          <Text style={styles.waterText} numberOfLines={1}>
            {waterConditions.site_name}
            {waterConditions.water_temp_c != null ? ` · ${waterConditions.water_temp_c}°C` : ''}
            {waterConditions.flow_rate_cfs != null ? ` · ${waterConditions.flow_rate_cfs} cfs` : ''}
          </Text>
          <Text style={styles.waterSource}>USGS</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {speciesFilters.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, selectedSpecies === s && styles.filterChipActive]}
            onPress={() => setSelectedSpecies(s === 'All Species' ? null : s)}
          >
            <Text style={[styles.filterText, selectedSpecies === s && styles.filterTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mapContainer}>
        <CommunityHeatmap
          speciesFilter={selectedSpecies ?? undefined}
          height={500}
        />
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Activity Level</Text>
        <View style={styles.legendRow}>
          <LegendItem color={colors.danger} label="Hot" />
          <LegendItem color={colors.warning} label="Active" />
          <LegendItem color={colors.gold} label="Moderate" />
          <LegendItem color={colors.success} label="Light" />
          <LegendItem color={colors.textSecondary} label="Low" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.chipBg,
    borderRadius: 10,
  },
  waterText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  waterSource: {
    fontSize: 9,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.textOnPrimary,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
