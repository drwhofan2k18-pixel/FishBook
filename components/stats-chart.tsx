import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SpeciesCount } from '@/lib/stats-aggregation';
import { colors } from '@/lib/theme';

interface StatsChartProps {
  data: SpeciesCount[];
}

const BAR_COLORS: Record<string, string> = {
  freshwater: colors.primary,
  saltwater: colors.success,
};

export default function StatsChart({ data }: StatsChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No species data yet</Text>
      </View>
    );
  }

  const topSpecies = data.slice(0, 10);
  const maxCount = Math.max(...topSpecies.map((s) => s.count), 1);

  return (
    <View style={styles.container} accessibilityLabel={`Species breakdown: ${topSpecies.length} species`} accessibilityRole="summary">
      <Text style={styles.title}>Species Breakdown</Text>
      {topSpecies.map((item, index) => {
        const barWidth = (item.count / maxCount) * 100;
        const color = BAR_COLORS[item.habitat] ?? colors.primary;

        return (
          <View key={item.species_id || index} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {item.common_name}
            </Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: color }]} />
              <Text style={styles.count}>{item.count}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  label: {
    width: 90,
    fontSize: 12,
    color: colors.textBody,
    textAlign: 'right',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  count: {
    position: 'absolute',
    right: 6,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
