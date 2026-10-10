/**
 * Human-friendly formatting helpers for the analog UI.
 */

/**
 * Format a distance in meters as a metric string.
 *
 * @param meters - Distance in meters.
 * @returns A short string such as `"240 m"` or `"1.8 km"`.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

/**
 * Format a duration in seconds as `mm:ss` or `h:mm:ss`.
 *
 * @param seconds - Duration in seconds.
 * @returns A colon-delimited duration string.
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number): string => value.toString().padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`
  }
  return `${pad(minutes)}:${pad(secs)}`
}

/**
 * Format a timestamp as a short clock time.
 *
 * @param iso - ISO-8601 timestamp.
 * @returns A localized time such as `"2:15 PM"`.
 */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Format a timestamp as a relative phrase.
 *
 * @param iso - ISO-8601 timestamp.
 * @returns A phrase such as `"12m ago"` or `"just now"`.
 */
export function formatRelative(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(deltaMs / 60000)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

/**
 * Format an ISO timestamp as a warm, readable date.
 *
 * @param iso - ISO-8601 timestamp.
 * @returns A localized date such as `"Thu, Oct 9"`.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
