/**
 * React context wiring for the local-first store.
 */

import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { AppAction, AppState } from './store'

/** The value exposed by the application provider. */
export interface AppContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
}

/** Context holding the application store; `null` until provided. */
export const AppContext = createContext<AppContextValue | null>(null)

/**
 * Access the application store from any descendant component.
 *
 * @returns The current state and dispatch function.
 * @throws When used outside of an `AppProvider`.
 */
export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return value
}
