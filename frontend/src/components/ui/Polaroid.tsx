/**
 * Analog instant-photo frame with prop overlays and a typewriter caption.
 */

import type { ReactNode } from 'react'
import type { PhotoArtifact } from '../../types/domain'
import { formatClock } from '../../lib/format'
import { resolveProps } from '../../lib/engine/retro'
import { PropGlyph } from './PropGlyph'

/** Props accepted by {@link Polaroid}. */
export interface PolaroidProps {
  photo: PhotoArtifact
  rotate?: number
  className?: string
}

/**
 * Render a photo as a Polaroid with its applied props.
 *
 * @param props - The Polaroid props.
 * @returns The rendered instant photo.
 */
export function Polaroid({ photo, rotate = 0, className = '' }: PolaroidProps): ReactNode {
  const overlays = resolveProps(photo.appliedProps)
  return (
    <figure
      className={`polaroid ${className}`.trim()}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[2px] film-vignette">
        {photo.retroImageUrl ? (
          <img
            src={photo.retroImageUrl}
            alt={photo.captionText || 'Field photograph'}
            className="h-full w-full object-cover"
          />
        ) : (
          <PhotoFallback seed={photo.photoId} />
        )}
        {overlays.map(({ placement, definition }) => (
          <div
            key={placement.propId}
            className="pointer-events-none absolute"
            style={{
              left: `${placement.offsetXPct}%`,
              top: `${placement.offsetYPct}%`,
              width: `${28 * placement.scale}%`,
              transform: `translate(-50%, -50%) rotate(${placement.rotationDeg}deg)`,
            }}
          >
            <PropGlyph
              propId={definition?.propId ?? placement.propId}
              className="h-auto w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.28)]"
            />
          </div>
        ))}
      </div>
      <figcaption className="mt-3 px-1">
        <p className="typewriter text-[0.72rem] leading-snug text-ink-soft">
          {photo.captionText || 'Untitled field note'}
        </p>
        <p className="typewriter mt-1 text-[0.6rem] text-ink-faint">
          {formatClock(photo.capturedAt)} · {photo.latitude.toFixed(4)},{' '}
          {photo.longitude.toFixed(4)}
        </p>
      </figcaption>
    </figure>
  )
}

/**
 * Deterministic parchment illustration used when no captured image exists.
 *
 * @param props - The fallback props.
 * @returns The rendered placeholder.
 */
function PhotoFallback({ seed }: { seed: string }): ReactNode {
  const hue = hashSeed(seed) % 40
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(150deg, hsl(${34 + hue} 42% 78%), hsl(${28 + hue} 30% 56%))`,
      }}
    >
      <svg viewBox="0 0 120 120" className="h-2/3 w-2/3 opacity-70">
        <g fill="#2b2620">
          <path d="M22 74 q4 -26 30 -26 q14 0 22 8 l14 -4 l-2 10 l6 8 l-18 2 q-4 14 -22 14 q-26 0 -30 -12 z" />
          <path d="M78 50 q10 -18 20 -14 q6 3 2 12 l-8 10 z" />
        </g>
        <circle cx="42" cy="62" r="4" fill="#fbf6ec" />
      </svg>
      <span className="typewriter absolute bottom-2 right-3 text-[0.55rem] text-paper/80">
        NO FRAME
      </span>
    </div>
  )
}

/**
 * Hash a string into a small non-negative integer.
 *
 * @param value - The string to hash.
 * @returns A stable integer.
 */
function hashSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}
