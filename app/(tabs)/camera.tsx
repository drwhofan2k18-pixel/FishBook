import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useCatchStore } from '@/lib/catch-store';
import { uploadCatchPhoto } from '@/lib/supabase';
import { identifyFish, estimateWeight } from '@/lib/fish-id';
import { useSaveCatch } from '@/lib/catches';
import { awardAchievementIfEarned } from '@/lib/achievements';
import { showAchievementNotification } from '@/lib/notifications';
import { getCurrentPosition, reverseGeocode } from '@/lib/location';
import { REFERENCE_OBJECTS, type ReferenceObject } from '@/lib/photo-length';
import PhotoCapture from '@/components/photo-capture';
import SpeciesPicker from '@/components/species-picker';
import RegulationBadge from '@/components/regulation-badge';
import TackleSuggestion from '@/components/tackle-suggestion';
import CoachMark, { CAMERA_COACH_STEPS, hasSeenCoachMarks } from '@/components/coach-mark';

export default function CameraScreen() {
  const { user } = useAuth();
  const store = useCatchStore();
  const saveCatch = useSaveCatch();
  const [showLengthTool, setShowLengthTool] = useState(false);
  const [selectedRef, setSelectedRef] = useState<ReferenceObject>(REFERENCE_OBJECTS[0]);
  const [showCoachMark, setShowCoachMark] = useState(false);

  useEffect(() => {
    hasSeenCoachMarks(CAMERA_COACH_STEPS.map(s => s.id)).then(seen => {
      if (!seen) setShowCoachMark(true);
    });
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    (async () => {
      const position = await getCurrentPosition();
      if (position) {
        const geo = await reverseGeocode(position.latitude, position.longitude);
        store.setLocation(
          position.latitude,
          position.longitude,
          geo.locationName ?? '',
          geo.waterBody ?? '',
        );
      }
    })();
  }, []);

  const handlePhotoTaken = useCallback(async (uri: string) => {
    store.setPhoto(uri);
    store.setIsIdentifying(true);

    if (!user?.id) {
      store.setIsIdentifying(false);
      return;
    }

    const { url, error: uploadError } = await uploadCatchPhoto(user.id, uri);
    if (uploadError || !url) {
      store.setIsIdentifying(false);
      Alert.alert('Upload Failed', uploadError ?? 'Could not upload photo');
      return;
    }

    store.setPhotoUrl(url);

    const result = await identifyFish(url);
    store.setIsIdentifying(false);

    if (result.error) {
      Alert.alert('Identification Failed', result.error);
      return;
    }

    if (result.matches.length > 0) {
      store.setIdentification(result.matches[0], result.matches);
    }
  }, [user?.id]);

  const handleLengthChange = useCallback(async (text: string) => {
    store.setLengthCm(text);

    // Auto-calculate weight if species and length are set
    const length = parseFloat(text);
    const speciesId = store.selectedSpeciesId;
    if (length > 0 && speciesId) {
      const result = await estimateWeight(speciesId, length);
      if ('weightKg' in result) {
        store.setWeightKg(result.weightKg.toString());
        store.setWeightMethod('estimated_species');
      }
    }
  }, [store.selectedSpeciesId]);

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Not Logged In', 'Please sign in to save catches.');
      return;
    }

    if (!store.photoUri) {
      Alert.alert('No Photo', 'Please take a photo first.');
      return;
    }

    const speciesId = store.selectedSpeciesId;
    if (!speciesId) {
      Alert.alert('No Species', 'Please identify or select a species.');
      return;
    }

    store.setIsSaving(true);

    try {
      await saveCatch.mutateAsync({
        user_id: user.id,
        species_id: speciesId,
        ai_species_id: store.identification?.species_id ?? speciesId,
        ai_confidence: store.identification?.confidence ?? null,
        photo_url: store.photoUrl ?? '',
        weight_kg: store.weightKg ? parseFloat(store.weightKg) : null,
        weight_method: store.weightMethod,
        length_cm: store.lengthCm ? parseFloat(store.lengthCm) : null,
        length_type: 'total',
        latitude: store.latitude,
        longitude: store.longitude,
        location_name: store.locationName || null,
        water_body: store.waterBody || null,
        caught_at: new Date().toISOString(),
        notes: store.notes || null,
        is_released: store.isReleased,
      });

      store.reset();

      try {
        const earnedName = await awardAchievementIfEarned(user.id);
        if (earnedName) {
          showAchievementNotification(earnedName);
        }
      } catch {}
      router.push('/(tabs)/library');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Save Failed', message);
    } finally {
      store.setIsSaving(false);
    }
  }, [user?.id, store, saveCatch]);

  const topMatch = store.allMatches[0];
  const otherMatches = store.allMatches.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Camera / Photo */}
          <PhotoCapture
            photoUri={store.photoUri}
            onPhotoTaken={handlePhotoTaken}
            onRetake={() => store.setPhoto('')}
          />

          {/* Identifying spinner */}
          {store.isIdentifying && (
            <View style={styles.identifyingRow}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.identifyingText}>Identifying species...</Text>
            </View>
          )}

          {/* Photo taken: show form fields */}
          {store.photoUri && !store.isIdentifying && (
            <View style={styles.formSection}>
              {/* Species Identification */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Species</Text>

                {topMatch && (
                  <TouchableOpacity
                    style={styles.matchCard}
                    onPress={() => {
                      store.setIdentification(topMatch, store.allMatches);
                    }}
                  >
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchName}>{topMatch.common_name}</Text>
                      <Text style={styles.matchSciName}>{topMatch.scientific_name}</Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(topMatch.confidence * 100)}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {otherMatches.length > 0 && (
                  <>
                    <Text style={styles.otherLabel}>Other matches:</Text>
                    {otherMatches.map((m, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.otherMatchRow}
                        onPress={() => store.setIdentification(m, store.allMatches)}
                      >
                        <Text style={styles.otherMatchName}>{m.common_name}</Text>
                        <Text style={styles.otherMatchConf}>
                          {Math.round(m.confidence * 100)}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                <TouchableOpacity
                  style={styles.manualPickButton}
                  onPress={() => store.setSpeciesPickerOpen(true)}
                >
                  <Ionicons name="search" size={18} color="#007AFF" />
                  <Text style={styles.manualPickText}>
                    {store.selectedSpeciesId ? 'Change species' : 'Search species...'}
                  </Text>
                </TouchableOpacity>
              </View>

              {store.identification && (
                <>
                  <RegulationBadge
                    speciesName={store.identification.common_name}
                    lengthCm={store.lengthCm ? parseFloat(store.lengthCm) : null}
                  />
                  <TackleSuggestion
                    speciesName={store.identification.common_name}
                  />
                </>
              )}

              {/* Measurements */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Measurements</Text>

                <View style={styles.inputRow}>
                  <Ionicons name="resize-outline" size={20} color="#34C759" />
                  <TextInput
                    style={styles.input}
                    placeholder="Length (cm)"
                    placeholderTextColor="#C7C7CC"
                    value={store.lengthCm}
                    onChangeText={handleLengthChange}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity 
                    style={styles.toolButton}
                    onPress={() => setShowLengthTool(true)}
                  >
                    <Ionicons name="expand-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="scale-outline" size={20} color="#FF9500" />
                  <TextInput
                    style={styles.input}
                    placeholder="Weight (kg)"
                    placeholderTextColor="#C7C7CC"
                    value={store.weightKg}
                    onChangeText={store.setWeightKg}
                    keyboardType="decimal-pad"
                  />
                  {store.weightMethod === 'estimated_species' && (
                    <View style={styles.estBadge}>
                      <Text style={styles.estBadgeText}>Est.</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Location */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Location</Text>
                {store.latitude && store.longitude ? (
                  <Text style={styles.locationCoords}>
                    {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                  </Text>
                ) : (
                  <Text style={styles.locationCoords}>Detecting location...</Text>
                )}
                <TextInput
                  style={styles.textInput}
                  placeholder="Location name"
                  placeholderTextColor="#C7C7CC"
                  value={store.locationName}
                  onChangeText={store.setLocation as any}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Water body (lake, river, ocean)"
                  placeholderTextColor="#C7C7CC"
                  value={store.waterBody}
                  onChangeText={store.setLocation as any}
                />
              </View>

              {/* Notes */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="Add notes about your catch..."
                  placeholderTextColor="#C7C7CC"
                  value={store.notes}
                  onChangeText={store.setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Catch & Release */}
              <View style={styles.releaseRow}>
                <View>
                  <Text style={styles.releaseLabel}>Catch & Release</Text>
                  <Text style={styles.releaseHint}>Toggle off if you kept the catch</Text>
                </View>
                <Switch
                  value={store.isReleased}
                  onValueChange={store.setIsReleased}
                  trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, store.isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={store.isSaving}
              >
                {store.isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Catch</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Species Picker Modal */}
      <SpeciesPicker
        visible={store.speciesPickerOpen}
        onClose={() => store.setSpeciesPickerOpen(false)}
        onSelect={(species) => {
          store.setIdentification(species, [species, ...store.allMatches]);
        }}
      />

      <CoachMark
        steps={CAMERA_COACH_STEPS}
        visible={showCoachMark}
        onComplete={() => setShowCoachMark(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  flex: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  identifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  identifyingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  formSection: {
    gap: 12,
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  matchInfo: { flex: 1 },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  matchSciName: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#8E8E93',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  otherLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  otherMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  otherMatchName: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
  },
  otherMatchConf: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  manualPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  manualPickText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  toolButton: {
    padding: 8,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
  },
  estBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  estBadgeText: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  notesInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  locationCoords: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  releaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  releaseLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  releaseHint: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
