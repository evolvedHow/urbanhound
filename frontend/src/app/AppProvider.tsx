/**
 * Application provider that owns the reducer and persistence lifecycle.
 */

import { useEffect, useReducer } from 'react'
import type { ReactNode } from 'react'
import { AppContext } from '../lib/context'
import { appReducer, loadState, saveState } from '../lib/store'

/** Props accepted by {@link AppProvider}. */
interface AppProviderProps {
  children: ReactNode
}

/**
 * Provide the Urban Hound store to the component tree.
 *
 * State is hydrated from `localStorage` on mount and written back on every
 * change, keeping the PWA usable while fully offline.
 *
 * @param props - The provider props.
 * @returns The context provider wrapping the children.
 */
export function AppProvider({ children }: AppProviderProps): ReactNode {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}
