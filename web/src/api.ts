export type CardKind = 'symbol' | 'photo'

export interface Card {
  id: string
  pairId: string
  kind: CardKind
  imageUrl: string
  symbolId: string
  /** Symbol name per language code; "en" is always present. */
  symbolNames: Record<string, string>
  alt: string | null
}

export interface HighScore {
  id: number
  name: string
  pairs: number
  moves: number
  timeMs: number
  createdAt: string
}

export interface NewHighScore {
  name: string
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${url} feilet (${response.status})`)
  return response.json() as Promise<T>
}

export const fetchGame = (pairs: number) => request<Card[]>(`/api/game?pairs=${pairs}`)

export const fetchSymbols = () => request<SymbolInfo[]>('/api/symbols')

export const fetchHighScores = (pairs: number) => request<HighScore[]>(`/api/highscores?pairs=${pairs}`)

export const postHighScore = (score: NewHighScore) =>
  request<HighScore>('/api/highscores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(score),
  })
