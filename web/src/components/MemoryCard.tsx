import type { CSSProperties } from 'react'
import type { Card } from '../api'
import { useI18n } from '../i18n/context'
import { symbolName } from '../i18n/language'

interface Props {
  card: Card
  faceUp: boolean
  matched: boolean
  zoomed: boolean
  /** Position among the enlarged cards (0 = opened first); later cards are drawn on top. */
  zoomOrder: number
  /** Whether clicking does something (turn, enlarge or shrink the card). */
  interactive: boolean
  onClick: () => void
}

/**
 * One card. Its zoom transform is set by GameBoard (which places all enlarged cards together so they never
 * overlap); the card only marks itself with data-card-id so the board can find it.
 */
export function MemoryCard({ card, faceUp, matched, zoomed, zoomOrder, interactive, onClick }: Props) {
  const { t, language } = useI18n()

  const title = symbolName(card.symbolNames, language)
  const hint = zoomed ? t.card.clickToShrink : interactive ? t.card.clickToEnlarge : ''
  const label = faceUp
    ? [`${t.card[card.kind]}${matched ? `: ${title}` : ''}`, hint].filter(Boolean).join(' ')
    : t.card.hidden

  return (
    <div className="card-slot" data-card-id={card.id}>
      <button
        type="button"
        style={zoomed ? ({ '--zoom-order': zoomOrder } as CSSProperties) : undefined}
        className={`card ${faceUp ? 'is-face-up' : ''} ${matched ? 'is-matched' : ''} ${zoomed ? 'is-zoomed' : ''}`}
        onClick={onClick}
        disabled={!interactive}
        aria-label={label}
      >
        <span className="card-inner">
          <span className="card-back" aria-hidden="true" />
          <span className={`card-front card-front-${card.kind}`}>
            <img
              src={card.imageUrl}
              alt={card.kind === 'photo' ? (card.alt ?? '') : t.card[card.kind]}
              draggable={false}
            />
          </span>
        </span>
      </button>
      <span className="card-caption">{matched ? title : ' '}</span>
    </div>
  )
}

