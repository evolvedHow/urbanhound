/**
 * Refined, understated status caption generator.
 *
 * The tone aims for dry, affectionate humor: a well-mannered city hound
 * narrating a walk rather than a slapstick caption.
 */

const TARGET_OBJECTS = [
  'suspicious squirrel',
  'overly confident pigeon',
  'delivery truck',
  'fire hydrant',
  'leaf pile of consequence',
  'tennis ball behind a fence',
  'rival hound across the street',
  'abandoned bagel',
]

const LOCATION_TYPES = [
  'park',
  'hydrant',
  'sidewalk',
  'tree',
  'café patio',
  'flower bed',
]

const STREET_NAMES = [
  'Oak Street',
  'Maple Row',
  'Beacon Court',
  'Linden Way',
  'Harbor Lane',
  'Prescott Avenue',
  'Cedar Mews',
]

const TEMPLATES = [
  'Currently auditing a suspicious {targetObject} on {streetName}.',
  'Escorting the mail carrier along {streetName}.',
  'Conducting a routine inspection of the {locationType} on {streetName}.',
  'Holding a staring contest with a {targetObject}.',
  'Submitting a formal complaint about the {targetObject} to {streetName}.',
  'Taste-testing the breeze near the {locationType}.',
  'Presiding over the {locationType} with quiet authority.',
  'Negotiating with a {targetObject} for right of way.',
]

/** Spatial context seeded into a generated caption. */
export interface StatusContext {
  streetName: string
  locationType: string
  targetObject: string
}

/**
 * Choose a random element from an array.
 *
 * @param items - Non-empty array to sample.
 * @param random - Random source in `[0, 1)`.
 * @returns A randomly selected element.
 */
function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

/**
 * Derive plausible spatial context from a coordinate.
 *
 * @param latitude - Latitude of the hound.
 * @param longitude - Longitude of the hound.
 * @param random - Random source in `[0, 1)`.
 * @returns A contextual seed for the caption generator.
 */
export function contextFromCoordinates(
  latitude: number,
  longitude: number,
  random: () => number,
): StatusContext {
  const streetIndex = Math.abs(Math.round(latitude * 1000 + longitude * 997))
  return {
    streetName: STREET_NAMES[streetIndex % STREET_NAMES.length],
    locationType: pick(LOCATION_TYPES, random),
    targetObject: pick(TARGET_OBJECTS, random),
  }
}

/**
 * Generate a status caption, optionally using spatial context.
 *
 * @param context - Spatial context; generated defaults are used when omitted.
 * @param random - Random source in `[0, 1)`.
 * @returns A rendered caption string.
 */
export function generateStatus(
  context?: StatusContext,
  random: () => number = Math.random,
): string {
  const active =
    context ??
    contextFromCoordinates(
      40.7359 + random() * 0.02,
      -73.9911 - random() * 0.02,
      random,
    )
  const template = pick(TEMPLATES, random)
  return template
    .replace('{streetName}', active.streetName)
    .replace('{locationType}', active.locationType)
    .replace('{targetObject}', active.targetObject)
}

/**
 * Generate a caption distinct from the previous one when possible.
 *
 * @param previous - The caption currently displayed.
 * @param random - Random source in `[0, 1)`.
 * @returns A newly generated caption.
 */
export function shuffleStatus(
  previous?: string,
  random: () => number = Math.random,
): string {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateStatus(undefined, random)
    if (candidate !== previous) {
      return candidate
    }
  }
  return generateStatus(undefined, random)
}
