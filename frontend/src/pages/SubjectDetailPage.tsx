/**
 * Subject detail page: dossie, zones, walk history, and quick actions.
 */

import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { TrailMap } from '../components/ui/TrailMap'
import { useApp } from '../lib/context'
import { formatDate, formatDistance, formatDuration } from '../lib/format'
import { photosForSession, pointsForSession } from '../lib/store'

/**
 * Render a single hound's full dossier.
 *
 * @returns The rendered page.
 */
export function SubjectDetailPage(): ReactNode {
  const { subjectId } = useParams<{ subjectId: string }>()
  const { state } = useApp()
  const navigate = useNavigate()
  const subject = state.subjects.find((item) => item.subjectId === subjectId)

  if (!subject) {
    return <EmptyState title="No such hound" hint="This one appears to have left the ledger." action={<Link className="btn btn-primary" to="/hounds">Back to hounds</Link>} />
  }

  const sessions = state.sessions
    .filter((session) => session.subjectId === subject.subjectId)
    .sort((a, b) => new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime())
  const zones = state.zones.filter((zone) => zone.subjectId === subject.subjectId && zone.isEnabled)
  const totalDistance = sessions.reduce((sum, session) => sum + session.totalDistanceMeters, 0)
  const latest = sessions[0]
  const latestPoints = latest ? pointsForSession(state, latest.sessionId) : []
  const latestPhotos = latest ? photosForSession(state, latest.sessionId) : []

  const startWalk = (): void => {
    navigate(`/walk?subject=${subject.subjectId}`, { replace: true })
  }

  return (
    <div className="anim-rise space-y-4">
      <Link to="/hounds" className="typewriter text-xs text-ink-faint hover:text-ink-soft">
        ← All hounds
      </Link>

      <section className="card-paper p-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-full bg-teal font-display text-xl text-paper">
            {subject.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl text-ink">{subject.name}</h1>
              <Chip tone="ok">{subject.status.replace('_', ' ')}</Chip>
            </div>
            <p className="text-sm text-ink-soft">{subject.breedOrMix}</p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Walks" value={String(sessions.length)} />
          <Stat label="Distance" value={formatDistance(totalDistance)} />
          <Stat label="Zones" value={String(zones.length)} />
        </dl>

        <div className="mt-4 space-y-1.5 text-sm text-ink-soft">
          {subject.identifyingMarks && (
            <p><span className="font-medium text-ink">Marks: </span>{subject.identifyingMarks}</p>
          )}
          {subject.favoriteTreatsNotes && (
            <p><span className="font-medium text-ink">Tastes: </span>{subject.favoriteTreatsNotes}</p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" className="btn btn-primary flex-1" onClick={startWalk}>
            Start walk
          </button>
          <Link to="/camera" className="btn btn-ghost">
            Camera
          </Link>
        </div>
      </section>

      {zones.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Zones</h2>
          <div className="mt-2 space-y-2">
            {zones.map((zone) => (
              <div key={zone.zoneId} className="card-paper flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-ink">{zone.name}</p>
                  <p className="text-xs text-ink-faint">{zone.geometryType.replace('_', ' ')} · {formatDistance(zone.radiusMeters)} radius</p>
                </div>
                <Chip tone={zone.zoneType === 'SAFE_ZONE' ? 'ok' : 'warn'}>{zone.zoneType.replace('_', ' ')}</Chip>
              </div>
            ))}
          </div>
        </section>
      )}

      {latest && (
        <section>
          <h2 className="font-display text-lg text-ink">Recent</h2>
          <section className="card-paper mt-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-ink-soft">
                {formatDate(latest.scheduledStartTime)} · {formatDuration(durationOf(latest.actualStartTime, latest.actualEndTime))}
              </p>
              <Chip tone="neutral">{latest.status.replace('_', ' ')}</Chip>
            </div>
            <TrailMap points={latestPoints} photos={latestPhotos} className="h-44" />
            {latest.statusCaptionText && (
              <p className="typewriter mt-3 text-sm text-ink-soft">"{latest.statusCaptionText}"</p>
            )}
          </section>
        </section>
      )}
    </div>
  )
}

/** A single numeric stat. */
interface StatProps {
  label: string
  value: string
}

/**
 * Render a labelled statistic.
 *
 * @param props - The stat props.
 * @returns The rendered stat.
 */
function Stat({ label, value }: StatProps): ReactNode {
  return (
    <div className="rounded-xl bg-paper-deep/50 px-2 py-3">
      <p className="typewriter text-base text-ink">{value}</p>
      <p className="text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
    </div>
  )
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