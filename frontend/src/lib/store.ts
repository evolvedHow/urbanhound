/**
 * Local-first application store for Urban Hound.
 *
 * The store is the single source of truth for the PWA. It is persisted to
 * `localStorage` so the app is fully usable offline and when deployed as a
 * static site, and it mirrors the backend's domain rules (distance
 * accumulation, the session FSM, and the vibe projection).
 */

import type {
  GeofenceZone,
  IncidentReport,
  LocationPoint,
  PhotoArtifact,
  PropPlacement,
  SessionEvent,
  SessionStatus,
  SightingReport,
  Subject,
  TaskSession,
} from '../types/domain'
import { generateStatus } from './engine/humor'
import { pathDistanceMeters } from './engine/geo'
import { nextStatus } from './engine/sessionFsm'
import { projectVibe } from './engine/vibe'
import { uuid } from './id'

/** User-controlled preferences persisted with the store. */
export interface AppSettings {
  ownerName: string
  broadcastRadiusMeters: number
  retroFilterId: string
  hapticsEnabled: boolean
}

/** The complete persisted application state. */
export interface AppState {
  ownerId: string
  subjects: Subject[]
  zones: GeofenceZone[]
  sessions: TaskSession[]
  points: LocationPoint[]
  photos: PhotoArtifact[]
  incidents: IncidentReport[]
  sightings: SightingReport[]
  settings: AppSettings
}

/** All mutations the reducer understands. */
export type AppAction =
  | { type: 'addSubject'; subject: Subject }
  | { type: 'updateSubject'; subjectId: string; patch: Partial<Subject> }
  | { type: 'addZone'; zone: GeofenceZone }
  | { type: 'startSession'; session: TaskSession }
  | { type: 'transitionSession'; sessionId: string; event: SessionEvent }
  | { type: 'recordPoint'; point: LocationPoint }
  | { type: 'addPhoto'; photo: PhotoArtifact }
  | { type: 'setCaption'; sessionId: string; caption: string }
  | { type: 'createIncident'; incident: IncidentReport }
  | { type: 'resolveIncident'; incidentId: string }
  | { type: 'addSighting'; sighting: SightingReport }
  | { type: 'updateSettings'; patch: Partial<AppSettings> }
  | { type: 'reset' }

/** Storage key for persisted state. */
export const STORAGE_KEY = 'urbanhound.state.v1'

/** Default preferences for a new install. */
export const DEFAULT_SETTINGS: AppSettings = {
  ownerName: 'Ava Rendell',
  broadcastRadiusMeters: 5000,
  retroFilterId: 'kodachrome',
  hapticsEnabled: true,
}

/**
 * Build the demo dataset used on first launch or after a reset.
 *
 * @returns A fully populated initial state.
 */
