import { useEffect, useState } from 'react'
import { fetchHighScores, type HighScore } from '../api'
import { formatTime } from '../game/useMemoryGame'

interface Props {
  pairs: number
  highlightId?: number
}

export function HighScoreList({ pairs, highlightId }: Props) {
  const [scores, setScores] = useState<HighScore[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHighScores(pairs)
      .then(s => { if (!cancelled) setScores(s) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [pairs])

  if (error) return <p className="muted">Kunne ikke hente highscore.</p>
  if (scores === null) return <p className="muted">Laster…</p>
  if (scores.length === 0) return <p className="muted">Ingen resultater ennå – bli den første!</p>

  return (
    <ol className="highscores">
      {scores.map(s => (
        <li key={s.id} className={s.id === highlightId ? 'is-highlighted' : ''}>
          <span className="hs-name">{s.name}</span>
          <span className="hs-moves">{s.moves} trekk</span>
          <span className="hs-time">{formatTime(s.timeMs)}</span>
        </li>
      ))}
    </ol>
  )
}
