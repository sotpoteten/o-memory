import { describe, expect, it } from 'vitest'
import { layoutZoomedCards, type CardRect, type ZoomTransform } from './zoomLayout'

const viewport = { width: 1200, height: 900 }

/** The on-screen rectangle of a card after its zoom transform (transform-origin: center). */
function zoomedRect(card: CardRect, t: ZoomTransform) {
  const cx = card.left + card.width / 2 + t.dx
  const cy = card.top + card.height / 2 + t.dy
  const w = card.width * t.scale
  const h = card.height * t.scale
  return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2 }
}

function overlap(a: ReturnType<typeof zoomedRect>, b: ReturnType<typeof zoomedRect>) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

function inside(r: ReturnType<typeof zoomedRect>, v = viewport) {
  return r.left >= 0 && r.top >= 0 && r.right <= v.width && r.bottom <= v.height
}

const card = (id: string, left: number, top: number, size = 150): CardRect => ({ id, left, top, width: size, height: size })

describe('layoutZoomedCards', () => {
  it('enlarges a single card around its centre', () => {
    const c = card('a', 500, 300)
    const t = layoutZoomedCards([c], viewport).get('a')!

    expect(t.scale).toBeGreaterThan(2)
    expect(t.dx).toBe(0)
    expect(t.dy).toBe(0)
  })

  it('keeps a card near the edge inside the viewport', () => {
    const c = card('a', 10, 10)
    const t = layoutZoomedCards([c], viewport).get('a')!

    expect(inside(zoomedRect(c, t))).toBe(true)
  })

  it('leaves two distant cards where they are', () => {
    const a = card('a', 100, 100)
    const b = card('b', 900, 600)
    const layout = layoutZoomedCards([a, b], viewport)

    expect(overlap(zoomedRect(a, layout.get('a')!), zoomedRect(b, layout.get('b')!))).toBe(false)
    expect(layout.get('b')!.dx).toBe(0)
  })

  it.each([
    ['side by side', card('a', 400, 350), card('b', 560, 350)],
    ['above each other', card('a', 500, 200), card('b', 500, 360)],
    ['diagonal', card('a', 400, 200), card('b', 560, 360)],
    ['near an edge', card('a', 10, 350), card('b', 170, 350)],
  ])('puts two neighbouring cards edge to edge without overlap (%s)', (_, a, b) => {
    const layout = layoutZoomedCards([a, b], viewport)
    const ra = zoomedRect(a, layout.get('a')!)
    const rb = zoomedRect(b, layout.get('b')!)

    expect(overlap(ra, rb)).toBe(false)
    expect(inside(ra) && inside(rb)).toBe(true)
    expect(layout.get('a')!.scale).toBeGreaterThan(1.5)
  })

  it('keeps the cards in their order: the left card stays left', () => {
    const a = card('a', 560, 350)
    const b = card('b', 400, 350)
    const layout = layoutZoomedCards([a, b], viewport)

    expect(zoomedRect(b, layout.get('b')!).right).toBeLessThanOrEqual(zoomedRect(a, layout.get('a')!).left)
  })

  it('shrinks the cards rather than overlapping on a small screen', () => {
    const phone = { width: 375, height: 700 }
    const a = card('a', 20, 300, 100)
    const b = card('b', 130, 300, 100)
    const layout = layoutZoomedCards([a, b], phone)
    const ra = zoomedRect(a, layout.get('a')!)
    const rb = zoomedRect(b, layout.get('b')!)

    expect(overlap(ra, rb)).toBe(false)
    expect(inside(ra, phone) && inside(rb, phone)).toBe(true)
  })

  it('handles wide control description cards', () => {
    const a: CardRect = { id: 'a', left: 300, top: 300, width: 250, height: 125 }
    const b: CardRect = { id: 'b', left: 560, top: 300, width: 250, height: 125 }
    const layout = layoutZoomedCards([a, b], viewport)

    expect(overlap(zoomedRect(a, layout.get('a')!), zoomedRect(b, layout.get('b')!))).toBe(false)
  })
})
