import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CatchRecord } from '@/lib/catches';

interface CatchCardProps {
  catchItem: CatchRecord;
  onPress: (id: string) => void;
  variant?: 'grid' | 'list';
}

export default function CatchCard({ catchItem, onPress, variant = 'grid' }: CatchCardProps) {
  const speciesName = catchItem.species?.common_name ?? 'Unknown Species';
  const weight = catchItem.weight_kg ? `${catchItem.weight_kg} kg` : null;
  const date = catchItem.caught_at
    ? new Date(catchItem.caught_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  if (variant === 'list') {
    return (
      <TouchableOpacity style={styles.listCard} onPress={() => onPress(catchItem.id)}>
        <View style={styles.listThumb}>
          {catchItem.photo_thumbnail_url ? (
            <Image source={{ uri: catchItem.photo_thumbnail_url }} style={styles.thumbImage} />
          ) : (
            <Ionicons name="fish-outline" size={24} color="#C7C7CC" />
          )}
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listName} numberOfLines={1}>{speciesName}</Text>
          <Text style={styles.listMeta}>
            {weight ? `${weight} · ` : ''}{date}{catchItem.location_name ? ` · ${catchItem.location_name}` : ''}
          </Text>
        </View>
        <View style={styles.listBadge}>
          {catchItem.is_released && (
            <Ionicons name="return-up-back" size={16} color="#34C759" />
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.gridCard} onPress={() => onPress(catchItem.id)}>
      <View style={styles.gridImageContainer}>
        {catchItem.photo_thumbnail_url ? (
          <Image source={{ uri: catchItem.photo_thumbnail_url }} style={styles.gridImage} />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons name="fish-outline" size={32} color="#C7C7CC" />
          </View>
        )}
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={1}>{speciesName}</Text>
        <View style={styles.gridMetaRow}>
          {weight && <Text style={styles.gridMeta}>{weight}</Text>}
          <Text style={styles.gridMeta}>{date}</Text>
        </View>
      </View>
      {catchItem.is_released && (
        <View style={styles.releaseDot}>
          <Ionicons name="return-up-back" size={12} color="#34C759" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid variant
  gridCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E5EA',
  },
  gridInfo: {
    padding: 10,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  gridMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  gridMeta: {
    fontSize: 12,
    color: '#8E8E93',
  },
  releaseDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List variant
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbImage: {
    width: 52,
    height: 52,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  listMeta: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  listBadge: {
    marginRight: 8,
  },
});
