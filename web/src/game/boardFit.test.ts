import { describe, expect, it } from 'vitest'
import { fitBoard, MIN_CARD_HEIGHT_PX, type BoardMetrics } from './boardFit'

/** A 1920×900 PC window: the board starts ~240px down and the footer takes ~76px. */
const descriptions12: BoardMetrics = {
  availableWidth: 1568,
  availableHeight: 585,
  cards: 24,
  rowGap: 14,
  columnGap: 14,
  captionHeight: 22,
  aspectRatio: 2,
  maxCardWidth: 260,
}

/** Total size of the board laid out with the given columns and width. */
function boardSize(m: BoardMetrics, columns: number, width: number) {
  const rows = Math.ceil(m.cards / columns)
  const cardWidth = (width - (columns - 1) * m.columnGap) / columns
  return {
    cardWidth,
    height: rows * (cardWidth / m.aspectRatio + m.captionHeight) + (rows - 1) * m.rowGap,
  }
}

describe('fitBoard', () => {
  it('uses more columns on a wide screen so 12 control description pairs fit without scrolling', () => {
    const { columns, width } = fitBoard(descriptions12)
    const size = boardSize(descriptions12, columns, width)

    expect(columns).toBe(6)
    expect(width).toBeLessThanOrEqual(descriptions12.availableWidth)
    expect(size.height).toBeLessThanOrEqual(descriptions12.availableHeight)
    expect(size.cardWidth).toBeGreaterThan(200)
  })

  it.each([
    ['map symbols, 8 pairs', { cards: 16, aspectRatio: 1, maxCardWidth: 170, availableHeight: 700 }],
    ['control descriptions, 8 pairs', { cards: 16 }],
    ['map symbols, 12 pairs', { cards: 24, aspectRatio: 1, maxCardWidth: 170, availableHeight: 700 }],
    ['map symbols, 6 pairs', { cards: 12, aspectRatio: 1, maxCardWidth: 170 }],
  ])('fills every row (%s)', (_, overrides) => {
    const m = { ...descriptions12, ...overrides }
    const { columns, width } = fitBoard(m)

    expect(m.cards % columns).toBe(0)
    expect(boardSize(m, columns, width).height).toBeLessThanOrEqual(m.availableHeight)
  })

  it('picks the columns giving the largest cards among those that fill every row', () => {
    const layout = fitBoard(descriptions12)
    const chosen = boardSize(descriptions12, layout.columns, layout.width).cardWidth

    for (let columns = 1; columns <= 24; columns++) {
      if (24 % columns !== 0) continue
      const rows = Math.ceil(24 / columns)
      const byHeight = ((585 - (rows - 1) * 14) / rows - 22) * 2
      const byWidth = (1568 - (columns - 1) * 14) / columns
      expect(Math.min(260, byWidth, byHeight)).toBeLessThanOrEqual(chosen + 1)
    }
  })

  it('never exceeds the maximum card size, and prefers fewer columns when cards are that big anyway', () => {
    // 6 pairs of map symbols on a large screen: 4×3 already gives full-size cards.
    const symbols6: BoardMetrics = { ...descriptions12, cards: 12, availableHeight: 750, aspectRatio: 1, maxCardWidth: 170 }
    const { columns, width } = fitBoard(symbols6)

    expect(boardSize(symbols6, columns, width).cardWidth).toBeCloseTo(170, 0)
    expect(columns).toBe(4)
  })

  it('stays within a narrow width', () => {
    const narrow: BoardMetrics = { ...descriptions12, availableWidth: 700, aspectRatio: 1, maxCardWidth: 170 }
    const { width } = fitBoard(narrow)

    expect(width).toBeLessThanOrEqual(700)
  })

  it('keeps cards readable on a very low window rather than shrinking them to nothing', () => {
    const low = { ...descriptions12, availableHeight: 150, availableWidth: 500 }
    const { columns, width } = fitBoard(low)

    expect(boardSize(low, columns, width).cardWidth).toBeGreaterThanOrEqual(MIN_CARD_HEIGHT_PX * 2 - 1)
  })
})
