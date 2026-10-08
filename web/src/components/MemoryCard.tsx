import type { Card } from '../api'

interface Props {
  card: Card
  faceUp: boolean
  matched: boolean
  onFlip: () => void
}

export function MemoryCard({ card, faceUp, matched, onFlip }: Props) {
  const label = faceUp
    ? `${card.kind === 'symbol' ? 'Karttegn' : 'Foto'}${matched ? `: ${card.symbolId} ${card.symbolName}` : ''}`
    : 'Skjult kort'

  return (
    <div className="card-slot">
      <button
        type="button"
        className={`card ${faceUp ? 'is-face-up' : ''} ${matched ? 'is-matched' : ''}`}
        onClick={onFlip}
        disabled={faceUp}
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
