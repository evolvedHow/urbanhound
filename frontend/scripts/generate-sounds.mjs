/**
 * Synthesizes the placeholder animal sounds bundled with Urban Hound.
 *
 * The app ships a small, offline sound board for coaxing a hound over. These
 * clips are crude but recognizable caricatures generated from scratch — no
 * licensing concerns. Replace any file under `public/sounds/` with your own
 * recording (same filename) to upgrade the board.
 *
 * Usage: `node scripts/generate-sounds.mjs`
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 22050
const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'sounds')

/**
 * Encode mono float samples as a 16-bit PCM WAV buffer.
 *
 * @param {Float32Array} samples - Samples in the range [-1, 1].
 * @returns {Buffer} A complete WAV file buffer.
 */
function makeWav(samples) {
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * bytesPerSample)
  }
  return buffer
}

/**
 * Build a sample buffer of a given duration.
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {Float32Array} An empty sample buffer.
 */
function buffer(seconds) {
  return new Float32Array(Math.floor(seconds * SAMPLE_RATE))
}

/** Linear interpolation of a piecewise (time, value) curve. */
function curve(points, time) {
  if (time <= points[0][0]) return points[0][1]
  const last = points[points.length - 1]
  if (time >= last[0]) return last[1]
  for (let index = 0; index < points.length - 1; index += 1) {
    const [t0, v0] = points[index]
    const [t1, v1] = points[index + 1]
    if (time >= t0 && time <= t1) {
      const span = t1 - t0 || 1
      return v0 + ((v1 - v0) * (time - t0)) / span
    }
  }
  return last[1]
}

/** Attack/decay envelope over a normalized phase. */
function envelope(phase, attack = 0.05, release = 0.4) {
  if (phase < attack) return phase / attack
  if (phase > 1 - release) return (1 - phase) / release
  return 1
}

/** One-pole low-pass in place; returns the same buffer. */
function lowpass(samples, cutoff) {
  const dt = 1 / SAMPLE_RATE
  const rc = 1 / (2 * Math.PI * cutoff)
  const alpha = dt / (rc + dt)
  let previous = 0
  for (let index = 0; index < samples.length; index += 1) {
    previous += alpha * (samples[index] - previous)
    samples[index] = previous
  }
  return samples
}

/** One-pole high-pass in place; returns the same buffer. */
function highpass(samples, cutoff) {
  const dt = 1 / SAMPLE_RATE
  const rc = 1 / (2 * Math.PI * cutoff)
  const alpha = rc / (rc + dt)
  let previousInput = samples[0]
  let previousOutput = 0
  for (let index = 0; index < samples.length; index += 1) {
    const input = samples[index]
    previousOutput = alpha * (previousOutput + input - previousInput)
    previousInput = input
    samples[index] = previousOutput
  }
  return samples
}

/** Scale a buffer so its peak reaches the given level. */
function normalize(samples, level = 0.9) {
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  if (peak === 0) return samples
  const gain = level / peak
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain
  return samples
}

/** Soft clip with a tanh-like curve for a warmer edge. */
function softClip(samples) {
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.tanh(samples[index] * 1.4)
  return samples
}

function whiteNoise() {
  return Math.random() * 2 - 1
}

// --- Individual generators -------------------------------------------------

function dogBark() {
  const samples = buffer(0.5)
  const bursts = [
    { start: 0.02, length: 0.16, base: 210 },
    { start: 0.26, length: 0.15, base: 190 },
  ]
  for (const burst of bursts) {
    const from = Math.floor(burst.start * SAMPLE_RATE)
    const count = Math.floor(burst.length * SAMPLE_RATE)
    for (let index = 0; index < count; index += 1) {
      const t = index / SAMPLE_RATE
      const phase = index / count
      const env = envelope(phase, 0.04, 0.6)
      const pitch = burst.base * (1 + 0.15 * Math.exp(-t * 30))
      const body = Math.sin(2 * Math.PI * pitch * t) * 0.7
      const formant =
        Math.sin(2 * Math.PI * pitch * 3.1 * t) * 0.35 +
        Math.sin(2 * Math.PI * pitch * 5.4 * t) * 0.2
      const noise = whiteNoise() * 0.5 * Math.exp(-t * 60)
      samples[from + index] += (body + formant + noise) * env
    }
  }
  return softClip(normalize(samples))
}

function dogHowl() {
  const samples = buffer(1.5)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.18, 0.5)
    const base = curve(
      [
        [0, 300],
        [0.3, 560],
        [0.9, 540],
        [1.35, 360],
        [1.5, 300],
      ],
      t,
    )
    const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t)
    const frequency = base * vibrato
    const tone =
      Math.sin(2 * Math.PI * frequency * t) * 0.7 +
      Math.sin(2 * Math.PI * frequency * 2 * t) * 0.2 +
      Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1
    samples[index] = tone * env
  }
  return softClip(normalize(samples))
}

function dogWhimper() {
  const samples = buffer(0.7)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.15, 0.35) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 9 * t))
    const frequency = curve(
      [
        [0, 900],
        [0.35, 1150],
        [0.7, 750],
      ],
      t,
    )
    samples[index] = Math.sin(2 * Math.PI * frequency * t) * env * 0.8
  }
  return normalize(samples)
}

