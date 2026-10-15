import type { Card, SymbolInfo } from '../api'
import { shuffle } from '../game/memoryGame'

// Builds games straight from the files in data/, for the static (GitHub Pages) version without the API.
// Mirrors SymbolRepository, ControlDescriptionRepository and Game in src/Mem.Api; keep the two in step.

export const ALLOWED_PAIRS = [6, 8, 12] as const
const MAX_PAIRS = Math.max(...ALLOWED_PAIRS)

/** A photo in data/symbols.json; `file` is relative to data/images. */
export interface RawPhoto {
  file: string
  alt: string | null
  caption: string | null
  location: string | null
  sourceUrl: string
}

/** A symbol in data/symbols.json, as written by tools/OmapScraper. */
export interface RawSymbol {
  id: string
  name: string
  category: number
  definition: string | null
  pageUrl: string
  /** Relative to data/images. */
  symbolImage: string
  photos: RawPhoto[]
}

/** A row in data/control-descriptions.json; image paths are relative to data/. */
export interface RawControlExample {
  id: number
  page: number
  text: string
  feature: string
  mapImage: string
  terrainImage: string
  descriptionImage: string
}

/** A set of easily confused items (*groups.json); a game contains at most one of them. */
export interface ConfusableGroup {
  name: string
  ids: string[]
}

/** Per item id, the indices of the confusable groups it belongs to. */
export type GroupsById = ReadonlyMap<string, readonly number[]>

export interface GameData {
  /** Playable symbols (with at least one photo), with their names in every language. */
  symbols: (RawSymbol & { names: Record<string, string> })[]
  symbolGroups: GroupsById
  examples: RawControlExample[]
  exampleGroups: GroupsById
}

/** Turns the image paths in the data files into URLs. */
export interface ImageUrls {
  /** For paths relative to data/images (symbols and photos). */
  image: (file: string) => string
  /** For paths relative to data/ (control description examples). */
  data: (file: string) => string
}

/** Maps every known id to the indices of its groups; ids that are not in `knownIds` are ignored. */
export function groupsById(groups: readonly ConfusableGroup[], knownIds: ReadonlySet<string>): GroupsById {
  const result = new Map<string, number[]>()
  groups.forEach((group, index) => {
    for (const id of group.ids) {
      if (!knownIds.has(id)) continue
      result.set(id, [...(result.get(id) ?? []), index])
    }
  })
  return result
}

/** Takes items in order, skipping any whose confusable group is already represented. */
export function pickNonConfusable<T>(ordered: Iterable<T>, idOf: (item: T) => string, groups: GroupsById, max: number): T[] {
  const usedGroups = new Set<number>()
  const chosen: T[] = []
  for (const item of ordered) {
    if (chosen.length === max) break
    const itemGroups = groups.get(idOf(item)) ?? []
    if (itemGroups.some(g => usedGroups.has(g))) continue
    itemGroups.forEach(g => usedGroups.add(g))
    chosen.push(item)
  }
  return chosen
}

/**
 * Shuffles the items and takes `count` of them, at most one per confusable group. Every item is equally likely
 * to be considered first, so larger groups appear more often while each item is picked about equally often.
 */
function pickRandom<T>(items: readonly T[], idOf: (item: T) => string, groups: GroupsById, count: number, random: () => number): T[] {
  const chosen = pickNonConfusable(shuffle(items, random), idOf, groups, count)
  if (chosen.length < count) throw new Error(`Need ${count} non-confusable items, only ${chosen.length} available.`)
  return chosen
}

/** Fails on load rather than on the first "hard" game if the groups leave too few distinct items. */
function ensureCapacity<T>(items: readonly T[], idOf: (item: T) => string, groups: GroupsById, what: string) {
  const capacity = pickNonConfusable(items, idOf, groups, Infinity).length
  if (capacity < MAX_PAIRS) throw new Error(`Confusable groups leave only ${capacity} non-confusable ${what}; ${MAX_PAIRS} are needed.`)
}

