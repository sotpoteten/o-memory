import { useState } from 'react'
import { GAME_MODES, type GameMode } from '../api'
import { readStoredMode, storeMode } from '../gameMode'
import { useI18n } from '../i18n/context'
import { MAX_NAME_LENGTH, readStoredName, storeName } from '../playerName'
import { HighScoreList } from './HighScoreList'

const PAIR_OPTIONS = [6, 8, 12] as const

interface Props {
  onStart: (mode: GameMode, pairs: number, playerName: string) => void
  error?: string
}

export function SetupScreen({ onStart, error }: Props) {
  const { t } = useI18n()
  const [mode, setMode] = useState<GameMode>(readStoredMode)
  const [pairs, setPairs] = useState<number>(8)
  const [name, setName] = useState(readStoredName)

  function start() {
    storeName(name)
    storeMode(mode)
    onStart(mode, pairs, name)
  }

  return (
    <section className="setup">
      <p className="intro">{t.setup.intro}</p>

      <div className="player-name">
        <label htmlFor="player-name">{t.setup.nameLabel} <span className="muted">{t.setup.optional}</span></label>
        <input
          id="player-name"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder={t.anonymous}
          autoComplete="nickname"
        />
      </div>

      <fieldset className="choice-group mode-picker">
        <legend>{t.setup.mode}</legend>
        {GAME_MODES.map(m => (
          <label key={m} className={mode === m ? 'is-selected' : ''}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
            <span className="choice-label">{t.modes[m].title}</span>
            <span className="muted">{t.modes[m].description}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="choice-group difficulty">
        <legend>{t.setup.difficulty}</legend>
        {PAIR_OPTIONS.map(p => (
          <label key={p} className={pairs === p ? 'is-selected' : ''}>
            <input
              type="radio"
              name="difficulty"
              value={p}
              checked={pairs === p}
              onChange={() => setPairs(p)}
            />
            <span className="choice-label">{t.setup.levels[p]}</span>
            <span className="muted">{t.setup.pairsCount(p)}</span>
          </label>
        ))}
      </fieldset>

      <button type="button" className="start" onClick={start}>{t.setup.start}</button>
      {error && <p className="error">{error}</p>}

      <h2>{t.setup.highscoreHeading(t.modes[mode].title, t.setup.levels[pairs])}</h2>
      <HighScoreList key={`${mode}-${pairs}`} mode={mode} pairs={pairs} />
    </section>
  )
}
