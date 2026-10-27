export const HOME_BASE = { lat: 6.455, lng: 3.42, label: "Lagos Island" };

// Great-circle distance between two coordinates, in kilometres.
export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Smart proximity routing: attach the real distance to the job site and sort nearest-first.
export function routeByProximity(list, origin = HOME_BASE) {
  return [...list]
    .map((a) => ({
      ...a,
      distanceKm: Math.round(haversineKm(a.coords, origin) * 10) / 10,
    }))
    .sort((x, y) => x.distanceKm - y.distanceKm);
}
