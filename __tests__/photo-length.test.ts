import {
  calculateLengthFromCalibration,
  calculatePixelDistance,
  REFERENCE_OBJECTS,
} from '../lib/photo-length';

describe('photo-length', () => {
  describe('calculateLengthFromCalibration', () => {
    it('calculates fish length from pixel ratio', () => {
      const calibration = {
        startX: 0, startY: 0,
        endX: 100, endY: 0,
        referencePixels: 100,
        referenceCm: 10, // 10cm = 100px → 0.1 cm/px
      };
      const result = calculateLengthFromCalibration(200, calibration);
      expect(result.fishLengthCm).toBe(20); // 200px * 0.1cm/px
    });

    it('returns high accuracy for large reference + fish', () => {
      const result = calculateLengthFromCalibration(150, {
        startX: 0, startY: 0, endX: 250, endY: 0,
        referencePixels: 250,
        referenceCm: 8.56,
      });
      expect(result.accuracy).toBe('high');
    });

    it('returns medium accuracy for moderate values', () => {
      const result = calculateLengthFromCalibration(60, {
        startX: 0, startY: 0, endX: 150, endY: 0,
        referencePixels: 150,
        referenceCm: 8.56,
      });
      expect(result.accuracy).toBe('medium');
    });

    it('returns low accuracy for small values', () => {
      const result = calculateLengthFromCalibration(30, {
        startX: 0, startY: 0, endX: 50, endY: 0,
        referencePixels: 50,
        referenceCm: 8.56,
      });
      expect(result.accuracy).toBe('low');
    });

    it('rounds to 1 decimal place', () => {
      const result = calculateLengthFromCalibration(333, {
        startX: 0, startY: 0, endX: 100, endY: 0,
        referencePixels: 100,
        referenceCm: 8.56,
      });
      const decimalPart = result.fishLengthCm.toString().split('.')[1] ?? '';
      expect(decimalPart.length).toBeLessThanOrEqual(1);
    });
  });

  describe('calculatePixelDistance', () => {
    it('calculates horizontal distance', () => {
      expect(calculatePixelDistance(0, 0, 100, 0)).toBe(100);
    });

    it('calculates vertical distance', () => {
      expect(calculatePixelDistance(0, 0, 0, 100)).toBe(100);
    });

    it('calculates diagonal distance', () => {
      expect(calculatePixelDistance(0, 0, 3, 4)).toBe(5);
    });

    it('returns 0 for same point', () => {
      expect(calculatePixelDistance(50, 50, 50, 50)).toBe(0);
    });
  });

  describe('REFERENCE_OBJECTS', () => {
    it('has 6 reference objects', () => {
      expect(REFERENCE_OBJECTS.length).toBe(6);
    });

    it('all objects have name, sizeCm, and icon', () => {
      for (const obj of REFERENCE_OBJECTS) {
        expect(obj.name).toBeTruthy();
        expect(obj.sizeCm).toBeGreaterThan(0);
        expect(obj.icon).toBeTruthy();
      }
    });

    it('credit card is ~8.56cm', () => {
      const cc = REFERENCE_OBJECTS.find((o) => o.name === 'Credit Card');
      expect(cc?.sizeCm).toBe(8.56);
    });

    it('ruler is ~30.48cm', () => {
      const ruler = REFERENCE_OBJECTS.find((o) => o.name.includes('Ruler'));
      expect(ruler?.sizeCm).toBe(30.48);
    });
  });
});
