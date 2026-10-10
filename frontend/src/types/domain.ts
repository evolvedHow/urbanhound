/**
 * Client-side domain model for Urban Hound.
 *
 * These types mirror the backend Pydantic schemas so data can move between the
 * local-first store and the FastAPI service without translation.
 */

/** Role granted to a user of the platform. */
export type UserRole = 'GUEST' | 'CLIENT' | 'FIELD_AGENT' | 'ADMIN'

/** Lifecycle state of a walk subject. */
export type SubjectStatus = 'ACTIVE' | 'IN_SESSION' | 'MISSING' | 'ARCHIVED'

/** Semantic classification of a geofence zone. */
export type ZoneType = 'SAFE_ZONE' | 'WARNING_ZONE' | 'RESTRICTED_ZONE'

/** Supported geofence geometry primitives. */
export type GeometryType = 'RADIAL' | 'POLYGON'

/** State of a field walk session. */
export type SessionStatus =
  | 'SCHEDULED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'STALLED'
  | 'COMPLETED'
  | 'CANCELLED'

/** Resolution state of an emergency incident. */
export type IncidentStatus = 'OPEN' | 'RESOLVED' | 'CANCELLED'

/** Trust level of a community sighting. */
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED_POSITIVE' | 'REJECTED'

/** Shareable analog artifact rendered from a session. */
export type ArtifactType = 'POSTCARD_MMS' | 'STOP_MOTION_GIF'

/** Geofence evaluation result. */
export type GeofenceStatus = 'OK' | 'WARNING' | 'BREACH'

/** Events that drive the session finite state machine. */
export type SessionEvent =
  | 'DISPATCH_TASK'
  | 'ACCEPT_TASK'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'END_SESSION'
  | 'CANCEL_TASK'
  | 'FORCE_CANCEL'
  | 'TELEMETRY_TIMEOUT'

/** A coordinate pair as `[latitude, longitude]`. */
export type Coord = [number, number]

/** An account-scoped identity. */
export interface User {
  userId: string
  email: string
  phoneNumber: string
  displayName: string
  role: UserRole
  defaultBroadcastRadiusMeters: number
}

/** A dog whose walks and media are tracked. */
export interface Subject {
  subjectId: string
  ownerId: string
  name: string
  breedOrMix: string
  status: SubjectStatus
  identifyingMarks: string
  favoriteTreatsNotes: string
  createdAt: string
}

/** A geofence with a configured exit grace period. */
export interface GeofenceZone {
  zoneId: string
  ownerId: string
  subjectId: string | null
  name: string
  zoneType: ZoneType
  geometryType: GeometryType
  centerLatitude: number
  centerLongitude: number
  radiusMeters: number
  gracePeriodSeconds: number
  isEnabled: boolean
}

/** A single accepted GPS fix. */
export interface LocationPoint {
  pointId: string
  sessionId: string
  latitude: number
  longitude: number
  accuracyRadiusMeters: number
  speedMps: number
  headingDegrees: number
  batteryLevelPct: number
  recordedAt: string
}

/** A scheduled or active walk. */
export interface TaskSession {
  sessionId: string
  subjectId: string
  agentId: string | null
  status: SessionStatus
  scheduledStartTime: string
  actualStartTime: string | null
  actualEndTime: string | null
  totalDistanceMeters: number
  currentVibeText: string
  statusCaptionText: string
  lastPingAt: string | null
}

/** Placement of a decorative prop over a photo. */
export interface PropPlacement {
  propId: string
  offsetXPct: number
  offsetYPct: number
  scale: number
  rotationDeg: number
}

/** A retro-processed photo pinned to a location. */
export interface PhotoArtifact {
  photoId: string
  sessionId: string
  latitude: number
  longitude: number
  retroImageUrl: string
  appliedProps: PropPlacement[]
  captionText: string
  capturedAt: string
}

/** An emergency broadcast for a missing subject. */
export interface IncidentReport {
  incidentId: string
  subjectId: string
  reporterId: string
  status: IncidentStatus
  lastKnownLatitude: number
  lastKnownLongitude: number
  searchRadiusMeters: number
  description: string
  triggeredAt: string
  notifiedCount: number
}

/** A community-submitted sighting linked to an incident. */
export interface SightingReport {
  sightingId: string
  incidentId: string
  submitterId: string | null
  latitude: number
  longitude: number
  retroImageUrl: string | null
  notes: string
  verificationStatus: VerificationStatus
  sightedAt: string
}

/** Projected vibe for a walk. */
export interface VibeProjection {
  headline: string
  energyPct: number
  couchPct: number
  tags: string[]
}

/** A rendered trail coordinate. */
export interface TrailPoint {
  latitude: number
  longitude: number
  recordedAt: string
  hasPhoto: boolean
}

/** A retro filter preset. */
export interface RetroFilter {
  filterId: string
  label: string
  saturation: number
  warmth: number
  contrast: number
}

/** A decorative prop definition. */
export interface PropDefinition {
  propId: string
  label: string
  category: 'Wearables' | 'Badges' | 'Captions'
}
