jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../lib/supabase';
import {
  getUserStats,
  getSpeciesBreakdown,
  getRecentCatches,
  updateProfile,
} from '../lib/stats-aggregation';

// Build a chainable, thenable query builder that resolves to `result` when awaited.
function makeChain(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof jest.fn>> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn(() => Promise.resolve(result)),
  };
  // Make the builder thenable so `await` resolves with `result`.
  (builder as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void,
    reject: (e: unknown) => void,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const from = supabase.from as jest.Mock;

describe('stats-aggregation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    it('returns all zeros/nulls for empty catches', async () => {
      from.mockReturnValue(makeChain({ data: [], error: null }));

      const stats = await getUserStats('u1');

      expect(from).toHaveBeenCalledWith('catches');
      expect(stats).toEqual({
        totalCatches: 0,
        uniqueSpecies: 0,
        biggestFishKg: null,
        biggestFishSpecies: null,
        biggestFishId: null,
        totalWeightKg: 0,
        freshwaterCount: 0,
        saltwaterCount: 0,
        releasedCount: 0,
        biggestPhotoUrl: null,
      });
    });

    it('computes aggregates from mixed catches', async () => {
      const catches = [
        {
          id: 'c1',
          weight_kg: 2.5,
          is_released: true,
          photo_url: 'p1',
          species: { common_name: 'Bass', habitat: ['freshwater'] },
        },
        {
          id: 'c2',
          weight_kg: 5.0,
          is_released: false,
          photo_url: 'p2',
          species: { common_name: 'Trout', habitat: ['freshwater'] },
        },
        {
          id: 'c3',
          weight_kg: 8.0,
          is_released: true,
          photo_url: 'p3',
          species: { common_name: 'Snook', habitat: ['saltwater'] },
        },
        {
          id: 'c4',
          weight_kg: 0,
          is_released: false,
          photo_url: null,
          species: null,
        },
      ];
      from.mockReturnValue(makeChain({ data: catches, error: null }));

      const stats = await getUserStats('u1');

      expect(stats.totalCatches).toBe(4);
      expect(stats.uniqueSpecies).toBe(4); // Bass, Trout, Snook, Unknown
      expect(stats.biggestFishKg).toBe(8.0);
      expect(stats.totalWeightKg).toBe(15.5);
      expect(stats.freshwaterCount).toBe(2);
      expect(stats.saltwaterCount).toBe(1);
      expect(stats.releasedCount).toBe(2);
    });

    it('tracks biggest fish species, id, and photo', async () => {
      const catches = [
        {
          id: 'c1',
          weight_kg: 3.0,
          is_released: false,
          photo_url: 'p1',
          species: { common_name: 'Bass', habitat: ['freshwater'] },
        },
        {
          id: 'c2',
          weight_kg: 12.0,
          is_released: false,
          photo_url: 'p2',
          species: { common_name: 'Tarpon', habitat: ['saltwater'] },
        },
      ];
      from.mockReturnValue(makeChain({ data: catches, error: null }));

      const stats = await getUserStats('u1');

      expect(stats.biggestFishSpecies).toBe('Tarpon');
      expect(stats.biggestFishId).toBe('c2');
      expect(stats.biggestPhotoUrl).toBe('p2');
    });

    it('returns null biggest when all weights are zero', async () => {
      from.mockReturnValue(
        makeChain({
          data: [
            {
              id: 'c1',
              weight_kg: 0,
              is_released: false,
              photo_url: null,
              species: { common_name: 'Bass', habitat: ['freshwater'] },
            },
          ],
          error: null,
        }),
      );

      const stats = await getUserStats('u1');
      expect(stats.biggestFishKg).toBeNull();
    });
  });

  describe('getSpeciesBreakdown', () => {
    it('groups by species and sorts by count descending', async () => {
      const catches = [
        {
          final_species_id: 1,
          species: { common_name: 'Bass', scientific_name: 'M. salmoides', habitat: ['freshwater'] },
        },
        {
          final_species_id: 1,
          species: { common_name: 'Bass', scientific_name: 'M. salmoides', habitat: ['freshwater'] },
        },
        {
          final_species_id: 2,
          species: { common_name: 'Snook', scientific_name: 'C. undecimalis', habitat: ['saltwater'] },
        },
        {
          final_species_id: 3,
          species: { common_name: 'Tarpon', scientific_name: 'M. atlanticus', habitat: ['freshwater', 'saltwater'] },
        },
      ];
      from.mockReturnValue(makeChain({ data: catches, error: null }));

      const breakdown = await getSpeciesBreakdown('u1');

      expect(breakdown).toHaveLength(3);
      // Bass (2) first, then Snook and Tarpon (1 each)
      expect(breakdown[0].common_name).toBe('Bass');
      expect(breakdown[0].count).toBe(2);
      expect(breakdown[1].count).toBe(1);
      expect(breakdown[2].count).toBe(1);
    });

    it('determines habitat from species data', async () => {
      const catches = [
        {
          final_species_id: 1,
          species: { common_name: 'Bass', scientific_name: 'M.', habitat: ['freshwater'] },
        },
        {
          final_species_id: 2,
          species: { common_name: 'Tarpon', scientific_name: 'M.a', habitat: ['freshwater', 'saltwater'] },
        },
      ];
      from.mockReturnValue(makeChain({ data: catches, error: null }));

      const breakdown = await getSpeciesBreakdown('u1');
      const byName = Object.fromEntries(breakdown.map((b) => [b.common_name, b.habitat]));

      // freshwater-only -> freshwater; includes saltwater -> saltwater
      expect(byName['Bass']).toBe('freshwater');
      expect(byName['Tarpon']).toBe('saltwater');
    });

    it('returns empty array for no catches', async () => {
      from.mockReturnValue(makeChain({ data: null, error: null }));
      expect(await getSpeciesBreakdown('u1')).toEqual([]);
    });

    it('includes scientific_name and species_id', async () => {
      const catches = [
        {
          final_species_id: 7,
          species: { common_name: 'Bass', scientific_name: 'M. salmoides', habitat: ['freshwater'] },
        },
      ];
      from.mockReturnValue(makeChain({ data: catches, error: null }));

      const [first] = await getSpeciesBreakdown('u1');
      expect(first.species_id).toBe(7);
      expect(first.scientific_name).toBe('M. salmoides');
    });
  });

  describe('getRecentCatches', () => {
    it('queries with correct user_id and default limit', async () => {
      const rows = [{ id: 'c1' }];
      from.mockReturnValue(makeChain({ data: rows, error: null }));

      const result = await getRecentCatches('u1');

      expect(from).toHaveBeenCalledWith('catches');
      const builder = from.mock.results[0].value;
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(builder.order).toHaveBeenCalledWith('caught_at', { ascending: false });
      expect(builder.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(rows);
    });

    it('honors a custom limit', async () => {
      from.mockReturnValue(makeChain({ data: [], error: null }));
      await getRecentCatches('u1', 20);

      const builder = from.mock.results[0].value;
      expect(builder.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('updateProfile', () => {
    it('calls supabase update with correct params', async () => {
      const builder = makeChain({ error: null });
      from.mockReturnValue(builder);

      const updates = { display_name: 'Angler', bio: 'hi', home_waters: 'Lake X' };
      await updateProfile('u1', updates);

      expect(from).toHaveBeenCalledWith('profiles');
      expect(builder.update).toHaveBeenCalledWith(updates);
      expect(builder.eq).toHaveBeenCalledWith('id', 'u1');
    });
  });
});
