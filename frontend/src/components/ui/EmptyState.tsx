/**
 * Friendly empty-state block.
 */

import type { ReactNode } from 'react'

/** Props accepted by {@link EmptyState}. */
export interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
}

/**
 * Render a centered empty-state message with an optional action.
 *
 * @param props - The empty-state props.
 * @returns The rendered block.
 */
export function EmptyState({ title, hint, action }: EmptyStateProps): ReactNode {
  return (
    <div className="card-paper flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-soft">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
