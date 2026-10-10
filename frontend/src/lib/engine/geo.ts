/**
 * Geospatial primitives shared by the client engine.
 *
 * These mirror the backend implementations so the app can compute distances,
 * bounding boxes, and geofence evaluations locally while offline.
 */

import type { Coord, GeofenceZone } from '../../types/domain'

const EARTH_RADIUS_METERS = 6_371_000
const METERS_PER_DEGREE_LATITUDE = 111_320

/**
 * Compute the great-circle distance between two coordinates.
 *
 * @param lat1 - Latitude of the first point in decimal degrees.
 * @param lng1 - Longitude of the first point in decimal degrees.
 * @param lat2 - Latitude of the second point in decimal degrees.
 * @param lng2 - Longitude of the second point in decimal degrees.
 * @returns Distance along the Earth's surface in meters.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a))
}

/**
 * Accumulate the total path length of an ordered coordinate sequence.
 *
 * @param points - Ordered coordinates describing the route.
 * @returns Total travelled distance in meters.
 */
export function pathDistanceMeters(points: Coord[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const [lat1, lng1] = points[index - 1]
    const [lat2, lng2] = points[index]
    total += haversineMeters(lat1, lng1, lat2, lng2)
  }
  return total
}

/**
 * Compute a lat/lng bounding box enclosing a search radius.
 *
 * @param centerLatitude - Latitude of the box center.
 * @param centerLongitude - Longitude of the box center.
 * @param radiusMeters - Radius to enclose around the center.
 * @returns A `[latMin, latMax, lngMin, lngMax]` tuple.
 */
export function boundingBox(
  centerLatitude: number,
  centerLongitude: number,
  radiusMeters: number,
): [number, number, number, number] {
  const latDelta = radiusMeters / METERS_PER_DEGREE_LATITUDE
  const cosLat = Math.max(Math.cos((centerLatitude * Math.PI) / 180), 1e-6)
  const lngDelta = radiusMeters / (METERS_PER_DEGREE_LATITUDE * cosLat)
  return [
    centerLatitude - latDelta,
    centerLatitude + latDelta,
    centerLongitude - lngDelta,
    centerLongitude + lngDelta,
  ]
}

/**
 * Test whether a coordinate lies inside a radial geofence.
 *
 * @param latitude - Latitude of the query point.
 * @param longitude - Longitude of the query point.
 * @param zone - The radial zone to test.
 * @param accuracyMeters - Horizontal accuracy of the fix.
 * @returns `true` when the point is inside the zone.
 */
export function insideRadialZone(
  latitude: number,
  longitude: number,
  zone: GeofenceZone,
  accuracyMeters: number,
): boolean {
  const distance = haversineMeters(
    latitude,
    longitude,
    zone.centerLatitude,
    zone.centerLongitude,
  )
  return distance <= zone.radiusMeters + accuracyMeters
}
