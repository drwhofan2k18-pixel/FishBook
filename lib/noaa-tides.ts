import NetInfo from '@react-native-community/netinfo';

export interface TidePrediction {
  time: string;
  height_m: number;
  type: 'high' | 'low';
}

export interface TideStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

const NOAA_BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const NOAA_STATION_BASE = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

export async function findNearbyTideStations(
  latitude: number,
  longitude: number,
  radiusKm: number = 200,
): Promise<TideStation[]> {
  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return [];

    const resp = await fetch(NOAA_STATION_BASE);
    if (!resp.ok) return [];

    const data = await resp.json();
    const stations: TideStation[] = [];

    for (const s of data.stations ?? []) {
      if (!s.lat || !s.lng) continue;
      const dist = haversineDistance(latitude, longitude, s.lat, s.lng);
      if (dist > radiusKm) continue;

      stations.push({
        id: s.id,
        name: s.name,
        latitude: s.lat,
        longitude: s.lng,
        distance_km: Math.round(dist * 10) / 10,
      });
    }

    return stations.sort((a, b) => a.distance_km - b.distance_km).slice(0, 5);
  } catch {
    return [];
  }
}

export async function getTidePredictions(
  stationId: string,
  days: number = 2,
): Promise<TidePrediction[]> {
  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return [];

    const begin = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const url = `${NOAA_BASE}?begin_date=${formatDate(begin)}&end_date=${formatDate(end)}&station=${stationId}&product=predictions&datum=MLLW&time_zone=gmt&units=metric&interval=hilo&format=json`;

    const resp = await fetch(url);
    if (!resp.ok) return [];

    const data = await resp.json();
    const predictions: TidePrediction[] = [];

    for (const p of data.predictions ?? []) {
      if (!p.t || !p.v) continue;

      const time = new Date(p.t);
      const height = parseFloat(p.v);

      if (isNaN(height)) continue;

      predictions.push({
        time: p.t,
        height_m: Math.round(height * 100) / 100,
        type: p.type === 'H' ? 'high' : 'low',
      });
    }

    return predictions;
  } catch {
    return [];
  }
}

export async function getNextTide(
  stationId: string,
): Promise<TidePrediction | null> {
  const predictions = await getTidePredictions(stationId, 1);
  const now = Date.now();

  for (const p of predictions) {
    if (new Date(p.time).getTime() > now) {
      return p;
    }
  }

  return predictions.length > 0 ? predictions[predictions.length - 1] : null;
}

export async function getNearestTideStation(
  latitude: number,
  longitude: number,
): Promise<TideStation | null> {
  const stations = await findNearbyTideStations(latitude, longitude);
  return stations.length > 0 ? stations[0] : null;
}

export function isNearCoast(latitude: number, longitude: number): boolean {
  const coastalBoxes = [
    { minLat: 24, maxLat: 50, minLng: -130, maxLng: -65 },
    { minLat: 18, maxLat: 23, minLng: -162, maxLng: -154 },
    { minLat: 51, maxLat: 72, minLng: -180, maxLng: -129 },
    { minLat: -5, maxLat: 10, minLng: -80, maxLng: -60 },
    { minLat: 45, maxLat: 60, minLng: -10, maxLng: 30 },
    { minLat: 30, maxLat: 45, minLng: -10, maxLng: 40 },
  ];

  return coastalBoxes.some(
    b => latitude >= b.minLat && latitude <= b.maxLat && longitude >= b.minLng && longitude <= b.maxLng,
  );
}
