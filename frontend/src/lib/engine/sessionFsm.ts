/**
 * TaskSession finite state machine, mirroring the backend transition table.
 */

import type { SessionEvent, SessionStatus } from '../../types/domain'

/** Allowed state transitions keyed by `[fromState, event]`. */
const TRANSITIONS: Record<string, SessionStatus> = {
  'SCHEDULED:DISPATCH_TASK': 'DISPATCHED',
  'DISPATCHED:ACCEPT_TASK': 'IN_PROGRESS',
  'IN_PROGRESS:PAUSE_SESSION': 'PAUSED',
  'PAUSED:RESUME_SESSION': 'IN_PROGRESS',
  'IN_PROGRESS:TELEMETRY_TIMEOUT': 'STALLED',
  'IN_PROGRESS:END_SESSION': 'COMPLETED',
  'PAUSED:END_SESSION': 'COMPLETED',
  'STALLED:END_SESSION': 'COMPLETED',
  'SCHEDULED:CANCEL_TASK': 'CANCELLED',
  'DISPATCHED:CANCEL_TASK': 'CANCELLED',
  'IN_PROGRESS:FORCE_CANCEL': 'CANCELLED',
  'PAUSED:FORCE_CANCEL': 'CANCELLED',
  'STALLED:FORCE_CANCEL': 'CANCELLED',
}

/**
 * Resolve the next session state for an event.
 *
 * @param current - The session's current state.
 * @param event - The event to apply.
 * @returns The resulting state, or `null` when the transition is invalid.
 */
export function nextStatus(
  current: SessionStatus,
  event: SessionEvent,
): SessionStatus | null {
  return TRANSITIONS[`${current}:${event}`] ?? null
}
