export interface BoardMetrics {
  /** Width available to the board. */
  availableWidth: number
  /** Height from the board's top edge to the page footer. */
  availableHeight: number
  cards: number
  rowGap: number
  columnGap: number
  /** Height of the name line under each card (including its margin). */
  captionHeight: number
  /** Card width / height: 1 for map symbols, 2 for control descriptions. */
  aspectRatio: number
  /** Cards never get wider than this, however much room there is. */
  maxCardWidth: number
}

export interface BoardLayout {
  columns: number
  /** Width of the whole board (cards plus gaps between them). */
  width: number
}

/** Cards never get lower than this; a very small window scrolls instead of showing unreadable cards. */
export const MIN_CARD_HEIGHT_PX = 50

/**
 * Picks the number of columns that gives the largest cards while every row (cards plus captions) fits in
 * the available height and the board fits in the available width. Only column counts that divide the
 * number of cards are considered, so every row is full. On ties the fewer columns win, which keeps the
 * board compact.
 */
export function fitBoard(m: BoardMetrics): BoardLayout {
  let best: { columns: number; cardWidth: number } | null = null

  for (let columns = 1; columns <= m.cards; columns++) {
    if (m.cards % columns !== 0) continue
    const rows = Math.ceil(m.cards / columns)
    const byWidth = (m.availableWidth - (columns - 1) * m.columnGap) / columns
    const byHeight = ((m.availableHeight - (rows - 1) * m.rowGap) / rows - m.captionHeight) * m.aspectRatio
    const cardWidth = Math.min(m.maxCardWidth, byWidth, byHeight)
    if (best === null || cardWidth > best.cardWidth + 0.5) best = { columns, cardWidth }
  }

  const { columns } = best!
  const cardWidth = Math.max(best!.cardWidth, MIN_CARD_HEIGHT_PX * m.aspectRatio)
  return { columns, width: Math.floor(columns * cardWidth + (columns - 1) * m.columnGap) }
}
