import { supabase } from './supabase';
import { getUserStats } from './stats-aggregation';
import { captureError } from './crash-reporting';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_url: string | null;
  criteria: AchievementCriteria;
}

export interface AchievementCriteria {
  type: string;
  threshold: number;
  habitat?: string;
}

export interface AchievementProgress {
  achievement: Achievement;
  earned: boolean;
  earned_at: string | null;
  progress: number;
  current: number;
  threshold: number;
}

const ACHIEVEMENT_SEEDS: Omit<Achievement, 'id'>[] = [
  { name: 'First Catch', description: 'Log your first catch', icon_url: null, criteria: { type: 'catches_count', threshold: 1 } },
  { name: 'Dedicated Angler', description: 'Log 50 catches', icon_url: null, criteria: { type: 'catches_count', threshold: 50 } },
  { name: 'Master Angler', description: 'Log 100 catches', icon_url: null, criteria: { type: 'catches_count', threshold: 100 } },
  { name: 'Species Collector', description: 'Catch 5 different species', icon_url: null, criteria: { type: 'species_count', threshold: 5 } },
  { name: 'Species Hunter', description: 'Catch 15 different species', icon_url: null, criteria: { type: 'species_count', threshold: 15 } },
  { name: 'Ichthyologist', description: 'Catch 30 different species', icon_url: null, criteria: { type: 'species_count', threshold: 30 } },
  { name: 'Big Catcher', description: 'Catch a 10 kg fish', icon_url: null, criteria: { type: 'biggest_fish_kg', threshold: 10 } },
  { name: 'Giant Hunter', description: 'Catch a 25 kg fish', icon_url: null, criteria: { type: 'biggest_fish_kg', threshold: 25 } },
  { name: 'Record Breaker', description: 'Catch a 50 kg fish', icon_url: null, criteria: { type: 'biggest_fish_kg', threshold: 50 } },
  { name: 'Freshwater Fan', description: 'Catch 25 freshwater fish', icon_url: null, criteria: { type: 'habitat_catches', threshold: 25, habitat: 'freshwater' } },
  { name: 'Saltwater Sailor', description: 'Catch 25 saltwater fish', icon_url: null, criteria: { type: 'habitat_catches', threshold: 25, habitat: 'saltwater' } },
  { name: 'Catch & Release', description: 'Release 25 catches', icon_url: null, criteria: { type: 'released_catches', threshold: 25 } },
];

export async function seedAchievements(): Promise<void> {
  const { data: existing } = await supabase.from('achievements').select('id').limit(1);

  if (existing && existing.length > 0) {
    return;
  }

  const { error } = await supabase.from('achievements').insert(ACHIEVEMENT_SEEDS);
  if (error) {
    captureError(error, { context: 'seed-achievements' });
  }
}

export async function checkAchievements(userId: string): Promise<AchievementProgress[]> {
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .order('id');

  if (!achievements) return [];

  const { data: earned } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('user_id', userId);

  const earnedMap = new Map((earned ?? []).map((e) => [e.achievement_id, e.earned_at]));
  const stats = await getUserStats(userId);

  return achievements.map((ach: Achievement) => {
    const crit = ach.criteria;
    let current = 0;

    switch (crit.type) {
      case 'catches_count':
        current = stats.totalCatches;
        break;
      case 'species_count':
        current = stats.uniqueSpecies;
        break;
      case 'biggest_fish_kg':
        current = stats.biggestFishKg ?? 0;
        break;
      case 'habitat_catches':
        current = crit.habitat === 'freshwater' ? stats.freshwaterCount : stats.saltwaterCount;
        break;
      case 'released_catches':
        current = stats.releasedCount;
        break;
      default:
        current = 0;
    }

    return {
      achievement: ach,
      earned: earnedMap.has(ach.id),
      earned_at: earnedMap.get(ach.id) ?? null,
      progress: Math.min(current / crit.threshold, 1),
      current,
      threshold: crit.threshold,
    };
  });
}

export async function awardAchievementIfEarned(userId: string): Promise<string | null> {
  const progresses = await checkAchievements(userId);
  const newlyEarned = progresses.find((p) => !p.earned && p.progress >= 1);

  if (newlyEarned) {
    const { error } = await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: newlyEarned.achievement.id,
    });
    if (!error) {
      return newlyEarned.achievement.name;
    }
  }

  return null;
}
