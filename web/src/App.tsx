import { useState } from 'react'
import { fetchGame, type Card } from './api'
import { Credits } from './components/Credits'
import { GameBoard } from './components/GameBoard'
import { SetupScreen } from './components/SetupScreen'

type Screen =
  | { name: 'setup' }
  | { name: 'loading' }
  | { name: 'playing'; pairs: number; playerName: string; cards: Card[]; gameId: number }
  | { name: 'credits' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'setup' })
  const [error, setError] = useState<string>()

  async function start(pairs: number, playerName: string) {
    setError(undefined)
    setScreen({ name: 'loading' })
    try {
      const cards = await fetchGame(pairs)
      setScreen({ name: 'playing', pairs, playerName, cards, gameId: Date.now() })
    } catch {
      setError('Kunne ikke starte spillet. Kjører API-et?')
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
        <nav>
          <button type="button" className="link" onClick={() => setScreen({ name: 'credits' })}>
            Kilder
          </button>
        </nav>
      </header>

      <main>
        {screen.name === 'setup' && <SetupScreen onStart={start} error={error} />}
        {screen.name === 'loading' && <p className="muted center">Henter kort…</p>}
        {screen.name === 'playing' && (
          <GameBoard
            key={screen.gameId}
            cards={screen.cards}
            pairs={screen.pairs}
            playerName={screen.playerName}
            onRestart={() => start(screen.pairs, screen.playerName)}
            onQuit={toSetup}
          />
        )}
        {screen.name === 'credits' && <Credits />}
      </main>

      <footer className="app-footer">
        Innhold fra <a href="https://omapwiki.orienteering.sport/">IOF O-Map Wiki</a>, CC BY-SA 4.0
      </footer>
    </div>
  )
}
