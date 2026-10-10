/**
 * Daily treat-time nudge: confirm the treat was given and rate the hound's joy.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../../lib/context'
import { describeHappiness } from '../../lib/engine/journal'
import { findSubject } from '../../lib/store'
import { uuid } from '../../lib/id'
import type { TreatLog } from '../../types/domain'

/** Props accepted by {@link TreatCard}. */
export interface TreatCardProps {
  subjectId: string
}

/**
 * Render the treat-time prompt for a hound.
 *
 * @param props - The treat card props.
 * @returns The rendered prompt, or `null` when the hound is unknown.
 */
export function TreatCard({ subjectId }: TreatCardProps): ReactNode {
  const { state, dispatch } = useApp()
  const subject = findSubject(state, subjectId)
  const [rating, setRating] = useState(false)

  if (!subject) {
    return null
  }

  const respond = (wasGiven: boolean, happinessRating: number | null): void => {
    dispatch({ type: 'logTreat', log: buildTreatLog(subjectId, wasGiven, happinessRating) })
  }

  return (
    <section className="card-paper overflow-hidden border-mustard/40 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-mustard/20 text-xl" aria-hidden="true">
          🦴
        </span>
        <div className="min-w-0 flex-1">
          <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-mustard">
            Treat time
          </p>
          <p className="font-display text-lg leading-tight text-ink">
            {rating ? `How happy was ${subject.name}?` : `Time for ${subject.name}'s treat?`}
          </p>
        </div>
      </div>

      {rating ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((value) => {
              const mood = describeHappiness(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => respond(true, value)}
                  className="chip cursor-pointer transition-colors hover:border-brick/60 hover:bg-brick/10"
                  title={mood.label}
                >
                  <span aria-hidden="true">{mood.emoji}</span>
                  {value}
                </button>
              )
            })}
          </div>
          <p className="typewriter mt-2 text-[0.6rem] text-ink-faint">
            1 = barely noticed · 5 = tail-wagging euphoria
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setRating(true)}>
            Yes, gave it 🦴
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => respond(false, null)}>
            Not right now
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * Build a treat log for a hound for the current local day.
 *
 * @param subjectId - The hound being answered for.
 * @param wasGiven - Whether a treat was given.
 * @param happinessRating - Owner-rated happiness from 1 to 5, or `null`.
 * @returns A complete treat log record.
 */
function buildTreatLog(
  subjectId: string,
  wasGiven: boolean,
  happinessRating: number | null,
): TreatLog {
  const now = new Date()
  return {
    logId: uuid(),
    subjectId,
    forDate: formatKey(now),
    wasGiven,
    happinessRating,
    loggedAt: now.toISOString(),
  }
}

/**
 * Format a date as a local `YYYY-MM-DD` key.
 *
 * @param date - The date to key.
 * @returns The local calendar-day string.
 */
function formatKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
