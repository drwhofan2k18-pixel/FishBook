import { getMoonPhase, getSolunarPeriods, isInSolunarPeriod } from './moon-phase';
import { getCurrentWeather, type WeatherConditions } from './weather';
import { getNearestWaterConditions, type WaterConditions } from './usgs-water';
import { getNearestTideStation, getTidePredictions, type TidePrediction } from './noaa-tides';
import { getSpeciesBreakdown } from './stats-aggregation';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FishingContext {
  species?: string;
  latitude?: number;
  longitude?: number;
  weather?: WeatherConditions | null;
  waterConditions?: WaterConditions | null;
  tides?: TidePrediction[];
  moonPhase?: string;
  solunarActive?: boolean;
  solunarStrength?: number;
}

async function gatherContext(
  latitude?: number,
  longitude?: number,
  species?: string,
  userId?: string,
): Promise<FishingContext> {
  const ctx: FishingContext = { species };

  if (latitude != null && longitude != null) {
    ctx.latitude = latitude;
    ctx.longitude = longitude;

    const [weather, water] = await Promise.all([
      getCurrentWeather(latitude, longitude),
      getNearestWaterConditions(latitude, longitude),
    ]);
    ctx.weather = weather;
    ctx.waterConditions = water;

    const moon = getMoonPhase();
    ctx.moonPhase = `${moon.emoji} ${moon.phase} (${Math.round(moon.illumination * 100)}% illuminated)`;

    const solunar = getSolunarPeriods(new Date(), longitude);
    const status = isInSolunarPeriod(new Date(), solunar);
    ctx.solunarActive = status.inMajor || status.inMinor;
    ctx.solunarStrength = status.strength;

    try {
      const station = await getNearestTideStation(latitude, longitude);
      if (station) {
        ctx.tides = await getTidePredictions(station.id, 1);
      }
    } catch {}
  } else {
    const moon = getMoonPhase();
    ctx.moonPhase = `${moon.emoji} ${moon.phase}`;
  }

  return ctx;
}

