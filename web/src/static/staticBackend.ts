import type { Backend } from '../api'
import {
  buildGameData, createDescriptionDeck, createSymbolDeck, symbolInfos,
  type ConfusableGroup, type GameData, type ImageUrls, type RawControlExample, type RawSymbol,
} from './deck'
import { addScore, topScores } from './localHighScores'

// The static version reads the data files that the build copies to <base>/data/ (see vite.config.ts).
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`

const urls: ImageUrls = {
  image: file => dataUrl(`images/${file}`),
  data: dataUrl,
}

async function fetchJson<T>(file: string): Promise<T> {
  const response = await fetch(dataUrl(file))
  if (!response.ok) throw new Error(`GET ${file} feilet (${response.status})`)
  return response.json() as Promise<T>
}

let gameData: Promise<GameData> | null = null

/** Loads the data files once; a failed load is retried on the next call. */
function loadGameData(): Promise<GameData> {
  gameData ??= Promise.all([
    fetchJson<RawSymbol[]>('symbols.json'),
    fetchJson<Record<string, string>>('i18n/symbols.nb.json'),
    fetchJson<ConfusableGroup[]>('confusable-groups.json'),
    fetchJson<RawControlExample[]>('control-descriptions.json'),
    fetchJson<ConfusableGroup[]>('control-descriptions-groups.json'),
  ])
    .then(([symbols, nb, symbolGroups, examples, exampleGroups]) =>
      buildGameData({ symbols, translations: { nb }, symbolGroups, examples, exampleGroups }))
    .catch(error => {
      gameData = null
      throw error
    })
  return gameData
}

/** Read on each call: accessing localStorage can throw (blocked site data), which then fails just that call. */
function storage(): Storage {
  return window.localStorage
}

export const staticBackend: Backend = {
  isStatic: true,
  fetchGame: async (pairs, mode) => {
    const data = await loadGameData()
    return mode === 'descriptions' ? createDescriptionDeck(data, pairs, urls) : createSymbolDeck(data, pairs, urls)
  },
  fetchSymbols: async () => symbolInfos(await loadGameData(), urls),
  fetchHighScores: async (pairs, mode) => topScores(storage(), pairs, mode),
  postHighScore: async score => addScore(storage(), score),
}
