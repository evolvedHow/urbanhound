/**
 * Hounds page: the roster, with a form to add a new subject.
 */

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { PageHeading } from '../components/layout/PageHeading'
import { useApp } from '../lib/context'
import { makeSubject } from '../lib/store'
import type { SubjectStatus } from '../types/domain'

const STATUS_TONE: Record<SubjectStatus, 'ok' | 'info' | 'warn' | 'danger' | 'neutral'> = {
  ACTIVE: 'ok',
  IN_SESSION: 'info',
  MISSING: 'danger',
  ARCHIVED: 'neutral',
}

/**
 * Render the hounds roster and add form.
 *
 * @returns The rendered page.
 */
export function SubjectsPage(): ReactNode {
  const { state } = useApp()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="anim-rise space-y-4">
      <PageHeading
        title="The Hounds"
        subtitle={`${state.subjects.length} on the ledger — all currently more important than your inbox.`}
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((open) => !open)}>
            {showForm ? 'Close' : '+ New hound'}
          </button>
        }
      />

      {showForm && <AddSubjectForm onDone={() => setShowForm(false)} />}

      <div className="space-y-3">
        {state.subjects.map((subject) => (
          <Link to={`/hounds/${subject.subjectId}`} key={subject.subjectId} className="block">
            <article className="card-paper flex items-center gap-4 p-4 transition-transform active:translate-y-0.5">
              <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-teal font-display text-lg text-paper">
                {subject.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-ink">{subject.name}</h2>
                  <Chip tone={STATUS_TONE[subject.status]}>{subject.status.replace('_', ' ')}</Chip>
                </div>
                <p className="truncate text-sm text-ink-soft">{subject.breedOrMix}</p>
              </div>
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Form state for a new subject. */
interface SubjectFormState {
  name: string
  breedOrMix: string
  identifyingMarks: string
  favoriteTreatsNotes: string
}

/** Props accepted by {@link AddSubjectForm}. */
interface AddSubjectFormProps {
  onDone: () => void
}

/**
 * Form for registering a new hound.
 *
 * @param props - The form props.
 * @returns The rendered form.
 */
function AddSubjectForm({ onDone }: AddSubjectFormProps): ReactNode {
  const { state, dispatch } = useApp()
  const [form, setForm] = useState<SubjectFormState>({
    name: '',
    breedOrMix: '',
    identifyingMarks: '',
    favoriteTreatsNotes: '',
  })

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) {
      return
    }
    dispatch({ type: 'addSubject', subject: makeSubject(state.ownerId, name, form.breedOrMix.trim() || 'Mystery mix', {
      identifyingMarks: form.identifyingMarks.trim(),
      favoriteTreatsNotes: form.favoriteTreatsNotes.trim(),
    }) })
    onDone()
  }

  const update = (field: keyof SubjectFormState) => (value: string): void => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <form onSubmit={submit} className="card-paper space-y-3 p-4">
      <TextField label="Name" required value={form.name} onChange={update('name')} placeholder="e.g. Atticus" />
      <TextField label="Breed or mix" value={form.breedOrMix} onChange={update('breedOrMix')} placeholder="e.g. Wirehaired Fox Terrier" />
      <TextField label="Identifying marks" value={form.identifyingMarks} onChange={update('identifyingMarks')} placeholder="White blaze, one floppy ear" />
      <TextField label="Treat notes" value={form.favoriteTreatsNotes} onChange={update('favoriteTreatsNotes')} placeholder="Negotiates for liver snaps" />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Add to ledger
        </button>
      </div>
    </form>
  )
}

/** Props for {@link TextField}. */
interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

/**
 * A labelled textual input.
 *
 * @param props - The text field props.
 * @returns The rendered field.
 */
function TextField({ label, value, onChange, placeholder, required }: TextFieldProps): ReactNode {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </span>
      <input
        type="text"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-ink placeholder:text-ink-faint/70 focus:border-sepia focus:outline-none"
      />
    </label>
  )
}