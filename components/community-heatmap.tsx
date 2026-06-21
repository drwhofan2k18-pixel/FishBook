import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Circle, type Region } from 'react-native-maps';
import { fetchCommunityHeatmap, getHeatColor, getHeatOpacity, type HeatmapCell, type HeatmapBounds } from '@/lib/community-map';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

interface CommunityHeatmapProps {
  initialRegion?: Region;
  speciesFilter?: string;
  height?: number;
}

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

export default function CommunityHeatmap({ initialRegion, speciesFilter, height = 400 }: CommunityHeatmapProps) {

  const { colors } = useTheme();
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(initialRegion ?? DEFAULT_REGION);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCells = useCallback(async (region: Region) => {
    setLoading(true);
    const bounds: HeatmapBounds = {
      minLat: region.latitude - region.latitudeDelta / 2,
      maxLat: region.latitude + region.latitudeDelta / 2,
      minLng: region.longitude - region.longitudeDelta / 2,
      maxLng: region.longitude + region.longitudeDelta / 2,
    };

    const result = await fetchCommunityHeatmap(bounds, speciesFilter);
    setCells(result);
    setLoading(false);
  }, [speciesFilter]);

  useEffect(() => {
    loadCells(currentRegion);
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    setCurrentRegion(region);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadCells(region);
    }, 800);
  }, [loadCells]);

  return (
    <View style={[styles.container, { height }]} accessibilityLabel="Community fishing heatmap" accessibilityRole="image">
      <MapView
        style={styles.map}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChange}
        onPress={() => setSelectedCell(null)}
      >
        {cells.map((cell, index) => (
          <Circle
            key={`${cell.grid_lat}_${cell.grid_lng}_${index}`}
            center={{ latitude: cell.grid_lat, longitude: cell.grid_lng }}
            radius={getCellRadius(currentRegion)}
            fillColor={getHeatColorWithOpacity(cell.avg_rating)}
            strokeColor={getHeatColor(cell.avg_rating)}
            strokeWidth={1}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {selectedCell && (
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="flame" size={16} color={getHeatColor(selectedCell.avg_rating)} />
            <Text style={styles.infoTitle}>
              {selectedCell.catch_count} catches · {selectedCell.user_count} anglers
            </Text>
          </View>
          {selectedCell.top_species.length > 0 && (
            <Text style={styles.infoSpecies}>
              Top: {selectedCell.top_species.join(', ')}
            </Text>
          )}
          {selectedCell.avg_weight_kg && (
            <Text style={styles.infoWeight}>
              Avg: {selectedCell.avg_weight_kg} kg
            </Text>
          )}
          <Text style={styles.privacyNote}>
            Zones blurred for privacy · Min 3 catches from 2+ anglers
          </Text>
        </View>
      )}

      {cells.length === 0 && !loading && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="globe-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No community data in this area</Text>
        </View>
      )}
    </View>
  );
}

function getCellRadius(region: Region): number {
  const zoomApprox = Math.log2(360 / region.longitudeDelta);
  return Math.max(200, 2000 / Math.pow(2, (zoomApprox - 5) / 3));
}

function getHeatColorWithOpacity(rating: number): string {
  const color = getHeatColor(rating);
  const opacity = getHeatOpacity(rating);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  infoSpecies: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoWeight: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  privacyNote: {
    fontSize: 11,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  emptyOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
