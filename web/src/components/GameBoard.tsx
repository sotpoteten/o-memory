import type { Card } from '../api'
import { formatTime, useMemoryGame } from '../game/useMemoryGame'
import { isFinished } from '../game/memoryGame'
import { MemoryCard } from './MemoryCard'
import { ResultDialog } from './ResultDialog'

interface Props {
  cards: Card[]
  pairs: number
  onRestart: () => void
  onQuit: () => void
}

export function GameBoard({ cards, pairs, onRestart, onQuit }: Props) {
  const { state, flip, elapsedMs } = useMemoryGame(cards)

  return (
    <section className="game">
      <div className="scorebar" aria-live="polite">
        <span>Trekk: <strong>{state.moves}</strong></span>
        <span>Tid: <strong>{formatTime(elapsedMs)}</strong></span>
        <span>Par: <strong>{state.matched.length}/{pairs}</strong></span>
        <span className="scorebar-actions">
          <button type="button" className="secondary" onClick={onRestart}>Nytt spill</button>
          <button type="button" className="secondary" onClick={onQuit}>Avslutt</button>
        </span>
      </div>

      <div className={`board board-${pairs}`}>
        {state.cards.map(card => (
          <MemoryCard
            key={card.id}
            card={card}
            faceUp={state.flipped.includes(card.id) || state.matched.includes(card.pairId)}
            matched={state.matched.includes(card.pairId)}
            onFlip={() => flip(card.id)}
          />
        ))}
      </div>

      {isFinished(state) && (
        <ResultDialog pairs={pairs} moves={state.moves} timeMs={elapsedMs} onPlayAgain={onRestart} onQuit={onQuit} />
      )}
    </section>
  )
}
