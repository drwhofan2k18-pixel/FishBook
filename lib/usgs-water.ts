import NetInfo from '@react-native-community/netinfo';

export interface WaterConditions {
  water_temp_c: number | null;
  flow_rate_cfs: number | null;
  gauge_height_ft: number | null;
  site_name: string;
  site_code: string;
  last_updated: string;
}

export interface NearbyWaterSite {
  site_code: string;
  site_name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

const USGS_BASE = 'https://waterservices.usgs.gov/nwis/iv';
const USGS_SITE_BASE = 'https://waterservices.usgs.gov/nwis/site';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyWaterSites(
  latitude: number,
  longitude: number,
  radiusKm: number = 50,
): Promise<NearbyWaterSite[]> {
  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return [];

    const bbox = `${longitude - 1},${latitude - 1},${longitude + 1},${latitude + 1}`;
    const url = `${USGS_SITE_BASE}?format=rdb&bBox=${bbox}&siteType=LK,ST&siteStatus=active&parameterCd=00010,00060,00065`;

    const resp = await fetch(url);
    if (!resp.ok) return [];

    const text = await resp.text();
    const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
    const headerLine = lines.findIndex(l => l.startsWith('agency_cd'));
    if (headerLine < 0) return [];

    const headers = lines[headerLine].split('\t');
    const sites: NearbyWaterSite[] = [];

    for (let i = headerLine + 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length < 5) continue;

      const siteCode = cols[1] ?? '';
      const siteName = cols[2] ?? '';
      const lat = parseFloat(cols[4] ?? '0');
      const lng = parseFloat(cols[5] ?? '0');

      if (isNaN(lat) || isNaN(lng)) continue;

      const dist = haversineDistance(latitude, longitude, lat, lng);
      if (dist > radiusKm) continue;

      sites.push({
        site_code: siteCode,
        site_name: siteName,
        latitude: lat,
        longitude: lng,
        distance_km: Math.round(dist * 10) / 10,
      });
    }

    return sites.sort((a, b) => a.distance_km - b.distance_km).slice(0, 10);
  } catch {
    return [];
  }
}

export async function getWaterConditions(
  siteCode: string,
): Promise<WaterConditions | null> {
  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return null;

    const url = `${USGS_BASE}?format=json&sites=${siteCode}&parameterCd=00010,00060,00065&siteStatus=active`;

    const resp = await fetch(url);
    if (!resp.ok) return null;

    const data = await resp.json();
    const timeSeries = data?.value?.timeSeries ?? [];

    let waterTemp: number | null = null;
    let flowRate: number | null = null;
    let gaugeHeight: number | null = null;
    let lastUpdated = '';

    for (const ts of timeSeries) {
      const varCode = ts?.variable?.variableCode?.[0]?.value ?? '';
      const values = ts?.values?.[0]?.value ?? [];
      const latest = values[values.length - 1];

      if (!latest) continue;

      if (varCode === '00010') waterTemp = parseFloat(latest.value);
      if (varCode === '00060') flowRate = parseFloat(latest.value);
      if (varCode === '00065') gaugeHeight = parseFloat(latest.value);

      if (latest.dateTime) lastUpdated = latest.dateTime;
    }

    const siteName = timeSeries[0]?.sourceInfo?.siteName ?? '';

    return {
      water_temp_c: waterTemp && !isNaN(waterTemp) ? Math.round(waterTemp * 10) / 10 : null,
      flow_rate_cfs: flowRate && !isNaN(flowRate) ? Math.round(flowRate) : null,
      gauge_height_ft: gaugeHeight && !isNaN(gaugeHeight) ? Math.round(gaugeHeight * 100) / 100 : null,
      site_name: siteName,
      site_code: siteCode,
      last_updated: lastUpdated,
    };
  } catch {
    return null;
  }
}

export async function getNearestWaterConditions(
  latitude: number,
  longitude: number,
): Promise<WaterConditions | null> {
  const sites = await findNearbyWaterSites(latitude, longitude);
  if (sites.length === 0) return null;

  for (const site of sites) {
    const conditions = await getWaterConditions(site.site_code);
    if (conditions && (conditions.water_temp_c !== null || conditions.flow_rate_cfs !== null)) {
      return conditions;
    }
  }

  return null;
}
