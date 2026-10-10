/**
 * Resolve a stored journal media blob to a displayable object URL.
 */

import { useEffect, useState } from 'react'
import { loadMedia } from '../media'

/**
 * Load a media blob from IndexedDB and expose it as an object URL.
 *
 * The URL is created when the blob resolves and revoked when the component
 * unmounts or the `mediaId` changes, so blobs are never leaked.
 *
 * @param mediaId - Identifier of the stored media.
 * @returns The object URL, or `null` while loading or when absent.
 */
export function useMediaUrl(mediaId: string): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    loadMedia(mediaId)
      .then((blob) => {
        if (cancelled || !blob) {
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setUrl(null)
    }
  }, [mediaId])

  return url
}
