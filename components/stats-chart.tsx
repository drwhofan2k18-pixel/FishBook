import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SpeciesCount } from '@/lib/stats-aggregation';

interface StatsChartProps {
  data: SpeciesCount[];
}

const BAR_COLORS: Record<string, string> = {
  freshwater: '#007AFF',
  saltwater: '#34C759',
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
    <View style={styles.container}>
      <Text style={styles.title}>Species Breakdown</Text>
      {topSpecies.map((item, index) => {
        const barWidth = (item.count / maxCount) * 100;
        const color = BAR_COLORS[item.habitat] ?? '#007AFF';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
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
    color: '#3C3C43',
    textAlign: 'right',
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: '#F2F2F7',
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
    color: '#8E8E93',
    fontWeight: '600',
  },
});
