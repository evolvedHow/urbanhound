/**
 * Walk page: start, live-track, pause, and wrap a field session.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { TrailMap } from '../components/ui/TrailMap'
import { VibeMeter } from '../components/ui/VibeMeter'
import { useApp } from '../lib/context'
import { evaluateZones } from '../lib/engine/geofence'
import { haversineMeters } from '../lib/engine/geo'
import { shuffleStatus } from '../lib/engine/humor'
import { projectVibe } from '../lib/engine/vibe'
import { useElapsedSeconds } from '../lib/hooks/useElapsedSeconds'
import { useLiveLocation } from '../lib/hooks/useLiveLocation'
import { formatDistance, formatDuration } from '../lib/format'
import { uuid } from '../lib/id'
import { activeSession, pointsForSession } from '../lib/store'
import type { LocationPoint, TaskSession } from '../types/domain'

const GLOBAL_BASE = { latitude: 40.7359, longitude: -73.9911 }

/**
 * Render the walk page.
 *
 * @returns The rendered page.
 */
export function WalkPage(): ReactNode {
  const { state, dispatch } = useApp()
  const active = activeSession(state)
  const [params] = useSearchParams()
  const preselectedSubject = params.get('subject')
  const [subjectId, setSubjectId] = useState<string | null>(preselectedSubject)
  const [justEnded, setJustEnded] = useState(false)

  const begin = (): void => {
    if (!subjectId) {
      return
    }
    const now = new Date().toISOString()
    const session: TaskSession = {
      sessionId: uuid(),
      subjectId,
      agentId: 'self',
      status: 'DISPATCHED',
      scheduledStartTime: now,
      actualStartTime: null,
      actualEndTime: null,
      totalDistanceMeters: 0,
      currentVibeText: 'Getting a read on the situation…',
      statusCaptionText: '',
      lastPingAt: null,
    }
    dispatch({ type: 'startSession', session })
    dispatch({ type: 'transitionSession', sessionId: session.sessionId, event: 'ACCEPT_TASK' })
  }

  if (justEnded) {
    return <WalkSummary onDone={() => setJustEnded(false)} />
  }

  if (!active) {
    const candidates = state.subjects.filter((subject) => subject.status === 'ACTIVE')
    return (
      <div className="anim-rise space-y-4">
        <PageTitle />
        {candidates.length === 0 ? (
          <EmptyState
            title="Everyone is otherwise engaged"
            hint="Every hound is mid-walk or unaccounted for. Secure the roster first."
            action={<Link className="btn btn-primary" to="/hounds">Open the ledger</Link>}
          />
        ) : (
          <>
            <section className="card-paper p-4">
              <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Who is going?</p>
              <div className="space-y-2">
                {candidates.map((subject) => (
                  <label
                    key={subject.subjectId}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 p-3 transition-colors has-checked:border-brick has-checked:bg-brick/5"
                  >
                    <input
                      type="radio"
                      name="subject"
                      className="h-4 w-4 accent-brick"
                      checked={subjectId === subject.subjectId}
                      onChange={() => setSubjectId(subject.subjectId)}
                    />
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-teal font-display text-sm text-paper">
                      {subject.name[0]}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{subject.name}</span>
                      <span className="block text-xs text-ink-faint">{subject.breedOrMix}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" className="btn btn-primary mt-3 w-full" disabled={!subjectId} onClick={begin}>
                Begin walk
              </button>
              <p className="typewriter mt-3 text-center text-[0.62rem] text-ink-faint">
                Demo mode uses a polite, simulated neighbourhood.
              </p>
            </section>
            <QuickRules />
          </>
        )}
      </div>
    )
  }

  return (
    <LiveWalk
      session={active}
      key={active.sessionId}
      onEnded={() => setJustEnded(true)}
    />
  )
}

/**
 * Live tracking view for an in-progress session.
 *
 * @param props - Live walk props.
 * @returns The rendered tracking UI.
 */
function LiveWalk({ session, onEnded }: { session: TaskSession; onEnded: () => void }): ReactNode {
  const { state, dispatch } = useApp()
  const running = session.status === 'IN_PROGRESS'
  const points = pointsForSession(state, session.sessionId)
  const subject = state.subjects.find((item) => item.subjectId === session.subjectId)
  const zones = state.zones.filter((zone) => zone.subjectId === session.subjectId && zone.isEnabled)

  const base = points.length > 0 ? points[points.length - 1] : null
  const fix = useLiveLocation({
    active: session.status !== 'COMPLETED' && session.status !== 'CANCELLED',
    fallbackLatitude: base?.latitude ?? GLOBAL_BASE.latitude,
    fallbackLongitude: base?.longitude ?? GLOBAL_BASE.longitude,
  })

  const elapsed = useElapsedSeconds(session.actualStartTime, running)
  const vibe = projectVibe(
    session.totalDistanceMeters,
    Math.max(1, session.actualStartTime ? (Date.now() - new Date(session.actualStartTime).getTime()) / 1000 : 1),
    points.filter((point) => point.speedMps < 0.2).length,
  )

  const lastRecordAtRef = useRef(0)
  const breachRef = useRef<number | null>(null)
  const [zoneResult, setZoneResult] = useState(() =>
    evaluateZones(zones, fix.latitude, fix.longitude, fix.accuracyMeters, Date.now(), null),
  )

  useEffect(() => {
    if (!running) {
      return
    }
    const now = Date.now()
    if (now - lastRecordAtRef.current < 900) {
      return
    }
    lastRecordAtRef.current = now
    const previous = points.length > 0 ? points[points.length - 1] : null
    const speed = previous
      ? haversineMeters(previous.latitude, previous.longitude, fix.latitude, fix.longitude) /
        Math.max(1, (now - new Date(previous.recordedAt).getTime()) / 1000)
      : 0
    const point: LocationPoint = {
      pointId: uuid(),
      sessionId: session.sessionId,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyRadiusMeters: Math.round(fix.accuracyMeters * 10) / 10,
      speedMps: Math.round(speed * 100) / 100,
      headingDegrees: 0,
      batteryLevelPct: 92,
      recordedAt: new Date(now).toISOString(),
    }
    dispatch({ type: 'recordPoint', point })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix.latitude, fix.longitude, running])

  useEffect(() => {
    const result = evaluateZones(zones, fix.latitude, fix.longitude, fix.accuracyMeters, Date.now(), breachRef.current)
    breachRef.current = result.breachStartedAt
    setZoneResult(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix.latitude, fix.longitude, running])

  const togglePause = (): void => {
    dispatch({
      type: 'transitionSession',
      sessionId: session.sessionId,
      event: running ? 'PAUSE_SESSION' : 'RESUME_SESSION',
    })
  }

  const endWalk = (): void => {
    dispatch({ type: 'transitionSession', sessionId: session.sessionId, event: 'END_SESSION' })
    onEnded()
  }

  const cancel = (): void => {
    dispatch({ type: 'transitionSession', sessionId: session.sessionId, event: 'FORCE_CANCEL' })
  }

  const freshCaption = (): void => {
    dispatch({
      type: 'setCaption',
      sessionId: session.sessionId,
      caption: shuffleStatus(session.statusCaptionText),
    })
  }

  const source = fix.source === 'simulated' ? 'Demo · simulated' : fix.source === 'gps' ? 'Live GPS' : 'Paused'

  return (
    <div className="anim-rise space-y-4">
      <section className="card-paper p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">Field session</p>
            <h1 className="font-display text-2xl text-ink">
              {subject?.name ?? 'Unknown'} is out
            </h1>
          </div>
          <Chip tone={running ? 'info' : 'warn'}>{session.status.replace('_', ' ')}</Chip>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat value={formatDuration(elapsed)} label="elapsed" />
          <Stat value={formatDistance(session.totalDistanceMeters)} label="distance" />
          <Stat value={source} label="fix" />
        </dl>

        <TrailMap points={points} zones={zones} photos={state.photos.filter((photo) => photo.sessionId === session.sessionId)} className="mt-4 h-52" />
      </section>

      {zoneResult.status !== 'OK' && (
        <section
          className={`rounded-card border p-3 text-sm ${
            zoneResult.status === 'BREACH'
              ? 'border-brick/60 bg-brick/10 text-brick'
              : 'border-mustard/60 bg-mustard/15 text-[#8a6a1c]'
          }`}
          role="alert"
        >
          <p className="font-medium">
            {zoneResult.status === 'BREACH' ? 'Zone breach detected' : `Heads up — ${zoneResult.zoneName ?? 'a zone'}`}
          </p>
          {zoneResult.status === 'BREACH' ? (
            <Link to={`/alerts?subject=${session.subjectId}`} className="mt-1 inline-block underline underline-offset-2">
              Raise a missing-pet broadcast →
            </Link>
          ) : (
            <p className="mt-0.5 text-xs opacity-80">Resolved or inside within the grace window, no fuss.</p>
          )}
        </section>
      )}

      <VibeMeter vibe={vibe} />

      <section className="card-paper p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="typewriter text-sm leading-relaxed text-ink-soft">
            {session.statusCaptionText || 'Awaiting field notes…'}
          </p>
          <button type="button" className="btn btn-ghost flex-none px-3" onClick={freshCaption} aria-label="New caption">
            ↻
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={togglePause}>
          {running ? 'Pause' : 'Resume'}
        </button>
        <Link to={`/camera?session=${session.sessionId}`} className="btn btn-accent">
          Snap frame
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-primary" onClick={endWalk}>
          Wrap it up
        </button>
        <button type="button" className="btn btn-ghost" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Props for {@link Stat}. */
interface StatProps {
  label: string
  value: string
}

/**
 * Render a single live statistic.
 *
 * @param props - The stat props.
 * @returns The rendered stat.
 */
function Stat({ label, value }: StatProps): ReactNode {
  return (
    <div className="rounded-xl bg-paper-deep/50 px-2 py-2.5">
      <p className="typewriter text-sm text-ink">{value}</p>
      <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
    </div>
  )
}

/** The title block used on the start view. */
function PageTitle(): ReactNode {
  return (
    <header>
      <p className="typewriter text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">Field walk</p>
      <h1 className="font-display text-2xl text-ink">Today's route</h1>
      <p className="mt-1 text-sm text-ink-soft">A walk is a negotiation conducted outdoors.</p>
      <div className="rule-ink mt-3" />
    </header>
  )
}

/** House rules shown before a walk begins. */
function QuickRules(): ReactNode {
  return (
    <section className="card-paper p-4 text-sm text-ink-soft">
      <p className="mb-1 font-medium text-ink">The fine print</p>
      <ul className="list-disc space-y-1 pl-4">
        <li>Each step is recorded quietly and without judgement.</li>
        <li>Geofences hold their boundaries; so does Atticus.</li>
        <li>The Daily Vibe Check is peer-reviewed by nobody.</li>
      </ul>
    </section>
  )
}

/** Props for {@link WalkSummary}. */
interface WalkSummaryProps {
  onDone: () => void
}

/**
 * Post-walk summary shown immediately after a session ends.
 *
 * @param props - The summary props.
 * @returns The rendered summary.
 */
function WalkSummary({ onDone }: WalkSummaryProps): ReactNode {
  const { state } = useApp()
  const completed = [...state.sessions]
    .filter((session) => session.status === 'COMPLETED')
    .sort((a, b) => new Date(b.actualEndTime ?? '').getTime() - new Date(a.actualEndTime ?? '').getTime())[0]
  if (!completed) {
    return <EmptyState title="Walk concluded" hint="The ledger was updated." />
  }
  const subject = state.subjects.find((item) => item.subjectId === completed.subjectId)
  const points = pointsForSession(state, completed.sessionId)
  const duration = completed.actualStartTime && completed.actualEndTime
    ? (new Date(completed.actualEndTime).getTime() - new Date(completed.actualStartTime).getTime()) / 1000
    : 0
  const vibe = projectVibe(completed.totalDistanceMeters, Math.max(1, duration), points.filter((point) => point.speedMps < 0.2).length)

  return (
    <div className="anim-rise space-y-4">
      <header>
        <p className="typewriter text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">Session complete</p>
        <h1 className="font-display text-2xl text-ink">
          {subject?.name ?? 'The hound'} has returned
        </h1>
        <div className="rule-ink mt-3" />
      </header>

      <VibeMeter vibe={vibe} />
      <TrailMap points={points} className="h-48" />

      <section className="card-paper p-4">
        <p className="typewriter text-sm leading-relaxed text-ink-soft">
          "{completed.statusCaptionText || 'A walk concluded without incident.'}"
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/scrapbook" className="btn btn-primary">
          Open scrapbook
        </Link>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}