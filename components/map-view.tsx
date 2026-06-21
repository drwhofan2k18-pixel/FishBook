import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

interface CatchLocation {
  id: string;
  latitude: number;
  longitude: number;
  species_name?: string;
  weight_kg?: number | null;
  caught_at?: string;
}

interface MapViewComponentProps {
  locations: CatchLocation[];
  height?: number;
}

export default function CatchMap({ locations, height = 250 }: MapViewComponentProps) {
  const region = useMemo<Region>(() => {
    if (locations.length === 0) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 40,
        longitudeDelta: 40,
      };
    }

    const lats = locations.map((l) => l.latitude);
    const lngs = locations.map((l) => l.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + 0.5, 1),
      longitudeDelta: Math.max(maxLng - minLng + 0.5, 1),
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Ionicons name="map-outline" size={32} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No catch locations yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]} accessibilityLabel={`Catch location map: ${locations.length} catches`} accessibilityRole="image">
      <MapView style={styles.map} initialRegion={region}>
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            title={loc.species_name ?? 'Catch'}
            description={
              loc.weight_kg ? `${loc.weight_kg} kg` : undefined
            }
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});
