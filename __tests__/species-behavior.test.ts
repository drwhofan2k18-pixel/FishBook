import {
  getBehaviorProfile,
  getBehaviorByCommonName,
  getAllBehaviors,
  SPECIES_BEHAVIORS,
} from '../lib/species-behavior';

describe('species-behavior', () => {
  describe('SPECIES_BEHAVIORS', () => {
    it('has at least 15 species profiles', () => {
      expect(SPECIES_BEHAVIORS.length).toBeGreaterThanOrEqual(15);
    });

    it('all profiles have required fields', () => {
      for (const profile of SPECIES_BEHAVIORS) {
        expect(profile.scientific_name).toBeTruthy();
        expect(profile.common_name).toBeTruthy();
        expect(profile.temp_range_c).toHaveLength(2);
        expect(profile.temp_optimal_c).toHaveLength(2);
        expect(profile.temp_range_c[0]).toBeLessThan(profile.temp_range_c[1]);
        expect(profile.temp_optimal_c[0]).toBeLessThan(profile.temp_optimal_c[1]);
        expect(['dawn_dusk', 'daytime', 'night', 'any']).toContain(profile.light_preference);
        expect(['calm', 'light', 'moderate', 'any']).toContain(profile.wind_tolerance);
        expect(['falling', 'stable', 'rising', 'any']).toContain(profile.pressure_preference);
        expect(['shallow', 'mid', 'deep', 'any']).toContain(profile.depth_preference);
        expect(['high', 'medium', 'low']).toContain(profile.moon_sensitivity);
      }
    });

    it('optimal range is within total range', () => {
      for (const profile of SPECIES_BEHAVIORS) {
        expect(profile.temp_optimal_c[0]).toBeGreaterThanOrEqual(profile.temp_range_c[0]);
        expect(profile.temp_optimal_c[1]).toBeLessThanOrEqual(profile.temp_range_c[1]);
      }
    });
  });

  describe('getBehaviorProfile', () => {
    it('finds Largemouth Bass by scientific name', () => {
      const profile = getBehaviorProfile('Micropterus salmoides');
      expect(profile).not.toBeNull();
      expect(profile?.common_name).toBe('Largemouth Bass');
    });

    it('returns null for unknown species', () => {
      expect(getBehaviorProfile('Fakeus fishus')).toBeNull();
    });

    it('Bass prefers dawn_dusk', () => {
      const profile = getBehaviorProfile('Micropterus salmoides');
      expect(profile?.light_preference).toBe('dawn_dusk');
    });

    it('Catfish prefers night', () => {
      const profile = getBehaviorProfile('Ictalurus punctatus');
      expect(profile?.light_preference).toBe('night');
    });
  });

  describe('getBehaviorByCommonName', () => {
    it('finds species by common name', () => {
      const profile = getBehaviorByCommonName('Walleye');
      expect(profile).not.toBeNull();
      expect(profile?.scientific_name).toBe('Sander vitreus');
    });

    it('returns null for unknown name', () => {
      expect(getBehaviorByCommonName('Fake Fish')).toBeNull();
    });
  });

  describe('getAllBehaviors', () => {
    it('returns all profiles', () => {
      expect(getAllBehaviors()).toEqual(SPECIES_BEHAVIORS);
    });
  });
});
