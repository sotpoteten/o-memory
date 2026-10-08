import { GAME_MODES, type GameMode } from './api'

const MODE_KEY = 'mem.mode'

export function readStoredMode(): GameMode {
  try {
    const stored = localStorage.getItem(MODE_KEY)
    if (GAME_MODES.includes(stored as GameMode)) return stored as GameMode
  } catch {
    // Storage unavailable — start with the default mode.
  }
  return 'symbols'
}

export function storeMode(mode: GameMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Storage unavailable — the choice is just not remembered.
  }
}