export function createInitialState(): AppState {
  const ownerId = uuid()
  const agentId = uuid()
  const atticus = makeSubject(ownerId, 'Atticus', 'Wirehaired Fox Terrier', {
    identifyingMarks: 'White blaze; one ear that never quite cooperates.',
    favoriteTreatsNotes: 'Will negotiate indefinitely for a liver snap.',
  })
  const pim = makeSubject(ownerId, 'Pim', 'Whippet mix', {
    identifyingMarks: 'Brindle coat, serene expression.',
    favoriteTreatsNotes: 'Prefers the quiet dignity of a plain biscuit.',
  })

  const zones: GeofenceZone[] = [
    {
      zoneId: uuid(),
      ownerId,
      subjectId: atticus.subjectId,
      name: 'Home Block',
      zoneType: 'SAFE_ZONE',
      geometryType: 'RADIAL',
      centerLatitude: 40.7359,
      centerLongitude: -73.9911,
      radiusMeters: 400,
      gracePeriodSeconds: 30,
      isEnabled: true,
    },
    {
      zoneId: uuid(),
      ownerId,
      subjectId: null,
      name: 'Riverside Off-Leash',
      zoneType: 'RESTRICTED_ZONE',
      geometryType: 'RADIAL',
      centerLatitude: 40.7411,
      centerLongitude: -73.9897,
      radiusMeters: 220,
      gracePeriodSeconds: 45,
      isEnabled: true,
    },
  ]

  const seeded = makeCompletedSession(atticus, agentId)
  return {
    ownerId,
    subjects: [atticus, pim],
    zones,
    sessions: [seeded.session],
    points: seeded.points,
    photos: seeded.photos,
    incidents: [],
    sightings: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** A completed session bundled with its points and photos for seeding. */
interface SeededSession {
  session: TaskSession
  points: LocationPoint[]
  photos: PhotoArtifact[]
}

/**
 * Create a subject with defaults.
 *
 * @param ownerId - Identifier of the owning user.
 * @param name - The subject's name.
 * @param breed - Breed or mix label.
 * @param extras - Optional identifying marks and treat notes.
 * @returns A new subject.
 */
export function makeSubject(
  ownerId: string,
  name: string,
  breed: string,
  extras: { identifyingMarks?: string; favoriteTreatsNotes?: string } = {},
): Subject {
  return {
    subjectId: uuid(),
    ownerId,
    name,
    breedOrMix: breed,
    status: 'ACTIVE',
    identifyingMarks: extras.identifyingMarks ?? '',
    favoriteTreatsNotes: extras.favoriteTreatsNotes ?? '',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Create a completed walk with a loop trail and two retro photos.
 *
 * @param subject - The subject that took the walk.
 * @param agentId - Identifier of the walker.
 * @returns The seeded session with its points and photos.
 */
function seedCompletedSession(subject: Subject, agentId: string): SeededSession {
  const sessionId = uuid()
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(7, 40, 0, 0)
  const baseLat = 40.7359
  const baseLng = -73.9911
  const offsets: Array<[number, number, number]> = [
    [0, 0, 70],
    [0.0006, 0.0004, 90],
    [0.0013, 0.0006, 30],
    [0.0019, 0.0002, 80],
    [0.0023, -0.0005, 60],
    [0.0016, -0.0011, 25],
    [0.0008, -0.0013, 75],
  ]
  const points: LocationPoint[] = offsets.map(([dLat, dLng, seconds], index) => ({
    pointId: uuid(),
    sessionId,
    latitude: baseLat + dLat,
    longitude: baseLng + dLng,
    accuracyRadiusMeters: 4 + (index % 3),
    speedMps: seconds < 40 ? 0.1 : 1.3,
    headingDegrees: (index * 42) % 360,
    batteryLevelPct: 88 - index,
    recordedAt: new Date(start.getTime() + index * 70_000).toISOString(),
  }))
  const coordinates = points.map((point) => [point.latitude, point.longitude] as [number, number])
  const distance = pathDistanceMeters(coordinates)
  const duration = (points.length - 1) * 70
  const vibe = projectVibe(distance, duration, 2)
  const end = points[points.length - 1]

  const session: TaskSession = {
    sessionId,
    subjectId: subject.subjectId,
    agentId,
    status: 'COMPLETED',
    scheduledStartTime: start.toISOString(),
    actualStartTime: start.toISOString(),
    actualEndTime: end.recordedAt,
    totalDistanceMeters: distance,
    currentVibeText: vibe.headline,
    statusCaptionText: generateStatus({
      streetName: 'Oak Street',
      locationType: 'park',
      targetObject: 'suspicious squirrel',
    }),
    lastPingAt: end.recordedAt,
  }

  const photos: PhotoArtifact[] = [
    makeSeededPhoto(sessionId, points[2], 'Found a 10/10 stick near Oak Street'),
    makeSeededPhoto(sessionId, points[5], 'Filed a complaint with the head pigeon'),
  ]

  return { session, points, photos }
}

/**
 * Create a seeded photo pinned to a location.
 *
 * @param sessionId - Owning session identifier.
 * @param point - The point the photo is pinned to.
 * @param caption - Label-maker caption text.
 * @returns A photo artifact with an empty image URL.
 */
function makeSeededPhoto(
  sessionId: string,
  point: LocationPoint,
  caption: string,
): PhotoArtifact {
  const props: PropPlacement[] = [
    { propId: 'sunglasses_retro', offsetXPct: 50, offsetYPct: 42, scale: 1, rotationDeg: 0 },
  ]
  return {
    photoId: uuid(),
    sessionId,
    latitude: point.latitude,
    longitude: point.longitude,
    retroImageUrl: '',
    appliedProps: props,
    captionText: caption,
    capturedAt: point.recordedAt,
  }
}

// Rename-aware alias so the seed function name reads naturally at call sites.
const makeCompletedSession = seedCompletedSession

/**
 * Reduce an action into the next application state.
 *
 * @param state - The current state.
 * @param action - The action to apply.
 * @returns The next state.
 */
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'addSubject':
      return { ...state, subjects: [...state.subjects, action.subject] }
    case 'updateSubject':
      return {
        ...state,
        subjects: state.subjects.map((subject) =>
          subject.subjectId === action.subjectId
            ? { ...subject, ...action.patch }
            : subject,
        ),
      }
    case 'addZone':
      return { ...state, zones: [...state.zones, action.zone] }
    case 'startSession':
      return {
        ...state,
        sessions: [...state.sessions, action.session],
        subjects: state.subjects.map((subject) =>
          subject.subjectId === action.session.subjectId
            ? { ...subject, status: 'IN_SESSION' }
            : subject,
        ),
      }
    case 'transitionSession':
      return transitionSession(state, action.sessionId, action.event)
    case 'recordPoint':
      return {
        ...state,
        points: [...state.points, action.point],
        sessions: state.sessions.map((session) =>
          session.sessionId === action.point.sessionId
            ? {
                ...session,
                totalDistanceMeters:
                  session.totalDistanceMeters +
                  stepDistance(state, session.sessionId, action.point),
                lastPingAt: action.point.recordedAt,
              }
            : session,
        ),
      }
    case 'addPhoto':
      return { ...state, photos: [...state.photos, action.photo] }
    case 'setCaption':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.sessionId === action.sessionId
            ? { ...session, statusCaptionText: action.caption }
            : session,
        ),
      }
    case 'createIncident':
      return {
        ...state,
        incidents: [...state.incidents, action.incident],
        subjects: state.subjects.map((subject) =>
          subject.subjectId === action.incident.subjectId
            ? { ...subject, status: 'MISSING' }
            : subject,
        ),
      }
    case 'resolveIncident':
      return {
        ...state,
        incidents: state.incidents.map((incident) =>
          incident.incidentId === action.incidentId
            ? { ...incident, status: 'RESOLVED' }
            : incident,
        ),
        subjects: state.subjects.map((subject) => {
          const incident = state.incidents.find(
            (item) => item.incidentId === action.incidentId,
          )
          return incident && subject.subjectId === incident.subjectId
            ? { ...subject, status: 'ACTIVE' }
            : subject
        }),
      }
    case 'addSighting':
      return { ...state, sightings: [...state.sightings, action.sighting] }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'reset':
      return createInitialState()
    default:
      return state
  }
}

