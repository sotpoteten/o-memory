import { describe, expect, it } from 'vitest'
import {
  ALLOWED_PAIRS, buildGameData, createDescriptionDeck, createSymbolDeck, groupsById, pickNonConfusable,
  type ConfusableGroup, type RawControlExample, type RawSymbol,
} from './deck'
import symbolsJson from '../../../data/symbols.json?raw'
import namesJson from '../../../data/i18n/symbols.nb.json?raw'
import symbolGroupsJson from '../../../data/confusable-groups.json?raw'
import examplesJson from '../../../data/control-descriptions.json?raw'
import exampleGroupsJson from '../../../data/control-descriptions-groups.json?raw'

const urls = { image: (f: string) => `/data/images/${f}`, data: (f: string) => `/data/${f}` }

const symbol = (id: string, photos = 2): RawSymbol => ({
  id,
  name: `Symbol ${id}`,
  category: 1,
  definition: null,
  pageUrl: `https://example.org/${id}`,
  symbolImage: `${id}/symbol.svg`,
  photos: Array.from({ length: photos }, (_, i) => ({ file: `${id}/photo-${i + 1}.jpg`, alt: `Photo ${i + 1}`, caption: null, location: null, sourceUrl: '' })),
})

const example = (id: number): RawControlExample => ({
  id,
  page: 18,
  text: `Text ${id}`,
  feature: 'feature',
  mapImage: `control-descriptions/${id}/map.png`,
  terrainImage: `control-descriptions/${id}/terrain.png`,
  descriptionImage: `control-descriptions/${id}/description.png`,
})

const ids = (n: number) => Array.from({ length: n }, (_, i) => String(100 + i))

function data(groups: ConfusableGroup[] = []) {
  return buildGameData({
    symbols: [...ids(14).map(id => symbol(id)), symbol('999', 0)],
    translations: { nb: { 100: 'Norsk 100', 101: '  ' } },
    symbolGroups: groups,
    examples: Array.from({ length: 14 }, (_, i) => example(i + 1)),
    exampleGroups: [{ name: 'Re-entrant', ids: ['1', '2'] }],
  })
}

describe('buildGameData', () => {
  it('leaves out symbols without photos and adds translated names, falling back to English', () => {
    const { symbols } = data()

    expect(symbols.map(s => s.id)).not.toContain('999')
    expect(symbols.find(s => s.id === '100')!.names).toEqual({ en: 'Symbol 100', nb: 'Norsk 100' })
    expect(symbols.find(s => s.id === '101')!.names).toEqual({ en: 'Symbol 101' })
  })

  it('fails when the confusable groups leave too few items for the hardest level', () => {
    expect(() => data([{ name: 'Too big', ids: ids(4) }])).toThrow(/only 11 non-confusable symbols/)
  })
})

describe('groupsById and pickNonConfusable', () => {
  it('ignores unknown ids and lets an item belong to several groups', () => {
    const groups = groupsById([{ name: 'a', ids: ['1', '2', 'x'] }, { name: 'b', ids: ['2', '3'] }], new Set(['1', '2', '3']))

    expect(groups.get('2')).toEqual([0, 1])
    expect(groups.has('x')).toBe(false)
  })

  it('takes at most one item per group, in order', () => {
    const groups = groupsById([{ name: 'a', ids: ['1', '2'] }, { name: 'b', ids: ['2', '3'] }], new Set(['1', '2', '3', '4']))

    expect(pickNonConfusable(['2', '1', '3', '4'], id => id, groups, 10)).toEqual(['2', '4'])
    expect(pickNonConfusable(['1', '2', '3', '4'], id => id, groups, 2)).toEqual(['1', '3'])
  })
})

describe('createSymbolDeck', () => {
  it.each(ALLOWED_PAIRS)('deals %i distinct pairs of symbol and photo', pairs => {
    const cards = createSymbolDeck(data(), pairs, urls)

    expect(cards).toHaveLength(pairs * 2)
    expect(new Set(cards.map(c => c.id)).size).toBe(pairs * 2)
    for (const pairId of new Set(cards.map(c => c.pairId))) {
      expect(cards.filter(c => c.pairId === pairId).map(c => c.kind).sort()).toEqual(['photo', 'symbol'])
    }
  })

  it('never deals two symbols from the same confusable group', () => {
    const game = data([{ name: 'Boulders', ids: ['100', '101', '102'] }])
    for (let i = 0; i < 50; i++) {
      const symbolIds = createSymbolDeck(game, 12, urls).map(c => c.symbolId)
      expect(symbolIds.filter(id => ['100', '101', '102'].includes(id)).length).toBeLessThanOrEqual(2)
    }
  })

  it('uses the data paths for images and names for the caption', () => {
    const cards = createSymbolDeck(data(), 6, urls, () => 0)
    const symbolCard = cards.find(c => c.kind === 'symbol')!
    const photoCard = cards.find(c => c.kind === 'photo')!

    expect(symbolCard.imageUrl).toBe(`/data/images/${symbolCard.symbolId}/symbol.svg`)
    expect(photoCard.imageUrl).toBe(`/data/images/${photoCard.symbolId}/photo-1.jpg`)
    expect(photoCard.alt).toBe('Photo 1')
    expect(symbolCard.symbolNames.en).toBe(`Symbol ${symbolCard.symbolId}`)
  })
})

describe('createDescriptionDeck', () => {
  it('pairs the description strip with the terrain drawing, both carrying the map excerpt and English text', () => {
    const cards = createDescriptionDeck(data(), 8, urls)
    const [description, terrain] = cards

    expect(cards).toHaveLength(16)
    expect(description.kind).toBe('description')
    expect(terrain.kind).toBe('terrain')
    expect(terrain.pairId).toBe(description.pairId)
    expect(description.imageUrl).toBe(`/data/control-descriptions/${description.pairId}/description.png`)
    expect(terrain.details).toEqual({ mapImageUrl: `/data/control-descriptions/${description.pairId}/map.png`, text: `Text ${description.pairId}` })
    expect(description.symbolNames).toEqual({ en: `Text ${description.pairId}` })
  })

  it('never deals two examples from the same group', () => {
    for (let i = 0; i < 50; i++) {
      const pairIds = new Set(createDescriptionDeck(data(), 12, urls).map(c => c.pairId))
      expect(pairIds.has('1') && pairIds.has('2')).toBe(false)
    }
  })
})

describe('the real data files', () => {
  it('give enough non-confusable items for every level, with Norwegian names', () => {
    const game = buildGameData({
      symbols: JSON.parse(symbolsJson) as RawSymbol[],
      translations: { nb: JSON.parse(namesJson) as Record<string, string> },
      symbolGroups: JSON.parse(symbolGroupsJson) as ConfusableGroup[],
      examples: JSON.parse(examplesJson) as RawControlExample[],
      exampleGroups: JSON.parse(exampleGroupsJson) as ConfusableGroup[],
    })

    expect(game.symbols.every(s => s.names.nb)).toBe(true)
    expect(createSymbolDeck(game, 12, urls)).toHaveLength(24)
    expect(createDescriptionDeck(game, 12, urls)).toHaveLength(24)
  })
})
