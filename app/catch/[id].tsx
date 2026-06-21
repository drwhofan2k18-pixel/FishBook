import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCatch, useUpdateCatch, useDeleteCatch, type CatchRecord } from '@/lib/catches';
import { shareCatch } from '@/lib/share-catch';
import { colors } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

export default function CatchDetailScreen() {

  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: catchData, isLoading, isError, refetch } = useCatch(id ?? '');
  const updateMutation = useUpdateCatch();
  const deleteMutation = useDeleteCatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editLength, setEditLength] = useState('');

  const handleEdit = () => {
    setEditNotes(catchData?.notes ?? '');
    setEditWeight(catchData?.weight_kg?.toString() ?? '');
    setEditLength(catchData?.length_cm?.toString() ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({
        id,
        notes: editNotes || null,
        weight_kg: editWeight ? parseFloat(editWeight) : null,
        length_cm: editLength ? parseFloat(editLength) : null,
      });
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Catch', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          try {
            await deleteMutation.mutateAsync(id);
            router.back();
          } catch (err) {
            Alert.alert('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !catchData) {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>Failed to load catch</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const speciesName = catchData.species?.common_name ?? 'Unknown Species';
  const scientificName = catchData.species?.scientific_name;
  const dateStr = catchData.caught_at
    ? new Date(catchData.caught_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catch Details</Text>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.editHeaderText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {catchData.photo_url ? (
        <Image source={{ uri: catchData.photo_url }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.speciesHeader}>
          <Text style={styles.speciesName}>{speciesName}</Text>
          {scientificName && (
            <Text style={styles.scientificName}>{scientificName}</Text>
          )}
          {catchData.ai_confidence != null && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                AI-identified · {Math.round(catchData.ai_confidence * 100)}%
              </Text>
            </View>
          )}
          {catchData.is_released && (
            <View style={styles.releasedBadge}>
              <Ionicons name="return-up-back" size={14} color="colors.positiveText" />
              <Text style={styles.releasedText}>Released</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Measurements</Text>
        {isEditing ? (
          <>
            <TextInput
              style={styles.editInput}
              placeholder="Weight (kg)"
              placeholderTextColor={colors.textTertiary}
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.editInput}
              placeholder="Length (cm)"
              placeholderTextColor={colors.textTertiary}
              value={editLength}
              onChangeText={setEditLength}
              keyboardType="decimal-pad"
            />
          </>
        ) : (
          <>
            <View style={styles.measurementRow}>
              <View style={styles.measurementItem}>
                <Text style={styles.measurementValue}>
                  {catchData.weight_kg ? `${catchData.weight_kg} kg` : '—'}
                </Text>
                <Text style={styles.measurementLabel}>Weight</Text>
              </View>
              <View style={styles.measurementDivider} />
              <View style={styles.measurementItem}>
                <Text style={styles.measurementValue}>
                  {catchData.length_cm ? `${catchData.length_cm} cm` : '—'}
                </Text>
                <Text style={styles.measurementLabel}>Length</Text>
              </View>
            </View>
            {catchData.weight_method === 'estimated_species' && (
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>Estimated</Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>
        {catchData.latitude && catchData.longitude ? (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.mapText}>
              {catchData.latitude.toFixed(4)}, {catchData.longitude.toFixed(4)}
            </Text>
          </View>
        ) : null}
        <Text style={styles.locationName}>{catchData.location_name || 'Unknown location'}</Text>
        {catchData.water_body && (
          <Text style={styles.locationDetail}>{catchData.water_body}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        <DetailRow icon="calendar-outline" label="Date" value={dateStr} />
        {catchData.weather_conditions && (
          <DetailRow icon="thermometer-outline" label="Weather" value="Logged" />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notes</Text>
        {isEditing ? (
          <TextInput
            style={[styles.editInput, styles.editNotesInput]}
            placeholder="Add notes..."
            placeholderTextColor={colors.textTertiary}
            value={editNotes}
            onChangeText={setEditNotes}
            multiline
            numberOfLines={3}
          />
        ) : (
          <Text style={styles.notesText}>
            {catchData.notes || 'No notes'}
          </Text>
        )}
      </View>

      {isEditing && (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.saveButton, updateMutation.isPending && styles.buttonDisabled]}
            onPress={handleSaveEdit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isEditing && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editActionButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.editActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareActionButton}
            onPress={() => catchData && shareCatch(catchData as CatchRecord)}
          >
            <Ionicons name="share-outline" size={20} color={colors.success} />
            <Text style={styles.shareActionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteActionButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  },
  editHeaderText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  photo: {
    width: '100%',
    height: 300,
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
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
  speciesHeader: {
    alignItems: 'center',
    gap: 8,
  },
  speciesName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: 'colors.positiveBg',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: 'colors.positiveText',
    fontWeight: '500',
  },
  releasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'colors.positiveBg',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  releasedText: {
    fontSize: 12,
    color: 'colors.positiveText',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementItem: {
    flex: 1,
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  measurementLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  measurementDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.divider,
  },
  methodBadge: {
    alignSelf: 'center',
    backgroundColor: 'colors.infoBg',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  methodText: {
    fontSize: 12,
    color: 'colors.infoText',
    fontWeight: '500',
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 70,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  editInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  editNotesInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 15,
    color: colors.textBody,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
  },
  editActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  editActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  deleteActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  shareActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  shareActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  editActions: {
    marginHorizontal: 16,
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 10,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
