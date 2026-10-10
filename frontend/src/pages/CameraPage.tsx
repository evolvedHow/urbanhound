/**
 * Retro camera: live viewfinder, color grade, props, captions, and capture.
 *
 * To stay fully offline and functional on any device, the viewfinder renders
 * into a `<canvas>`: from the device camera when permission is granted, and
 * from a gently animated parchment scene otherwise.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/ui/Chip'
import { PropGlyph } from '../components/ui/PropGlyph'
import { useApp } from '../lib/context'
import { generateStatus } from '../lib/engine/humor'
import { FILTERS, PROPS, renderRetroImage } from '../lib/engine/retro'
import { useNow } from '../lib/hooks/useNow'
import { uuid } from '../lib/id'
import { activeSession, pointsForSession } from '../lib/store'
import type { PropPlacement } from '../types/domain'

const OUT_WIDTH = 720
const OUT_HEIGHT = 540

/**
 * Render the retro camera page.
 *
 * @returns The rendered page.
 */
export function CameraPage(): ReactNode {
  const { state, dispatch } = useApp()
  const active = activeSession(state)
  const points = active ? pointsForSession(state, active.sessionId) : []
  const anchor = points.length > 0 ? points[points.length - 1] : null
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)

  const [filterId, setFilterId] = useState(state.settings.retroFilterId)
  const [props, setProps] = useState<PropPlacement[]>([])
  const [caption, setCaption] = useState('')
  const [savedPhotoId, setSavedPhotoId] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const now = useNow(1000)
  const filter = FILTERS.find((item) => item.filterId === filterId) ?? FILTERS[0]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let stop = false
    if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then((stream) => {
          if (stop) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }
          streamRef.current = stream
          const video = document.createElement('video')
          video.playsInline = true
          video.srcObject = stream
          void video.play()

          const tick = (): void => {
            if (stop) {
              return
            }
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
              context.drawImage(video, 0, 0, OUT_WIDTH, OUT_HEIGHT)
            }
            frameRef.current = requestAnimationFrame(tick)
          }
          tick()
        })
        .catch(() => {
          setCameraError('No camera found — the demo darkroom steps in.')
          renderScene(context, Date.now())
          const drift = (): void => {
            if (stop) {
              return
            }
            renderScene(context, Date.now())
            frameRef.current = requestAnimationFrame(drift)
          }
          drift()
        })
      return () => {
        stop = true
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current)
        }
        streamRef.current?.getTracks().forEach((track) => track.stop())
      }
    }

    renderScene(context, Date.now())
    const drift = (): void => {
      if (stop) {
        return
      }
      renderScene(context, Date.now())
      frameRef.current = requestAnimationFrame(drift)
    }
    drift()
    return () => {
      stop = true
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const capture = (): void => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const url = renderRetroImage(canvas, filter, OUT_WIDTH, OUT_HEIGHT)
    const resolvedCaption = caption.trim() || `A quiet record of ${anchor ? 'the walk' : 'an ordinary afternoon'}.`
    const sessionId = active?.sessionId ?? ''
    const placement: PropPlacement = props[0] ?? { propId: '', offsetXPct: 50, offsetYPct: 45, scale: 1, rotationDeg: 0 }
    const photo = {
      photoId: uuid(),
      sessionId,
      latitude: anchor?.latitude ?? 40.7359,
      longitude: anchor?.longitude ?? -73.9911,
      retroImageUrl: url,
      appliedProps: props.length > 0 ? props : placement.propId ? [placement] : [],
      captionText: resolvedCaption,
      capturedAt: new Date().toISOString(),
    }
    dispatch({ type: 'addPhoto', photo })
    setSavedPhotoId(photo.photoId)
  }

  const addProp = (propId: string): void => {
    setProps((current) => [
      ...current,
      {
        propId,
        offsetXPct: 50,
        offsetYPct: 45,
        scale: 0.9 + Math.random() * 0.3,
        rotationDeg: (Math.random() - 0.5) * 10,
      },
    ])
  }

  return (
    <div className="anim-rise space-y-4">
      <header>
        <p className="typewriter text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">Retro kit</p>
        <h1 className="font-display text-2xl text-ink">Field camera</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {active ? `Pinning to ${state.subjects.find((s) => s.subjectId === active.subjectId)?.name ?? 'the walk'} · ${anchor ? 'walk' : 'park'}` : 'Unpinned still — pin it to a walk next time.'}
        </p>
        <div className="rule-ink mt-3" />
      </header>

      {savedPhotoId && (
        <section className="rounded-card border border-sage/50 bg-sage/10 p-3 text-sm text-sage" role="status">
          Frame developed and pinned to the scrapbook.{' '}
          <Link to="/scrapbook" className="underline underline-offset-2">
            View it →
          </Link>
        </section>
      )}

      {cameraError && <Chip tone="warn">{cameraError}</Chip>}

      <section className="relative">
        <div className="polaroid p-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-paper-deep">
            <canvas ref={canvasRef} width={OUT_WIDTH} height={OUT_HEIGHT} className="h-full w-full object-cover" />
            {props.map((placement) => (
              <div
                key={`${placement.propId}-${placement.offsetXPct}-${placement.offsetYPct}`}
                className="pointer-events-none absolute"
                style={{
                  left: `${placement.offsetXPct}%`,
                  top: `${placement.offsetYPct}%`,
                  width: '34%',
                  transform: `translate(-50%, -50%) rotate(${placement.rotationDeg}deg)`,
                }}
              >
                <PropGlyph propId={placement.propId} className="h-auto w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              </div>
            ))}
            <div className="typewriter absolute bottom-2 left-3 text-[0.58rem] uppercase tracking-[0.18em] text-paper/85">
              {filter.label}
            </div>
            <div className="typewriter absolute right-3 top-2 text-[0.58rem] text-paper/75">
              {new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </section>

      <section className="card-paper space-y-3 p-4">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Film stock</p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.filterId}
              type="button"
              onClick={() => setFilterId(item.filterId)}
              className={`chip cursor-pointer ${filterId === item.filterId ? 'border-brick/60 bg-brick/10 text-brick' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Props</p>
        <div className="grid grid-cols-5 gap-2">
          {PROPS.map((prop) => (
            <button
              key={prop.propId}
              type="button"
              className="col-span-1 flex min-h-16 flex-col items-center gap-1 rounded-xl border border-ink/10 p-1.5 text-[0.56rem] text-ink-soft transition-colors hover:border-sepia"
              onClick={() => addProp(prop.propId)}
              disabled={props.some((item) => item.propId === prop.propId)}
            >
              <PropGlyph propId={prop.propId} className="h-8 w-8" />
              <span className="text-center leading-tight">{prop.label}</span>
            </button>
          ))}
        </div>
        {props.length > 0 && (
          <button type="button" className="typewriter text-xs text-ink-faint underline underline-offset-2" onClick={() => setProps([])}>
            Clear props
          </button>
        )}
        <label className="block">
          <span className="mb-1 block text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink-soft">Caption</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="A label-maker thought…"
              className="typewriter w-full rounded-xl border border-ink/15 bg-paper px-3 py-3 text-sm text-ink placeholder:text-ink-faint/70"
            />
            <button
              type="button"
              className="btn btn-ghost flex-none px-3"
              aria-label="Random caption"
              onClick={() => setCaption(generateStatus())}
            >
              ↻
            </button>
          </div>
        </label>
        <button type="button" className="btn btn-primary w-full" onClick={capture}>
          Develop frame
        </button>
      </section>

      <p className="typewriter text-center text-[0.62rem] text-ink-faint">
        {active ? 'Attached to the active walk.' : 'Free frame — optionally attach to a walk.'}
      </p>
    </div>
  )
}

/**
 * Paint a synthetic still-life scene onto the viewfinder canvas.
 *
 * Used when the device camera is unavailable, so the demo still feels alive.
 *
 * @param context - The canvas context.
 * @param now - The current epoch milliseconds, used for gentle drift.
 */
function renderScene(context: CanvasRenderingContext2D, now: number): void {
  const width = OUT_WIDTH
  const height = OUT_HEIGHT
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#e6d4ac')
  gradient.addColorStop(0.6, '#cfb98d')
  gradient.addColorStop(1, '#a9885c')
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)

  const sunX = width * 0.78 + Math.sin(now / 4000) * 12
  context.fillStyle = 'rgba(252, 236, 188, 0.75)'
  context.beginPath()
  context.arc(sunX, height * 0.22, 42, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = 'rgba(139, 108, 74, 0.55)'
  context.beginPath()
  context.ellipse(width * 0.5, height * 0.88, width * 0.72, height * 0.22, 0, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = '#3f5b54'
  context.beginPath()
  context.moveTo(width * 0.2, height * 0.62)
  context.lineTo(width * 0.34, height * 0.5)
  context.lineTo(width * 0.42, height * 0.62)
  context.closePath()
  context.fill()

  context.fillStyle = 'rgba(43, 38, 32, 0.85)'
  context.beginPath()
  context.ellipse(width * 0.62, height * 0.56, 40, 26, 0, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.ellipse(width * 0.62, height * 0.52, 22, 14, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f4ecdd'
  context.beginPath()
  context.arc(width * 0.57, height * 0.5, 3.5, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(width * 0.67, height * 0.5, 3.5, 0, Math.PI * 2)
  context.fill()
}