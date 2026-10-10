/**
 * Elapsed-time hook for live walk sessions.
 */

import { useEffect, useState } from 'react'

/**
 * Track elapsed seconds since a start timestamp.
 *
 * @param startIso - ISO timestamp of the session start, or `null` when idle.
 * @param running - Whether the timer should advance.
 * @returns Elapsed seconds since `startIso`.
 */
export function useElapsedSeconds(startIso: string | null, running: boolean): number {
  const [elapsed, setElapsed] = useState(() => elapsedFrom(startIso))

  useEffect(() => {
    if (!startIso) {
      return
    }
    const compute = (): void => setElapsed(elapsedFrom(startIso))
    if (running) {
      const timer = setInterval(compute, 1000)
      return () => clearInterval(timer)
    }
    return undefined
  }, [startIso, running])

  return elapsed
}

/**
 * Compute elapsed seconds from an ISO start timestamp.
 *
 * @param startIso - ISO timestamp, or `null` when idle.
 * @returns Whole elapsed seconds, or zero when idle.
 */
function elapsedFrom(startIso: string | null): number {
  if (!startIso) {
    return 0
  }
  return Math.max(0, (Date.now() - new Date(startIso).getTime()) / 1000)
}