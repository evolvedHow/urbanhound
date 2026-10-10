/**
 * Route table for the Urban Hound PWA.
 *
 * Hash routing is used so the app can be served from GitHub Pages without a
 * server-side SPA fallback.
 */

import type { ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AlertsPage } from './pages/AlertsPage'
import { CameraPage } from './pages/CameraPage'
import { HomePage } from './pages/HomePage'
import { ScrapbookPage } from './pages/ScrapbookPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubjectDetailPage } from './pages/SubjectDetailPage'
import { SubjectsPage } from './pages/SubjectsPage'
import { WalkPage } from './pages/WalkPage'

/**
 * Root application component with the route hierarchy.
 *
 * @returns The rendered application.
 */
export default function App(): ReactNode {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="hounds" element={<SubjectsPage />} />
          <Route path="hounds/:subjectId" element={<SubjectDetailPage />} />
          <Route path="walk" element={<WalkPage />} />
          <Route path="scrapbook" element={<ScrapbookPage />} />
          <Route path="camera" element={<CameraPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<FallsThrough />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

/**
 * Fallback shown for unknown routes.
 *
 * @returns The rendered fallback.
 */
function FallsThrough(): ReactNode {
  return (
    <div className="card-paper p-8 text-center">
      <p className="font-display text-lg text-ink">This path is not on the map.</p>
      <p className="typewriter mt-2 text-sm text-ink-faint">404 — even the hounds are elsewhere.</p>
    </div>
  )
}