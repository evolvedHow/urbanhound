/**
 * Client-side geofence evaluation with grace-period debouncing.
 */

import type { GeofenceStatus, GeofenceZone } from '../../types/domain'
import { insideRadialZone } from './geo'

/** The outcome of evaluating a fix against a subject's zones. */
export interface ZoneResult {
  status: GeofenceStatus
  zoneName: string | null
  breachStartedAt: number | null
}

/**
 * Evaluate a fix against the subject's radial zones, honouring grace periods.
 *
 * @param zones - Enabled zones scoped to the subject.
 * @param latitude - Latitude of the current fix.
 * @param longitude - Longitude of the current fix.
 * @param accuracyMeters - Horizontal accuracy of the fix.
 * @param nowMs - Current time in epoch milliseconds.
 * @param breachStartedAt - Epoch ms when the current breach streak began.
 * @returns The resulting zone status and breach timing.
 */
export function evaluateZones(
  zones: GeofenceZone[],
  latitude: number,
  longitude: number,
  accuracyMeters: number,
  nowMs: number,
  breachStartedAt: number | null,
): ZoneResult {
  for (const zone of zones) {
    if (zone.zoneType !== 'RESTRICTED_ZONE') {
      continue
    }
    if (insideRadialZone(latitude, longitude, zone, accuracyMeters)) {
      return applyGrace(zone, `Inside ${zone.name}`, nowMs, breachStartedAt)
    }
  }

  for (const zone of zones) {
    if (zone.zoneType !== 'SAFE_ZONE') {
      continue
    }
    if (!insideRadialZone(latitude, longitude, zone, accuracyMeters)) {
      return applyGrace(zone, `Left ${zone.name}`, nowMs, breachStartedAt)
    }
  }

  return { status: 'OK', zoneName: null, breachStartedAt: null }
}

/**
 * Downgrade a breach to WARNING while its grace period is still running.
 *
 * @param zone - The zone that was triggered.
 * @param zoneName - Descriptive name for the triggered zone.
 * @param nowMs - Current time in epoch milliseconds.
 * @param breachStartedAt - Epoch ms when the breach streak began.
 * @returns The debounced zone result.
 */
function applyGrace(
  zone: GeofenceZone,
  zoneName: string,
  nowMs: number,
  breachStartedAt: number | null,
): ZoneResult {
  const startedAt = breachStartedAt ?? nowMs
  const deadline = startedAt + zone.gracePeriodSeconds * 1000
  if (nowMs < deadline) {
    return { status: 'WARNING', zoneName, breachStartedAt: startedAt }
  }
  return { status: 'BREACH', zoneName, breachStartedAt: startedAt }
}
