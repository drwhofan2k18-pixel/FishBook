import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { getUserStats, getSpeciesBreakdown, updateProfile } from '@/lib/stats-aggregation';
import { checkAchievements, seedAchievements, type AchievementProgress } from '@/lib/achievements';
import { getUserCatchLocations, type CatchLocation } from '@/lib/recommendations';
import StatsChart from '@/components/stats-chart';
import CatchMap from '@/components/map-view';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? '';
  const username = (user?.user_metadata as Record<string, string> | undefined)?.username ?? 'Angler';
  const initial = username.charAt(0).toUpperCase();

  const [stats, setStats] = useState<import('@/lib/stats-aggregation').UserStats | null>(null);
  const [speciesData, setSpeciesData] = useState<Awaited<ReturnType<typeof getSpeciesBreakdown>>>([]);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [catchLocations, setCatchLocations] = useState<CatchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [homeWaters, setHomeWaters] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await seedAchievements();
      const [userStats, species, achiev, locs] = await Promise.all([
        getUserStats(userId),
        getSpeciesBreakdown(userId),
        checkAchievements(userId),
        getUserCatchLocations(userId),
      ]);
      setStats(userStats);
      setSpeciesData(species);
      setAchievements(achiev);
      setCatchLocations(locs);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!userId) return;
    const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar.jpg`);
    if (data?.publicUrl) setAvatarUrl(data.publicUrl + '?t=' + Date.now());
  }, [userId]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to set your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const filePath = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (data?.publicUrl) setAvatarUrl(data.publicUrl + '?t=' + Date.now());

      await updateProfile(userId, { avatar_url: data?.publicUrl });
    } catch (err) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(userId, {
        display_name: displayName || undefined,
        bio: bio || undefined,
        home_waters: homeWaters || undefined,
      });
      setEditModal(false);
    } catch (err) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatar} onPress={handlePickAvatar} disabled={uploadingAvatar} accessibilityLabel="Change profile photo" accessibilityRole="button">
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007AFF', borderRadius: 12, padding: 4 }}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>
            {(user?.user_metadata as Record<string, string> | undefined)?.display_name ?? username}
          </Text>
          {(user?.user_metadata as Record<string, string> | undefined)?.bio ? (
            <Text style={styles.bio}>{(user?.user_metadata as Record<string, string> | undefined)?.bio}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => {
              setDisplayName((user?.user_metadata as Record<string, string> | undefined)?.display_name ?? '');
              setBio((user?.user_metadata as Record<string, string> | undefined)?.bio ?? '');
              setHomeWaters((user?.user_metadata as Record<string, string> | undefined)?.home_waters ?? '');
              setEditModal(true);
            }}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.totalCatches ?? 0}</Text>
            <Text style={styles.statLabel}>Total Catches</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.uniqueSpecies ?? 0}</Text>
            <Text style={styles.statLabel}>Species</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.biggestFishKg ? `${stats.biggestFishKg} kg` : '0 kg'}</Text>
            <Text style={styles.statLabel}>Biggest Fish</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{earnedCount}</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {stats?.biggestFishSpecies && (
          <View style={styles.recordCard}>
            <Ionicons name="trophy-outline" size={24} color="#FF9500" />
            <View style={styles.recordInfo}>
              <Text style={styles.recordLabel}>Biggest Catch</Text>
              <Text style={styles.recordValue}>
                {stats.biggestFishSpecies} — {stats.biggestFishKg} kg
              </Text>
            </View>
          </View>
        )}

        <CatchMap
          locations={catchLocations.map((l) => ({
            id: l.id,
            latitude: l.latitude,
            longitude: l.longitude,
            species_name: l.species_name ?? undefined,
            weight_kg: l.weight_kg,
            caught_at: l.caught_at,
          }))}
          height={180}
        />

        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>Species Breakdown</Text>
        </View>
        <StatsChart data={speciesData} />

        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
        </View>
        <View style={styles.achievementsGrid}>
          {achievements.slice(0, 12).map((ap) => (
            <View key={ap.achievement.id} style={[styles.achievementItem, ap.earned && styles.achievementEarned]}>
              <Ionicons
                name={ap.earned ? 'trophy' : 'lock-closed'}
                size={24}
                color={ap.earned ? '#FF9500' : '#C7C7CC'}
              />
              <Text style={[styles.achievementName, ap.earned && styles.achievementNameEarned]} numberOfLines={2}>
                {ap.achievement.name}
              </Text>
              {!ap.earned && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${ap.progress * 100}%` }]} />
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeader}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => setEditModal(true)} />
            <View style={styles.divider} />
            <SettingsRow icon="fish-outline" label="Species Guide" onPress={() => router.push('/(tabs)/species')} />
            <View style={styles.divider} />
            <SettingsRow icon="settings-outline" label="Settings" onPress={() => router.push('/(tabs)/settings')} />
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor="#C7C7CC"
            />
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.fieldLabel}>Home Waters</Text>
            <TextInput
              style={styles.textInput}
              value={homeWaters}
              onChangeText={setHomeWaters}
              placeholder="Your favorite fishing spot"
              placeholderTextColor="#C7C7CC"
            />
            <TouchableOpacity style={styles.saveProfileButton} onPress={handleSaveProfile}>
              <Text style={styles.saveProfileText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress}>
      <Ionicons name={icon} size={22} color="#007AFF" />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#FFFFFF' },
  displayName: { fontSize: 24, fontWeight: '700', color: '#1C1C1E' },
  bio: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  editProfileButton: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  editProfileText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statItem: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#007AFF' },
  statLabel: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, marginBottom: 16, gap: 12 },
  recordInfo: { flex: 1 },
  recordLabel: { fontSize: 12, color: '#E65100', fontWeight: '500' },
  recordValue: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginTop: 2 },
  contentHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievementItem: { width: '23%', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 10, alignItems: 'center', opacity: 0.5 },
  achievementEarned: { opacity: 1, borderWidth: 1, borderColor: '#FFD700' },
  achievementName: { fontSize: 10, color: '#8E8E93', textAlign: 'center', marginTop: 6 },
  achievementNameEarned: { color: '#1C1C1E', fontWeight: '500' },
  progressBar: { width: '100%', height: 3, backgroundColor: '#F2F2F7', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
  settingsSection: { marginTop: 24 },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#F2F2F7', marginLeft: 52 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingsLabel: { flex: 1, fontSize: 16 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16, gap: 8 },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },
  modalContainer: { flex: 1, backgroundColor: '#F2F2F7' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  modalContent: { padding: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#3C3C43', marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 16, color: '#1C1C1E' },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  saveProfileButton: { backgroundColor: '#007AFF', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveProfileText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
