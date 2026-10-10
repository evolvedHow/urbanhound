/**
 * Live location hook: real GPS when available, otherwise a deterministic
 * simulated walk so the PWA remains demonstrable on desktop and static hosts.
 */

import { useEffect, useRef, useState } from 'react'

/** A single live location fix. */
export interface LiveFix {
  latitude: number
  longitude: number
  accuracyMeters: number
  source: 'gps' | 'simulated' | 'idle'
  error: string | null
}

/** Options controlling the location hook. */
export interface UseLiveLocationOptions {
  /** Whether tracking is active. */
  active: boolean
  /** Fallback latitude used when GPS is unavailable. */
  fallbackLatitude: number
  /** Fallback longitude used when GPS is unavailable. */
  fallbackLongitude: number
  /** Interval between simulated fixes, in milliseconds. */
  intervalMs?: number
}

/**
 * Track the user's location, falling back to a simulated wander.
 *
 * @param options - Tracking configuration.
 * @returns The latest {@link LiveFix}.
 */
export function useLiveLocation(options: UseLiveLocationOptions): LiveFix {
  const {
    active,
    fallbackLatitude,
    fallbackLongitude,
    intervalMs = 1500,
  } = options
  const [fix, setFix] = useState<LiveFix>({
    latitude: fallbackLatitude,
    longitude: fallbackLongitude,
    accuracyMeters: 12,
    source: 'idle',
    error: null,
  })
  const positionRef = useRef({ latitude: fallbackLatitude, longitude: fallbackLongitude })

  useEffect(() => {
    if (!active) {
      return
    }

    let cancelled = false
    let watchId: number | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    const startSimulation = (): void => {
      if (cancelled) {
        return
      }
      timer = setInterval(() => {
        const current = positionRef.current
        const latitude = current.latitude + (Math.random() - 0.45) * 0.0004
        const longitude = current.longitude + (Math.random() - 0.5) * 0.0005
        positionRef.current = { latitude, longitude }
        setFix({
          latitude,
          longitude,
          accuracyMeters: 6 + Math.random() * 8,
          source: 'simulated',
          error: null,
        })
      }, intervalMs)
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      let gpsReceived = false
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          gpsReceived = true
          const { latitude, longitude, accuracy } = position.coords
          positionRef.current = { latitude, longitude }
          setFix({ latitude, longitude, accuracyMeters: accuracy, source: 'gps', error: null })
        },
        () => {
          if (!timer) {
            startSimulation()
          }
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 4000 },
      )
      const fallbackTimer = setTimeout(() => {
        if (!gpsReceived && !timer) {
          startSimulation()
        }
      }, 4500)
      return () => {
        cancelled = true
        clearTimeout(fallbackTimer)
        navigator.geolocation.clearWatch(watchId as number)
        if (timer) {
          clearInterval(timer)
        }
      }
    }

    startSimulation()
    return () => {
      cancelled = true
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [active, fallbackLatitude, fallbackLongitude, intervalMs])

  return active ? fix : { ...fix, source: 'idle' }
}