/**
 * Apply an FSM event and its side effects to a session.
 *
 * @param state - The current state.
 * @param sessionId - Identifier of the target session.
 * @param event - The event to apply.
 * @returns The next state, unchanged if the transition is invalid.
 */
function transitionSession(
  state: AppState,
  sessionId: string,
  event: SessionEvent,
): AppState {
  const session = state.sessions.find((item) => item.sessionId === sessionId)
  if (!session) {
    return state
  }
  const status = nextStatus(session.status, event)
  if (!status) {
    return state
  }
  const now = new Date().toISOString()
  const updated = applySessionEffects(state, session, status, event, now)
  return {
    ...state,
    sessions: state.sessions.map((item) =>
      item.sessionId === sessionId ? updated : item,
    ),
    subjects: updateSubjectStatusForSession(state, session.subjectId, status),
  }
}

/**
 * Compute the post-transition session record, including derived metrics.
 *
 * @param state - The current state.
 * @param session - The session being transitioned.
 * @param status - The resolved next status.
 * @param event - The event that caused the transition.
 * @param now - The current ISO timestamp.
 * @returns The updated session.
 */
function applySessionEffects(
  state: AppState,
  session: TaskSession,
  status: SessionStatus,
  event: SessionEvent,
  now: string,
): TaskSession {
  if (event === 'ACCEPT_TASK') {
    return { ...session, status, actualStartTime: now, lastPingAt: now }
  }
  if (event === 'END_SESSION') {
    const points = state.points.filter((point) => point.sessionId === session.sessionId)
    const coordinates = points.map(
      (point) => [point.latitude, point.longitude] as [number, number],
    )
    const distance = pathDistanceMeters(coordinates)
    const duration = session.actualStartTime
      ? (new Date(now).getTime() - new Date(session.actualStartTime).getTime()) / 1000
      : 0
    const stops = points.filter((point) => point.speedMps < 0.2).length
    const vibe = projectVibe(distance, duration, stops)
    return {
      ...session,
      status,
      actualEndTime: now,
      totalDistanceMeters: distance,
      currentVibeText: vibe.headline,
      statusCaptionText:
        session.statusCaptionText ||
        generateStatus({
          streetName: 'Maple Row',
          locationType: 'sidewalk',
          targetObject: 'delivery truck',
        }),
    }
  }
  return { ...session, status }
}

