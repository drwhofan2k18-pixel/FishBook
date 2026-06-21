/**
 * Moon Phase + Solunar Theory Calculator
 * Pure math — no external API needed.
 * Provides major/minor feeding periods based on moon transit.
 */

export interface MoonPhaseInfo {
  phase: string;
  illumination: number;
  emoji: string;
  fishingBonus: number;
}

export interface SolunarPeriod {
  type: 'major' | 'minor';
  start: Date;
  end: Date;
  peak: Date;
  strength: number;
}

export interface SolunarDay {
  date: Date;
  moonRise: Date | null;
  moonSet: Date | null;
  moonPhase: MoonPhaseInfo;
  majorPeriods: SolunarPeriod[];
  minorPeriods: SolunarPeriod[];
  overallRating: number;
}

function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate()
    + date.getUTCHours() / 24
    + date.getUTCMinutes() / 1440
    + date.getUTCSeconds() / 86400;

  let yr = y;
  let mo = m;
  if (mo <= 2) { yr--; mo += 12; }

  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716))
    + Math.floor(30.6001 * (mo + 1))
    + d + B - 1524.5;
}

function moonAge(date: Date): number {
  const jd = julianDay(date);
  const diff = jd - 2451550.1;
  const synodicMonth = 29.53058867;
  let age = diff % synodicMonth;
  if (age < 0) age += synodicMonth;
  return age;
}

function moonIllumination(age: number): number {
  const synodicMonth = 29.53058867;
  return (1 - Math.cos((2 * Math.PI * age) / synodicMonth)) / 2;
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseInfo {
  const age = moonAge(date);
  const synodicMonth = 29.53058867;
  const illum = moonIllumination(age);
  const fraction = age / synodicMonth;

  let phase: string;
  let emoji: string;
  let fishingBonus: number;

  if (fraction < 0.0625) {
    phase = 'New Moon'; emoji = '🌑'; fishingBonus = 0.35;
  } else if (fraction < 0.1875) {
    phase = 'Waxing Crescent'; emoji = '🌒'; fishingBonus = 0.2;
  } else if (fraction < 0.3125) {
    phase = 'First Quarter'; emoji = '🌓'; fishingBonus = 0.15;
  } else if (fraction < 0.4375) {
    phase = 'Waxing Gibbous'; emoji = '🌔'; fishingBonus = 0.1;
  } else if (fraction < 0.5625) {
    phase = 'Full Moon'; emoji = '🌕'; fishingBonus = 0.3;
  } else if (fraction < 0.6875) {
    phase = 'Waning Gibbous'; emoji = '🌖'; fishingBonus = 0.1;
  } else if (fraction < 0.8125) {
    phase = 'Last Quarter'; emoji = '🌗'; fishingBonus = 0.15;
  } else if (fraction < 0.9375) {
    phase = 'Waning Crescent'; emoji = '🌘'; fishingBonus = 0.2;
  } else {
    phase = 'New Moon'; emoji = '🌑'; fishingBonus = 0.35;
  }

  return {
    phase,
    illumination: Math.round(illum * 100) / 100,
    emoji,
    fishingBonus,
  };
}

function moonTransitTime(date: Date, longitude: number): number {
  const jd = julianDay(date);
  const T = (jd - 2451545.0) / 36525;
  const L0 = 218.316 + 481267.881 * T;
  const M = 134.963 + 477198.868 * T;
  const F = 93.272 + 483202.019 * T;
  const elongation = (L0 + 6.289 * Math.sin(M * Math.PI / 180)) % 360;
  const ra = elongation + longitude / 15;
  let transitHour = (ra % 360) / 15;
  if (transitHour < 0) transitHour += 24;
  return transitHour;
}

export function getSolunarPeriods(date: Date, longitude: number = -122): SolunarDay {
  const moonPhase = getMoonPhase(date);
  const transitHour = moonTransitTime(date, longitude);

  const majorStart1 = new Date(date);
  majorStart1.setHours(Math.floor(transitHour) - 1, (transitHour % 1) * 60, 0);
  const majorEnd1 = new Date(majorStart1);
  majorEnd1.setHours(majorEnd1.getHours() + 2);

  const majorStart2 = new Date(majorStart1);
  majorStart2.setHours(majorStart2.getHours() + 12);
  const majorEnd2 = new Date(majorStart2);
  majorEnd2.setHours(majorEnd2.getHours() + 2);

  const minorStart1 = new Date(majorStart1);
  minorStart1.setHours(minorStart1.getHours() - 6);
  const minorEnd1 = new Date(minorStart1);
  minorEnd1.setHours(minorEnd1.getHours() + 1);

  const minorStart2 = new Date(majorStart1);
  minorStart2.setHours(minorStart2.getHours() + 6);
  const minorEnd2 = new Date(minorStart2);
  minorEnd2.setHours(minorEnd2.getHours() + 1);

  const phaseBonus = moonPhase.fishingBonus;
  const majorStrength = 0.7 + phaseBonus;
  const minorStrength = 0.4 + phaseBonus * 0.5;

  const majorPeriods: SolunarPeriod[] = [
    {
      type: 'major',
      start: majorStart1,
      end: majorEnd1,
      peak: new Date((majorStart1.getTime() + majorEnd1.getTime()) / 2),
      strength: Math.min(1, majorStrength),
    },
    {
      type: 'major',
      start: majorStart2,
      end: majorEnd2,
      peak: new Date((majorStart2.getTime() + majorEnd2.getTime()) / 2),
      strength: Math.min(1, majorStrength),
    },
  ];

  const minorPeriods: SolunarPeriod[] = [
    {
      type: 'minor',
      start: minorStart1,
      end: minorEnd1,
      peak: new Date((minorStart1.getTime() + minorEnd1.getTime()) / 2),
      strength: Math.min(1, minorStrength),
    },
    {
      type: 'minor',
      start: minorStart2,
      end: minorEnd2,
      peak: new Date((minorStart2.getTime() + minorEnd2.getTime()) / 2),
      strength: Math.min(1, minorStrength),
    },
  ];

  const overallRating = Math.round(((majorStrength * 2 + minorStrength * 2) / 4) * 100) / 100;

  return {
    date,
    moonRise: null,
    moonSet: null,
    moonPhase,
    majorPeriods,
    minorPeriods,
    overallRating,
  };
}

export function isInSolunarPeriod(date: Date, solunar: SolunarDay): {
  inMajor: boolean;
  inMinor: boolean;
  strength: number;
} {
  const time = date.getTime();
  let strength = 0;

  for (const p of solunar.majorPeriods) {
    if (time >= p.start.getTime() && time <= p.end.getTime()) {
      return { inMajor: true, inMinor: false, strength: p.strength };
    }
  }

  for (const p of solunar.minorPeriods) {
    if (time >= p.start.getTime() && time <= p.end.getTime()) {
      strength = p.strength;
      return { inMajor: false, inMinor: true, strength };
    }
  }

  return { inMajor: false, inMinor: false, strength: 0 };
}

export function getSolunarBonus(date: Date, longitude: number = -122): number {
  const solunar = getSolunarPeriods(date, longitude);
  const status = isInSolunarPeriod(date, solunar);
  return status.strength;
}
