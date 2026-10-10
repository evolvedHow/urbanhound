/**
 * Today page: greeting, active walk, latest completed walk, and quick actions.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { Polaroid } from '../components/ui/Polaroid'
import { TrailMap } from '../components/ui/TrailMap'
import { VibeMeter } from '../components/ui/VibeMeter'
import { useApp } from '../lib/context'
import { projectVibe } from '../lib/engine/vibe'
import { formatDate, formatDistance, formatDuration } from '../lib/format'
import { useNow } from '../lib/hooks/useNow'
import { activeSession, photosForSession, pointsForSession } from '../lib/store'

/**
 * Render the Today page.
 *
 * @returns The rendered page.
 */
export function HomePage(): ReactNode {
  const { state } = useApp()
  const now = useNow()
  const active = activeSession(state)
  const completed = [...state.sessions]
    .filter((session) => session.status === 'COMPLETED')
    .sort(
      (a, b) =>
        (new Date(b.actualEndTime ?? b.scheduledStartTime).getTime() -
          new Date(a.actualEndTime ?? a.scheduledStartTime).getTime()),
    )[0]

  const completedPoints = completed ? pointsForSession(state, completed.sessionId) : []
  const completedPhotos = completed ? photosForSession(state, completed.sessionId) : []
  const recentPhotos = [...state.photos]
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
    .slice(0, 3)

  const subjectName = (subjectId: string): string =>
    state.subjects.find((subject) => subject.subjectId === subjectId)?.name ?? 'Unknown'

  return (
    <div className="anim-rise space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="typewriter text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
            {formatDate(new Date(now).toISOString())}
          </p>
          <h1 className="font-display text-2xl text-ink">
            {greeting(now)}, {state.settings.ownerName.split(' ')[0]}
          </h1>
        </div>
        <div className="flex -space-x-2">
          {state.subjects.slice(0, 3).map((subject) => (
            <span
              key={subject.subjectId}
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper bg-teal font-display text-sm text-paper"
              title={subject.name}
            >
              {subject.name[0]}
            </span>
          ))}
        </div>
      </header>

      {active && (
        <Link to="/walk" className="block">
          <section className="card-paper flex items-center gap-4 p-4">
            <div className="relative grid h-12 w-12 flex-none place-items-center rounded-full bg-brick/10">
              <span className="flicker absolute inset-0 rounded-full bg-brick/20" />
              <span className="relative block h-3 w-3 rounded-full bg-brick" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight text-ink">
                {subjectName(active.subjectId)} is on a walk
              </p>
              <p className="mt-0.5 truncate text-sm text-ink-soft">
                Activity brewing · {formatDistance(active.totalDistanceMeters)} so far
              </p>
            </div>
            <span className="typewriter text-xs text-brick">OPEN</span>
          </section>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-3">
        <QuickAction to="/walk" label="Walk" />
        <QuickAction to="/camera" label="Camera" />
        <QuickAction to="/alerts" label="Broadcast" />
      </div>

      {completed && (
        <section>
          <h2 className="font-display text-lg text-ink">Latest walk</h2>
          <section className="card-paper mt-2 space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg text-ink">{subjectName(completed.subjectId)}</p>
                <p className="text-sm text-ink-soft">
                  {formatDate(completed.actualEndTime ?? completed.scheduledStartTime)}
                </p>
              </div>
              <div className="text-right">
                <p className="typewriter text-sm text-ink">{formatDistance(completed.totalDistanceMeters)}</p>
                <p className="typewriter text-xs text-ink-faint">
                  {formatDuration(durationOf(completed.actualStartTime, completed.actualEndTime))}
                </p>
              </div>
            </div>

            <TrailMap
              points={completedPoints}
              photos={completedPhotos}
              zones={state.zones.filter((zone) => zone.subjectId === completed.subjectId)}
              className="h-40"
            />

            <VibeMeter vibe={recomputeVibe(completedPoints, completed.totalDistanceMeters)} />

            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="neutral">{completed.statusCaptionText}</Chip>
              <Link to="/scrapbook" className="btn btn-ghost ml-auto">
                Open scrapbook
              </Link>
            </div>
          </section>
        </section>
      )}

      {recentPhotos.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent frames</h2>
            <Link to="/scrapbook" className="typewriter text-xs text-ink-soft">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recentPhotos.map((photo, index) => (
              <Polaroid key={photo.photoId} photo={photo} rotate={index % 2 === 0 ? -1.5 : 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** A tappable quick action tile. */
function QuickAction({ to, label }: { to: string; label: string }): ReactNode {
  return (
    <Link
      to={to}
      className="card-paper flex min-h-20 flex-col items-center justify-center gap-1 p-2 text-center transition-transform active:translate-y-0.5"
    >
      <span className="text-[0.68rem] font-medium text-ink">{label}</span>
    </Link>
  )
}

/**
 * Pick a greeting for a given time of day.
 *
 * @param now - Current epoch milliseconds.
 * @returns A greeting phrase.
 */
function greeting(now: number): string {
  const hour = new Date(now).getHours()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

/**
 * Compute a duration between two ISO timestamps.
 *
 * @param start - The start timestamp.
 * @param end - The end timestamp.
 * @returns Duration in whole seconds.
 */
function durationOf(start: string | null, end: string | null): number {
  if (!start || !end) {
    return 0
  }
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 1000)
}

/**
 * Rebuild the vibe projection from a session's recorded points.
 *
 * @param points - The session's points in chronological order.
 * @param distanceMeters - The session's recorded total distance.
 * @returns The projected vibe.
 */
function recomputeVibe(points: { speedMps: number; recordedAt: string }[], distanceMeters: number): ReturnType<typeof projectVibe> {
  if (points.length < 2) {
    return projectVibe(distanceMeters, 1, 0)
  }
  const first = new Date(points[0].recordedAt).getTime()
  const last = new Date(points[points.length - 1].recordedAt).getTime()
  const duration = Math.max(1, (last - first) / 1000)
  const stops = points.filter((point) => point.speedMps < 0.2).length
  return projectVibe(distanceMeters, duration, stops)
}