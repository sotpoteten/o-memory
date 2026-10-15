import type { GameMode, HighScore, NewHighScore } from '../api'

// High scores for the static version: kept in the player's own browser, so each player sees only their results.

const STORAGE_KEY = 'mem.highscores'
const LIST_LENGTH = 10
const MAX_NAME_LENGTH = 20

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>

const byRank = (a: HighScore, b: HighScore) =>
  a.moves - b.moves || a.timeMs - b.timeMs || a.createdAt.localeCompare(b.createdAt)

/** All stored scores; an unreadable or blocked store counts as empty. */
function readAll(storage: ScoreStorage): HighScore[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as HighScore[]) : []
  } catch {
    return []
  }
}

/** The best results for one mode and difficulty, best first. */
export function topScores(storage: ScoreStorage, pairs: number, mode: GameMode): HighScore[] {
  return readAll(storage)
    .filter(s => s.pairs === pairs && s.mode === mode)
    .sort(byRank)
    .slice(0, LIST_LENGTH)
}

/**
 * Stores a result and returns it with its id. Only the best results per mode and difficulty are kept, so the
 * store stays small. Throws if the browser refuses to store it, so the result dialog can offer a retry.
 */
export function addScore(storage: ScoreStorage, score: NewHighScore, now: Date = new Date()): HighScore {
  const all = readAll(storage)
  const saved: HighScore = {
    ...score,
    id: all.reduce((max, s) => Math.max(max, s.id), 0) + 1,
    name: score.name.trim().slice(0, MAX_NAME_LENGTH),
    createdAt: now.toISOString(),
  }

  const sameList = (s: HighScore) => s.pairs === saved.pairs && s.mode === saved.mode
  const kept = [...all.filter(sameList), saved].sort(byRank).slice(0, LIST_LENGTH)
  storage.setItem(STORAGE_KEY, JSON.stringify([...all.filter(s => !sameList(s)), ...kept]))
  return saved
}
