import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type DistanceUnit = 'km' | 'mi';
export type TemperatureUnit = 'c' | 'f';

interface UnitPreferences {
  weight: WeightUnit;
  length: LengthUnit;
  distance: DistanceUnit;
  temperature: TemperatureUnit;
  setWeight: (unit: WeightUnit) => void;
  setLength: (unit: LengthUnit) => void;
  setDistance: (unit: DistanceUnit) => void;
  setTemperature: (unit: TemperatureUnit) => void;
  loadPreferences: () => Promise<void>;
}

export const useUnitStore = create<UnitPreferences>((set) => ({
  weight: 'kg',
  length: 'cm',
  distance: 'km',
  temperature: 'c',

  setWeight: (unit) => {
    set({ weight: unit });
    AsyncStorage.setItem('fishbook_unit_weight', unit).catch(() => {});
  },

  setLength: (unit) => {
    set({ length: unit });
    AsyncStorage.setItem('fishbook_unit_length', unit).catch(() => {});
  },

  setDistance: (unit) => {
    set({ distance: unit });
    AsyncStorage.setItem('fishbook_unit_distance', unit).catch(() => {});
  },

  setTemperature: (unit) => {
    set({ temperature: unit });
    AsyncStorage.setItem('fishbook_unit_temperature', unit).catch(() => {});
  },

  loadPreferences: async () => {
    try {
      const [w, l, d, t] = await Promise.all([
        AsyncStorage.getItem('fishbook_unit_weight'),
        AsyncStorage.getItem('fishbook_unit_length'),
        AsyncStorage.getItem('fishbook_unit_distance'),
        AsyncStorage.getItem('fishbook_unit_temperature'),
      ]);
      set({
        weight: (w as WeightUnit) ?? 'kg',
        length: (l as LengthUnit) ?? 'cm',
        distance: (d as DistanceUnit) ?? 'km',
        temperature: (t as TemperatureUnit) ?? 'c',
      });
    } catch {
      // silent
    }
  },
}));

export function formatWeight(kg: number, unit: WeightUnit): string {
  if (unit === 'lb') return `${(kg * 2.20462).toFixed(1)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function formatLength(cm: number, unit: LengthUnit): string {
  if (unit === 'in') return `${(cm / 2.54).toFixed(1)} in`;
  return `${cm.toFixed(1)} cm`;
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  if (unit === 'mi') return `${(km * 0.621371).toFixed(1)} mi`;
  return `${km.toFixed(1)} km`;
}

export function formatTemperature(c: number, unit: TemperatureUnit): string {
  if (unit === 'f') return `${((c * 9 / 5) + 32).toFixed(0)}°F`;
  return `${c.toFixed(0)}°C`;
}
