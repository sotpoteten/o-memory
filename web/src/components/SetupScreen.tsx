import { useState, type CSSProperties } from 'react'
import { GAME_MODES, IS_STATIC, SAMPLE_IMAGES, type GameMode } from '../api'
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
    <div className="setup">
      <section className="setup-main" aria-labelledby="setup-heading">
        <h1 id="setup-heading">{t.setup.heading}</h1>
        <p className="intro">{t.setup.intro}</p>

        <fieldset className="mode-picker">
          <legend>{t.setup.mode}</legend>
          {GAME_MODES.map(m => (
            <label key={m} className={`mode-tile ${mode === m ? 'is-selected' : ''}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
              <ModeSample mode={m} />
              <span className="mode-tile-text">
                <span className="mode-tile-title">{t.modes[m].title}</span>
                <span className="muted">{t.modes[m].description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="setup-options">
          <fieldset className="segmented">
            <legend>{t.setup.difficulty}</legend>
            <div className="segmented-track" style={{ '--selected': PAIR_OPTIONS.indexOf(pairs as 6 | 8 | 12) } as CSSProperties}>
              {PAIR_OPTIONS.map(p => (
                <label key={p} className={pairs === p ? 'is-selected' : ''}>
                  <input type="radio" name="difficulty" value={p} checked={pairs === p} onChange={() => setPairs(p)} />
                  <span className="segmented-label">{t.setup.levels[p]}</span>
                  <span className="segmented-sub">{t.setup.pairsCount(p)}</span>
                </label>
              ))}
            </div>
          </fieldset>

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
        </div>

        <button type="button" className="start" onClick={start}>{t.setup.start}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <aside className="setup-scores" aria-labelledby="scores-heading">
        <h2 id="scores-heading">{IS_STATIC ? t.setup.localHighscoreHeading : t.setup.highscoreHeading}</h2>
        <p className="scores-scope">{t.setup.highscoreScope(t.modes[mode].title, t.setup.levels[pairs])}</p>
        <HighScoreList key={`${mode}-${pairs}`} mode={mode} pairs={pairs} />
        {IS_STATIC && <p className="muted scores-note">{t.setup.localHighscoreNote}</p>}
      </aside>
    </div>
  )
}

/** A real pair from the game, so the choice shows what is matched with what. Purely decorative. */
function ModeSample({ mode }: { mode: GameMode }) {
  if (mode === 'symbols') {
    return (
      <span className="mode-sample mode-sample-symbols" aria-hidden="true">
        <img className="sample-symbol" src={SAMPLE_IMAGES.symbol} alt="" />
        <img className="sample-photo" src={SAMPLE_IMAGES.photo} alt="" />
      </span>
    )
  }
  return (
    <span className="mode-sample mode-sample-descriptions" aria-hidden="true">
      <img className="sample-description" src={SAMPLE_IMAGES.description} alt="" />
      <img className="sample-terrain" src={SAMPLE_IMAGES.terrain} alt="" />
    </span>
  )
}
