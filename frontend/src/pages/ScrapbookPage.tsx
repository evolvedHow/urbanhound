/**
 * Scrapbook page: a pasted-in record of every returned walk.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeading } from '../components/layout/PageHeading'
import { Polaroid } from '../components/ui/Polaroid'
import { TrailMap } from '../components/ui/TrailMap'
import { useApp } from '../lib/context'
import { formatDate, formatDistance, formatDuration } from '../lib/format'
import { photosForSession, pointsForSession } from '../lib/store'

/**
 * Render the scrapbook of completed walks.
 *
 * @returns The rendered page.
 */
export function ScrapbookPage(): ReactNode {
  const { state } = useApp()
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const completed = [...state.sessions]
    .filter((session) => session.status === 'COMPLETED')
    .sort(
      (a, b) =>
        new Date(b.actualEndTime ?? b.scheduledStartTime).getTime() -
        new Date(a.actualEndTime ?? a.scheduledStartTime).getTime(),
    )
  const visible = subjectFilter
    ? completed.filter((session) => session.subjectId === subjectFilter)
    : completed

  const subjectName = (subjectId: string): string =>
    state.subjects.find((subject) => subject.subjectId === subjectId)?.name ?? 'Unknown'

  return (
    <div className="anim-rise space-y-4">
      <PageHeading
        title="Scrapbook"
        subtitle="Every walk, developed and pasted in. Nothing thrown away."
      />

      {state.subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`chip cursor-pointer ${subjectFilter === null ? 'border-brick/60 bg-brick/10 text-brick' : ''}`}
            onClick={() => setSubjectFilter(null)}
          >
            All hounds
          </button>
          {state.subjects.map((subject) => (
            <button
              key={subject.subjectId}
              type="button"
              className={`chip cursor-pointer ${subjectFilter === subject.subjectId ? 'border-brick/60 bg-brick/10 text-brick' : ''}`}
              onClick={() => setSubjectFilter(subject.subjectId)}
            >
              {subject.name}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="The scrapbook is blank"
          hint="Complete a walk and its frames will show up here, slightly imperfect and entirely charming."
          action={<Link className="btn btn-primary" to="/walk">Take a walk</Link>}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((session) => (
            <ScrapbookEntry key={session.sessionId} sessionId={session.sessionId} subjectName={subjectName(session.subjectId)} />
          ))}
        </div>
      )}
    </div>
  )
}

/** Props for {@link ScrapbookEntry}. */
interface ScrapbookEntryProps {
  sessionId: string
  subjectName: string
}

/**
 * Render a single pasted walk entry.
 *
 * @param props - The entry props.
 * @returns The rendered entry.
 */
function ScrapbookEntry({ sessionId, subjectName }: ScrapbookEntryProps): ReactNode {
  const { state } = useApp()
  const session = state.sessions.find((item) => item.sessionId === sessionId)
  const [expanded, setExpanded] = useState(false)
  if (!session) {
    return null
  }

  const points = pointsForSession(state, session.sessionId)
  const photos = photosForSession(state, session.sessionId)
  const duration = session.actualStartTime && session.actualEndTime
    ? (new Date(session.actualEndTime).getTime() - new Date(session.actualStartTime).getTime()) / 1000
    : 0

  return (
    <article className="card-paper overflow-hidden">
      <div className="tape mx-auto -mt-0.5 h-5 w-20" aria-hidden="true" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-lg text-ink">{subjectName}</h2>
            <p className="text-sm text-ink-soft">{formatDate(session.actualEndTime ?? session.scheduledStartTime)}</p>
          </div>
          <Chip tone="ok">returned</Chip>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-ink-faint">
          <span className="typewriter">{formatDistance(session.totalDistanceMeters)}</span>
          <span aria-hidden="true">·</span>
          <span className="typewriter">{formatDuration(duration)}</span>
          <span aria-hidden="true">·</span>
          <span>{points.length} fixes</span>
        </div>

        {session.statusCaptionText && (
          <p className="typewriter mt-3 text-sm leading-relaxed text-ink-soft">
            "{session.statusCaptionText}"
          </p>
        )}

        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.slice(0, expanded ? photos.length : 2).map((photo, index) => (
              <Polaroid key={photo.photoId} photo={photo} rotate={index % 2 === 0 ? -1.2 : 1.1} />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? 'Contract route' : photos.length > 2 ? 'Expand frames' : 'Show route'}
          </button>
          <div className="h-28 w-28 sm:h-32 sm:w-32">
            <TrailMap points={points.slice(0, Math.max(2, Math.ceil(points.length / 4)))} className="h-full w-full rounded-card" />
          </div>
        </div>
      </div>
    </article>
  )
}