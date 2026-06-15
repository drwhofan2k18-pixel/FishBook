import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  locationName?: string;
  waterBody?: string;
}

/**
 * Request location permissions and get current position.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the user's current GPS coordinates with high accuracy.
 */
export async function getCurrentPosition(): Promise<LocationData | null> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse-geocode coordinates to get a human-readable location name.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<{ locationName?: string; waterBody?: string }> {
  try {
    const geocode = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (geocode.length > 0) {
      const place = geocode[0];
      const parts = [place.city, place.region, place.country].filter(Boolean);
      return {
        locationName: parts.join(', '),
        waterBody: place.name ?? undefined,
      };
    }
  } catch {
    // Silently fail - location name is not critical
  }

  return {};
}
