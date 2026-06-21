import { getMoonPhase, getSolunarPeriods, isInSolunarPeriod } from './moon-phase';
import { getCurrentWeather, type WeatherConditions } from './weather';
import { getNearestWaterConditions, type WaterConditions } from './usgs-water';
import { getNearestTideStation, getTidePredictions, type TidePrediction } from './noaa-tides';

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
}

async function gatherContext(
  latitude?: number,
  longitude?: number,
  species?: string,
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

function buildSystemPrompt(ctx: FishingContext): string {
  let prompt = `You are FishBook AI, an expert fishing assistant. You give practical, actionable fishing advice.

Guidelines:
- Be concise and direct. No fluff.
- Give specific lure/bait recommendations with colors and sizes.
- Mention technique and retrieval speed when relevant.
- Reference current conditions when available.
- If you don't know something, say so rather than guessing.
- Use fishing terminology naturally but explain if needed.
- Always consider catch-and-release best practices.

Current conditions:`;

  if (ctx.weather) {
    prompt += `\nWeather: ${ctx.weather.temp_c}°C, wind ${ctx.weather.wind_kph} kph ${ctx.weather.wind_dir}, ${ctx.weather.sky_conditions}, pressure ${ctx.weather.pressure_mb} mb`;
  }

  if (ctx.waterConditions) {
    const wt = ctx.waterConditions.water_temp_c;
    prompt += `\nWater: ${wt != null ? wt + '°C' : 'temp unknown'}, flow ${ctx.waterConditions.flow_rate_cfs ?? 'unknown'} cfs at ${ctx.waterConditions.site_name}`;
  }

  if (ctx.moonPhase) {
    prompt += `\nMoon: ${ctx.moonPhase}`;
  }

  if (ctx.solunarActive) {
    prompt += `\nSolunar: ACTIVE — fish are more likely to feed right now`;
  }

  if (ctx.tides && ctx.tides.length > 0) {
    const next = ctx.tides.find(t => new Date(t.time).getTime() > Date.now());
    if (next) {
      prompt += `\nNext tide: ${next.type} at ${new Date(next.time).toLocaleTimeString()} (${next.height_m}m)`;
    }
  }

  if (ctx.species) {
    prompt += `\nTarget species: ${ctx.species}`;
  }

  return prompt;
}

export async function askFishingQuestion(
  question: string,
  latitude?: number,
  longitude?: number,
  species?: string,
): Promise<string> {
  try {
    const ctx = await gatherContext(latitude, longitude, species);
    const systemPrompt = buildSystemPrompt(ctx);

    const supabaseUrl = 'https://tybkfzdkjvedashszsjc.supabase.co/functions/v1/fishing-chatbot';

    const resp = await fetch(supabaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        systemPrompt,
        context: {
          weather: ctx.weather,
          waterConditions: ctx.waterConditions,
          moonPhase: ctx.moonPhase,
          solunarActive: ctx.solunarActive,
          tides: ctx.tides?.slice(0, 4),
        },
      }),
    });

    if (!resp.ok) {
      return generateLocalAdvice(ctx, question);
    }

    const data = await resp.json();
    return data.response ?? generateLocalAdvice(ctx, question);
  } catch {
    return generateLocalAdvice({ species }, question);
  }
}

function generateLocalAdvice(ctx: FishingContext, question: string): string {
  const lower = question.toLowerCase();
  const species = ctx.species ?? 'fish';
  const moon = getMoonPhase();

  if (lower.includes('bait') || lower.includes('lure') || lower.includes('throw')) {
    if (species.toLowerCase().includes('bass')) {
      return `For bass right now:\n• Texas-rigged plastic worm (green pumpkin or junebug)\n• Spinnerbait (white/chartreuse, 3/8 oz)\n• Topwater if it's early morning or evening\n• ${moon.phase === 'Full Moon' || moon.phase === 'New Moon' ? 'Solunar activity is HIGH — bass should be actively feeding' : 'Standard bite expected'}`;
    }
    if (species.toLowerCase().includes('trout')) {
      return `For trout:\n• Inline spinner (silver or gold, size 0-2)\n• PowerBait on a slip sinker rig (rainbow or chartreuse)\n• Fly: woolly bugger or elk hair caddis\n• Water temp ${ctx.waterConditions?.water_temp_c ?? 'check — trout prefer 10-18°C'}`;
    }
    return `For ${species}: try a medium diving crankbait in natural colors, or a jig tipped with soft plastic. Match the hatch — use colors that resemble local forage.`;
  }

  if (lower.includes('when') || lower.includes('time') || lower.includes('best')) {
    const solunar = getSolunarPeriods(new Date());
    const nextMajor = solunar.majorPeriods.find(p => p.start.getTime() > Date.now());
    const timeStr = nextMajor
      ? `Next major feeding period starts around ${nextMajor.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Check the bite forecast for today\'s peak times';

    return `Best times to fish today:\n• Early morning (dawn) and evening (dusk) are always productive\n• ${timeStr}\n• Moon phase: ${moon.emoji} ${moon.phase} — ${moon.fishingBonus > 0.25 ? 'excellent' : moon.fishingBonus > 0.15 ? 'good' : 'fair'} fishing conditions`;
  }

  if (lower.includes('where') || lower.includes('spot') || lower.includes('location')) {
    return `Finding fish:\n• Look for structure: fallen trees, weed edges, rock piles, dock pilings\n• Fish tend to face into the current — cast upstream\n• Deeper water during midday, shallower during dawn/dusk\n• Check the Explore tab for community catch heatmaps near you`;
  }

  return `I can help with fishing advice! Ask me about:\n• What bait/lure to use for a specific species\n• Best times to fish today\n• Where to find fish in different conditions\n• Techniques for your target species\n\nI also consider your current weather, water conditions, and moon phase automatically.`;
}
