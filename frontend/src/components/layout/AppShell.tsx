/**
 * Application frame: masthead, routed content, and bottom navigation.
 */

import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { TabBar } from './TabBar'

/**
 * Render the persistent application chrome around the active route.
 *
 * @returns The rendered shell.
 */
export function AppShell(): ReactNode {
  const location = useLocation()
  const isWalk = location.pathname.startsWith('/walk')

  return (
    <div className="paper-grain min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 16c0-5 3.5-8 8-8 2.5 0 3.5 1.2 3.5 2.6 0 1-.6 1.6-1.4 2l-1.6.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9.5" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="leading-none">
              <span className="block font-display text-lg text-ink">Urban Hound</span>
              <span className="typewriter block text-[0.58rem] uppercase tracking-[0.24em] text-ink-faint">
                Hound Journal
              </span>
            </span>
          </Link>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-ink/5"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </header>

      <main className={`mx-auto max-w-3xl px-4 pb-28 ${isWalk ? 'pt-4' : 'pt-5'}`}>
        <Outlet />
      </main>

      <TabBar />
    </div>
  )
}
