import NetInfo from '@react-native-community/netinfo';

export interface StockingRecord {
  species: string;
  waterbody: string;
  state: string;
  date: string;
  quantity: number;
  county: string;
}

const STOCKING_URLS: Record<string, string> = {
  CA: 'https://wildlife.ca.gov/Conservation/Fishes/Stocking',
  CO: 'https://cpw.state.co.us/fishing/fish-stocking-reports',
  MI: 'https://www.michigan.gov/dnr/managing-resources/fisheries/fish-stocking',
  NY: 'https://www.dec.ny.gov/outdoor/fishing/fish-stocking',
  TX: 'https://tpwd.texas.gov/fishboat/fish/management/stocking/',
  WA: 'https://wdfw.wa.gov/fishing/stocking',
  FL: 'https://myfwc.com/fishing/freshwater/fish-stocking/',
  MN: 'https://www.dnr.state.mn.us/fishing/stocking.html',
  WI: 'https://dnr.wisconsin.gov/topic/fishing/stocking',
  PA: 'https://www.fishandboat.com/Fish/Pages/FishStocking.aspx',
};

export function getStockingInfoUrl(stateCode: string): string | null {
  return STOCKING_URLS[stateCode.toUpperCase()] ?? null;
}

export function getSupportedStockingStates(): string[] {
  return Object.keys(STOCKING_URLS);
}

export async function getRecentStockings(
  latitude: number,
  longitude: number,
): Promise<{ state: string; url: string; message: string } | null> {
  try {
    const online = await NetInfo.fetch();
    if (!online.isConnected) return null;

    const stateCode = await reverseGeocodeToState(latitude, longitude);
    if (!stateCode) return null;

    const url = getStockingInfoUrl(stateCode);
    if (!url) return null;

    return {
      state: stateCode,
      url,
      message: `Check recent fish stocking reports for ${stateCode}`,
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeToState(lat: number, lng: number): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'FishBook/1.0' } },
    );

    if (!resp.ok) return null;

    const data = await resp.json();
    return data?.address?.state_code ?? null;
  } catch {
    return null;
  }
}

const COMMON_STOCKED_SPECIES: Record<string, string[]> = {
  Rainbow: ['Rainbow Trout', 'Steelhead'],
  Brown: ['Brown Trout'],
  Brook: ['Brook Trout'],
  Tiger: ['Tiger Trout'],
  Channel: ['Channel Catfish'],
  Largemouth: ['Largemouth Bass'],
  Smallmouth: ['Smallmouth Bass'],
  Walleye: ['Walleye'],
  Muskellunge: ['Muskellunge'],
  Northern: ['Northern Pike'],
  Bluegill: ['Bluegill'],
  Crappie: ['Black Crappie', 'White Crappie'],
};

export function isStockableSpecies(speciesName: string): boolean {
  const lower = speciesName.toLowerCase();
  return Object.keys(COMMON_STOCKED_SPECIES).some(k =>
    lower.includes(k.toLowerCase()),
  );
}

export function getStockingSeason(speciesName: string): string {
  const lower = speciesName.toLowerCase();

  if (lower.includes('trout') || lower.includes('steelhead')) {
    return 'Spring/Fall — most states stock trout before opening day and in fall';
  }
  if (lower.includes('catfish')) {
    return 'Spring/Summer — catfish stocked when water temps reach 15°C+';
  }
  if (lower.includes('walleye') || lower.includes('pike')) {
    return 'Spring — fingerlings stocked in early summer';
  }

  return 'Varies by state — check your local stocking schedule';
}
