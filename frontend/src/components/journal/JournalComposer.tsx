/**
 * Journal composer: pick a pre-filled update, roll "Feeling lucky", or write
 * your own — then attach a photo or short video and log the hound's mood.
 */

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../../lib/context'
import { feelingLucky, suggestPrompts } from '../../lib/engine/journal'
import { deleteManyMedia, saveMedia } from '../../lib/media'
import { uuid } from '../../lib/id'
import { MediaView } from './MediaView'
import { MoodPicker } from './MoodPicker'
import type {
  JournalEntry,
  JournalMedia,
  JournalSource,
  MoodId,
} from '../../types/domain'

/** Props accepted by {@link JournalComposer}. */
export interface JournalComposerProps {
  /** Pre-selects a hound; defaults to the first on the ledger. */
  defaultSubjectId?: string
  /** Called after an entry is successfully saved. */
  onSaved?: () => void
  className?: string
}

/**
 * Render the journal entry composer.
 *
 * @param props - The composer props.
 * @returns The rendered composer card.
 */
export function JournalComposer({
  defaultSubjectId,
  onSaved,
  className = '',
}: JournalComposerProps): ReactNode {
  const { state, dispatch } = useApp()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [subjectId, setSubjectId] = useState(
    defaultSubjectId ?? state.subjects[0]?.subjectId ?? '',
  )
  const [bodyText, setBodyText] = useState('')
  const [moodId, setMoodId] = useState<MoodId | null>(null)
  const [media, setMedia] = useState<JournalMedia[]>([])
  const [source, setSource] = useState<JournalSource>('CUSTOM')
  const [suggestions, setSuggestions] = useState(() => suggestPrompts(3))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const choosePrompt = (prompt: string): void => {
    setBodyText(prompt)
    setSource('PROMPT')
  }

  const rollLucky = (): void => {
    const next = feelingLucky(bodyText)
    setBodyText(next)
    setSource('LUCKY')
    setSuggestions(suggestPrompts(3, next))
  }

  const reshuffle = (): void => {
    setSuggestions(suggestPrompts(3, bodyText))
  }

  const attachFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) {
      return
    }
    setBusy(true)
    setError(null)
    const added: JournalMedia[] = []
    for (const file of Array.from(files)) {
      const mediaId = uuid()
      try {
        const stored = await saveMedia(mediaId, file)
        added.push({
          mediaId,
          kind: stored.kind,
          mimeType: stored.mimeType,
          caption: '',
        })
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'That file could not be added.'
        setError(message)
      }
    }
    if (added.length > 0) {
      setMedia((current) => [...current, ...added])
    }
    setBusy(false)
    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  const removeMedia = (mediaId: string): void => {
    setMedia((current) => current.filter((item) => item.mediaId !== mediaId))
    void deleteManyMedia([mediaId])
  }

  const reset = (): void => {
    setBodyText('')
    setMoodId(null)
    setMedia([])
    setSource('CUSTOM')
    setSuggestions(suggestPrompts(3))
    setError(null)
  }

  const canSave = Boolean(subjectId) && (bodyText.trim().length > 0 || media.length > 0)

  const save = (): void => {
    if (!canSave) {
      return
    }
    const entry: JournalEntry = {
      entryId: uuid(),
      subjectId,
      createdAt: new Date().toISOString(),
      bodyText: bodyText.trim(),
      moodId,
      media,
      source,
    }
    dispatch({ type: 'addJournalEntry', entry })
    reset()
    onSaved?.()
  }

  return (
    <section className={`card-paper journal-page space-y-4 p-4 ${className}`.trim()}>
      <div className="flex items-center justify-between gap-2">
        <p className="typewriter text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
          New entry
        </p>
        {state.subjects.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <span>for</span>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="rounded-lg border border-ink/15 bg-paper px-2 py-1.5 text-sm text-ink"
            >
              {state.subjects.map((subject) => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
            Suggestions
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reshuffle}
              className="typewriter text-[0.62rem] text-ink-faint underline underline-offset-2"
            >
              shuffle
            </button>
            <button type="button" onClick={rollLucky} className="btn btn-accent min-h-9 px-3 py-0 text-xs">
              🍀 Feeling lucky
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => choosePrompt(prompt)}
              className="rounded-xl border border-dashed border-ink/20 bg-paper/60 px-3 py-2 text-left typewriter text-[0.72rem] leading-snug text-ink-soft transition-colors hover:border-sepia hover:bg-paper"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Today&rsquo;s update
        </span>
        <textarea
          value={bodyText}
          onChange={(event) => {
            setBodyText(event.target.value)
            setSource('CUSTOM')
          }}
          rows={4}
          placeholder="Dear diary…"
          className="typewriter w-full resize-y rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-faint/70 focus:border-sepia focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Mood
        </span>
        <MoodPicker value={moodId} onChange={setMoodId} />
      </div>

      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {media.map((item) => (
            <div key={item.mediaId} className="relative aspect-square overflow-hidden rounded-card border border-ink/10">
              <MediaView media={item} />
              <button
                type="button"
                onClick={() => removeMedia(item.mediaId)}
                aria-label="Remove attachment"
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-xs text-paper"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-brick">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(event) => void attachFiles(event.target.files)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          📷 Add photo / video
        </button>
        <button type="button" className="btn btn-primary ml-auto" onClick={save} disabled={!canSave || busy}>
          {busy ? 'Adding…' : 'Save entry'}
        </button>
      </div>
    </section>
  )
}
