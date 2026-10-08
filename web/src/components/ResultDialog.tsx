import { formatTime } from '../game/useMemoryGame'
import type { SaveStatus } from '../game/useSaveResult'
import { HighScoreList } from './HighScoreList'

interface Props {
  pairs: number
  moves: number
  timeMs: number
  saveStatus: SaveStatus
  onRetrySave: () => void
  onPlayAgain: () => void
  onReview: () => void
  onQuit: () => void
}

export function ResultDialog({ pairs, moves, timeMs, saveStatus, onRetrySave, onPlayAgain, onReview, onQuit }: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">Alle par funnet!</h2>
        <p className="result-stats">
          <strong>{moves}</strong> trekk på <strong>{formatTime(timeMs)}</strong>
        </p>

        <div aria-live="polite">
          {saveStatus.state === 'saving' && <p className="muted">Lagrer resultatet…</p>}
          {saveStatus.state === 'saved' && <HighScoreList pairs={pairs} highlightId={saveStatus.id} />}
          {saveStatus.state === 'error' && (
            <p className="error">
              Kunne ikke lagre resultatet.{' '}
              <button type="button" className="link" onClick={onRetrySave}>Prøv igjen</button>
            </p>
          )}
        </div>

        <div className="row dialog-actions">
          <button type="button" onClick={onPlayAgain}>Spill igjen</button>
          <button type="button" className="secondary" onClick={onReview}>Se på brettet</button>
          <button type="button" className="secondary" onClick={onQuit}>Til start</button>
        </div>
      </div>
    </div>
  )
}
