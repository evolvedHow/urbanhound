/**
 * Daily Vibe Check readout: a tongue-in-cheek energy-versus-couch gauge.
 */

import type { ReactNode } from 'react'
import type { VibeProjection } from '../../types/domain'

/** Props accepted by {@link VibeMeter}. */
export interface VibeMeterProps {
  vibe: VibeProjection
  className?: string
}

/**
 * Render the vibe projection with dual bars and tags.
 *
 * @param props - The meter props.
 * @returns The rendered gauge.
 */
export function VibeMeter({ vibe, className = '' }: VibeMeterProps): ReactNode {
  return (
    <section className={`card-paper p-4 ${className}`.trim()} aria-label="Daily vibe check">
      <p className="typewriter text-[0.62rem] uppercase tracking-[0.18em] text-ink-faint">
        Daily Vibe Check
      </p>
      <h3 className="mt-1 text-lg leading-snug text-balance text-ink">{vibe.headline}</h3>

      <div className="mt-3 space-y-2">
        <Bar label="Energy" value={vibe.energyPct} tone="var(--color-teal)" />
        <Bar label="Couch" value={vibe.couchPct} tone="var(--color-sepia)" />
      </div>

      {vibe.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vibe.tags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

/** Props for a single labelled bar. */
interface BarProps {
  label: string
  value: number
  tone: string
}

/**
 * Render a single percentage bar.
 *
 * @param props - The bar props.
 * @returns The rendered bar.
 */
function Bar({ label, value, tone }: BarProps): ReactNode {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex items-center justify-between text-[0.7rem] text-ink-soft">
        <span>{label}</span>
        <span className="typewriter">{clamped}%</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${clamped}%`, backgroundColor: tone }}
        />
      </div>
    </div>
  )
}
