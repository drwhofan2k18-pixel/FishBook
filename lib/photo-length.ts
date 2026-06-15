export interface CalibrationLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  referencePixels: number;
  referenceCm: number;
}

export interface CalibrationResult {
  fishLengthCm: number;
  fishPixels: number;
  referencePixels: number;
  referenceCm: number;
  accuracy: 'high' | 'medium' | 'low';
}

export function calculateLengthFromCalibration(
  fishPixels: number,
  calibration: CalibrationLine,
): CalibrationResult {
  const scaleCmPerPx = calibration.referenceCm / calibration.referencePixels;
  const fishLengthCm = fishPixels * scaleCmPerPx;

  let accuracy: CalibrationResult['accuracy'] = 'low';
  if (calibration.referencePixels > 200 && fishPixels > 100) {
    accuracy = 'high';
  } else if (calibration.referencePixels > 100 && fishPixels > 50) {
    accuracy = 'medium';
  }

  return {
    fishLengthCm: Math.round(fishLengthCm * 10) / 10,
    fishPixels,
    referencePixels: calibration.referencePixels,
    referenceCm: calibration.referenceCm,
    accuracy,
  };
}

export interface ReferenceObject {
  name: string;
  sizeCm: number;
  icon: string;
}

export const REFERENCE_OBJECTS: ReferenceObject[] = [
  { name: 'Credit Card', sizeCm: 8.56, icon: 'card-outline' },
  { name: 'US Dollar Bill', sizeCm: 15.6, icon: 'cash-outline' },
  { name: 'Coin (Quarter)', sizeCm: 2.426, icon: 'ellipse-outline' },
  { name: 'Hand (palm width)', sizeCm: 8.5, icon: 'hand-left-outline' },
  { name: 'Phone (standard)', sizeCm: 15.0, icon: 'phone-portrait-outline' },
  { name: 'Ruler (12 inches)', sizeCm: 30.48, icon: 'resize-outline' },
];

export function calculatePixelDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
