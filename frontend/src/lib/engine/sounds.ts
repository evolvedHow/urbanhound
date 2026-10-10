/**
 * Animal sound board used to attract and entertain a hound.
 *
 * Clips are small WAV files bundled under `public/sounds/` so the whole board
 * works offline on the installed PWA. `generate-sounds.mjs` (in
 * `frontend/scripts/`) synthesizes placeholder clips; drop in your own licensed
 * recordings under the same filenames to replace them.
 */

import type { SoundClip } from '../../types/domain'

/** Every bundled sound clip, grouped by animal family. */
export const SOUND_CLIPS: SoundClip[] = [
  { soundId: 'dog-bark', label: 'Bark', group: 'Dog', file: 'dog-bark.wav', emoji: '🐕' },
  { soundId: 'dog-howl', label: 'Howl', group: 'Dog', file: 'dog-howl.wav', emoji: '🌙' },
  { soundId: 'dog-whimper', label: 'Whimper', group: 'Dog', file: 'dog-whimper.wav', emoji: '🥺' },
  { soundId: 'cat-meow', label: 'Meow', group: 'Cat', file: 'cat-meow.wav', emoji: '🐈' },
  { soundId: 'cat-purr', label: 'Purr', group: 'Cat', file: 'cat-purr.wav', emoji: '💤' },
  { soundId: 'cat-trill', label: 'Trill', group: 'Cat', file: 'cat-trill.wav', emoji: '🎶' },
  { soundId: 'bird-tweet', label: 'Tweet', group: 'Bird', file: 'bird-tweet.wav', emoji: '🐦' },
  { soundId: 'bird-chirp', label: 'Chirp', group: 'Bird', file: 'bird-chirp.wav', emoji: '🐤' },
  { soundId: 'bird-squawk', label: 'Squawk', group: 'Bird', file: 'bird-squawk.wav', emoji: '🦜' },
  { soundId: 'toy-squeak', label: 'Squeaky toy', group: 'Other', file: 'toy-squeak.wav', emoji: '🧸' },
  { soundId: 'treat-bag', label: 'Treat bag', group: 'Other', file: 'treat-bag.wav', emoji: '🦴' },
  { soundId: 'whistle', label: 'Whistle', group: 'Other', file: 'whistle.wav', emoji: '😗' },
]

/** Stable display order for the animal groups. */
export const SOUND_GROUPS: SoundClip['group'][] = ['Dog', 'Cat', 'Bird', 'Other']

/**
 * Resolve a clip's public URL, respecting the Vite base path.
 *
 * @param clip - The sound clip to resolve.
 * @returns An absolute-from-root URL to the bundled audio file.
 */
export function soundUrl(clip: SoundClip): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}sounds/${clip.file}`
}
