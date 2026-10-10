/**
 * Journal page: the full diary, filterable by hound, with the composer on top.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { JournalComposer } from '../components/journal/JournalComposer'
import { JournalEntryCard } from '../components/journal/JournalEntryCard'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeading } from '../components/layout/PageHeading'
import { useApp } from '../lib/context'
import { sortedJournalEntries } from '../lib/store'

/**
 * Render the full journal timeline.
 *
 * @returns The rendered page.
 */
export function JournalPage(): ReactNode {
  const { state } = useApp()
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  const entries = sortedJournalEntries(state)
  const visible = subjectFilter
    ? entries.filter((entry) => entry.subjectId === subjectFilter)
    : entries

  return (
    <div className="anim-rise space-y-4">
      <PageHeading
        title="The Journal"
        subtitle="Every entry, in the hound's own words (mostly translated)."
        action={
          <button type="button" className="btn btn-primary" onClick={() => setComposing((open) => !open)}>
            {composing ? 'Close' : '✒️ New entry'}
          </button>
        }
      />

      {composing && <JournalComposer onSaved={() => setComposing(false)} />}

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
          title="An empty diary"
          hint="Pick a suggestion, roll 'Feeling lucky', or write the first line yourself."
          action={
            <button type="button" className="btn btn-primary" onClick={() => setComposing(true)}>
              Write the first entry
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((entry) => (
            <JournalEntryCard key={entry.entryId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