/**
 * Sync the subject's status with a session transition.
 *
 * @param state - The current state.
 * @param subjectId - The subject tied to the session.
 * @param status - The resolved session status.
 * @returns The updated subjects list.
 */
function updateSubjectStatusForSession(
  state: AppState,
  subjectId: string,
  status: SessionStatus,
): Subject[] {
  const nextSubjectStatus =
    status === 'IN_PROGRESS' || status === 'PAUSED' || status === 'STALLED'
      ? 'IN_SESSION'
      : 'ACTIVE'
  return state.subjects.map((subject) =>
    subject.subjectId === subjectId
      ? { ...subject, status: nextSubjectStatus }
      : subject,
  )
}

/**
 * Compute the increment of distance contributed by a new point.
 *
 * @param state - The current state.
 * @param sessionId - The session receiving the point.
 * @param point - The new point.
 * @returns The step distance in meters, or zero when no prior point exists.
 */
function stepDistance(
  state: AppState,
  sessionId: string,
  point: LocationPoint,
): number {
  const history = state.points.filter((item) => item.sessionId === sessionId)
  if (history.length === 0) {
    return 0
  }
  const previous = history[history.length - 1]
  return pathDistanceMeters([
    [previous.latitude, previous.longitude],
    [point.latitude, point.longitude],
  ])
}

/**
 * Load persisted state from `localStorage`, falling back to the seed.
 *
 * @returns The restored or freshly seeded state.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as AppState
    }
  } catch {
    // Corrupt payloads fall through to a fresh seed.
  }
  return createInitialState()
}

/**
 * Persist state to `localStorage`.
 *
 * @param state - The state to persist.
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable (private mode); the app stays in memory.
  }
}

/**
 * Return the points recorded for a session in chronological order.
 *
 * @param state - The current state.
 * @param sessionId - The session to query.
 * @returns The session's points.
 */
export function pointsForSession(
  state: AppState,
  sessionId: string,
): LocationPoint[] {
  return state.points
    .filter((point) => point.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    )
}

/**
 * Return the photos captured for a session in chronological order.
 *
 * @param state - The current state.
 * @param sessionId - The session to query.
 * @returns The session's photos.
 */
export function photosForSession(
  state: AppState,
  sessionId: string,
): PhotoArtifact[] {
  return state.photos
    .filter((photo) => photo.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    )
}

/**
 * Return the currently active session, if any.
 *
 * @param state - The current state.
 * @returns The active session or `null`.
 */
export function activeSession(state: AppState): TaskSession | null {
  return (
    state.sessions.find(
      (session) =>
        session.status === 'IN_PROGRESS' ||
        session.status === 'PAUSED' ||
        session.status === 'DISPATCHED',
    ) ?? null
  )
}
