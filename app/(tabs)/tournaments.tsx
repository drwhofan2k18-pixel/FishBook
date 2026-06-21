import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import {
  getTournaments,
  createTournament,
  getLeaderboard,
  joinTournament,
  formatTournamentDate,
  getScoringLabel,
  getStatusColor,
  type Tournament,
  type LeaderboardEntry,
  type CreateTournamentInput,
} from '@/lib/tournaments';

type Tab = 'active' | 'upcoming' | 'completed';

export default function TournamentsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTournaments(activeTab === 'active' ? 'active' : activeTab === 'upcoming' ? 'upcoming' : 'completed');
      setTournaments(data);
    } catch {
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);

  useEffect(() => {
    if (selectedTournament) {
      getLeaderboard(selectedTournament).then(setLeaderboard).catch(() => setLeaderboard([]));
    }
  }, [selectedTournament]);

  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'active', label: 'Active', icon: 'flash' },
    { key: 'upcoming', label: 'Upcoming', icon: 'calendar' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-done' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tournaments</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color={colors.textOnPrimary} />
          <Text style={styles.createText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tournamentCard} onPress={() => setSelectedTournament(item.id)}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={styles.tournamentName}>{item.name}</Text>
              </View>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="trophy-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{getScoringLabel(item.scoring)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {formatTournamentDate(item.start_date)} - {formatTournamentDate(item.end_date)}
                  </Text>
                </View>
              </View>
              {item.species_target && (
                <View style={styles.targetRow}>
                  <Ionicons name="fish-outline" size={14} color={colors.primary} />
                  <Text style={styles.targetText}>{item.species_target}</Text>
                </View>
              )}
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No {activeTab} tournaments</Text>
            </View>
          }
        />
      )}

      {/* Leaderboard Modal */}
      <Modal visible={!!selectedTournament} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leaderboard</Text>
            <TouchableOpacity onPress={() => setSelectedTournament(null)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.leaderRow}>
                <Text style={styles.rank}>#{item.rank}</Text>
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>{item.display_name || item.username}</Text>
                  <Text style={styles.leaderMeta}>
                    {item.entry_count} entries · Best: {item.biggest_fish_kg ? `${item.biggest_fish_kg} kg` : 'N/A'}
                  </Text>
                </View>
                <Text style={styles.leaderScore}>{item.score.toFixed(1)} kg</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="podium-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>No entries yet</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (input) => {
          if (!user?.id) return;
          try {
            await createTournament(user.id, input);
            setShowCreate(false);
            loadTournaments();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create tournament');
          }
        }}
      />
    </SafeAreaView>
  );
}

function CreateTournamentModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: CreateTournamentInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scoring, setScoring] = useState<CreateTournamentInput['scoring']>('biggest_fish');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  const scoringOptions: { key: CreateTournamentInput['scoring']; label: string }[] = [
    { key: 'biggest_fish', label: 'Biggest Fish' },
    { key: 'total_weight', label: 'Total Weight' },
    { key: 'species_count', label: 'Species Count' },
  ];

  const handleCreate = async () => {
    if (!name.trim() || !startDate.trim() || !endDate.trim()) {
      Alert.alert('Missing Fields', 'Please fill in name, start date, and end date.');
      return;
    }
    setCreating(true);
    await onCreate({ name: name.trim(), description: description.trim() || undefined, scoring, start_date: startDate, end_date: endDate });
    setCreating(false);
    setName(''); setDescription(''); setStartDate(''); setEndDate('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Tournament</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.createForm}>
          <Text style={styles.fieldLabel}>Tournament Name</Text>
          <TextInput style={styles.textInput} value={name} onChangeText={setName} placeholder="Summer Bass Classic" placeholderTextColor={colors.textTertiary} />

          <Text style={styles.fieldLabel}>Description (optional)</Text>
          <TextInput style={[styles.textInput, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Rules, prizes, etc." placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />

          <Text style={styles.fieldLabel}>Scoring Method</Text>
          <View style={styles.scoringRow}>
            {scoringOptions.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.scoringOption, scoring === s.key && styles.scoringOptionActive]}
                onPress={() => setScoring(s.key)}
              >
                <Text style={[styles.scoringText, scoring === s.key && styles.scoringTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Start Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.textInput} value={startDate} onChangeText={setStartDate} placeholder="2026-07-01" placeholderTextColor={colors.textTertiary} />

          <Text style={styles.fieldLabel}>End Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.textInput} value={endDate} onChangeText={setEndDate} placeholder="2026-07-03" placeholderTextColor={colors.textTertiary} />

          <TouchableOpacity style={[styles.createSubmitButton, creating && styles.buttonDisabled]} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.createSubmitText}>Create Tournament</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  createText: { color: colors.textOnPrimary, fontWeight: '600', fontSize: 14 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.divider, gap: 6 },
  tabActive: { backgroundColor: colors.cardBg },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 4 },
  tournamentCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tournamentName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  cardMeta: { gap: 4, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.textSecondary },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  targetText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  modalContainer: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  leaderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 8, gap: 12 },
  rank: { fontSize: 18, fontWeight: '700', color: colors.primary, width: 36 },
  leaderInfo: { flex: 1 },
  leaderName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  leaderMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  leaderScore: { fontSize: 16, fontWeight: '700', color: colors.success },
  createForm: { padding: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: colors.textBody, marginBottom: 6, marginTop: 12 },
  textInput: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, height: 44, fontSize: 16, color: colors.textPrimary },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  scoringRow: { flexDirection: 'row', gap: 8 },
  scoringOption: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.divider, alignItems: 'center' },
  scoringOptionActive: { backgroundColor: colors.primary },
  scoringText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  scoringTextActive: { color: colors.textOnPrimary },
  createSubmitButton: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  createSubmitText: { color: colors.textOnPrimary, fontSize: 17, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
