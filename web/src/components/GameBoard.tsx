import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { Card, GameMode } from '../api'
import { useI18n } from '../i18n/context'
import { displayName } from '../playerName'
import { useSaveResult } from '../game/useSaveResult'
import { formatTime, useMemoryGame } from '../game/useMemoryGame'
import { detailsPairId, isFinished, isLocked } from '../game/memoryGame'
import { layoutZoomedCards, type CardRect } from '../game/zoomLayout'
import { fitBoard } from '../game/boardFit'
import { ControlProgress } from './ControlProgress'
import { MemoryCard } from './MemoryCard'
import { PairDetailsPanel } from './PairDetailsPanel'
import { ResultDialog } from './ResultDialog'

interface Props {
  cards: Card[]
  mode: GameMode
  pairs: number
  playerName: string
  onRestart: () => void
  onQuit: () => void
}

export function GameBoard({ cards, mode, pairs, playerName, onRestart, onQuit }: Props) {
  const { t } = useI18n()
  const { state, flip, unzoom, review, toggleZoom, elapsedMs } = useMemoryGame(cards)

  const finished = isFinished(state)
  // Moves and time are frozen once the game is finished, so this is created once.
  const finalTimeMs = finished ? state.finishedAt! - state.startedAt! : 0
  const score = useMemo(
    () => (finished ? { name: displayName(playerName, t.anonymous), mode, pairs, moves: state.moves, timeMs: finalTimeMs } : null),
    [finished, playerName, t.anonymous, mode, pairs, state.moves, finalTimeMs],
  )
  const { status: saveStatus, retry: retrySave } = useSaveResult(score)

  const boardRef = useRef<HTMLDivElement>(null)
  useZoomLayout(boardRef, state.zoomed)
  // The review hint above the board moves it down, so refit when it appears.
  useFitToWindow(boardRef, state.cards.length, state.reviewing)

  const detailsPair = detailsPairId(state)
  const details = state.cards.find(c => c.pairId === detailsPair)?.details ?? null

  return (
    <section className="game">
      <div className="scorebar">
        <dl className="scorebar-stats">
          <div>
            <dt>{t.game.time}</dt>
            <dd>{formatTime(elapsedMs)}</dd>
          </div>
          <div>
            <dt>{t.game.moves}</dt>
            <dd>{state.moves}</dd>
          </div>
        </dl>
        <ControlProgress total={pairs} found={state.matched.length} />
        <span className="scorebar-actions">
          <button type="button" className="link" onClick={onRestart}>{t.game.newGame}</button>
          <button type="button" className="link" onClick={onQuit}>{t.game.quit}</button>
        </span>
      </div>

      {mode === 'descriptions' && <PairDetailsPanel details={details} />}

      {state.reviewing && <p className="muted center review-hint">{t.game.reviewHint}</p>}

      <div ref={boardRef} className={`board board-${pairs} board-${mode} ${state.reviewing ? 'is-reviewing' : ''}`}>
        {state.cards.map((card, index) => {
          const faceUp = state.flipped.includes(card.id) || state.matched.includes(card.pairId)
          const zoomed = state.zoomed.includes(card.id)
          return (
            <MemoryCard
              key={card.id}
              card={card}
              index={index}
              faceUp={faceUp}
              matched={state.matched.includes(card.pairId)}
              zoomed={zoomed}
              zoomOrder={state.zoomed.indexOf(card.id)}
              interactive={state.reviewing || (!isLocked(state) && (zoomed || !faceUp))}
              onClick={() => {
                if (state.reviewing) toggleZoom(card.id)
                else if (zoomed) unzoom(card.id)
                else flip(card.id)
              }}
            />
          )
        })}
      </div>

      {finished && saveStatus && !state.reviewing && (
        <ResultDialog
          mode={mode}
          pairs={pairs}
          moves={state.moves}
          timeMs={elapsedMs}
          saveStatus={saveStatus}
          onRetrySave={retrySave}
          onPlayAgain={onRestart}
          onReview={review}
          onQuit={onQuit}
        />
      )}
    </section>
  )
}

