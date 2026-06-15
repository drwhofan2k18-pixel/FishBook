import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CommunityHeatmap from '@/components/community-heatmap';

export default function ExploreScreen() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const speciesFilters = ['All Species', 'Largemouth Bass', 'Rainbow Trout', 'Channel Catfish'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Community catch zones — blurred for privacy</Text>
      </View>

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
          <LegendItem color="#FF3B30" label="Hot" />
          <LegendItem color="#FF9500" label="Active" />
          <LegendItem color="#FFD60A" label="Moderate" />
          <LegendItem color="#34C759" label="Light" />
          <LegendItem color="#8E8E93" label="Low" />
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
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
    backgroundColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
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
    color: '#8E8E93',
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
    color: '#8E8E93',
  },
});
