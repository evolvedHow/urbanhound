/**
 * Mood selector rendered as a row of emoji chips.
 */

import type { ReactNode } from 'react'
import { MOODS } from '../../lib/engine/journal'
import type { MoodId } from '../../types/domain'

/** Props accepted by {@link MoodPicker}. */
export interface MoodPickerProps {
  value: MoodId | null
  onChange: (moodId: MoodId | null) => void
  /** When true, tapping the selected mood clears it. */
  allowClear?: boolean
  className?: string
}

/**
 * Render the mood picker.
 *
 * @param props - The picker props.
 * @returns The rendered chip row.
 */
export function MoodPicker({
  value,
  onChange,
  allowClear = true,
  className = '',
}: MoodPickerProps): ReactNode {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()} role="radiogroup" aria-label="Mood">
      {MOODS.map((mood) => {
        const selected = value === mood.moodId
        return (
          <button
            key={mood.moodId}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected && allowClear ? null : mood.moodId)}
            className={`chip cursor-pointer transition-colors ${
              selected ? 'border-brick/60 bg-brick/10 text-brick' : 'hover:border-sepia'
            }`}
          >
            <span aria-hidden="true">{mood.emoji}</span>
            {mood.label}
          </button>
        )
      })}
    </div>
  )
}
