/**
 * Sounds page: a board of animal calls to coax and entertain a hound.
 */

import type { ReactNode } from 'react'
import { SoundBoard } from '../components/journal/SoundBoard'
import { PageHeading } from '../components/layout/PageHeading'

/**
 * Render the animal sound board.
 *
 * @returns The rendered page.
 */
export function SoundsPage(): ReactNode {
  return (
    <div className="anim-rise space-y-4">
      <PageHeading
        title="Sound board"
        subtitle="Tap a clip to prick up a hound's ears. Bark, meow, chirp, and squeak to your heart's content."
      />
      <SoundBoard />
      <p className="typewriter text-center text-[0.6rem] text-ink-faint">
        Placeholder clips are synthesized on-device — swap in your own recordings under
        <span className="text-ink-soft"> public/sounds/</span> for the real thing.
      </p>
    </div>
  )
}