const SPECIES_ADVICE: Record<string, {
  baits: string[];
  techniques: string[];
  depth: string;
  structure: string;
  tips: string[];
}> = {
  bass: {
    baits: [
      'Texas-rigged plastic worm (green pumpkin, junebug, or watermelon)',
      'Spinnerbait (white/chartreuse, 3/8 oz, tandem willow leaf)',
      'Jig with craw trailer (brown/green pumpkin, 3/8 oz)',
      'Crankbait (shad pattern, diving to 3-6ft)',
      'Topwater buzzbait or popper (black or white)',
    ],
    techniques: [
      'Pitch and flip into cover — bass hold tight to structure',
      'Slow roll a spinnerbait along weed edges',
      'Work topwater at dawn/dusk with pause-retrieve cadence',
      'Drag a jig along bottom — hop it twice, pause 3 seconds',
    ],
    depth: 'Shallow (1-3m) in morning/evening, deeper (3-8m) at midday',
    structure: 'Fallen trees, dock pilings, weed edges, rock piles, laydowns',
    tips: [
      'Bass are ambush predators — target irregular edges and transitions',
      'Wind-blown banks often hold more active fish',
      'In clear water, use natural colors and longer casts',
      'In stained water, use darker colors (black/blue, junebug)',
    ],
  },
  trout: {
    baits: [
      'Inline spinner (silver or gold, size 0-2)',
      'PowerBait on slip sinker rig (rainbow, chartreuse, or orange)',
      'Worm under a bobber — natural and deadly',
      'Fly: woolly bugger (#8-10), elk hair caddis (#14-16)',
      'Kastmaster spoon (silver, 1/8-1/4 oz)',
    ],
    techniques: [
      'Cast upstream and let the current bring your bait naturally',
      'Drift fish in current seams — trout sit behind rocks',
      'Still fish PowerBait on the bottom in stocked ponds',
      'Match the hatch — observe what insects are present',
    ],
    depth: 'Riffles, pools, and undercut banks. Stocked: anywhere in the pond',
    structure: 'Current seams, eddies behind boulders, undercut banks, shaded pools',
    tips: [
      'Trout prefer water 10-18°C — check your water temp',
      'Fish are more active when barometric pressure is stable or falling',
      'Early morning and late evening are prime — avoid bright sun',
      'Wear earth tones — trout spook easily in clear water',
    ],
  },
  catfish: {
    baits: [
      'Chicken liver (let it cure in the sun for a day)',
      'Cut bait (shad, bluegill, or herring)',
      'Nightcrawlers on a Carolina rig',
      'Stink bait / punch bait (Sonny\'s, CJ\'s)',
      'Hot dog pieces soaked in garlic powder',
    ],
    techniques: [
      'Bottom fish with a slip sinker rig — let them take it',
      'Use a circle hook (2/0-5/0) for better hookup and fish safety',
      'Fish at night — catfish are most active after dark',
      'Cast near dam faces and deep holes',
    ],
    depth: 'Deep holes, channels, and along dam faces (3-10m)',
    structure: 'Deep holes, channel edges, submerged timber, dam faces',
    tips: [
      'Catfish have incredible smell — the stinkier the bait, the better',
      'Best bite is typically 1 hour before/after dark',
      'Flatheads prefer live bait (bluegill, goldfish)',
      'Channel cats bite well when water temp is 21-27°C',
    ],
  },
  walleye: {
    baits: [
      'Jig tipped with minnow or leech (1/4 oz, chartreuse or white)',
      'Lindy rig with nightcrawler (bottom bouncer + spinner)',
      'Shad-style crankbait (shad, perch, or firetiger pattern)',
      'Jigging spoon (gold or silver, 1/2-3/4 oz)',
      'Soft plastic swimbait (3-4", pearl white or smelt)',
    ],
    techniques: [
      'Slow troll with crawler harness at 1.0-1.5 mph',
      'Jig along rocky points and humps — lift-drop-lift cadence',
      'Troll crankbaits at the depth fish are holding',
      'Night fishing is often best — walleye are low-light feeders',
    ],
    depth: 'Rocky points, humps, and transitions from shallow to deep (3-12m)',
    structure: 'Rocky points, humps, reefs, transitions from rock to sand',
    tips: [
      'Walleye feed most aggressively at dawn, dusk, and overcast days',
      'Low light conditions are key — overcast days produce well',
      'Wind-blown shorelines concentrate baitfish and walleye',
      'Water temp 13-21°C is optimal — check USGS water data',
    ],
  },
  salmon: {
    baits: [
      'Cured roe/skein (pink or chartreuse cure)',
      'Kwikfish/Luhr Jensen K-15 (gold/orange/chartreuse)',
      'Trolling spoons (Mag Lip, Coho Killer)',
      'Jigs tipped with shrimp or roe',
      'Spinners (Blue Fox, Vibrax, size 3-5)',
    ],
    techniques: [
      'Troll with flashers and hoochie/dodger combos',
      'Backbounce roe through deep runs',
      'Cast spoons from shore at river mouths',
      'Drift roe bags through holding water',
    ],
    depth: 'River: deep runs and pools. Ocean: 15-60ft down',
    structure: 'River mouths, deep runs, current seams, estuaries',
    tips: [
      'Salmon stop eating in rivers — trigger reaction strikes',
      'Bright colors in clear water, dark colors in murky water',
      'Tidal changes affect river salmon — fish the tide turns',
      'Early morning is best at river mouths during runs',
    ],
  },
  pike: {
    baits: [
      'Spoons (Daredevil, red/white, 3/4 oz)',
      'Spinnerbaits (white or chartreuse, 1/2 oz)',
      'Soft plastic swimbaits (4-6", pike or perch pattern)',
      'Jerkbaits (Rapala Husky Jerk, minnow pattern)',
      'Live bait: large minnows or bluegill under a float',
    ],
    techniques: [
      'Cast along weed edges and retrieve fast — pike are aggressive',
      'Use a steel or fluorocarbon leader (30-50lb) — teeth will cut line',
      'Troll crankbaits along drop-offs',
      'Figure-eight at the boat — pike follow before striking',
    ],
    depth: 'Weed edges and drop-offs in 1-4m. Deeper in summer (5-8m)',
    structure: 'Weed beds, lily pads, creek mouths, rocky points',
    tips: [
      'Pike are most active in cold water — excellent fall/spring fishery',
      'Strike hard and fast — they hit and run',
      'Use 20lb+ leader material — wire or heavy fluoro',
      'Post-spawn pike are aggressive — target shallow bays in spring',
    ],
  },
  crappie: {
    baits: [
      'Small jigs (1/16-1/8 oz, white, chartreuse, or pink)',
      'Minnows under a slip bobber',
      'Tiny soft plastics (tube jigs, curly tails)',
      'Small crankbaits (Bobby Garland Baby Shad)',
      'Marabou jigs in white or yellow',
    ],
    techniques: [
      'Spider rig multiple poles while slow trolling',
      'Vertical jig around submerged timber and brush piles',
      'Set slip bobber just above fish depth — vary until you find them',
      'Cast and slow retrieve small jigs near structure',
    ],
    depth: 'Schools at specific depths — often 3-8m near structure',
    structure: 'Submerged timber, brush piles, dock pilings, bridge pilings',
    tips: [
      'Crappie school tight — find one, find them all',
      'Spring spawn: fish shallow (1-2m) near bank cover',
      'Use light line (4-6lb) for better presentation',
      'Electronics help — they hold at very specific depths',
    ],
  },
  bluegill: {
    baits: [
      'Worm pieces under a small bobber',
      'Tiny jigs (1/32 oz, black or chartreuse)',
      'Cricket or grasshopper (natural and irresistible)',
      'Small spinners (Mepps Aglia #00-0)',
      'Fly: popper, ant, or beetle (#10-14)',
    ],
    techniques: [
      'Set bobber 1-2ft deep near structure — simple and deadly',
      'Fly fish with poppers for explosive surface strikes',
      'Ultra-light spinning gear makes it sporting',
      'Target bedding areas in shallow water during spawn',
    ],
    depth: 'Shallow (0.5-2m), especially during spawn',
    structure: 'Weed beds, lily pads, dock shade, fallen trees',
    tips: [
      'Bluegill are the perfect beginner fish — great for kids',
      'Bedding colonies are easy to spot — look for cleared circles',
      'Catch-and-release during spawn to protect the population',
      'Best bait: live worm, no contest',
    ],
  },
};