function catMeow() {
  const samples = buffer(0.8)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.1, 0.45)
    const frequency = curve(
      [
        [0, 520],
        [0.2, 780],
        [0.5, 700],
        [0.8, 480],
      ],
      t,
    )
    const tone =
      Math.sin(2 * Math.PI * frequency * t) * 0.6 +
      Math.sin(2 * Math.PI * frequency * 2 * t) * 0.25 +
      Math.sin(2 * Math.PI * frequency * 3 * t) * 0.12
    samples[index] = tone * env
  }
  lowpass(samples, 2600)
  return softClip(normalize(samples))
}

function catPurr() {
  const samples = buffer(1.8)
  let low = 0
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const rumble = Math.sin(2 * Math.PI * 55 * t) * 0.5 + whiteNoise() * 0.2
    low += 0.15 * (rumble - low)
    const buzz = 0.6 + 0.4 * Math.max(0, Math.sin(2 * Math.PI * 26 * t))
    const fade = Math.min(1, t / 0.2) * Math.min(1, (1.8 - t) / 0.3)
    samples[index] = low * buzz * fade
  }
  lowpass(samples, 900)
  return softClip(normalize(samples, 0.8))
}

function catTrill() {
  const samples = buffer(0.5)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.08, 0.3)
    const frequency = 1100 * (1 + 0.15 * Math.sin(2 * Math.PI * 28 * t))
    samples[index] = Math.sin(2 * Math.PI * frequency * t) * env
  }
  return normalize(samples)
}

function birdTweet() {
  const samples = buffer(0.3)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.05, 0.5)
    const frequency = curve(
      [
        [0, 2200],
        [0.1, 3200],
        [0.2, 4400],
        [0.3, 3600],
      ],
      t,
    )
    samples[index] = Math.sin(2 * Math.PI * frequency * t) * env
  }
  return normalize(samples, 0.75)
}

function birdChirp() {
  const samples = buffer(0.5)
  const notes = [0.0, 0.16, 0.32]
  for (const offset of notes) {
    const from = Math.floor(offset * SAMPLE_RATE)
    const count = Math.floor(0.1 * SAMPLE_RATE)
    for (let index = 0; index < count; index += 1) {
      const t = index / SAMPLE_RATE
      const phase = index / count
      const env = envelope(phase, 0.1, 0.4)
      const frequency = 3000 + 900 * Math.sin((Math.PI * index) / count)
      samples[from + index] += Math.sin(2 * Math.PI * frequency * t) * env
    }
  }
  return normalize(samples, 0.75)
}

function birdSquawk() {
  const samples = buffer(0.45)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.03, 0.4)
    const frequency = curve(
      [
        [0, 1900],
        [0.45, 850],
      ],
      t,
    )
    const saw = 2 * ((t * frequency) % 1) - 1
    samples[index] = (saw * 0.7 + whiteNoise() * 0.3) * env
  }
  lowpass(samples, 3200)
  return softClip(normalize(samples, 0.8))
}

function toySqueak() {
  const samples = buffer(0.25)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.02, 0.35)
    const frequency = curve(
      [
        [0, 900],
        [0.1, 1800],
        [0.25, 1050],
      ],
      t,
    )
    samples[index] = Math.sin(2 * Math.PI * frequency * t) * env
  }
  return normalize(samples, 0.85)
}

function treatBag() {
  const samples = buffer(0.7)
  const crinkles = [
    { start: 0.02, length: 0.06 },
    { start: 0.12, length: 0.05 },
    { start: 0.22, length: 0.07 },
    { start: 0.36, length: 0.05 },
    { start: 0.48, length: 0.08 },
  ]
  for (const crinkle of crinkles) {
    const from = Math.floor(crinkle.start * SAMPLE_RATE)
    const count = Math.floor(crinkle.length * SAMPLE_RATE)
    for (let index = 0; index < count; index += 1) {
      const phase = index / count
      const env = envelope(phase, 0.2, 0.6)
      samples[from + index] += whiteNoise() * env
    }
  }
  highpass(samples, 2500)
  return normalize(samples, 0.7)
}

function whistle() {
  const samples = buffer(0.6)
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / SAMPLE_RATE
    const phase = index / samples.length
    const env = envelope(phase, 0.1, 0.4)
    const frequency = curve(
      [
        [0, 1000],
        [0.25, 2100],
        [0.45, 1600],
        [0.6, 1400],
      ],
      t,
    )
    const vibrato = 1 + 0.01 * Math.sin(2 * Math.PI * 7 * t)
    samples[index] = Math.sin(2 * Math.PI * frequency * vibrato * t) * env
  }
  return normalize(samples, 0.75)
}

const GENERATORS = {
  'dog-bark.wav': dogBark,
  'dog-howl.wav': dogHowl,
  'dog-whimper.wav': dogWhimper,
  'cat-meow.wav': catMeow,
  'cat-purr.wav': catPurr,
  'cat-trill.wav': catTrill,
  'bird-tweet.wav': birdTweet,
  'bird-chirp.wav': birdChirp,
  'bird-squawk.wav': birdSquawk,
  'toy-squeak.wav': toySqueak,
  'treat-bag.wav': treatBag,
  'whistle.wav': whistle,
}

mkdirSync(outDir, { recursive: true })
for (const [file, generate] of Object.entries(GENERATORS)) {
  const wav = makeWav(generate())
  writeFileSync(join(outDir, file), wav)
  console.log(`wrote ${file} (${wav.length} bytes)`)
}
console.log(`Done. ${Object.keys(GENERATORS).length} sounds in ${outDir}`)
