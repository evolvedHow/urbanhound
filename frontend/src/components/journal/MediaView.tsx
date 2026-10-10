/**
 * Renders a journal photo or short video loaded from IndexedDB.
 */

import type { ReactNode } from 'react'
import { useMediaUrl } from '../../lib/hooks/useMediaUrl'
import type { JournalMedia } from '../../types/domain'

/** Props accepted by {@link MediaView}. */
export interface MediaViewProps {
  media: JournalMedia
  className?: string
}

/**
 * Render a single piece of journal media.
 *
 * @param props - The media props.
 * @returns The rendered image or video, or a quiet placeholder while loading.
 */
export function MediaView({ media, className = '' }: MediaViewProps): ReactNode {
  const url = useMediaUrl(media.mediaId)

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-paper-deep/60 text-[0.6rem] text-ink-faint ${className}`.trim()}
      >
        <span className="typewriter uppercase tracking-[0.14em]">developing…</span>
      </div>
    )
  }

  if (media.kind === 'VIDEO') {
    return (
      <video
        src={url}
        controls
        playsInline
        className={`h-full w-full rounded-[2px] bg-ink/90 object-cover ${className}`.trim()}
      />
    )
  }

  return (
    <img
      src={url}
      alt={media.caption || 'Journal photo'}
      className={`h-full w-full rounded-[2px] object-cover ${className}`.trim()}
    />
  )
}
