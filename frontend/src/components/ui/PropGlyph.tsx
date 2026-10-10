/**
 * Hand-drawn SVG glyphs for the analog prop catalog.
 *
 * Each glyph draws inside a `0 0 100 100` viewBox so it can be scaled and
 * positioned freely as a photo overlay.
 */

import type { ReactNode } from 'react'

/** Props accepted by {@link PropGlyph}. */
export interface PropGlyphProps {
  propId: string
  className?: string
}

/**
 * Render the SVG glyph for a prop identifier.
 *
 * @param props - The glyph props.
 * @returns The rendered SVG, or `null` for unknown props.
 */
export function PropGlyph({ propId, className = '' }: PropGlyphProps): ReactNode {
  const body = GLYPHS[propId]
  if (!body) {
    return null
  }
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={propId}
      xmlns="http://www.w3.org/2000/svg"
    >
      {body}
    </svg>
  )
}

const GLYPHS: Record<string, ReactNode> = {
  sunglasses_retro: (
    <g fill="#2b2620" stroke="#2b2620" strokeWidth="2">
      <rect x="12" y="40" width="34" height="22" rx="10" />
      <rect x="54" y="40" width="34" height="22" rx="10" />
      <path d="M46 48 q4 -6 8 0" fill="none" />
      <path d="M12 44 l-6 -6 M88 44 l6 -6" fill="none" />
      <rect x="18" y="45" width="10" height="6" rx="3" fill="#f4ecdd" stroke="none" />
      <rect x="60" y="45" width="10" height="6" rx="3" fill="#f4ecdd" stroke="none" />
    </g>
  ),
  hat_detective: (
    <g fill="#5b5142" stroke="#2b2620" strokeWidth="2">
      <ellipse cx="50" cy="62" rx="42" ry="12" />
      <path d="M24 60 q6 -34 26 -34 q20 0 26 34 z" />
      <path d="M20 60 h60" fill="none" />
    </g>
  ),
  hat_party: (
    <g stroke="#2b2620" strokeWidth="2">
      <path d="M50 12 L74 70 L26 70 Z" fill="#a8552f" />
      <path d="M40 42 h20 M34 56 h32" fill="none" />
      <circle cx="50" cy="10" r="7" fill="#c99a3a" />
    </g>
  ),
  crown: (
    <g stroke="#2b2620" strokeWidth="2">
      <path d="M20 68 L14 30 L36 46 L50 22 L64 46 L86 30 L80 68 Z" fill="#c99a3a" />
      <circle cx="14" cy="28" r="4" fill="#a8552f" />
      <circle cx="50" cy="20" r="4" fill="#a8552f" />
      <circle cx="86" cy="28" r="4" fill="#a8552f" />
    </g>
  ),
  badge_stick_champion: (
    <g>
      <circle cx="50" cy="50" r="34" fill="#c99a3a" stroke="#2b2620" strokeWidth="2" />
      <path d="M34 24 L66 76" stroke="#6b4a2a" strokeWidth="8" strokeLinecap="round" />
      <path d="M60 30 l10 6 l4 -10" fill="none" stroke="#3f5b54" strokeWidth="3" />
    </g>
  ),
  badge_squirrel_inspector: (
    <g stroke="#2b2620" strokeWidth="2">
      <circle cx="46" cy="46" r="24" fill="#fbf6ec" />
      <circle cx="46" cy="46" r="24" fill="none" />
      <path d="M64 64 L82 82" strokeWidth="7" strokeLinecap="round" />
      <path d="M40 46 q6 -8 12 0 q-6 8 -12 0" fill="#8a5a3b" stroke="none" />
    </g>
  ),
  badge_professional_napper: (
    <g>
      <circle cx="50" cy="50" r="34" fill="#3f5b54" stroke="#2b2620" strokeWidth="2" />
      <path
        d="M34 60 q16 10 32 0"
        fill="none"
        stroke="#f4ecdd"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M40 40 l3 3 l-3 3 M52 36 l3 3 l-3 3 M64 40 l3 3 l-3 3" fill="none" stroke="#c99a3a" strokeWidth="3" />
    </g>
  ),
  badge_mud_magnet: (
    <g>
      <circle cx="50" cy="50" r="34" fill="#8a5a3b" stroke="#2b2620" strokeWidth="2" />
      <path d="M40 30 q10 16 0 30 q-8 12 4 16" fill="none" stroke="#3a2a1a" strokeWidth="5" strokeLinecap="round" />
      <path d="M58 34 q8 14 0 26 q-6 10 2 14" fill="none" stroke="#3a2a1a" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
}
