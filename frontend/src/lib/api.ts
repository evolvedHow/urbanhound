/**
 * Optional FastAPI client.
 *
 * Urban Hound is local-first: every feature works from the persisted store.
 * When `VITE_API_BASE` is configured, this client can additionally reach the
 * companion FastAPI service for health checks and artifact export.
 */

import type { PhotoArtifact, TaskSession } from '../types/domain'

const RAW_BASE = import.meta.env.VITE_API_BASE as string | undefined

/** Normalized API base URL, or an empty string when sync is disabled. */
export const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : ''

/**
 * Report whether a backend is configured for this build.
 *
 * @returns `true` when `VITE_API_BASE` is set.
 */
export function isApiEnabled(): boolean {
  return API_BASE.length > 0
}

/**
 * Perform a typed JSON request against the API.
 *
 * @param path - Path beginning with a slash, relative to the API base.
 * @param init - Optional fetch configuration.
 * @returns The parsed JSON response.
 * @throws When the API is disabled or the response is not successful.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isApiEnabled()) {
    throw new Error('Backend sync is not configured for this build')
  }
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

/** Backend health payload. */
export interface HealthStatus {
  status: string
  service?: string
  version?: string
}

/**
 * Query the backend health endpoint.
 *
 * @returns The parsed health payload.
 * @throws When the API is disabled or unreachable.
 */
export function checkHealth(): Promise<HealthStatus> {
  return request<HealthStatus>('/health')
}

/** Payload bundling a session with the media to sync. */
export interface SessionSyncPayload {
  session: TaskSession
  photos: PhotoArtifact[]
}

/**
 * Attempt to sync a completed session to the backend.
 *
 * The request is best-effort: failures are surfaced to the caller so the UI can
 * report that local data remains authoritative.
 *
 * @param payload - The session and photos to sync.
 * @returns A summary of the sync attempt.
 */
export async function syncSession(
  payload: SessionSyncPayload,
): Promise<{ synced: boolean; detail: string }> {
  if (!isApiEnabled()) {
    return { synced: false, detail: 'Local only — no backend configured.' }
  }
  try {
    await request<{ sessionId: string }>('/api/v1/export/artifact', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return { synced: true, detail: 'Session synced to the archive.' }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown sync error'
    return { synced: false, detail }
  }
}