function getSpeciesAdvice(species: string): typeof SPECIES_ADVICE[string] {
  const lower = species.toLowerCase();
  for (const [key, advice] of Object.entries(SPECIES_ADVICE)) {
    if (lower.includes(key)) return advice;
  }
  return {
    baits: [
      'Medium diving crankbait in natural colors (shad, crawfish)',
      'Jig with soft plastic trailer',
      'Live bait (worms, minnows) on appropriate hook',
      'Spinnerbait in white or chartreuse',
    ],
    techniques: [
      'Match the hatch — observe what baitfish are present',
      'Cast to structure and vary your retrieve speed',
      'Fish edges — where shallow meets deep, where weeds meet open water',
    ],
    depth: 'Varies by species — try different depths until you find them',
    structure: 'Look for irregular features: points, humps, weed edges, drop-offs',
    tips: [
      'Change your approach if you haven\'t had a bite in 15 minutes',
      'Downsize your presentation if fish are finicky',
      'Fish the wind-blown shore — baitfish concentrate there',
    ],
  };
}

function getTempAdvice(species: string, tempC: number | null): string {
  if (tempC == null) return '';

  const lower = species.toLowerCase();
  if (lower.includes('trout') && tempC > 20) {
    return `\n⚠️ Water is ${tempC}°C — approaching stressful range for trout. Fish early morning in shaded, oxygenated water. Consider catch-and-release only.`;
  }
  if (lower.includes('bass') && tempC > 30) {
    return `\n⚠️ Water is ${tempC}°C — bass will be sluggish. Fish deeper and slow down your presentation.`;
  }
  if (lower.includes('pike') && tempC > 24) {
    return `\n⚠️ Water is ${tempC}°C — warm water stresses pike. Target deeper, cooler areas.`;
  }
  if (tempC < 5) {
    return `\n❄️ Water is only ${tempC}°C — most fish will be very sluggish. Slow presentations and patience are key.`;
  }
  return '';
}

export async function askFishingQuestion(
  question: string,
  latitude?: number,
  longitude?: number,
  species?: string,
  userId?: string,
): Promise<string> {
  const ctx = await gatherContext(latitude, longitude, species, userId);
  return generateAdvice(ctx, question);
}

