/**
 * Settings page: profile, defaults, backend status, data tools.
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Chip } from '../components/ui/Chip'
import { PageHeading } from '../components/layout/PageHeading'
import { checkHealth, isApiEnabled } from '../lib/api'
import { useApp } from '../lib/context'
import { FILTERS } from '../lib/engine/retro'
import { STORAGE_KEY } from '../lib/store'

/**
 * Render the settings page.
 *
 * @returns The rendered page.
 */
export function SettingsPage(): ReactNode {
  const { state, dispatch } = useApp()
  const [ownerName, setOwnerName] = useState(state.settings.ownerName)
  const [backendState, setBackendState] = useState<'checking' | 'online' | 'offline' | 'disabled'>(
    () => (isApiEnabled() ? 'checking' : 'disabled'),
  )

  useEffect(() => {
    if (!isApiEnabled()) {
      return
    }
    let mounted = true
    checkHealth()
      .then(() => mounted && setBackendState('online'))
      .catch(() => mounted && setBackendState('offline'))
    return () => {
      mounted = false
    }
  }, [])

  const commitName = (): void => {
    const name = ownerName.trim()
    if (name) {
      dispatch({ type: 'updateSettings', patch: { ownerName: name } })
    }
  }

  const exportData = (): void => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `urban-hound-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetData = (): void => {
    if (window.confirm('Return the ledger to its furnished demo state? This clears local data.')) {
      dispatch({ type: 'reset' })
    }
  }

  return (
    <div className="anim-rise space-y-4">
      <PageHeading title="Settings" subtitle="Preferences live on this device. They are nobody else's business." />

      <section className="card-paper space-y-4 p-4">
        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Your name</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              onBlur={commitName}
              className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-ink placeholder:text-ink-faint/70"
            />
            <button type="button" className="btn btn-ghost flex-none" onClick={commitName}>
              Save
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
            Default broadcast radius — {formatRadius(state.settings.broadcastRadiusMeters)}
          </span>
          <input
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={state.settings.broadcastRadiusMeters}
            onChange={(event) =>
              dispatch({ type: 'updateSettings', patch: { broadcastRadiusMeters: Number(event.target.value) } })
            }
            className="w-full accent-brick"
          />
        </label>

        <div>
          <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Default film stock</p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.filterId}
                type="button"
                className={`chip cursor-pointer ${state.settings.retroFilterId === item.filterId ? 'border-brick/60 bg-brick/10 text-brick' : ''}`}
                onClick={() => dispatch({ type: 'updateSettings', patch: { retroFilterId: item.filterId } })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-ink">Haptic flourishes</span>
            <span className="block text-xs text-ink-faint">Subtle buzzes on capture and broadcast.</span>
          </span>
          <input
            type="checkbox"
            checked={state.settings.hapticsEnabled}
            onChange={(event) => dispatch({ type: 'updateSettings', patch: { hapticsEnabled: event.target.checked } })}
            className="h-6 w-6 accent-brick"
          />
        </label>
      </section>

      <section className="card-paper space-y-3 p-4">
        <h2 className="font-display text-lg text-ink">Sync</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-soft">Companion FastAPI service</p>
          <Chip tone={backendState === 'online' ? 'ok' : backendState === 'disabled' ? 'neutral' : 'warn'}>
            {backendState === 'checking' ? 'checking…' : backendState === 'online' ? 'online' : backendState === 'disabled' ? 'local only' : 'offline'}
          </Chip>
        </div>
        <p className="typewriter text-[0.62rem] text-ink-faint">
          Set <span className="text-ink-soft">VITE_API_BASE</span> at build time to enable sync. This device files everything locally regardless.
        </p>
      </section>

      <section className="card-paper space-y-2 p-4">
        <h2 className="font-display text-lg text-ink">Local data</h2>
        <p className="text-xs text-ink-faint">
          Stored under <span className="typewriter">{STORAGE_KEY}</span>. Offline by design.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={exportData}>
            Export ledger
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetData}>
            Reset demo
          </button>
        </div>
      </section>

      <section className="card-paper p-4 text-center">
        <p className="font-display text-lg text-ink">Urban Hound</p>
        <p className="typewriter text-[0.62rem] text-ink-faint">Field Book · PWA · built for refined city hounds</p>
      </section>
    </div>
  )
}

/**
 * Format a radius for display.
 *
 * @param meters - Radius in meters.
 * @returns A short radius string.
 */
function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(0)} km` : `${meters} m`
}