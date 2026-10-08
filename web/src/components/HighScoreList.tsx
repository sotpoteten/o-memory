import { useEffect, useState } from 'react'
import { fetchHighScores, type HighScore } from '../api'
import { formatTime } from '../game/useMemoryGame'
import { useI18n } from '../i18n/context'

interface Props {
  pairs: number
  highlightId?: number
}

export function HighScoreList({ pairs, highlightId }: Props) {
  const { t } = useI18n()
  const [scores, setScores] = useState<HighScore[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHighScores(pairs)
      .then(s => { if (!cancelled) setScores(s) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [pairs])

  if (error) return <p className="muted">{t.highscores.loadError}</p>
  if (scores === null) return <p className="muted">{t.highscores.loading}</p>
  if (scores.length === 0) return <p className="muted">{t.highscores.empty}</p>

  return (
    <ol className="highscores">
      {scores.map(s => (
        <li key={s.id} className={s.id === highlightId ? 'is-highlighted' : ''}>
          <span className="hs-name">{s.name}</span>
          <span className="hs-moves">{t.highscores.moves(s.moves)}</span>
          <span className="hs-time">{formatTime(s.timeMs)}</span>
        </li>
      ))}
    </ol>
  )
}
