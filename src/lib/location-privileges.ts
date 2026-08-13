export interface LocationPrivileges {
  nearbyFeed: boolean;
  autoFillLocation: boolean;
  nearbyTrekkers: boolean;
  checkIn: boolean;
}

export const NO_LOCATION_PRIVILEGES: LocationPrivileges = {
  nearbyFeed: false,
  autoFillLocation: false,
  nearbyTrekkers: false,
  checkIn: false,
};

export function getPrivileges(coords: { latitude: number; longitude: number } | null): LocationPrivileges {
  if (!coords) return NO_LOCATION_PRIVILEGES;
  return {
    nearbyFeed: true,
    autoFillLocation: true,
    nearbyTrekkers: true,
    checkIn: true,
  };
}

export function getPrivilegedFeatures(privileges: LocationPrivileges): string[] {
  const features: string[] = [];
  if (privileges.nearbyFeed) features.push('Nearby Feed');
  if (privileges.autoFillLocation) features.push('Auto-fill Location');
  if (privileges.nearbyTrekkers) features.push('Discover Nearby Trekkers');
  if (privileges.checkIn) features.push('Check-in at Treks');
  return features;
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
