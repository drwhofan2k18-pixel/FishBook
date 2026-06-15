/**
 * FishBase length-weight relationship calculator.
 * Formula: W = a * L^b
 *
 * Where:
 *   W = weight in kilograms
 *   L = length in centimeters
 *   a = condition factor (species-specific)
 *   b = shape parameter (species-specific, typically ~3.0)
 */

export interface LengthWeightParams {
  a: number;
  b: number;
}

export interface WeightEstimate {
  weightKg: number;
  minWeightKg: number;
  maxWeightKg: number;
  method: 'measured' | 'estimated_photo' | 'estimated_species';
}

/**
 * Calculate estimated weight from length using FishBase formula.
 * Returns weight with a confidence range of ±20%.
 */
export function estimateWeightFromLength(
  lengthCm: number,
  params: LengthWeightParams,
): WeightEstimate {
  const weightKg = params.a * Math.pow(lengthCm, params.b);

  return {
    weightKg: Math.round(weightKg * 100) / 100,
    minWeightKg: Math.round(weightKg * 0.8 * 100) / 100,
    maxWeightKg: Math.round(weightKg * 1.2 * 100) / 100,
    method: 'estimated_species',
  };
}

/**
 * Calculate length from weight (inverse of the FishBase formula).
 * L = (W / a)^(1/b)
 */
export function estimateLengthFromWeight(
  weightKg: number,
  params: LengthWeightParams,
): number {
  return Math.round(Math.pow(weightKg / params.a, 1 / params.b) * 10) / 10;
}

/**
 * Common FishBase length-weight parameters for major fish groups.
 * These are approximate - real parameters vary by species.
 */
export const DEFAULT_PARAMS: Record<string, LengthWeightParams> = {
  // General defaults
  freshwater: { a: 0.010, b: 3.00 },
  saltwater: { a: 0.012, b: 3.00 },

  // Specific groups (approximate averages)
  salmon: { a: 0.008, b: 3.05 },
  trout: { a: 0.009, b: 3.02 },
  bass: { a: 0.011, b: 3.00 },
  tuna: { a: 0.015, b: 2.95 },
  cod: { a: 0.010, b: 3.00 },
  catfish: { a: 0.013, b: 2.98 },
  carp: { a: 0.015, b: 2.97 },
  perch: { a: 0.012, b: 3.02 },
  pike: { a: 0.006, b: 3.10 },
  mackerel: { a: 0.008, b: 3.05 },
};
