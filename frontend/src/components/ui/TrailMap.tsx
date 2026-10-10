/**
 * Stylized SVG trail map.
 *
 * Rather than a tile-based map, the app renders a warm, hand-inked plot of the
 * walk: the path, its start and current position, radial zones, and pins for
 * captured photos. This keeps the analog voice and works fully offline.
 */

import type { ReactNode } from 'react'
import type { GeofenceZone, LocationPoint, PhotoArtifact } from '../../types/domain'

/** Props accepted by {@link TrailMap}. */
export interface TrailMapProps {
  points: LocationPoint[]
  photos?: PhotoArtifact[]
  zones?: GeofenceZone[]
  className?: string
}

/** Projected point in the `0 0 100 100` plot space. */
interface Projected {
  x: number
  y: number
}

const PADDING = 12

/**
 * Render the trail as a normalized SVG plot.
 *
 * @param props - The trail map props.
 * @returns The rendered map, or a notice when there are no points.
 */
export function TrailMap({ points, photos = [], zones = [], className = '' }: TrailMapProps): ReactNode {
  if (points.length === 0) {
    return (
      <div
        className={`flex aspect-square w-full items-center justify-center rounded-card border border-dashed border-ink/20 bg-paper-deep/40 ${className}`.trim()}
      >
        <span className="typewriter text-xs text-ink-faint">No trail recorded yet</span>
      </div>
    )
  }

  const meanLat = points.reduce((sum, point) => sum + point.latitude, 0) / points.length
  const cosLat = Math.cos((meanLat * Math.PI) / 180)
  const project = (latitude: number, longitude: number): [number, number] => [
    longitude * cosLat,
    latitude,
  ]

  const rawPoints = points.map((point) => project(point.latitude, point.longitude))
  const xs = rawPoints.map(([x]) => x)
  const ys = rawPoints.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1e-6)
  const spanY = Math.max(maxY - minY, 1e-6)
  const scale = (100 - PADDING * 2) / Math.max(spanX, spanY)
  const offsetX = (100 - spanX * scale) / 2
  const offsetY = (100 - spanY * scale) / 2

  const toPlot = (latitude: number, longitude: number): Projected => {
    const [x, y] = project(latitude, longitude)
    return {
      x: (x - minX) * scale + offsetX,
      y: 100 - ((y - minY) * scale + offsetY),
    }
  }

  const pathPoints = points.map((point) => toPlot(point.latitude, point.longitude))
  const pathData = pathPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
  const start = pathPoints[0]
  const current = pathPoints[pathPoints.length - 1]

  return (
    <div className={`relative aspect-square w-full overflow-hidden rounded-card border border-ink/15 bg-paper-deep/50 ${className}`.trim()}>
      <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Walk trail">
        <defs>
          <pattern id="trail-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0 L0 0 0 10" fill="none" stroke="rgba(43,38,32,0.08)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#trail-grid)" />

        {zones
          .filter((zone) => zone.geometryType === 'RADIAL')
          .map((zone) => {
            const center = toPlot(zone.centerLatitude, zone.centerLongitude)
            const radius = (zone.radiusMeters / 111_320) * scale
            const stroke = zone.zoneType === 'SAFE_ZONE' ? '#3f5b54' : zone.zoneType === 'RESTRICTED_ZONE' ? '#a8552f' : '#c99a3a'
            return (
              <circle
                key={zone.zoneId}
                cx={center.x}
                cy={center.y}
                r={radius}
                fill={zone.zoneType === 'SAFE_ZONE' ? 'rgba(63,91,84,0.08)' : 'rgba(168,85,47,0.08)'}
                stroke={stroke}
                strokeWidth="0.6"
                strokeDasharray="2 1.5"
              />
            )
          })}

        <path d={pathData} fill="none" stroke="#8a5a3b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

        {photos.map((photo) => {
          const marker = toPlot(photo.latitude, photo.longitude)
          return (
            <g key={photo.photoId} transform={`translate(${marker.x} ${marker.y})`}>
              <circle r="3.2" fill="#fbf6ec" stroke="#2b2620" strokeWidth="0.6" />
              <path d="M0 -1.4 a1.4 1.4 0 0 1 1.4 1.4 c0 1 -1.4 2.4 -1.4 2.4 s-1.4 -1.4 -1.4 -2.4 a1.4 1.4 0 0 1 1.4 -1.4 z" fill="#a8552f" />
            </g>
          )
        })}

        <circle cx={start.x} cy={start.y} r="2.6" fill="#3f5b54" stroke="#fbf6ec" strokeWidth="0.8" />
        <circle cx={current.x} cy={current.y} r="3.4" fill="#c99a3a" stroke="#2b261f" strokeWidth="0.8" />
        <circle cx={current.x} cy={current.y} r="6" fill="none" stroke="rgba(201,154,58,0.5)" strokeWidth="0.8" className="flicker" />
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-3 text-[0.55rem] text-ink-faint">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-teal" /> start
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-mustard" /> now
        </span>
      </div>
    </div>
  )
}
