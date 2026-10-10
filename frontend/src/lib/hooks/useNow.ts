/**
 * Current-time hook for wall-clock labels.
 */

import { useEffect, useState } from 'react'

/**
 * Track the current time, refreshed on an interval.
 *
 * @param intervalMs - Refresh cadence in milliseconds.
 * @returns The current time as an epoch-milliseconds value.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}