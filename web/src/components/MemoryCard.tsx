import { useLayoutEffect, useRef } from 'react'
import type { Card } from '../api'

interface Props {
  card: Card
  faceUp: boolean
  matched: boolean
  zoomed: boolean
  /** Whether clicking does something (turn, enlarge or shrink the card). */
  interactive: boolean
  onClick: () => void
}

export function MemoryCard({ card, faceUp, matched, zoomed, interactive, onClick }: Props) {
  const slotRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const slot = slotRef.current
    const button = cardRef.current
    if (!slot || !button) return
    if (!zoomed) {
      button.style.transform = ''
      return
    }
    const update = () => { button.style.transform = zoomTransform(slot, button) }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [zoomed])

  const label = faceUp
    ? `${card.kind === 'symbol' ? 'Karttegn' : 'Foto'}${matched ? `: ${card.symbolId} ${card.symbolName}` : ''}${zoomed ? ' (klikk for å forminske)' : faceUp && interactive ? ' (klikk for å forstørre)' : ''}`
    : 'Skjult kort'

  return (
    <div className="card-slot" ref={slotRef}>
      <button
        ref={cardRef}
        type="button"
        className={`card ${faceUp ? 'is-face-up' : ''} ${matched ? 'is-matched' : ''} ${zoomed ? 'is-zoomed' : ''}`}
        onClick={onClick}
        disabled={!interactive}
        aria-label={label}
      >
        <span className="card-inner">
          <span className="card-back" aria-hidden="true" />
          <span className={`card-front card-front-${card.kind}`}>
            <img src={card.imageUrl} alt={card.kind === 'photo' ? (card.alt ?? '') : ''} draggable={false} />
          </span>
        </span>
      </button>
      <span className="card-caption">{matched ? `${card.symbolId} ${card.symbolName}` : ' '}</span>
    </div>
  )
}

const MAX_ZOOM = 3
const MAX_ZOOMED_SIZE_PX = 380
const VIEWPORT_MARGIN_PX = 8

/**
 * Scales the card up around its centre, then shifts it so the enlarged card stays inside the viewport.
 * Measures the slot (never transformed) and the button's layout size (unaffected by transforms).
 */
function zoomTransform(slot: HTMLElement, button: HTMLElement) {
  const { left, top } = slot.getBoundingClientRect()
  const size = button.offsetWidth
  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight

  const target = Math.min(MAX_ZOOMED_SIZE_PX, vw * 0.75, vh * 0.6)
  const scale = Math.max(1, Math.min(MAX_ZOOM, target / size))
  const zoomedSize = size * scale

  const shift = (start: number, viewport: number) => {
    const zoomedStart = start + size / 2 - zoomedSize / 2
    const max = Math.max(VIEWPORT_MARGIN_PX, viewport - VIEWPORT_MARGIN_PX - zoomedSize)
    return Math.min(Math.max(zoomedStart, VIEWPORT_MARGIN_PX), max) - zoomedStart
  }

  return `translate(${shift(left, vw)}px, ${shift(top, vh)}px) scale(${scale})`
}
