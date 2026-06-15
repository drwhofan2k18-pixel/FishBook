import {
  formatWeight,
  formatLength,
  formatDistance,
  formatTemperature,
} from '../lib/units';

jest.mock('../lib/units', () => {
  const actual = jest.requireActual('../lib/units');
  return {
    ...actual,
    useUnitStore: jest.fn(),
  };
});

describe('units formatting', () => {
  describe('formatWeight', () => {
    it('formats kg correctly', () => {
      expect(formatWeight(2.3, 'kg')).toBe('2.3 kg');
    });

    it('formats 0 kg', () => {
      expect(formatWeight(0, 'kg')).toBe('0.0 kg');
    });

    it('converts kg to lb', () => {
      const result = formatWeight(1, 'lb');
      expect(result).toBe('2.2 lb');
    });

    it('converts large kg to lb', () => {
      const result = formatWeight(10, 'lb');
      expect(result).toBe('22.0 lb');
    });
  });

  describe('formatLength', () => {
    it('formats cm correctly', () => {
      expect(formatLength(45, 'cm')).toBe('45.0 cm');
    });

    it('converts cm to inches', () => {
      const result = formatLength(25.4, 'in');
      expect(result).toBe('10.0 in');
    });

    it('handles 0 cm', () => {
      expect(formatLength(0, 'cm')).toBe('0.0 cm');
    });
  });

  describe('formatDistance', () => {
    it('formats km correctly', () => {
      expect(formatDistance(5.5, 'km')).toBe('5.5 km');
    });

    it('converts km to miles', () => {
      const result = formatDistance(10, 'mi');
      expect(result).toBe('6.2 mi');
    });
  });

  describe('formatTemperature', () => {
    it('formats Celsius correctly', () => {
      expect(formatTemperature(22, 'c')).toBe('22°C');
    });

    it('converts Celsius to Fahrenheit', () => {
      expect(formatTemperature(0, 'f')).toBe('32°F');
      expect(formatTemperature(100, 'f')).toBe('212°F');
    });

    it('handles negative temperatures', () => {
      expect(formatTemperature(-10, 'c')).toBe('-10°C');
      expect(formatTemperature(-10, 'f')).toBe('14°F');
    });
  });
});
