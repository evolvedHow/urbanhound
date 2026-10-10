/**
 * Retro camera subsystem: 1960s color grading, film grain, light leaks, and the
 * analog prop catalog.
 */

import type { PropDefinition, PropPlacement, RetroFilter } from '../../types/domain'

/** Available color grading presets. */
export const FILTERS: RetroFilter[] = [
  { filterId: 'kodachrome', label: 'Kodachrome', saturation: 1.15, warmth: 0.28, contrast: 1.08 },
  { filterId: 'technicolor', label: 'Technicolor', saturation: 1.35, warmth: 0.2, contrast: 1.16 },
  { filterId: 'seventies_fade', label: 'Seventies Fade', saturation: 0.95, warmth: 0.35, contrast: 0.92 },
  { filterId: 'kodak_gold', label: 'Kodak Gold', saturation: 1.08, warmth: 0.32, contrast: 1.05 },
]

/** Available decorative props. */
export const PROPS: PropDefinition[] = [
  { propId: 'hat_detective', label: 'Detective Hat', category: 'Wearables' },
  { propId: 'sunglasses_retro', label: 'Retro Sunglasses', category: 'Wearables' },
  { propId: 'hat_party', label: 'Party Hat', category: 'Wearables' },
  { propId: 'crown', label: 'Crown', category: 'Wearables' },
  { propId: 'badge_stick_champion', label: 'Stick Champion', category: 'Badges' },
  { propId: 'badge_squirrel_inspector', label: 'Squirrel Inspector', category: 'Badges' },
  { propId: 'badge_professional_napper', label: 'Professional Napper', category: 'Badges' },
  { propId: 'badge_mud_magnet', label: 'Mud Magnet', category: 'Badges' },
]

/**
 * Build a CSS filter string for a preset, folding in the analog warmth.
 *
 * @param filter - The selected preset.
 * @returns A CSS `filter` value.
 */
export function filterCss(filter: RetroFilter): string {
  return [
    `saturate(${filter.saturation})`,
    `sepia(${filter.warmth})`,
    `contrast(${filter.contrast})`,
    'brightness(1.02)',
  ].join(' ')
}

/** A placement paired with its catalog definition. */
export interface ResolvedProp {
  placement: PropPlacement
  definition: PropDefinition | undefined
}

/**
 * Resolve stored placements against the catalog.
 *
 * @param placements - Placements stored with a photo.
 * @returns Each placement paired with its definition.
 */
export function resolveProps(placements: PropPlacement[]): ResolvedProp[] {
  return placements.map((placement) => ({
    placement,
    definition: PROPS.find((prop) => prop.propId === placement.propId),
  }))
}

/**
 * Render a source image or video frame through the retro pipeline onto a canvas.
 *
 * Applies the selected color grade, a randomized edge light leak, soft film
 * grain, and a subtle vignette, then returns a JPEG data URL.
 *
 * @param source - The image, video, or canvas to process.
 * @param filter - The selected color grading preset.
 * @param width - Output width in pixels.
 * @param height - Output height in pixels.
 * @returns A JPEG data URL of the processed frame.
 */
export function renderRetroImage(
  source: CanvasImageSource,
  filter: RetroFilter,
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return ''
  }

  context.filter = filterCss(filter)
  context.drawImage(source, 0, 0, width, height)
  context.filter = 'none'

  const leak = context.createRadialGradient(
    width * (0.7 + Math.random() * 0.3),
    height * 0.2,
    0,
    width * 0.8,
    height * 0.3,
    width * 0.9,
  )
  leak.addColorStop(0, 'rgba(255, 176, 92, 0.42)')
  leak.addColorStop(1, 'rgba(255, 176, 92, 0)')
  context.fillStyle = leak
  context.fillRect(0, 0, width, height)

  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.35,
    width / 2,
    height / 2,
    width * 0.75,
  )
  vignette.addColorStop(0, 'rgba(58, 40, 20, 0)')
  vignette.addColorStop(1, 'rgba(58, 40, 20, 0.4)')
  context.fillStyle = vignette
  context.fillRect(0, 0, width, height)

  return applyGrain(context, width, height)
}

/**
 * Overlay restrained film grain and return the canvas as a JPEG data URL.
 *
 * @param context - The target 2D context.
 * @param width - Canvas width in pixels.
 * @param height - Canvas height in pixels.
 * @returns A JPEG data URL with grain applied.
 */
function applyGrain(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): string {
  const image = context.getImageData(0, 0, width, height)
  const data = image.data
  for (let index = 0; index < data.length; index += 4) {
    const noise = (Math.random() - 0.5) * 18
    data[index] = clampByte(data[index] + noise)
    data[index + 1] = clampByte(data[index + 1] + noise)
    data[index + 2] = clampByte(data[index + 2] + noise)
  }
  context.putImageData(image, 0, 0)
  return context.canvas.toDataURL('image/jpeg', 0.88)
}

/**
 * Clamp a channel value into a valid byte range.
 *
 * @param value - The channel value to clamp.
 * @returns An integer in `[0, 255]`.
 */
function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}