function generateAdvice(ctx: FishingContext, question: string): string {
  const lower = question.toLowerCase();
  const species = ctx.species ?? 'fish';
  const moon = getMoonPhase();
  const advice = getSpeciesAdvice(species);
  const tempNote = getTempAdvice(species, ctx.waterConditions?.water_temp_c ?? null);

  if (lower.includes('bait') || lower.includes('lure') || lower.includes('throw') || lower.includes('use')) {
    const topBaits = advice.baits.slice(0, 4);
    const timeOfDay = new Date().getHours();
    const isLowLight = timeOfDay < 8 || timeOfDay > 18;

    let result = `🎯 Top picks for ${species}:\n${topBaits.map(b => `• ${b}`).join('\n')}`;

    if (isLowLight && advice.baits.some(b => b.toLowerCase().includes('topwater'))) {
      result += `\n\n🌅 Low light — great time for topwater!`;
    }

    if (ctx.weather && ctx.weather.wind_kph > 15) {
      result += `\n\n💨 Windy (${ctx.weather.wind_kph} kph) — use heavier baits for better control`;
    }

    if (ctx.solunarActive) {
      result += `\n\n${moon.emoji} Solunar ACTIVE — fish should be feeding aggressively right now`;
    }

    result += tempNote;
    return result;
  }

  if (lower.includes('when') || lower.includes('time') || lower.includes('best')) {
    const solunar = getSolunarPeriods(new Date(), ctx.longitude ?? -122);
    const nextMajor = solunar.majorPeriods.find(p => p.start.getTime() > Date.now());
    const nextMinor = solunar.minorPeriods.find(p => p.start.getTime() > Date.now());

    let result = `⏰ Best times for ${species} today:\n`;

    if (nextMajor) {
      result += `• MAJOR feeding period: ${nextMajor.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${nextMajor.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    }
    if (nextMinor) {
      result += `• Minor feeding period: ${nextMinor.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${nextMinor.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    }

    result += `• Dawn and dusk are always productive\n`;
    result += `\n${moon.emoji} ${moon.phase} — ${moon.fishingBonus > 0.25 ? 'excellent' : moon.fishingBonus > 0.15 ? 'good' : 'fair'} fishing conditions`;
    result += tempNote;
    return result;
  }

  if (lower.includes('where') || lower.includes('spot') || lower.includes('location') || lower.includes('find')) {
    let result = `📍 Where to find ${species}:\n\n`;
    result += `Structure: ${advice.structure}\n`;
    result += `Depth: ${advice.depth}\n\n`;
    result += `General tips:\n${advice.tips.map(t => `• ${t}`).join('\n')}`;

    if (ctx.waterConditions) {
      result += `\n\n💧 Water conditions at ${ctx.waterConditions.site_name}:`;
      if (ctx.waterConditions.water_temp_c != null) {
        result += `\n  Temp: ${ctx.waterConditions.water_temp_c}°C`;
      }
      if (ctx.waterConditions.flow_rate_cfs != null) {
        result += `\n  Flow: ${ctx.waterConditions.flow_rate_cfs} cfs`;
      }
    }

    result += tempNote;
    return result;
  }

  if (lower.includes('technique') || lower.includes('how') || lower.includes('catch')) {
    let result = `🎣 Techniques for ${species}:\n\n`;
    result += advice.techniques.map(t => `• ${t}`).join('\n');
    result += `\n\nRecommended presentations:\n${advice.baits.slice(0, 3).map(b => `• ${b}`).join('\n')}`;
    result += `\n\nPro tips:\n${advice.tips.slice(0, 3).map(t => `• ${t}`).join('\n')}`;
    result += tempNote;
    return result;
  }

  if (lower.includes('condition') || lower.includes('weather') || lower.includes('water')) {
    let result = `📊 Current conditions`;

    if (ctx.weather) {
      result += `\n\n🌤️ Weather:\n• Temp: ${ctx.weather.temp_c}°C (feels like ${ctx.weather.feels_like_c}°C)\n• Wind: ${ctx.weather.wind_kph} kph ${ctx.weather.wind_dir}\n• Sky: ${ctx.weather.sky_conditions}\n• Pressure: ${ctx.weather.pressure_mb} mb\n• Rating: ${ctx.weather.fishing_rating}`;
    }

    if (ctx.waterConditions) {
      result += `\n\n💧 Water at ${ctx.waterConditions.site_name}:`;
      if (ctx.waterConditions.water_temp_c != null) result += `\n• Temp: ${ctx.waterConditions.water_temp_c}°C`;
      if (ctx.waterConditions.flow_rate_cfs != null) result += `\n• Flow: ${ctx.waterConditions.flow_rate_cfs} cfs`;
      if (ctx.waterConditions.gauge_height_ft != null) result += `\n• Gauge: ${ctx.waterConditions.gauge_height_ft} ft`;
    }

    result += `\n\n${ctx.moonPhase}`;
    if (ctx.solunarActive) {
      result += `\n🟢 Solunar ACTIVE — fish are more likely to feed`;
    }

    if (ctx.tides && ctx.tides.length > 0) {
      const next = ctx.tides.find(t => new Date(t.time).getTime() > Date.now());
      if (next) {
        result += `\n\n🌊 Next tide: ${next.type.toUpperCase()} at ${new Date(next.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${next.height_m}m)`;
      }
    }

    return result;
  }

  // Default: full overview
  let result = `🐟 Fishing advice for ${species}:\n\n`;
  result += `Top baits:\n${advice.baits.slice(0, 3).map(b => `• ${b}`).join('\n')}`;
  result += `\n\nTechniques:\n${advice.techniques.slice(0, 2).map(t => `• ${t}`).join('\n')}`;

  if (ctx.solunarActive) {
    result += `\n\n${moon.emoji} SOLUNAR ACTIVE — excellent time to fish!`;
  } else {
    result += `\n\n${moon.emoji} ${moon.phase}`;
  }

  result += tempNote;
  result += `\n\n💡 Ask me about: baits, techniques, best times, where to find fish, current conditions`;

  return result;
}
