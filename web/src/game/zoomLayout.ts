/** A card's untransformed position and size, in viewport pixels. */
export interface CardRect {
  id: string
  left: number
  top: number
  width: number
  height: number
}

export interface Viewport {
  width: number
  height: number
}

/** CSS transform for an enlarged card (transform-origin: center): translate(dx, dy) scale(scale). */
export interface ZoomTransform {
  dx: number
  dy: number
  scale: number
}

const MAX_ZOOM = 3
const MAX_ZOOMED_WIDTH_PX = 560
const MAX_ZOOMED_HEIGHT_PX = 380
const MARGIN_PX = 8
const GAP_PX = 8

/** How much a card may be enlarged on this viewport (square cards and wide control description cards). */
export function zoomScale(width: number, height: number, viewport: Viewport) {
  return Math.max(1, Math.min(
    MAX_ZOOM,
    Math.min(MAX_ZOOMED_WIDTH_PX, viewport.width * 0.75) / width,
    Math.min(MAX_ZOOMED_HEIGHT_PX, viewport.height * 0.6) / height,
  ))
}

interface Span {
  start: number
  size: number
}

/** Places a span of the given size centred on `center`, moved inside [MARGIN, length - MARGIN] if needed. */
function clampedSpan(center: number, size: number, length: number): Span {
  const start = Math.min(Math.max(center - size / 2, MARGIN_PX), Math.max(MARGIN_PX, length - MARGIN_PX - size))
  return { start, size }
}

const center = (span: Span) => span.start + span.size / 2
const overlaps = (a: Span, b: Span) => a.start < b.start + b.size + GAP_PX && b.start < a.start + a.size + GAP_PX

/**
 * Where to draw the enlarged cards. Each card is enlarged around its own centre and kept inside the viewport.
 * Two enlarged cards never overlap: if they would, they are pushed apart — side by side or one above the
 * other, whichever moves them least — and made a bit smaller if they would not fit next to each other.
 */
export function layoutZoomedCards(cards: readonly CardRect[], viewport: Viewport): Map<string, ZoomTransform> {
  const result = new Map<string, ZoomTransform>()
  if (cards.length === 0) return result

  const centerX = (c: CardRect) => c.left + c.width / 2
  const centerY = (c: CardRect) => c.top + c.height / 2
  const toTransform = (card: CardRect, x: Span, y: Span, scale: number): ZoomTransform =>
    ({ dx: center(x) - centerX(card), dy: center(y) - centerY(card), scale })

  // Lay out each card on its own.
  for (const card of cards) {
    const scale = zoomScale(card.width, card.height, viewport)
    const x = clampedSpan(centerX(card), card.width * scale, viewport.width)
    const y = clampedSpan(centerY(card), card.height * scale, viewport.height)
    result.set(card.id, toTransform(card, x, y, scale))
  }
  if (cards.length !== 2) return result

  const [a, b] = cards
  const scale = Math.min(result.get(a.id)!.scale, result.get(b.id)!.scale)
  const spans = (card: CardRect, s: number) => ({
    x: clampedSpan(centerX(card), card.width * s, viewport.width),
    y: clampedSpan(centerY(card), card.height * s, viewport.height),
  })
  const natural = { a: spans(a, scale), b: spans(b, scale) }
  if (!overlaps(natural.a.x, natural.b.x) || !overlaps(natural.a.y, natural.b.y)) {
    result.set(a.id, toTransform(a, natural.a.x, natural.a.y, scale))
    result.set(b.id, toTransform(b, natural.b.x, natural.b.y, scale))
    return result
  }

  // They overlap: try putting them next to each other along each axis and keep the cheaper option.
  type Candidate = { cost: number; a: { x: Span; y: Span }; b: { x: Span; y: Span }; scale: number }
  const candidates: Candidate[] = (['x', 'y'] as const).map(axis => {
    const length = axis === 'x' ? viewport.width : viewport.height
    const sizeOf = (card: CardRect) => (axis === 'x' ? card.width : card.height)
    const centerOf = (card: CardRect) => (axis === 'x' ? centerX(card) : centerY(card))

    // Shrink both cards if they do not fit next to each other on this axis (never below their normal size).
    const available = length - 2 * MARGIN_PX - GAP_PX
    const s = Math.max(1, Math.min(scale, available / (sizeOf(a) + sizeOf(b))))

    // Keep their order along the axis; place them edge to edge around their common midpoint.
    const [first, second] = centerOf(a) <= centerOf(b) ? [a, b] : [b, a]
    const middle = (centerOf(first) + centerOf(second)) / 2
    let firstStart = middle - GAP_PX / 2 - sizeOf(first) * s
    let secondStart = middle + GAP_PX / 2
    // Move the pair as a block back inside the viewport.
    const shift = Math.max(0, MARGIN_PX - firstStart) - Math.max(0, secondStart + sizeOf(second) * s - (length - MARGIN_PX))
    firstStart += shift
    secondStart += shift

    const placed = new Map<CardRect, { x: Span; y: Span }>()
    for (const [card, start] of [[first, firstStart], [second, secondStart]] as const) {
      const along: Span = { start, size: sizeOf(card) * s }
      const across = axis === 'x'
        ? clampedSpan(centerY(card), card.height * s, viewport.height)
        : clampedSpan(centerX(card), card.width * s, viewport.width)
      placed.set(card, axis === 'x' ? { x: along, y: across } : { x: across, y: along })
    }

    const moved = (card: CardRect) => {
      const p = placed.get(card)!
      return (center(p.x) - centerX(card)) ** 2 + (center(p.y) - centerY(card)) ** 2
    }
    // Shrinking is worse than moving: weigh lost scale heavily.
    const cost = moved(a) + moved(b) + (scale - s) * 1e6
    return { cost, a: placed.get(a)!, b: placed.get(b)!, scale: s }
  })

  const best = candidates.reduce((x, y) => (y.cost < x.cost ? y : x))
  result.set(a.id, toTransform(a, best.a.x, best.a.y, best.scale))
  result.set(b.id, toTransform(b, best.b.x, best.b.y, best.scale))
  return result
}
