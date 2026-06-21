import { SPECIES_BEHAVIORS, type SpeciesBehaviorProfile } from './species-behavior';
import { getForecast, getCurrentWeather, type ForecastDay, type WeatherConditions } from './weather';
import { getUserStats } from './stats-aggregation';
import { supabase } from './supabase';
import { colors } from './theme';

export type TimeWindow = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export interface TimeWindowInfo {
  key: TimeWindow;
  label: string;
  hours: [number, number];
  icon: string;
}

export const TIME_WINDOWS: TimeWindowInfo[] = [
  { key: 'early_morning', label: 'Early Morning', hours: [5, 8], icon: 'sunny-outline' },
  { key: 'morning', label: 'Morning', hours: [8, 11], icon: 'sunny' },
  { key: 'midday', label: 'Midday', hours: [11, 14], icon: 'sunny' },
  { key: 'afternoon', label: 'Afternoon', hours: [14, 17], icon: 'partly-sunny' },
  { key: 'evening', label: 'Evening', hours: [17, 20], icon: 'moon-outline' },
  { key: 'night', label: 'Night', hours: [20, 5], icon: 'moon' },
];

export interface SpeciesBiteScore {
  species_name: string;
  scientific_name: string;
  overall_score: number;
  temp_score: number;
  light_score: number;
  wind_score: number;
  pressure_score: number;
  rating: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface BiteForecast {
  time_window: TimeWindowInfo;
  overall_rating: 'excellent' | 'good' | 'fair' | 'poor';
  overall_score: number;
  species_scores: SpeciesBiteScore[];
  temp_c: number;
  wind_kph: number;
  sky: string;
}

export interface DayBiteForecast {
  date: string;
  day_label: string;
  windows: BiteForecast[];
  best_window: BiteForecast | null;
  best_species: SpeciesBiteScore | null;
}

function getTimeWindow(hour: number): TimeWindow {
  if (hour >= 5 && hour < 8) return 'early_morning';
  if (hour >= 8 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function scoreTemperature(tempC: number, profile: SpeciesBehaviorProfile): number {
  const [min, max] = profile.temp_range_c;
  const [optMin, optMax] = profile.temp_optimal_c;

  if (tempC < min || tempC > max) return 0;
  if (tempC >= optMin && tempC <= optMax) return 1;

  if (tempC < optMin) {
    return Math.max(0, (tempC - min) / (optMin - min));
  }
  return Math.max(0, (max - tempC) / (max - optMax));
}

function scoreLight(window: TimeWindow, profile: SpeciesBehaviorProfile): number {
  const isDawnDusk = window === 'early_morning' || window === 'evening';
  const isDaytime = window === 'morning' || window === 'midday' || window === 'afternoon';
  const isNight = window === 'night';

  switch (profile.light_preference) {
    case 'dawn_dusk': return isDawnDusk ? 1 : isDaytime ? 0.4 : 0.2;
    case 'daytime': return isDaytime ? 1 : isDawnDusk ? 0.6 : 0.1;
    case 'night': return isNight ? 1 : isDawnDusk ? 0.4 : 0.1;
    case 'any': return 0.7;
  }
}

function scoreWind(windKph: number, profile: SpeciesBehaviorProfile): number {
  switch (profile.wind_tolerance) {
    case 'calm': return windKph < 10 ? 1 : windKph < 15 ? 0.5 : 0.1;
    case 'light': return windKph < 15 ? 1 : windKph < 25 ? 0.5 : 0.1;
    case 'moderate': return windKph < 25 ? 1 : windKph < 35 ? 0.4 : 0.1;
    case 'any': return 0.8;
  }
}

function scorePressure(profile: SpeciesBehaviorProfile): number {
  switch (profile.pressure_preference) {
    case 'falling': return 0.9;
    case 'stable': return 0.8;
    case 'rising': return 0.5;
    case 'any': return 0.7;
  }
}

function computeRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'fair';
  return 'poor';
}

function computeSpeciesScore(
  profile: SpeciesBehaviorProfile,
  window: TimeWindow,
  tempC: number,
  windKph: number,
): SpeciesBiteScore {
  const temp = scoreTemperature(tempC, profile);
  const light = scoreLight(window, profile);
  const wind = scoreWind(windKph, profile);
  const pressure = scorePressure(profile);

  const overall = temp * 0.35 + light * 0.30 + wind * 0.20 + pressure * 0.15;

  return {
    species_name: profile.common_name,
    scientific_name: profile.scientific_name,
    overall_score: Math.round(overall * 100) / 100,
    temp_score: temp,
    light_score: light,
    wind_score: wind,
    pressure_score: pressure,
    rating: computeRating(overall),
  };
}

function getWeatherForHour(
  current: WeatherConditions | null,
  forecast: ForecastDay[],
  hour: number,
): { temp: number; wind: number; sky: string } {
  const now = new Date();
  const currentHour = now.getHours();

  if (hour >= currentHour && hour < currentHour + 3 && current) {
    return { temp: current.temp_c, wind: current.wind_kph, sky: current.sky_conditions };
  }

  if (forecast.length > 0) {
    const dayIndex = hour < currentHour ? 1 : 0;
    const day = forecast[Math.min(dayIndex, forecast.length - 1)];
    if (day) {
      const midTemp = (day.temp_max_c + day.temp_min_c) / 2;
      const variation = Math.sin(((hour - 6) / 24) * Math.PI) * ((day.temp_max_c - day.temp_min_c) / 2);
      return {
        temp: Math.round(midTemp + variation),
        wind: day.wind_kph,
        sky: day.sky_conditions,
      };
    }
  }

  return { temp: 20, wind: 10, sky: 'Clear' };
}

export async function generateBiteForecast(
  latitude: number,
  longitude: number,
): Promise<DayBiteForecast[]> {
  const [current, forecast] = await Promise.all([
    getCurrentWeather(latitude, longitude),
    getForecast(latitude, longitude),
  ]);

  const days: DayBiteForecast[] = [];
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() + dayOffset);

    const dayLabel = dayOffset === 0 ? 'Today' : 'Tomorrow';

    const windows: BiteForecast[] = [];

    for (const tw of TIME_WINDOWS) {
      const midHour = tw.key === 'night'
        ? 22
        : (tw.hours[0] + tw.hours[1]) / 2;

      const actualHour = dayOffset === 0 && midHour < now.getHours()
        ? now.getHours()
        : midHour;

      const weather = getWeatherForHour(current, forecast, actualHour);

      const speciesScores = SPECIES_BEHAVIORS.map((profile) =>
        computeSpeciesScore(profile, tw.key, weather.temp, weather.wind),
      ).sort((a, b) => b.overall_score - a.overall_score);

      const topSpecies = speciesScores.slice(0, 5);
      const overallScore = topSpecies.reduce((a, s) => a + s.overall_score, 0) / topSpecies.length;

      windows.push({
        time_window: tw,
        overall_rating: computeRating(overallScore),
        overall_score: Math.round(overallScore * 100) / 100,
        species_scores: topSpecies,
        temp_c: weather.temp,
        wind_kph: weather.wind,
        sky: weather.sky,
      });
    }

    const bestWindow = windows.reduce((best, w) =>
      w.overall_score > (best?.overall_score ?? 0) ? w : best,
      null as BiteForecast | null,
    );

    const bestSpecies = bestWindow?.species_scores[0] ?? null;

    days.push({
      date: dayDate.toISOString(),
      day_label: dayLabel,
      windows,
      best_window: bestWindow,
      best_species: bestSpecies,
    });
  }

  return days;
}

export function getRatingColor(rating: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (rating) {
    case 'excellent': return colors.success;
    case 'good': return colors.primary;
    case 'fair': return colors.warning;
    case 'poor': return colors.danger;
  }
}

export function getRatingIcon(rating: 'excellent' | 'good' | 'fair' | 'poor'): string {
  switch (rating) {
    case 'excellent': return 'trophy';
    case 'good': return 'thumbs-up';
    case 'fair': return 'remove';
    case 'poor': return 'thumbs-down';
  }
}
