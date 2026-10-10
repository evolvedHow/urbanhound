/**
 * Daily Vibe Check projection, mirroring the backend matrix.
 */

import type { VibeProjection } from '../../types/domain'

/**
 * Clamp a number into an inclusive range.
 *
 * @param value - The value to clamp.
 * @param low - Inclusive lower bound.
 * @param high - Inclusive upper bound.
 * @returns The clamped value.
 */
function clamp(value: number, low = 0, high = 100): number {
  return Math.max(low, Math.min(high, value))
}

/**
 * Project a subject's vibe from distance, time, and stop telemetry.
 *
 * @param distanceMeters - Total distance travelled during the walk.
 * @param durationSeconds - Elapsed wall-clock duration in seconds.
 * @param stopCount - Number of distinct stationary pauses detected.
 * @returns The projected mood.
 */
export function projectVibe(
  distanceMeters: number,
  durationSeconds: number,
  stopCount: number,
): VibeProjection {
  const durationMinutes = durationSeconds / 60
  const avgKmh =
    durationSeconds > 0 ? distanceMeters / 1000 / (durationSeconds / 3600) : 0
  const stopRatio = stopCount / Math.max(durationMinutes, 1)

  const tags: string[] = []
  if (avgKmh > 3) {
    tags.push('spirited pace')
  } else if (avgKmh < 0.5) {
    tags.push('leisurely pace')
  }
  if (stopRatio > 0.4) {
    tags.push('frequent stops')
  }

  if (durationMinutes > 45 && avgKmh > 2) {
    return {
      headline: 'Post-Park Nap Required (100% Satiated)',
      energyPct: 0,
      couchPct: 100,
      tags: ['well earned'],
    }
  }
  if (avgKmh < 0.5 && durationMinutes > 20 && stopRatio > 0.3) {
    return {
      headline: '70% Couch Potato, 30% Ready for Zoomies',
      energyPct: 30,
      couchPct: 70,
      tags: tags.length ? tags : ['taking it all in'],
    }
  }
  if (avgKmh > 3) {
    return {
      headline: '80% Energy Machine, 20% Chaos',
      energyPct: 80,
      couchPct: 20,
      tags: tags.length ? tags : ['on a mission'],
    }
  }

  const energy = clamp(Math.round(40 + avgKmh * 12))
  return {
    headline: `${energy}% Curious Companion, ${100 - energy}% Perfectly Unhurried`,
    energyPct: energy,
    couchPct: 100 - energy,
    tags: tags.length ? tags : ['strolling'],
  }
}
