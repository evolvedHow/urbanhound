/**
 * Animal sound board: tap a clip to play it and catch a hound's attention.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../../lib/context'
import { SOUND_CLIPS, SOUND_GROUPS, soundUrl } from '../../lib/engine/sounds'
import type { SoundClip } from '../../types/domain'

/**
 * Render the sound board with a volume control.
 *
 * @returns The rendered board.
 */
export function SoundBoard(): ReactNode {
  const { state, dispatch } = useApp()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const volume = state.settings.soundVolume

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const play = (clip: SoundClip): void => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    audio.src = soundUrl(clip)
    audio.volume = volume
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
    setPlayingId(clip.soundId)
  }

  const stop = (): void => {
    audioRef.current?.pause()
    setPlayingId(null)
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      <section className="card-paper flex items-center gap-3 p-4">
        <span className="typewriter text-[0.62rem] uppercase tracking-[0.14em] text-ink-soft">Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) =>
            dispatch({ type: 'updateSettings', patch: { soundVolume: Number(event.target.value) } })
          }
          className="flex-1 accent-brick"
          aria-label="Sound volume"
        />
        {playingId && (
          <button type="button" className="btn btn-ghost min-h-9 px-3 text-xs" onClick={stop}>
            ■ Stop
          </button>
        )}
      </section>

      {SOUND_GROUPS.map((group) => (
        <section key={group}>
          <h2 className="font-display text-lg text-ink">{group}</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SOUND_CLIPS.filter((clip) => clip.group === group).map((clip) => {
              const active = playingId === clip.soundId
              return (
                <button
                  key={clip.soundId}
                  type="button"
                  onClick={() => play(clip)}
                  className={`card-paper flex min-h-24 flex-col items-center justify-center gap-1 p-2 text-center transition-transform active:translate-y-0.5 ${
                    active ? 'border-brick/60 bg-brick/10' : ''
                  }`}
                  aria-pressed={active}
                >
                  <span className="text-2xl" aria-hidden="true">{clip.emoji}</span>
                  <span className="text-[0.68rem] font-medium text-ink">{clip.label}</span>
                  {active && <span className="typewriter text-[0.55rem] text-brick">playing…</span>}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
