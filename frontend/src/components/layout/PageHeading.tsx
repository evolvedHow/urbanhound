/**
 * Page title block with an optional trailing action.
 */

import type { ReactNode } from 'react'

/** Props accepted by {@link PageHeading}. */
export interface PageHeadingProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

/**
 * Render a page heading with a ruled underline.
 *
 * @param props - The heading props.
 * @returns The rendered heading.
 */
export function PageHeading({ title, subtitle, action }: PageHeadingProps): ReactNode {
  return (
    <div className="mb-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl leading-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="rule-ink mt-3" />
    </div>
  )
}
