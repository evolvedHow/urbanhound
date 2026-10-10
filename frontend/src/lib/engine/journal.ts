/**
 * Journal content engine: hound moods and a bank of pre-filled updates.
 *
 * The tone is warm, first-person "dog diary" humor for pet lovers — playful but
 * dry, never cutesy. Owners can tap a suggestion, hit "Feeling lucky" for a
 * random one, or ignore them entirely and write their own.
 */

import type { MoodId } from '../../types/domain'

/** A selectable mood with display metadata and an energy score. */
export interface MoodDefinition {
  moodId: MoodId
  label: string
  emoji: string
  /** Relative energy from 1 (low) to 5 (high). */
  score: number
  /** Accent colour token for badges. */
  tone: string
}

/** Every mood a hound can be logged in, ordered from buzzy to poorly. */
export const MOODS: MoodDefinition[] = [
  { moodId: 'ZOOMIES', label: 'Zoomies', emoji: '⚡', score: 5, tone: 'var(--color-brick)' },
  { moodId: 'JOYFUL', label: 'Joyful', emoji: '😄', score: 5, tone: 'var(--color-mustard)' },
  { moodId: 'CONTENT', label: 'Content', emoji: '😌', score: 4, tone: 'var(--color-sage)' },
  { moodId: 'HUNGRY', label: 'Hungry', emoji: '🍖', score: 3, tone: 'var(--color-sepia)' },
  { moodId: 'SLEEPY', label: 'Sleepy', emoji: '😴', score: 3, tone: 'var(--color-teal)' },
  { moodId: 'GRUMPY', label: 'Grumpy', emoji: '😾', score: 2, tone: 'var(--color-ink-soft)' },
  { moodId: 'ANXIOUS', label: 'Anxious', emoji: '😟', score: 2, tone: 'var(--color-sepia)' },
  { moodId: 'POORLY', label: 'Under the weather', emoji: '🤒', score: 1, tone: 'var(--color-brick)' },
]

/**
 * Look up a mood definition by identifier.
 *
 * @param moodId - The mood identifier, or `null`.
 * @returns The mood definition, or `null` when absent.
 */
export function getMood(moodId: MoodId | null): MoodDefinition | null {
  if (!moodId) {
    return null
  }
  return MOODS.find((mood) => mood.moodId === moodId) ?? null
}

/**
 * Describe a numeric happiness rating (1–5) as emoji and label.
 *
 * @param rating - The owner's rating from 1 to 5.
 * @returns Display metadata for the rating.
 */
export function describeHappiness(rating: number): { emoji: string; label: string } {
  const table: Array<{ emoji: string; label: string }> = [
    { emoji: '😐', label: 'Barely noticed' },
    { emoji: '🙂', label: 'Polite nibble' },
    { emoji: '😋', label: 'Contentedly munched' },
    { emoji: '😍', label: 'Absolutely delighted' },
    { emoji: '🤩', label: 'Tail-wagging euphoria' },
  ]
  const index = Math.min(5, Math.max(1, Math.round(rating))) - 1
  return table[index]
}

/** Pre-filled, pick-and-go updates written in the hound's voice. */
export const JOURNAL_PROMPTS: string[] = [
  'Woke at 5:47 a.m. to supervise a single leaf. It did not move. I remain vigilant.',
  'Successfully convinced the humans my bowl was empty. It was not. Zero regrets.',
  'Made a new friend at the park. He sniffed me, I sniffed him. It is serious.',
  'The mail carrier returned. I handled it with the calm grace of a seasoned professional.',
  'Buried an extremely important stick. Cannot recall where. This is now my life\u2019s work.',
  'Decided the squirrel and I are friends now. The squirrel has not been informed.',
  'Chewed a shoe. Only the left one. It had it coming.',
  'Gave the vacuum cleaner a stern talking-to. It has been warned.',
  'Napped for nineteen hours. Feeling refreshed. Ready to nap again.',
  'Found the perfect sunbeam and colonized it. Borders are closed.',
  'Did three zoomies for no reason at all. Would do again.',
  'Stared at my human while they ate a sandwich. Eye contact is a powerful tool.',
  'Escaped the bath using my saddest wet eyes. It did not work. Suffering persists.',
  'Learned a new word today: \u201cwalk.\u201d Fainted.',
  'The cat sat in my bed. In MY bed. War has been declared, very politely.',
  'Ate a suspicious thing in the garden. Review pending.',
  'Rolled in something magnificent. The humans used a great many bath words.',
  'Answered the door with an authorized three-bark greeting. Highly official.',
  'The dog next door is a complete amateur. I have informed him.',
  'Adopted a new squeaky toy. Named it Squeaky. We are inseparable.',
  'Conducted a full sniff audit of the entire neighbourhood. Report forthcoming.',
  'Sat on the human\u2019s laptop. Productivity halted. Job well done.',
  'Received a treat for doing absolutely nothing. Excellent system. No notes.',
  'Refused to come inside. The humans negotiated. I won.',
  'Chased a beam of light. It escaped. Again. I will be ready next time.',
  'Greeted everyone at the party and collected the most pets. Unsurprising.',
  'Found the world\u2019s best puddle. I would know — I tested all of them.',
  'Inspected the new grocery bag thoroughly. Empty. Deeply disappointing.',
  'Practiced my \u201cconcerningly cute\u201d face in the mirror. Nailed it.',
  'Held a staring contest with my own reflection. Lost. Rematch pending.',
  'Barked once at absolutely nothing to keep everyone on their toes.',
  'Reorganized my toy collection by squeak volume. Squeaky remains number one.',
  'Tried to befriend a pigeon. It flew away. Its loss.',
  'Slept on the human\u2019s feet so they could not leave. Mission accomplished.',
]

/**
 * Shuffle an array without mutating the input.
 *
 * @param items - The array to shuffle.
 * @param random - Random source in `[0, 1)`.
 * @returns A new shuffled array.
 */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }
  return copy
}

/**
 * Choose a set of distinct prompt suggestions.
 *
 * @param count - How many prompts to return.
 * @param exclude - Optional prompt to avoid (e.g. the current suggestion).
 * @param random - Random source in `[0, 1)`.
 * @returns An array of suggested prompts.
 */
export function suggestPrompts(
  count: number,
  exclude?: string,
  random: () => number = Math.random,
): string[] {
  const pool = exclude ? JOURNAL_PROMPTS.filter((prompt) => prompt !== exclude) : JOURNAL_PROMPTS
  return shuffle(pool, random).slice(0, count)
}

/**
 * Pick a single random prompt, avoiding the previous one when possible.
 *
 * @param previous - The prompt to avoid repeating.
 * @param random - Random source in `[0, 1)`.
 * @returns A random prompt string.
 */
export function feelingLucky(previous?: string, random: () => number = Math.random): string {
  const pool = previous ? JOURNAL_PROMPTS.filter((prompt) => prompt !== previous) : JOURNAL_PROMPTS
  return pool[Math.floor(random() * pool.length)]
}
