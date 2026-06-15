export interface TackleRecommendation {
  lure_name: string;
  lure_type: string;
  color: string;
  technique: string;
  depth: string;
  priority: 'primary' | 'secondary' | 'situational';
  reason: string;
}

export interface TackleProfile {
  species: string;
  scientific_name: string;
  recommendations: TackleRecommendation[];
}

import tackleProfiles from '../data/tackle-profiles.json';

type LightCondition = 'bright' | 'overcast' | 'low_light';
type WaterClarity = 'clear' | 'stained' | 'muddy';

function getLightCondition(hour: number): LightCondition {
  if ((hour >= 10 && hour <= 14)) return 'bright';
  if ((hour >= 5 && hour < 10) || (hour > 14 && hour <= 19)) return 'low_light';
  return 'overcast';
}

function getColorForConditions(light: LightCondition, clarity: WaterClarity): string {
  if (clarity === 'muddy') return 'Chartreuse';
  if (clarity === 'stained') return 'Chartreuse/White';
  if (light === 'bright') return 'Natural/Green Pumpkin';
  if (light === 'low_light') return 'Black/Dark';
  return 'White';
}

export function getTackleAdvice(
  speciesName: string,
  tempC?: number,
  windKph?: number,
  hour?: number,
): TackleRecommendation[] {
  const profile = (tackleProfiles as TackleProfile[]).find(
    (p) => p.species.toLowerCase() === speciesName.toLowerCase(),
  );

  if (!profile) {
    return getDefaultRecommendations();
  }

  const currentHour = hour ?? new Date().getHours();
  const light = getLightCondition(currentHour);
  const effectiveColor = getColorForConditions(light, 'clear');

  return profile.recommendations.map((rec) => ({
    ...rec,
    color: effectiveColor,
    priority: rec.priority,
  }));
}

function getDefaultRecommendations(): TackleRecommendation[] {
  return [
    {
      lure_name: 'Soft Plastic Worm',
      lure_type: 'Soft Plastic',
      color: 'Green Pumpkin',
      technique: 'Texas rig, slow retrieve along bottom',
      depth: 'Bottom',
      priority: 'primary',
      reason: 'Works for most freshwater species in any condition',
    },
    {
      lure_name: 'Spinnerbait',
      lure_type: 'Spinnerbait',
      color: 'White/Chartreuse',
      technique: 'Steady retrieve, vary speed',
      depth: 'Mid-water',
      priority: 'secondary',
      reason: 'Versatile search bait for locating active fish',
    },
    {
      lure_name: 'Live Worm',
      lure_type: 'Live Bait',
      color: 'Natural',
      technique: 'Bottom rig or bobber',
      depth: 'Variable',
      priority: 'situational',
      reason: 'When artificial lures aren\'t working, live bait is always reliable',
    },
  ];
}

export function getConditionsSummary(
  tempC: number,
  windKph: number,
  hour: number,
): { label: string; icon: string } {
  const light = getLightCondition(hour);

  if (light === 'low_light' && tempC >= 15 && tempC <= 25 && windKph < 15) {
    return { label: 'Prime Time — Low light, calm, ideal temp', icon: 'sunny-outline' };
  }
  if (windKph >= 25) {
    return { label: 'Windy — Fish windblown banks, use heavier lures', icon: 'leaf-outline' };
  }
  if (tempC > 30) {
    return { label: 'Hot — Fish deeper, slow down presentations', icon: 'thermometer-outline' };
  }
  if (tempC < 10) {
    return { label: 'Cold — Slow retrieves, fish deep structure', icon: 'snow-outline' };
  }
  return { label: 'Standard conditions — Match the hatch', icon: 'water-outline' };
}
