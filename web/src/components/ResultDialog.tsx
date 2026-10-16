import type { GameMode } from '../api'
import { formatTime } from '../game/useMemoryGame'
import { useI18n } from '../i18n/context'
import type { SaveStatus } from '../game/useSaveResult'
import { HighScoreList } from './HighScoreList'

interface Props {
  mode: GameMode
  pairs: number
  moves: number
  timeMs: number
  saveStatus: SaveStatus
  onRetrySave: () => void
  onPlayAgain: () => void
  onReview: () => void
  onQuit: () => void
}

export function ResultDialog({ mode, pairs, moves, timeMs, saveStatus, onRetrySave, onPlayAgain, onReview, onQuit }: Props) {
  const { t } = useI18n()
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{t.result.title}</h2>
        <dl className="result-stats">
          <div>
            <dt>{t.game.time}</dt>
            <dd>{formatTime(timeMs)}</dd>
          </div>
          <div>
            <dt>{t.game.moves}</dt>
            <dd>{moves}</dd>
          </div>
        </dl>

        <div aria-live="polite">
          {saveStatus.state === 'saving' && <p className="muted">{t.result.saving}</p>}
          {saveStatus.state === 'saved' && <HighScoreList mode={mode} pairs={pairs} highlightId={saveStatus.id} />}
          {saveStatus.state === 'error' && (
            <p className="error">
              {t.result.saveError}{' '}
              <button type="button" className="link" onClick={onRetrySave}>{t.result.retry}</button>
            </p>
          )}
        </div>

        <div className="row dialog-actions">
          <button type="button" onClick={onPlayAgain}>{t.result.playAgain}</button>
          <button type="button" className="secondary" onClick={onReview}>{t.result.review}</button>
          <button type="button" className="secondary" onClick={onQuit}>{t.result.toStart}</button>
        </div>
      </div>
    </div>
  )
}
