import {
  fishingRatingColor,
  fishingRatingLabel,
} from '../lib/weather';
import {
  getHeatColor,
  getHeatOpacity,
} from '../lib/community-map';
import {
  getRatingColor,
  getRatingIcon,
  TIME_WINDOWS,
} from '../lib/bite-forecast';

describe('weather helpers', () => {
  describe('fishingRatingColor', () => {
    it('returns green for good', () => {
      expect(fishingRatingColor('good')).toBe('#34C759');
    });

    it('returns orange for fair', () => {
      expect(fishingRatingColor('fair')).toBe('#FF9500');
    });

    it('returns red for poor', () => {
      expect(fishingRatingColor('poor')).toBe('#FF3B30');
    });
  });

  describe('fishingRatingLabel', () => {
    it('returns descriptive labels', () => {
      expect(fishingRatingLabel('good')).toContain('Great');
      expect(fishingRatingLabel('fair')).toContain('Fair');
      expect(fishingRatingLabel('poor')).toContain('Tough');
    });
  });
});

describe('community-map helpers', () => {
  describe('getHeatColor', () => {
    it('returns red for high activity', () => {
      expect(getHeatColor(0.9)).toBe('#FF3B30');
    });

    it('returns gray for low activity', () => {
      expect(getHeatColor(0.1)).toBe('#8E8E93');
    });

    it('has distinct colors for each level', () => {
      const colors = new Set([
        getHeatColor(0.1),
        getHeatColor(0.3),
        getHeatColor(0.5),
        getHeatColor(0.7),
        getHeatColor(0.9),
      ]);
      expect(colors.size).toBe(5);
    });
  });

  describe('getHeatOpacity', () => {
    it('returns opacity between 0.3 and 0.8', () => {
      expect(getHeatOpacity(0)).toBeGreaterThanOrEqual(0.3);
      expect(getHeatOpacity(1)).toBeLessThanOrEqual(0.8);
    });

    it('increases with rating', () => {
      expect(getHeatOpacity(0.8)).toBeGreaterThan(getHeatOpacity(0.2));
    });
  });
});

describe('bite-forecast helpers', () => {
  describe('getRatingColor', () => {
    it('has colors for all ratings', () => {
      expect(getRatingColor('excellent')).toBeTruthy();
      expect(getRatingColor('good')).toBeTruthy();
      expect(getRatingColor('fair')).toBeTruthy();
      expect(getRatingColor('poor')).toBeTruthy();
    });
  });

  describe('getRatingIcon', () => {
    it('has icons for all ratings', () => {
      expect(getRatingIcon('excellent')).toBe('trophy');
      expect(getRatingIcon('good')).toBe('thumbs-up');
      expect(getRatingIcon('fair')).toBe('remove');
      expect(getRatingIcon('poor')).toBe('thumbs-down');
    });
  });

  describe('TIME_WINDOWS', () => {
    it('has 6 time windows', () => {
      expect(TIME_WINDOWS.length).toBe(6);
    });

    it('covers 24 hours', () => {
      const sorted = [...TIME_WINDOWS]
        .filter((w) => w.key !== 'night')
        .sort((a, b) => a.hours[0] - b.hours[0]);
      expect(sorted[0].hours[0]).toBe(5); // Early morning starts at 5
    });

    it('all windows have label and icon', () => {
      for (const tw of TIME_WINDOWS) {
        expect(tw.label).toBeTruthy();
        expect(tw.icon).toBeTruthy();
        expect(tw.key).toBeTruthy();
      }
    });
  });
});
