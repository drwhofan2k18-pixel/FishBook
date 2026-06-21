jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../lib/stats-aggregation', () => ({
  getUserStats: jest.fn(),
}));

import { supabase } from '../lib/supabase';
import { getUserStats } from '../lib/stats-aggregation';
import {
  checkAchievements,
  awardAchievementIfEarned,
  seedAchievements,
} from '../lib/achievements';

// Build a chainable, thenable query builder that resolves to `result` when awaited.
function makeChain(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof jest.fn>> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve(result)),
  };
  (builder as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const from = supabase.from as jest.Mock;
const mockedGetUserStats = getUserStats as jest.Mock;

const STATS = {
  totalCatches: 10,
  uniqueSpecies: 4,
  biggestFishKg: 12,
  biggestFishSpecies: 'Tarpon',
  biggestFishId: 'c1',
  totalWeightKg: 50,
  freshwaterCount: 6,
  saltwaterCount: 4,
  releasedCount: 3,
  biggestPhotoUrl: null,
};

const ACHIEVEMENTS = [
  { id: 1, name: 'First Catch', description: 'd', icon_url: null, criteria: { type: 'catches_count', threshold: 1 } },
  { id: 2, name: 'Species Coll', description: 'd', icon_url: null, criteria: { type: 'species_count', threshold: 5 } },
  { id: 3, name: 'Big Catcher', description: 'd', icon_url: null, criteria: { type: 'biggest_fish_kg', threshold: 10 } },
  { id: 4, name: 'Freshwater Fan', description: 'd', icon_url: null, criteria: { type: 'habitat_catches', threshold: 25, habitat: 'freshwater' } },
  { id: 5, name: 'Saltwater Sailor', description: 'd', icon_url: null, criteria: { type: 'habitat_catches', threshold: 25, habitat: 'saltwater' } },
  { id: 6, name: 'Catch & Release', description: 'd', icon_url: null, criteria: { type: 'released_catches', threshold: 25 } },
];

describe('achievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserStats.mockResolvedValue(STATS);
  });

  describe('checkAchievements', () => {
    it('maps current value from stats for each criteria type', async () => {
      from.mockReturnValue(makeChain({ data: ACHIEVEMENTS }));
      // second from() call returns earned (empty)
      from.mockReturnValueOnce(makeChain({ data: ACHIEVEMENTS }));
      from.mockReturnValueOnce(makeChain({ data: [] }));

      const progress = await checkAchievements('u1');

      const byName = Object.fromEntries(progress.map((p) => [p.achievement.name, p.current]));
      expect(byName['First Catch']).toBe(STATS.totalCatches); // catches_count
      expect(byName['Species Coll']).toBe(STATS.uniqueSpecies); // species_count
      expect(byName['Big Catcher']).toBe(STATS.biggestFishKg); // biggest_fish_kg
      expect(byName['Freshwater Fan']).toBe(STATS.freshwaterCount); // habitat freshwater
      expect(byName['Saltwater Sailor']).toBe(STATS.saltwaterCount); // habitat saltwater
      expect(byName['Catch & Release']).toBe(STATS.releasedCount); // released_catches
    });

    it('populates the earned map from user_achievements', async () => {
      from.mockReturnValueOnce(makeChain({ data: ACHIEVEMENTS }));
      from.mockReturnValueOnce(
        makeChain({ data: [{ achievement_id: 1, earned_at: '2024-01-01' }] }),
      );

      const progress = await checkAchievements('u1');
      const earned = progress.find((p) => p.achievement.id === 1);
      const notEarned = progress.find((p) => p.achievement.id === 2);

      expect(earned?.earned).toBe(true);
      expect(earned?.earned_at).toBe('2024-01-01');
      expect(notEarned?.earned).toBe(false);
      expect(notEarned?.earned_at).toBeNull();
    });

    it('calculates progress as Math.min(current/threshold, 1)', async () => {
      from.mockReturnValueOnce(makeChain({ data: ACHIEVEMENTS }));
      from.mockReturnValueOnce(makeChain({ data: [] }));

      const progress = await checkAchievements('u1');
      const byName = Object.fromEntries(progress.map((p) => [p.achievement.name, p.progress]));

      // catches_count: 10/1 -> capped at 1
      expect(byName['First Catch']).toBe(1);
      // species_count: 4/5 -> 0.8
      expect(byName['Species Coll']).toBeCloseTo(0.8, 5);
      // biggest_fish_kg: 12/10 -> capped at 1
      expect(byName['Big Catcher']).toBe(1);
      // habitat freshwater: 6/25 -> 0.24
      expect(byName['Freshwater Fan']).toBeCloseTo(0.24, 5);
    });

    it('returns empty array when no achievements', async () => {
      from.mockReturnValueOnce(makeChain({ data: null }));
      expect(await checkAchievements('u1')).toEqual([]);
    });
  });

  describe('awardAchievementIfEarned', () => {
    it('inserts and returns the name of the first newly-earned achievement', async () => {
      // 'Big Catcher' (id 3) has progress 1 (12 >= 10) and is not earned.
      const earnedList = [
        { achievement_id: 1, earned_at: '2024-01-01' }, // First Catch already earned (progress 1)
      ];
      const achievementsChain = makeChain({ data: ACHIEVEMENTS });
      const earnedSelectChain = makeChain({ data: earnedList });
      const insertChain = makeChain({ error: null });
      earnedSelectChain.insert = jest.fn(() => insertChain);

      from.mockImplementation((table: string) => {
        if (table === 'achievements') return achievementsChain;
        if (table === 'user_achievements') return earnedSelectChain;
        return makeChain({ data: null });
      });

      const name = await awardAchievementIfEarned('u1');

      // find() returns the first unearned with progress >= 1: id 3 'Big Catcher'
      expect(name).toBe('Big Catcher');
      expect(earnedSelectChain.insert).toHaveBeenCalledWith({
        user_id: 'u1',
        achievement_id: 3,
      });
    });

    it('returns null when no new achievements are earned', async () => {
      // Mark every achievement as already earned so nothing new qualifies.
      const earnedList = ACHIEVEMENTS.map((a) => ({
        achievement_id: a.id,
        earned_at: '2024-01-01',
      }));
      const insertSpy = jest.fn(() => makeChain({ error: null }));

      from.mockImplementation((table: string) => {
        if (table === 'achievements') return makeChain({ data: ACHIEVEMENTS });
        if (table === 'user_achievements') {
          const c = makeChain({ data: earnedList });
          c.insert = insertSpy;
          return c;
        }
        return makeChain({ data: null });
      });

      const name = await awardAchievementIfEarned('u1');

      expect(name).toBeNull();
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  describe('seedAchievements', () => {
    it('skips insertion when achievements already exist', async () => {
      const insertSpy = jest.fn(() => makeChain({ error: null }));
      from.mockImplementation(() => {
        const c = makeChain({ data: [{ id: 1 }] });
        c.insert = insertSpy;
        return c;
      });

      await seedAchievements();

      // Only the existence check (select) was performed; insert never called.
      expect(insertSpy).not.toHaveBeenCalled();
      expect(from).toHaveBeenCalledTimes(1);
    });

    it('inserts seeds when no achievements exist', async () => {
      const insertSpy = jest.fn(() => makeChain({ error: null }));
      from.mockImplementation(() => {
        const c = makeChain({ data: [] });
        c.insert = insertSpy;
        return c;
      });

      await seedAchievements();

      expect(insertSpy).toHaveBeenCalledTimes(1);
      const inserted = insertSpy.mock.calls[0][0];
      expect(Array.isArray(inserted)).toBe(true);
      expect(inserted).toHaveLength(12);
    });
  });
});
