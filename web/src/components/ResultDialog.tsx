import { formatTime } from '../game/useMemoryGame'
import { useI18n } from '../i18n/context'
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
  const { t } = useI18n()
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">{t.result.title}</h2>
        <p className="result-stats">
          {t.result.stats(<strong>{moves}</strong>, <strong>{formatTime(timeMs)}</strong>)}
        </p>

        <div aria-live="polite">
          {saveStatus.state === 'saving' && <p className="muted">{t.result.saving}</p>}
          {saveStatus.state === 'saved' && <HighScoreList pairs={pairs} highlightId={saveStatus.id} />}
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
