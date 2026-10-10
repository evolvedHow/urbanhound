/**
 * Small status label used across the app.
 */

import type { ReactNode } from 'react'

/** Visual tone for a chip. */
export type ChipTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info'

/** Props accepted by {@link Chip}. */
export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  className?: string
}

const TONE_CLASSES: Record<ChipTone, string> = {
  neutral: 'border-ink/20 text-ink-soft',
  ok: 'border-sage/50 bg-sage/10 text-sage',
  warn: 'border-mustard/60 bg-mustard/15 text-[#8a6a1c]',
  danger: 'border-brick/50 bg-brick/10 text-brick',
  info: 'border-teal/40 bg-teal/10 text-teal',
}

/**
 * Render a compact, toned status chip.
 *
 * @param props - The chip props.
 * @returns The rendered chip.
 */
export function Chip({ children, tone = 'neutral', className = '' }: ChipProps): ReactNode {
  return (
    <span className={`chip ${TONE_CLASSES[tone]} ${className}`.trim()}>
      {children}
    </span>
  )
}
