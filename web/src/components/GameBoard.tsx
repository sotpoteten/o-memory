import { useMemo } from 'react'
import type { Card } from '../api'
import { displayName } from '../playerName'
import { useSaveResult } from '../game/useSaveResult'
import { formatTime, useMemoryGame } from '../game/useMemoryGame'
import { isFinished, isLocked } from '../game/memoryGame'
import { MemoryCard } from './MemoryCard'
import { ResultDialog } from './ResultDialog'

interface Props {
  cards: Card[]
  pairs: number
  playerName: string
  onRestart: () => void
  onQuit: () => void
}

export function GameBoard({ cards, pairs, playerName, onRestart, onQuit }: Props) {
  const { state, flip, unzoom, review, toggleZoom, elapsedMs } = useMemoryGame(cards)

  const finished = isFinished(state)
  // Moves and time are frozen once the game is finished, so this is created once.
  const finalTimeMs = finished ? state.finishedAt! - state.startedAt! : 0
  const score = useMemo(
    () => (finished ? { name: displayName(playerName), pairs, moves: state.moves, timeMs: finalTimeMs } : null),
    [finished, playerName, pairs, state.moves, finalTimeMs],
  )
  const { status: saveStatus, retry: retrySave } = useSaveResult(score)

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

      {state.reviewing && <p className="muted center review-hint">Klikk på et kort for å forstørre det.</p>}

      <div className={`board board-${pairs} ${state.reviewing ? 'is-reviewing' : ''}`}>
        {state.cards.map(card => {
          const faceUp = state.flipped.includes(card.id) || state.matched.includes(card.pairId)
          const zoomed = state.zoomed.includes(card.id)
          return (
            <MemoryCard
              key={card.id}
              card={card}
              faceUp={faceUp}
              matched={state.matched.includes(card.pairId)}
              zoomed={zoomed}
              interactive={state.reviewing || (!isLocked(state) && (zoomed || !faceUp))}
              onClick={() => {
                if (state.reviewing) toggleZoom(card.id)
                else if (zoomed) unzoom(card.id)
                else flip(card.id)
              }}
            />
          )
        })}
      </div>

      {finished && saveStatus && !state.reviewing && (
        <ResultDialog
          pairs={pairs}
          moves={state.moves}
          timeMs={elapsedMs}
          saveStatus={saveStatus}
          onRetrySave={retrySave}
          onPlayAgain={onRestart}
          onReview={review}
          onQuit={onQuit}
        />
      )}
    </section>
  )
}
