// ─────────────────────────────────────────────────────────────
// OpenStreetMap Overpass helper — fetches real street geometry
// around a point so the app can tint ONLY the roads, exactly like
// Google Maps traffic. Public API, no key required.
// ─────────────────────────────────────────────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Road classes Google-Maps-traffic-style tinting cares about.
const HIGHWAY_RE = '(residential|primary|secondary|tertiary|unclassified|living_street|pedestrian|service|road)'

/**
 * Fetch street polylines within `radius` meters of a coordinate.
 * @returns [{ id, name, highway, coordinates: [{latitude, longitude}] }]
 */
export async function fetchNearbyStreets({ latitude, longitude }, radius = 350) {
  const query = `[out:json][timeout:25];
(
  way(around:${radius},${latitude.toFixed(6)},${longitude.toFixed(6)})[highway~"${HIGHWAY_RE}"];
);
out body geom;`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)

  const data = await res.json()
  const streets = []
  for (const el of data.elements || []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 2) continue
    streets.push({
      id: el.id,
      name: el.tags?.name,
      highway: el.tags?.highway,
      coordinates: el.geometry.map(g => ({ latitude: g.lat, longitude: g.lon })),
    })
  }
  return streets
}