import type { Card } from '../api'

/** The game starts anyway after this long, so a slow or missing image never blocks it. */
const MAX_WAIT_MS = 5000

/**
 * Downloads and decodes every image the game will show, so a card shows its picture the moment it is turned
 * instead of loading it then. Failed images are ignored (the card shows its alt text).
 */
export function preloadImages(cards: readonly Card[]): Promise<void> {
  const urls = new Set(cards.flatMap(c => (c.details ? [c.imageUrl, c.details.mapImageUrl] : [c.imageUrl])))
  const loaded = Promise.all(
    [...urls].map(url => {
      const image = new Image()
      image.src = url
      return image.decode().catch(() => undefined)
    }),
  )
  return Promise.race([loaded.then(() => undefined), new Promise<void>(resolve => setTimeout(resolve, MAX_WAIT_MS))])
}