/**
 * Positions the enlarged cards. They are laid out together (see layoutZoomedCards) so two enlarged
 * neighbours sit edge to edge instead of overlapping; every other card goes back to filling its box.
 * The zoom is applied as a real size and position (not a scale transform), so images are drawn sharply at the
 * enlarged size. Writes the styles straight to the DOM, re-measuring on resize and scroll.
 */
function useZoomLayout(boardRef: RefObject<HTMLDivElement | null>, zoomedIds: readonly string[]) {
  const zoomedKey = zoomedIds.join('|')

  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return
    const ids = zoomedKey ? zoomedKey.split('|') : []
    const slotOf = (id: string) => board.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)

    const update = () => {
      const rects = ids.flatMap((id): CardRect[] => {
        // The box keeps the card's unenlarged place and size.
        const box = slotOf(id)?.querySelector('.card-box')
        if (!box) return []
        const { left, top, width, height } = box.getBoundingClientRect()
        return [{ id, left, top, width, height }]
      })
      const viewport = { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight }
      const layout = layoutZoomedCards(rects, viewport)

      for (const slot of board.querySelectorAll<HTMLElement>('[data-card-id]')) {
        const button = slot.querySelector('button')
        const box = slot.querySelector('.card-box')
        const t = layout.get(slot.dataset.cardId!)
        if (!button || !box) continue
        if (t) {
          // The transform is relative to the card's centre; turn it into a position within the box.
          const { width, height } = box.getBoundingClientRect()
          Object.assign(button.style, {
            left: `${t.dx - (width * t.scale - width) / 2}px`,
            top: `${t.dy - (height * t.scale - height) / 2}px`,
            width: `${width * t.scale}px`,
            height: `${height * t.scale}px`,
          })
        } else {
          Object.assign(button.style, { left: '', top: '', width: '', height: '' })
        }
      }
    }

    update()
    if (ids.length === 0) return
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [boardRef, zoomedKey])
}

const PHONE_QUERY = '(max-width: 600px)'

/**
 * On PC screens, picks the number of columns and the board width (the --fit-cols and --fit-width CSS
 * variables) that give the largest cards while the whole page — header, board and footer — fits in the
 * window without scrolling. Phones keep the CSS layout and scroll; fitted cards would be too small there.
 */
function useFitToWindow(boardRef: RefObject<HTMLDivElement | null>, cardCount: number, reviewing: boolean) {
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return

    const update = () => {
      if (window.matchMedia(PHONE_QUERY).matches) {
        board.style.removeProperty('--fit-cols')
        board.style.removeProperty('--fit-width')
        return
      }
      const card = board.querySelector<HTMLElement>('.card-box')
      const caption = board.querySelector<HTMLElement>('.card-caption')
      if (!card || !caption || !board.parentElement) return
      const style = getComputedStyle(board)
      const layout = fitBoard({
        availableWidth: board.parentElement.clientWidth,
        // 1px to spare: card heights are fractional, and rounding must never tip the page into scrolling.
        availableHeight: window.innerHeight - (board.getBoundingClientRect().top + window.scrollY) - footerHeight() - 1,
        cards: cardCount,
        rowGap: parseFloat(style.rowGap) || 0,
        columnGap: parseFloat(style.columnGap) || 0,
        captionHeight: caption.offsetHeight + (parseFloat(getComputedStyle(caption).marginTop) || 0),
        aspectRatio: card.offsetHeight > 0 ? card.offsetWidth / card.offsetHeight : 1,
        maxCardWidth: parseFloat(style.getPropertyValue('--card-width')) || 170,
      })
      board.style.setProperty('--fit-cols', String(layout.columns))
      board.style.setProperty('--fit-width', `${layout.width}px`)
    }

    update()
    // The web font can finish loading after the first fit and change the height of the text above the board.
    let active = true
    document.fonts?.ready.then(() => { if (active) update() })
    window.addEventListener('resize', update)
    return () => {
      active = false
      window.removeEventListener('resize', update)
    }
  }, [boardRef, cardCount, reviewing])
}

/** Height of the page footer below the board (its top padding doubles as the space under the board). */
function footerHeight() {
  return document.querySelector<HTMLElement>('.app-footer')?.offsetHeight ?? 0
}
