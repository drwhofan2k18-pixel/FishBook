import { supabase } from './supabase';
import { colors } from './theme';

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  host_id: string;
  species_target: string | null;
  scoring: 'biggest_fish' | 'total_weight' | 'species_count';
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  max_participants: number | null;
  created_at: string;
}

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  catch_id: string;
  entered_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  score: number;
  entry_count: number;
  biggest_fish_kg: number | null;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  species_target?: string;
  scoring: Tournament['scoring'];
  start_date: string;
  end_date: string;
  max_participants?: number;
}

export async function createTournament(hostId: string, input: CreateTournamentInput): Promise<Tournament> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      host_id: hostId,
      name: input.name,
      description: input.description ?? null,
      species_target: input.species_target ?? null,
      scoring: input.scoring,
      start_date: input.start_date,
      end_date: input.end_date,
      max_participants: input.max_participants ?? null,
      status: new Date(input.start_date) > new Date() ? 'upcoming' : 'active',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Tournament;
}

export async function getTournaments(status?: Tournament['status']): Promise<Tournament[]> {
  let q = supabase.from('tournaments').select('*').order('start_date', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Tournament[];
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Tournament;
}

export async function joinTournament(tournamentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('tournament_entries').insert({
    tournament_id: tournamentId,
    user_id: user.id,
  });
  if (error) throw new Error(error.message);
}

export async function enterCatch(tournamentId: string, catchId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('tournament_entries').insert({
    tournament_id: tournamentId,
    user_id: user.id,
    catch_id: catchId,
  });
  if (error) throw new Error(error.message);
}

export async function getLeaderboard(tournamentId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('tournament_entries')
    .select(`
      user_id,
      catch:catch_id (
        weight_kg,
        species:final_species_id (common_name)
      ),
      user:user_id (
        username,
        display_name
      )
    `)
    .eq('tournament_id', tournamentId);

  if (error) throw new Error(error.message);

  const userMap = new Map<string, {
    username: string;
    display_name: string | null;
    weights: number[];
    species: Set<string>;
    biggest: number;
  }>();

  for (const entry of data ?? []) {
    const catchData = entry.catch as unknown as { weight_kg: number | null; species: { common_name: string } | null } | null;
    const userData = entry.user as unknown as { username: string; display_name: string | null } | null;
    const uid = entry.user_id;

    if (!userMap.has(uid)) {
      userMap.set(uid, {
        username: userData?.username ?? 'Unknown',
        display_name: userData?.display_name ?? null,
        weights: [],
        species: new Set(),
        biggest: 0,
      });
    }

    const u = userMap.get(uid)!;
    if (catchData?.weight_kg) {
      u.weights.push(catchData.weight_kg);
      if (catchData.weight_kg > u.biggest) u.biggest = catchData.weight_kg;
    }
    if (catchData?.species?.common_name) {
      u.species.add(catchData.species.common_name);
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const [uid, u] of userMap) {
    entries.push({
      rank: 0,
      user_id: uid,
      username: u.username,
      display_name: u.display_name,
      score: u.weights.reduce((a, b) => a + b, 0),
      entry_count: u.weights.length,
      biggest_fish_kg: u.biggest || null,
    });
  }

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

export function formatTournamentDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getScoringLabel(scoring: Tournament['scoring']): string {
  switch (scoring) {
    case 'biggest_fish': return 'Biggest Fish';
    case 'total_weight': return 'Total Weight';
    case 'species_count': return 'Species Count';
  }
}

export function getStatusColor(status: Tournament['status']): string {
  switch (status) {
    case 'upcoming': return colors.primary;
    case 'active': return colors.success;
    case 'completed': return colors.textSecondary;
  }
}
