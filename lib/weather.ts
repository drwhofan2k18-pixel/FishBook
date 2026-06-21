import NetInfo from '@react-native-community/netinfo';
import { colors } from './theme';

const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '';

export interface WeatherConditions {
  temp_c: number;
  feels_like_c: number;
  wind_kph: number;
  wind_dir: string;
  pressure_mb: number;
  humidity_pct: number;
  sky_conditions: string;
  description: string;
  icon: string;
  moon_phase: string;
  fishing_rating: 'good' | 'fair' | 'poor';
}

export interface ForecastDay {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  wind_kph: number;
  sky_conditions: string;
  description: string;
  icon: string;
  fishing_rating: 'good' | 'fair' | 'poor';
}

function calculateMoonPhase(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const r = year % 100;
  const s = Math.floor(r / 4);
  const t = r + s + day + (month < 3 ? month + 2 : month - 4);
  const u = Math.floor(t / 30);
  const phase = (t - u * 30) + 1;

  if (phase < 3) return 'new_moon';
  if (phase < 7) return 'waxing_crescent';
  if (phase < 10) return 'first_quarter';
  if (phase < 14) return 'waxing_gibbous';
  if (phase < 17) return 'full_moon';
  if (phase < 21) return 'waning_gibbous';
  if (phase < 24) return 'last_quarter';
  if (phase < 28) return 'waning_crescent';
  return 'new_moon';
}

function calculateFishingRating(tempC: number, windKph: number): 'good' | 'fair' | 'poor' {
  const tempGood = tempC >= 15 && tempC <= 25;
  const tempFair = tempC >= 10 && tempC <= 30;
  const windGood = windKph < 15;
  const windFair = windKph < 25;

  if (tempGood && windGood) return 'good';
  if (tempFair && windFair) return 'fair';
  return 'poor';
}

export async function getCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherConditions | null> {
  if (!WEATHER_API_KEY) return null;

  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return null;

    const url = `${WEATHER_API_BASE}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const windDir = degreesToDirection(data.wind?.deg ?? 0);

    return {
      temp_c: data.main?.temp ?? 0,
      feels_like_c: data.main?.feels_like ?? 0,
      wind_kph: (data.wind?.speed ?? 0) * 3.6,
      wind_dir: windDir,
      pressure_mb: data.main?.pressure ?? 1013,
      humidity_pct: data.main?.humidity ?? 50,
      sky_conditions: data.weather?.[0]?.main ?? 'Unknown',
      description: data.weather?.[0]?.description ?? '',
      icon: data.weather?.[0]?.icon ?? '01d',
      moon_phase: calculateMoonPhase(new Date()),
      fishing_rating: calculateFishingRating(
        data.main?.temp ?? 20,
        (data.wind?.speed ?? 0) * 3.6,
      ),
    };
  } catch {
    return null;
  }
}

export async function getForecast(
  latitude: number,
  longitude: number,
): Promise<ForecastDay[]> {
  if (!WEATHER_API_KEY) return [];

  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return [];

    const url = `${WEATHER_API_BASE}/forecast?lat=${latitude}&lon=${longitude}&units=metric&cnt=40&appid=${WEATHER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data?.list) return [];

    const byDay = new Map<string, { temps: number[]; winds: number[]; sky: string; desc: string; icon: string }>();
    for (const item of data.list) {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = byDay.get(date);
      if (existing) {
        existing.temps.push(item.main?.temp ?? 0);
        existing.winds.push((item.wind?.speed ?? 0) * 3.6);
      } else {
        byDay.set(date, {
          temps: [item.main?.temp ?? 0],
          winds: [(item.wind?.speed ?? 0) * 3.6],
          sky: item.weather?.[0]?.main ?? 'Unknown',
          desc: item.weather?.[0]?.description ?? '',
          icon: item.weather?.[0]?.icon ?? '01d',
        });
      }
    }

    return Array.from(byDay.entries()).slice(0, 5).map(([date, info]) => ({
      date,
      temp_max_c: Math.round(Math.max(...info.temps)),
      temp_min_c: Math.round(Math.min(...info.temps)),
      wind_kph: Math.round(info.winds.reduce((a, b) => a + b, 0) / info.winds.length),
      sky_conditions: info.sky,
      description: info.desc,
      icon: info.icon,
      fishing_rating: calculateFishingRating(
        info.temps.reduce((a, b) => a + b, 0) / info.temps.length,
        info.winds.reduce((a, b) => a + b, 0) / info.winds.length,
      ),
    }));
  } catch {
    return [];
  }
}

function degreesToDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

export function fishingRatingColor(rating: 'good' | 'fair' | 'poor'): string {
  switch (rating) {
    case 'good': return colors.success;
    case 'fair': return colors.warning;
    case 'poor': return colors.danger;
  }
}

export function fishingRatingLabel(rating: 'good' | 'fair' | 'poor'): string {
  switch (rating) {
    case 'good': return 'Great Day to Fish';
    case 'fair': return 'Fair Conditions';
    case 'poor': return 'Tough Conditions';
  }
}
