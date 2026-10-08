import { useState } from 'react'
import { HighScoreList } from './HighScoreList'

const DIFFICULTIES = [
  { pairs: 6, label: 'Lett' },
  { pairs: 8, label: 'Middels' },
  { pairs: 12, label: 'Vanskelig' },
] as const

interface Props {
  onStart: (pairs: number) => void
  error?: string
}

export function SetupScreen({ onStart, error }: Props) {
  const [pairs, setPairs] = useState<number>(8)

  return (
    <section className="setup">
      <p className="intro">
        Finn parene: hvert karttegn fra orienteringskartet hører sammen med et foto av det samme
        terrengobjektet i virkeligheten.
      </p>

      <fieldset className="difficulty">
        <legend>Vanskelighetsgrad</legend>
        {DIFFICULTIES.map(d => (
          <label key={d.pairs} className={pairs === d.pairs ? 'is-selected' : ''}>
            <input
              type="radio"
              name="difficulty"
              value={d.pairs}
              checked={pairs === d.pairs}
              onChange={() => setPairs(d.pairs)}
            />
            <span className="difficulty-label">{d.label}</span>
            <span className="muted">{d.pairs} par</span>
          </label>
        ))}
      </fieldset>

      <button type="button" className="start" onClick={() => onStart(pairs)}>Start spill</button>
      {error && <p className="error">{error}</p>}

      <h2>Highscore – {DIFFICULTIES.find(d => d.pairs === pairs)?.label.toLowerCase()}</h2>
      <HighScoreList key={pairs} pairs={pairs} />
    </section>
  )
}
