/**
 * A single diary entry card: hound, timestamp, mood, text, and media.
 */

import type { ReactNode } from 'react'
import { useApp } from '../../lib/context'
import { getMood } from '../../lib/engine/journal'
import { formatClock, formatDate } from '../../lib/format'
import { deleteManyMedia } from '../../lib/media'
import { findSubject } from '../../lib/store'
import { MediaView } from './MediaView'
import type { JournalEntry } from '../../types/domain'

/** Props accepted by {@link JournalEntryCard}. */
export interface JournalEntryCardProps {
  entry: JournalEntry
  /** Hides the delete affordance (used for previews). */
  readOnly?: boolean
}

/** Attribution label per entry source. */
const SOURCE_LABEL: Record<JournalEntry['source'], string> = {
  PROMPT: 'from a suggestion',
  LUCKY: 'feeling lucky',
  CUSTOM: 'in your own words',
}

/**
 * Render a single journal entry.
 *
 * @param props - The entry props.
 * @returns The rendered entry card.
 */
export function JournalEntryCard({ entry, readOnly = false }: JournalEntryCardProps): ReactNode {
  const { state, dispatch } = useApp()
  const subject = findSubject(state, entry.subjectId)
  const mood = getMood(entry.moodId)

  const remove = (): void => {
    if (!window.confirm('Tear this page out of the diary? This removes its media too.')) {
      return
    }
    void deleteManyMedia(entry.media.map((item) => item.mediaId))
    dispatch({ type: 'deleteJournalEntry', entryId: entry.entryId })
  }

  return (
    <article className="card-paper journal-page overflow-hidden p-4">
      <header className="flex items-center gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-teal font-display text-sm text-paper">
          {subject?.name?.[0] ?? '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight text-ink">
            {subject?.name ?? 'Unknown hound'}
          </p>
          <p className="typewriter text-[0.62rem] uppercase tracking-[0.14em] text-ink-faint">
            {formatDate(entry.createdAt)} · {formatClock(entry.createdAt)}
          </p>
        </div>
        {mood && (
          <span
            className="chip"
            style={{ borderColor: mood.tone, color: mood.tone }}
            title={`Mood: ${mood.label}`}
          >
            <span aria-hidden="true">{mood.emoji}</span>
            {mood.label}
          </span>
        )}
      </header>

      {entry.bodyText && (
        <p className="typewriter mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
          {entry.bodyText}
        </p>
      )}

      {entry.media.length > 0 && (
        <div className={`mt-3 grid gap-2 ${entry.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {entry.media.map((item) => (
            <div key={item.mediaId} className="overflow-hidden rounded-card border border-ink/10">
              <MediaView media={item} className="aspect-[4/3]" />
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <footer className="mt-3 flex items-center justify-between">
          <span className="typewriter text-[0.6rem] text-ink-faint">{SOURCE_LABEL[entry.source]}</span>
          <button
            type="button"
            onClick={remove}
            className="typewriter text-[0.62rem] text-ink-faint underline underline-offset-2 hover:text-brick"
          >
            tear out
          </button>
        </footer>
      )}
    </article>
  )
}