/**
 * Combines the raw data files into playable data: drops symbols without photos, adds the translated names
 * (`translations` is { lang: { symbolId: name } }) and resolves the confusable groups.
 */
export function buildGameData(input: {
  symbols: readonly RawSymbol[]
  translations: Record<string, Record<string, string>>
  symbolGroups: readonly ConfusableGroup[]
  examples: readonly RawControlExample[]
  exampleGroups: readonly ConfusableGroup[]
}): GameData {
  const symbols = input.symbols
    .filter(s => s.photos.length > 0)
    .map(s => ({ ...s, names: namesFor(s, input.translations) }))
  const symbolGroups = groupsById(input.symbolGroups, new Set(symbols.map(s => s.id)))
  ensureCapacity(symbols, s => s.id, symbolGroups, 'symbols')

  const examples = [...input.examples]
  const exampleGroups = groupsById(input.exampleGroups, new Set(examples.map(exampleKey)))
  ensureCapacity(examples, exampleKey, exampleGroups, 'control descriptions')

  return { symbols, symbolGroups, examples, exampleGroups }
}

function namesFor(symbol: RawSymbol, translations: Record<string, Record<string, string>>): Record<string, string> {
  const names: Record<string, string> = { en: symbol.name }
  for (const [lang, byId] of Object.entries(translations)) {
    const name = byId[symbol.id]
    if (name?.trim()) names[lang] = name
  }
  return names
}

const exampleKey = (example: RawControlExample) => String(example.id)

/** Picks `pairs` random symbols (at most one per confusable group) and one random photo for each. Cards come in pair order. */
export function createSymbolDeck(data: GameData, pairs: number, urls: ImageUrls, random: () => number = Math.random): Card[] {
  return pickRandom(data.symbols, s => s.id, data.symbolGroups, pairs, random).flatMap((symbol): Card[] => {
    const photo = symbol.photos[Math.floor(random() * symbol.photos.length)]
    const shared = { pairId: symbol.id, symbolId: symbol.id, symbolNames: symbol.names }
    return [
      // Symbol cards get their alt text from the client, in the chosen language.
      { ...shared, id: `${symbol.id}-s`, kind: 'symbol', imageUrl: urls.image(symbol.symbolImage), alt: null },
      { ...shared, id: `${symbol.id}-p`, kind: 'photo', imageUrl: urls.image(photo.file), alt: photo.alt },
    ]
  })
}

/**
 * Picks `pairs` random control description examples (at most one per confusable group) as pairs of description
 * strip and terrain drawing. Both cards carry the map excerpt and text as details.
 */
export function createDescriptionDeck(data: GameData, pairs: number, urls: ImageUrls, random: () => number = Math.random): Card[] {
  return pickRandom(data.examples, exampleKey, data.exampleGroups, pairs, random).flatMap((example): Card[] => {
    const key = exampleKey(example)
    // The text is IOF's own (CC BY-ND), so it is shown untranslated in every language.
    const shared = {
      pairId: key,
      symbolId: key,
      symbolNames: { en: example.text },
      alt: null,
      details: { mapImageUrl: urls.data(example.mapImage), text: example.text },
    }
    return [
      { ...shared, id: `${key}-d`, kind: 'description', imageUrl: urls.data(example.descriptionImage) },
      { ...shared, id: `${key}-t`, kind: 'terrain', imageUrl: urls.data(example.terrainImage) },
    ]
  })
}

/** The symbol list for the credits page. */
export function symbolInfos(data: GameData, urls: ImageUrls): SymbolInfo[] {
  return data.symbols.map(s => ({
    id: s.id,
    name: s.name,
    names: s.names,
    category: s.category,
    definition: s.definition,
    pageUrl: s.pageUrl,
    symbolImageUrl: urls.image(s.symbolImage),
    photos: s.photos.map(p => ({ imageUrl: urls.image(p.file), alt: p.alt, caption: p.caption, location: p.location, sourceUrl: p.sourceUrl })),
  }))
}
