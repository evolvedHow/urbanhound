/**
 * Alerts page: emergency broadcasts, community sightings, and resolution.
 */

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { PageHeading } from '../components/layout/PageHeading'
import { useApp } from '../lib/context'
import { uuid } from '../lib/id'
import { pointsForSession } from '../lib/store'
import type { IncidentReport, SightingReport } from '../types/domain'

const BASE_COORD = { latitude: 40.7359, longitude: -73.9911 }

/**
 * Render the alerts and broadcasts page.
 *
 * @returns The rendered page.
 */
export function AlertsPage(): ReactNode {
  const { state } = useApp()
  const [params] = useSearchParams()
  const preselected = params.get('subject')
  const open = state.incidents.find((incident) => incident.status === 'OPEN')
  const resolved = state.incidents.filter((incident) => incident.status !== 'OPEN')

  return (
    <div className="anim-rise space-y-4">
      <PageHeading
        title="Ward Broadcasts"
        subtitle="A missing hound is everyone's business. Keep the tone calm and the radius honest."
      />

      {open ? (
        <OpenIncident incident={open} />
      ) : (
        <ReportForm preselectedSubjectId={preselected} />
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-ink">Resolved incidents</h2>
          <div className="mt-2 space-y-2">
            {resolved.map((incident) => {
              const subject = state.subjects.find((item) => item.subjectId === incident.subjectId)
              return (
                <div key={incident.incidentId} className="card-paper flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-ink">{subject?.name ?? 'Unknown'} · returned</p>
                    <p className="text-xs text-ink-faint">
                      {incident.description} · {incident.notifiedCount} notified
                    </p>
                  </div>
                  <Chip tone="ok">resolved</Chip>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

/** Props for {@link OpenIncident}. */
interface OpenIncidentProps {
  incident: IncidentReport
}

/**
 * Render the active incident with sightings and a resolution action.
 *
 * @param props - The incident props.
 * @returns The rendered incident card.
 */
function OpenIncident({ incident }: OpenIncidentProps): ReactNode {
  const { state, dispatch } = useApp()
  const subject = state.subjects.find((item) => item.subjectId === incident.subjectId)
  const sightings = state.sightings.filter((sighting) => sighting.incidentId === incident.incidentId)
  const [notes, setNotes] = useState('')

  const submitSighting = (event: FormEvent): void => {
    event.preventDefault()
    const text = notes.trim()
    if (!text) {
      return
    }
    const sighting: SightingReport = {
      sightingId: uuid(),
      incidentId: incident.incidentId,
      submitterId: null,
      latitude: incident.lastKnownLatitude + (Math.random() - 0.5) * 0.001,
      longitude: incident.lastKnownLongitude + (Math.random() - 0.5) * 0.001,
      retroImageUrl: null,
      notes: text,
      verificationStatus: 'UNVERIFIED',
      sightedAt: new Date().toISOString(),
    }
    dispatch({ type: 'addSighting', sighting })
    setNotes('')
  }

  return (
    <section className="rounded-card border-2 border-brick/60 bg-brick/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl text-brick">
          {subject?.name ?? 'A hound'} is missing
        </h2>
        <Chip tone="danger">active</Chip>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{incident.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-card p-2.5">
          <p className="typewriter text-sm text-ink">{incident.notifiedCount}</p>
          <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">notified (est.)</p>
        </div>
        <div className="rounded-xl bg-card p-2.5">
          <p className="typewriter text-sm text-ink">
            {incident.lastKnownLatitude.toFixed(4)}, {incident.lastKnownLongitude.toFixed(4)}
          </p>
          <p className="text-[0.58rem] uppercase tracking-[0.14em] text-ink-faint">last known</p>
        </div>
      </dl>

      {sightings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Sightings</p>
          {sightings.map((sighting) => (
            <div key={sighting.sightingId} className="rounded-xl bg-card p-3">
              <p className="text-sm text-ink">{sighting.notes}</p>
              <p className="mt-1 text-[0.62rem] text-ink-faint">
                {sighting.sightedAt.slice(0, 16).replace('T', ' · ')} · {sighting.sightingId.slice(0, 4)}… ·{' '}
                <Chip tone={sighting.verificationStatus === 'UNVERIFIED' ? 'warn' : 'ok'}>
                  {sighting.verificationStatus.replace('_', ' ').toLowerCase()}
                </Chip>
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submitSighting} className="mt-4 flex gap-2">
        <input
          type="text"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Brown dog matching the description by the bakery"
          className="typewriter w-full rounded-xl border border-ink/15 bg-card px-3 py-3 text-sm text-ink placeholder:text-ink-faint/70"
        />
        <button type="submit" className="btn btn-primary flex-none">
          Log sighting
        </button>
      </form>

      <button
        type="button"
        className="btn btn-accent mt-3 w-full"
        onClick={() => dispatch({ type: 'resolveIncident', incidentId: incident.incidentId })}
      >
        Mark as returned
      </button>
    </section>
  )
}

/** Form state for launching a broadcast. */
interface ReportFormProps {
  preselectedSubjectId: string | null
}

/**
 * Render the missing-pet broadcast form.
 *
 * @param props - The form props.
 * @returns The rendered form.
 */
function ReportForm({ preselectedSubjectId }: ReportFormProps): ReactNode {
  const { state, dispatch } = useApp()
  const candidates = state.subjects.filter((subject) => subject.status !== 'ARCHIVED')
  const [subjectId, setSubjectId] = useState<string | null>(preselectedSubjectId ?? candidates[0]?.subjectId ?? null)
  const [radius, setRadius] = useState(3000)
  const [description, setDescription] = useState('Went missing during or near a walk. Last seen heading west with intent.')

  const lastKnown = (): { latitude: number; longitude: number } => {
    const subject = state.subjects.find((item) => item.subjectId === subjectId)
    if (!subject) {
      return BASE_COORD
    }
    const sessions = state.sessions
      .filter((session) => session.subjectId === subject.subjectId)
      .sort((a, b) => new Date(b.actualEndTime ?? b.scheduledStartTime).getTime() - new Date(a.actualEndTime ?? a.scheduledStartTime).getTime())
    const latest = sessions[0]
    if (!latest) {
      return BASE_COORD
    }
    const points = pointsForSession(state, latest.sessionId)
    return points.length > 0
      ? { latitude: points[points.length - 1].latitude, longitude: points[points.length - 1].longitude }
      : BASE_COORD
  }

  const launch = (event: FormEvent): void => {
    event.preventDefault()
    if (!subjectId) {
      return
    }
    const anchor = lastKnown()
    const incident: IncidentReport = {
      incidentId: uuid(),
      subjectId,
      reporterId: state.ownerId,
      status: 'OPEN',
      lastKnownLatitude: anchor.latitude,
      lastKnownLongitude: anchor.longitude,
      searchRadiusMeters: radius,
      description: description.trim() || 'No further details yet — please keep an eye out.',
      triggeredAt: new Date().toISOString(),
      notifiedCount: estimateNeighbours(radius),
    }
    dispatch({ type: 'createIncident', incident })
  }

  return (
    <form onSubmit={launch} className="card-paper space-y-4 p-4">
      <h2 className="font-display text-lg text-ink">Report a missing hound</h2>

      <div>
        <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Who is missing?</p>
        <div className="flex flex-wrap gap-2">
          {candidates.map((subject) => (
            <button
              key={subject.subjectId}
              type="button"
              className={`chip cursor-pointer ${subjectId === subject.subjectId ? 'border-brick/60 bg-brick/10 text-brick' : ''}`}
              onClick={() => setSubjectId(subject.subjectId)}
            >
              {subject.name}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Broadcast radius — {formatRadius(radius)}
        </span>
        <input
          type="range"
          min={500}
          max={10000}
          step={500}
          value={radius}
          onChange={(event) => setRadius(Number(event.target.value))}
          className="w-full accent-brick"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Note to the ward</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="w-full resize-none rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm text-ink placeholder:text-ink-faint/70 focus:border-sepia focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between">
        <p className="typewriter text-[0.62rem] text-ink-faint">
          Last known pin: {lastKnown().latitude.toFixed(4)}, {lastKnown().longitude.toFixed(4)}
        </p>
        <button type="submit" className="btn btn-accent">
          Broadcast
        </button>
      </div>
    </form>
  )
}

/**
 * Estimate the number of neighbours a broadcast reaches.
 *
 * @param radiusMeters - The broadcast radius.
 * @returns A plausible recipient count.
 */
function estimateNeighbours(radiusMeters: number): number {
  return Math.round((radiusMeters / 1000) * 21 + 6)
}

/**
 * Format a radius without repeating the meter unit.
 *
 * @param meters - Radius in meters.
 * @returns A short radius string.
 */
function formatRadius(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(0)} km` : `${meters} m`
}