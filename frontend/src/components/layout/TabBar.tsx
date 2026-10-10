/**
 * Bottom tab bar for the primary app destinations.
 */

import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

/** A single tab destination. */
interface TabItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const ICON_CLASS = 'h-6 w-6'

const TABS: TabItem[] = [
  {
    to: '/',
    label: 'Today',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 11.5 12 5l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10.5V19h12v-8.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/hounds',
    label: 'Hounds',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 15c0-4 3-7 7-7s7 3 7 7" strokeLinecap="round" />
        <circle cx="9.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
        <path d="M10.5 15.5c1 .8 2 .8 3 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/walk',
    label: 'Walk',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="6" r="2.2" />
        <path d="M12 8.5 10 13l-2.5 2M12 8.5 14 13l1 6M10 13l-1 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/scrapbook',
    label: 'Scrapbook',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 5v14M4 9h4M4 15h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/alerts',
    label: 'Alerts',
    icon: (
      <svg viewBox="0 0 24 24" className={ICON_CLASS} fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15L6 17z" strokeLinejoin="round" />
        <path d="M10.5 21a1.6 1.6 0 0 0 3 0" strokeLinecap="round" />
      </svg>
    ),
  },
]

/**
 * Render the fixed bottom navigation.
 *
 * @returns The rendered tab bar.
 */
export function TabBar(): ReactNode {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-card/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[0.62rem] transition-colors ${
                  isActive ? 'text-brick' : 'text-ink-faint hover:text-ink-soft'
                }`
              }
            >
              {tab.icon}
              <span className="typewriter tracking-wide">{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
