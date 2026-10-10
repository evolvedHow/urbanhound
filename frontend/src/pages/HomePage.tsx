/**
 * Today page: the journal's opening spread — the day's page, treat nudges,
 * recent entries, and quick ways to capture a memory.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { JournalComposer } from '../components/journal/JournalComposer'
import { JournalEntryCard } from '../components/journal/JournalEntryCard'
import { TreatCard } from '../components/journal/TreatCard'
import { useApp } from '../lib/context'
import { describeHappiness, getMood, JOURNAL_PROMPTS } from '../lib/engine/journal'
import { formatDate, formatDistance } from '../lib/format'
import { useNow } from '../lib/hooks/useNow'
import {
  activeSession,
  dateKey,
  findSubject,
  isTreatDue,
  journalEntriesForDay,
  sortedJournalEntries,
  treatLogForDay,
} from '../lib/store'

/**
 * Render the Today page.
 *
 * @returns The rendered page.
 */
export function HomePage(): ReactNode {
  const { state } = useApp()
  const now = useNow()
  const nowDate = new Date(now)
  const [composing, setComposing] = useState(false)

  const active = activeSession(state)
  const todaysEntries = journalEntriesForDay(state, nowDate)
  const recentEntries = sortedJournalEntries(state).slice(0, 3)
  const dueSubjects = state.subjects.filter((subject) => isTreatDue(state, subject.subjectId, nowDate))
  const promptOfDay = promptForDate(nowDate)
  const todayMoods = todaysEntries
    .map((entry) => getMood(entry.moodId))
    .filter((mood): mood is NonNullable<typeof mood> => mood !== null)

  return (
    <div className="anim-rise space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="typewriter text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
            {formatDate(nowDate.toISOString())}
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
                {findSubject(state, active.subjectId)?.name ?? 'A hound'} is on a walk
              </p>
              <p className="mt-0.5 truncate text-sm text-ink-soft">
                Activity brewing · {formatDistance(active.totalDistanceMeters)} so far
              </p>
            </div>
            <span className="typewriter text-xs text-brick">OPEN</span>
          </section>
        </Link>
      )}

      <section className="card-paper journal-page p-5">
        <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
          Today&rsquo;s page
        </p>
        <p className="typewriter mt-2 text-sm leading-relaxed text-ink-soft">
          {promptOfDay}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {todaysEntries.length > 0 ? (
            <span className="typewriter text-[0.62rem] text-ink-faint">
              {todaysEntries.length} {todaysEntries.length === 1 ? 'entry' : 'entries'} written today
            </span>
          ) : (
            <span className="typewriter text-[0.62rem] text-ink-faint">The page is still blank.</span>
          )}
          {todayMoods.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {todayMoods.map((mood, index) => (
                <span key={`${mood.moodId}-${index}`} className="chip" style={{ color: mood.tone, borderColor: mood.tone }}>
                  {mood.emoji} {mood.label}
                </span>
              ))}
            </span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary mt-4 w-full"
          onClick={() => setComposing((open) => !open)}
        >
          {composing ? 'Close the page' : '✒️ Write today\u2019s entry'}
        </button>
      </section>

      {composing && <JournalComposer onSaved={() => setComposing(false)} />}

      {dueSubjects.map((subject) => (
        <TreatCard key={subject.subjectId} subjectId={subject.subjectId} />
      ))}

      <TreatRecap now={nowDate} />

      <div className="grid grid-cols-3 gap-3">
        <QuickAction to="/camera" label="Camera" emoji="📷" />
        <QuickAction to="/sounds" label="Sounds" emoji="🔊" />
        <QuickAction to="/walk" label="Walk" emoji="🐾" />
        <QuickAction to="/scrapbook" label="Scrapbook" emoji="📖" />
        <QuickAction to="/alerts" label="Broadcast" emoji="📣" />
        <QuickAction to="/hounds" label="Hounds" emoji="🐕" />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Recent entries</h2>
          <Link to="/journal" className="typewriter text-xs text-ink-soft">
            Open the journal
          </Link>
        </div>
        {recentEntries.length === 0 ? (
          <p className="card-paper p-4 text-sm text-ink-soft">
            No entries yet. Every hound has a story worth keeping.
          </p>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <JournalEntryCard key={entry.entryId} entry={entry} readOnly />
            ))}
          </div>
        )}
      </section>

      <p className="typewriter pb-2 text-center text-[0.6rem] text-ink-faint">
        A hound&rsquo;s diary · written daily, mostly in hindsight
      </p>
    </div>
  )
}

/** A tappable quick action tile. */
function QuickAction({ to, label, emoji }: { to: string; label: string; emoji: string }): ReactNode {
  return (
    <Link
      to={to}
      className="card-paper flex min-h-20 flex-col items-center justify-center gap-1 p-2 text-center transition-transform active:translate-y-0.5"
    >
      <span className="text-xl" aria-hidden="true">{emoji}</span>
      <span className="text-[0.68rem] font-medium text-ink">{label}</span>
    </Link>
  )
}

/**
 * Recap of every hound's answered treat nudge today.
 *
 * @param props - The recap props.
 * @returns The recap, or `null` when nobody has answered yet.
 */
function TreatRecap({ now }: { now: Date }): ReactNode {
  const { state } = useApp()
  const answered = state.subjects
    .map((subject) => ({ subject, log: treatLogForDay(state, subject.subjectId, now) }))
    .filter(
      (item): item is { subject: (typeof state.subjects)[number]; log: NonNullable<ReturnType<typeof treatLogForDay>> } =>
        item.log !== null,
    )

  if (answered.length === 0) {
    return null
  }

  return (
    <section className="card-paper p-4">
      <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">Treats today</p>
      <ul className="mt-2 space-y-1.5">
        {answered.map(({ subject, log }) => {
          const description = log.wasGiven && log.happinessRating !== null
            ? describeHappiness(log.happinessRating).emoji
            : 'went without today'
          return (
            <li key={subject.subjectId} className="flex items-center gap-2 text-sm text-ink-soft">
              <span className="font-medium text-ink">{subject.name}</span>
              <span aria-hidden="true">·</span>
              <span className="typewriter text-xs">
                {log.wasGiven ? 'treat given' : 'no treat'} {log.wasGiven && log.happinessRating !== null ? `— ${description}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
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
 * Choose a stable "prompt of the day" that only changes between days.
 *
 * @param date - The day to seed from.
 * @returns A prompt string.
 */
function promptForDate(date: Date): string {
  const key = dateKey(date)
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0
  }
  return JOURNAL_PROMPTS[Math.abs(hash) % JOURNAL_PROMPTS.length]
}
