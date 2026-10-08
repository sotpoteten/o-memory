import { useState, type FormEvent } from 'react'
import { postHighScore } from '../api'
import { formatTime } from '../game/useMemoryGame'
import { HighScoreList } from './HighScoreList'

interface Props {
  pairs: number
  moves: number
  timeMs: number
  onPlayAgain: () => void
  onQuit: () => void
}

const NAME_KEY = 'mem.playerName'

export function ResultDialog({ pairs, moves, timeMs, onPlayAgain, onQuit }: Props) {
  const [name, setName] = useState(() => readStoredName())
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedId, setSavedId] = useState<number>()

  async function save(e: FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const saved = await postHighScore({ name: name.trim(), pairs, moves, timeMs })
      try { localStorage.setItem(NAME_KEY, name.trim()) } catch { /* storage unavailable */ }
      setSavedId(saved.id)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <h2 id="result-title">Alle par funnet!</h2>
        <p className="result-stats">
          <strong>{moves}</strong> trekk på <strong>{formatTime(timeMs)}</strong>
        </p>

        {status === 'saved' ? (
          <HighScoreList pairs={pairs} highlightId={savedId} />
        ) : (
          <form onSubmit={save} className="result-form">
            <label htmlFor="player-name">Navn til highscore-listen</label>
            <div className="row">
              <input
                id="player-name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                required
                autoFocus
              />
              <button type="submit" disabled={status === 'saving' || name.trim() === ''}>Lagre</button>
            </div>
            {status === 'error' && <p className="error">Kunne ikke lagre resultatet. Prøv igjen.</p>}
          </form>
        )}

        <div className="row dialog-actions">
          <button type="button" onClick={onPlayAgain}>Spill igjen</button>
          <button type="button" className="secondary" onClick={onQuit}>Til start</button>
        </div>
      </div>
    </div>
  )
}

function readStoredName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
