import {
  estimateWeightFromLength,
  estimateLengthFromWeight,
  DEFAULT_PARAMS,
} from '../lib/weight-calc';

describe('weight-calc', () => {
  describe('estimateWeightFromLength', () => {
    it('calculates weight using FishBase formula W = a * L^b', () => {
      const result = estimateWeightFromLength(30, { a: 0.01, b: 3.0 });
      // 0.01 * 30^3 = 0.01 * 27000 = 270
      expect(result.weightKg).toBe(270);
    });

    it('returns ±20% weight range', () => {
      const result = estimateWeightFromLength(30, { a: 0.01, b: 3.0 });
      expect(result.minWeightKg).toBe(216); // 270 * 0.8
      expect(result.maxWeightKg).toBe(324); // 270 * 1.2
    });

    it('rounds to 2 decimal places', () => {
      const result = estimateWeightFromLength(25, { a: 0.009, b: 3.02 });
      expect(result.weightKg.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
    });

    it('handles small fish (10cm)', () => {
      const result = estimateWeightFromLength(10, DEFAULT_PARAMS.bass);
      expect(result.weightKg).toBeGreaterThan(0);
    });

    it('handles large fish (100cm)', () => {
      const result = estimateWeightFromLength(100, DEFAULT_PARAMS.bass);
      expect(result.weightKg).toBeGreaterThan(10);
    });

    it('returns method as estimated_species', () => {
      const result = estimateWeightFromLength(30, DEFAULT_PARAMS.bass);
      expect(result.method).toBe('estimated_species');
    });
  });

  describe('estimateLengthFromWeight', () => {
    it('is the inverse of estimateWeightFromLength', () => {
      const params = { a: 0.01, b: 3.0 };
      const lengthCm = 30;
      const { weightKg } = estimateWeightFromLength(lengthCm, params);
      const estimatedLength = estimateLengthFromWeight(weightKg, params);
      expect(estimatedLength).toBeCloseTo(lengthCm, 0);
    });

    it('calculates length from weight correctly', () => {
      // L = (W / a)^(1/b) = (10 / 0.01)^(1/3) = 1000^(1/3) = 10
      const result = estimateLengthFromWeight(10, { a: 0.01, b: 3.0 });
      expect(result).toBe(10);
    });
  });

  describe('DEFAULT_PARAMS', () => {
    it('has freshwater and saltwater defaults', () => {
      expect(DEFAULT_PARAMS.freshwater).toBeDefined();
      expect(DEFAULT_PARAMS.saltwater).toBeDefined();
    });

    it('has bass, trout, salmon, tuna, etc.', () => {
      expect(DEFAULT_PARAMS.bass).toBeDefined();
      expect(DEFAULT_PARAMS.trout).toBeDefined();
      expect(DEFAULT_PARAMS.salmon).toBeDefined();
      expect(DEFAULT_PARAMS.tuna).toBeDefined();
      expect(DEFAULT_PARAMS.cod).toBeDefined();
      expect(DEFAULT_PARAMS.catfish).toBeDefined();
      expect(DEFAULT_PARAMS.carp).toBeDefined();
      expect(DEFAULT_PARAMS.perch).toBeDefined();
      expect(DEFAULT_PARAMS.pike).toBeDefined();
      expect(DEFAULT_PARAMS.mackerel).toBeDefined();
    });

    it('all params have valid a and b values', () => {
      for (const [name, params] of Object.entries(DEFAULT_PARAMS)) {
        expect(params.a).toBeGreaterThan(0);
        expect(params.a).toBeLessThan(1);
        expect(params.b).toBeGreaterThan(2);
        expect(params.b).toBeLessThan(4);
      }
    });
  });
});
