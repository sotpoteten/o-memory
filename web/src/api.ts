import { SAMPLE_FILES } from './sampleFiles'
import { staticBackend } from './static/staticBackend'

export type CardKind = 'symbol' | 'photo' | 'description' | 'terrain'

export type GameMode = 'symbols' | 'descriptions'
export const GAME_MODES: readonly GameMode[] = ['symbols', 'descriptions']

/** Shown once a pair is found (control description mode). */
export interface CardDetails {
  mapImageUrl: string
  text: string
}

export interface Card {
  id: string
  pairId: string
  kind: CardKind
  imageUrl: string
  symbolId: string
  /** Symbol name per language code; "en" is always present. */
  symbolNames: Record<string, string>
  alt: string | null
  details?: CardDetails | null
}

export interface HighScore {
  id: number
  name: string
  pairs: number
  moves: number
  timeMs: number
  mode: GameMode
  createdAt: string
}

export interface NewHighScore {
  name: string
  mode: GameMode
  pairs: number
  moves: number
  timeMs: number
}

export interface Photo {
  imageUrl: string
  alt: string | null
  caption: string | null
  location: string | null
  sourceUrl: string
}

export interface SymbolInfo {
  id: string
  name: string
  names: Record<string, string>
  category: number
  definition: string | null
  pageUrl: string
  symbolImageUrl: string
  photos: Photo[]
}

/** One pair of each mode, shown on the mode choice on the start page. */
export interface SampleImages {
  symbol: string
  photo: string
  description: string
  terrain: string
}

/** Where games, symbols and high scores come from: the .NET API, or the data files alone (GitHub Pages). */
export interface Backend {
  /** True for the static version, where high scores are only kept in the player's own browser. */
  isStatic: boolean
  fetchGame: (pairs: number, mode: GameMode) => Promise<Card[]>
  fetchSymbols: () => Promise<SymbolInfo[]>
  fetchHighScores: (pairs: number, mode: GameMode) => Promise<HighScore[]>
  postHighScore: (score: NewHighScore) => Promise<HighScore>
  sampleImages: SampleImages
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${url} feilet (${response.status})`)
  return response.json() as Promise<T>
}

const apiBackend: Backend = {
  isStatic: false,
  fetchGame: (pairs, mode) => request<Card[]>(`/api/game?pairs=${pairs}&mode=${mode}`),
  fetchSymbols: () => request<SymbolInfo[]>('/api/symbols'),
  fetchHighScores: (pairs, mode) => request<HighScore[]>(`/api/highscores?pairs=${pairs}&mode=${mode}`),
  postHighScore: score =>
    request<HighScore>('/api/highscores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(score),
    }),
  // Symbol images are served from data/images at /images, control descriptions from data/ at /images too.
  sampleImages: {
    symbol: `/images/${SAMPLE_FILES.symbol}`,
    photo: `/images/${SAMPLE_FILES.photo}`,
    description: `/images/${SAMPLE_FILES.description}`,
    terrain: `/images/${SAMPLE_FILES.terrain}`,
  },
}

/** Chosen at build time (`--mode pages` sets VITE_BACKEND=static), so the unused backend is left out of the bundle. */
const backend = import.meta.env.VITE_BACKEND === 'static' ? staticBackend : apiBackend

export const IS_STATIC = backend.isStatic
export const fetchGame = backend.fetchGame
export const fetchSymbols = backend.fetchSymbols
export const fetchHighScores = backend.fetchHighScores
export const postHighScore = backend.postHighScore
export const SAMPLE_IMAGES = backend.sampleImages
