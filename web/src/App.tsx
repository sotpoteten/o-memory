import { useState } from 'react'
import { fetchGame, IS_STATIC, type Card, type GameMode } from './api'
import { Credits } from './components/Credits'
import { GameBoard } from './components/GameBoard'
import { SetupScreen } from './components/SetupScreen'
import { preloadImages } from './game/preloadImages'
import { useI18n } from './i18n/context'
import { LANGUAGES } from './i18n/language'
import { messages } from './i18n/messages'

type Screen =
  | { name: 'setup' }
  | { name: 'loading' }
  | { name: 'playing'; mode: GameMode; pairs: number; playerName: string; cards: Card[]; gameId: number }
  | { name: 'credits' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'setup' })
  const [startFailed, setStartFailed] = useState(false)
  const { t, language, setLanguage } = useI18n()

  async function start(mode: GameMode, pairs: number, playerName: string) {
    setStartFailed(false)
    setScreen({ name: 'loading' })
    try {
      const cards = await fetchGame(pairs, mode)
      await preloadImages(cards)
      setScreen({ name: 'playing', mode, pairs, playerName, cards, gameId: Date.now() })
    } catch {
      setStartFailed(true)
      setScreen({ name: 'setup' })
    }
  }

  const toSetup = () => setScreen({ name: 'setup' })

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="brand" onClick={toSetup}>
          <span className="brand-flag" aria-hidden="true" />
          O-memory
        </button>
        <nav className="row">
          <button type="button" className="link" onClick={() => setScreen({ name: 'credits' })}>
            {t.nav.credits}
          </button>
          <div className="language-picker" role="group" aria-label={t.languagePicker}>
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                lang={lang}
                aria-pressed={language === lang}
                title={messages[lang].languageName}
                onClick={() => setLanguage(lang)}
              >
                {lang === 'nb' ? 'NO' : 'EN'}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main>
        {screen.name === 'setup' && <SetupScreen onStart={start} error={startFailed ? (IS_STATIC ? t.setup.startErrorStatic : t.setup.startError) : undefined} />}
        {screen.name === 'loading' && <p className="muted center">{t.setup.loadingCards}</p>}
        {screen.name === 'playing' && (
          <GameBoard
            key={screen.gameId}
            cards={screen.cards}
            mode={screen.mode}
            pairs={screen.pairs}
            playerName={screen.playerName}
            onRestart={() => start(screen.mode, screen.pairs, screen.playerName)}
            onQuit={toSetup}
          />
        )}
        {screen.name === 'credits' && <Credits />}
      </main>

      <footer className="app-footer">
        {t.footer(<a href="https://omapwiki.orienteering.sport/">IOF O-Map Wiki</a>)}
      </footer>
    </div>
  )
}
