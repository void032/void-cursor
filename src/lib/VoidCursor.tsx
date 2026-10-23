'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

export interface VoidCursorProps {
  /** Whether the cursor effect is enabled. Defaults to `true`. */
  enabled?: boolean
  /** Trailing interpolation amount from 0 to 1. Defaults to `0.15`. */
  smoothing?: number
  /** Diameter of the trailing ring in pixels. Defaults to `30`. */
  ringSize?: number
  /** Diameter of the immediate dot in pixels. Defaults to `10`. */
  dotSize?: number
  /** Ring color. Defaults to ivory. */
  ringColor?: string
  /** Dot color. Defaults to white. */
  dotColor?: string
  /** Ring scale while an opted-in element is hovered. Defaults to `2.5`. */
  hoverScale?: number
  /** Stacking order for the cursor. Defaults to `99999`. */
  zIndex?: number
  /** Selector for elements that expand the ring. Defaults to an opt-in data attribute. */
  hoverSelector?: string
  /** Explicitly hide the browser cursor while this instance is active. Defaults to `false`. */
  hideNativeCursor?: boolean
  /** Called when the opted-in hover target changes. */
  onHoverChange?: (hovered: boolean, target: Element | null) => void
}

type Position = { x: number; y: number }

let nativeCursorHiderCount = 0
const DEFAULT_HOVER_SELECTOR = '[data-void-cursor="hover"]'
const STYLE_ID = 'void-cursor-styles'
const CURSOR_STYLES = `
.void-cursor { position: fixed; inset: 0; pointer-events: none; opacity: 0; mix-blend-mode: difference; transition: opacity 0.2s ease; }
.void-cursor[data-visible] { opacity: 1; }
.void-cursor__ball { position: fixed; top: 0; left: 0; pointer-events: none; will-change: transform; }
.void-cursor__ball svg { display: block; overflow: visible; transform-origin: center; transition: transform 250ms cubic-bezier(.2,.8,.2,1); }
.void-cursor__ball--ring { width: var(--void-cursor-ring-size); height: var(--void-cursor-ring-size); }
.void-cursor__ball--ring circle { fill: none; stroke: var(--void-cursor-ring-color); stroke-width: 1.5; }
.void-cursor__ball--dot { width: var(--void-cursor-dot-size); height: var(--void-cursor-dot-size); }
.void-cursor__ball--dot circle { fill: var(--void-cursor-dot-color); }
html.void-cursor--native-hidden, html.void-cursor--native-hidden * { cursor: none !important; }
`

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CURSOR_STYLES
  document.head.append(style)
}

function moveElement(element: HTMLDivElement, position: Position) {
  element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`
}

function getMatchedTarget(node: EventTarget | null, selector: string) {
  if (!(node instanceof Element)) return null

  try {
    return node.closest(selector)
  } catch {
    return null
  }
}

/** A two-part custom cursor with an immediate dot and a trailing ring. */
export function VoidCursor({
  enabled = true,
  smoothing = 0.15,
  ringSize = 30,
  dotSize = 10,
  ringColor = '#f2efe8',
  dotColor = '#ffffff',
  hoverScale = 2.5,
  zIndex = 99999,
  hoverSelector = DEFAULT_HOVER_SELECTOR,
  hideNativeCursor = false,
  onHoverChange,
}: VoidCursorProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const ringSvgRef = useRef<SVGSVGElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const positionRef = useRef({ target: { x: 0, y: 0 }, ring: { x: 0, y: 0 }, hasPointer: false })
  const hoverTargetRef = useRef<Element | null>(null)
  const hoverCbRef = useRef(onHoverChange)
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  const [supported, setSupported] = useState(false)
  const [visible, setVisible] = useState(false)
  const resolvedSmoothing = Math.min(1, Math.max(0.01, smoothing))

  useEffect(() => {
    hoverCbRef.current = onHoverChange
  }, [onHoverChange])

  useEffect(() => {
    if (mounted) injectStyles()
  }, [mounted])

  useEffect(() => {
    if (!enabled) {
      positionRef.current.hasPointer = false
      queueMicrotask(() => setVisible(false))
      return
    }

    const coarsePointer = window.matchMedia('(pointer: coarse)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateSupport = () => {
      const nextSupported = !coarsePointer.matches && !reducedMotion.matches
      if (!nextSupported) {
        positionRef.current.hasPointer = false
        setVisible(false)
      }
      setSupported(nextSupported)
    }

    queueMicrotask(updateSupport)
    coarsePointer.addEventListener('change', updateSupport)
    reducedMotion.addEventListener('change', updateSupport)
    return () => {
      coarsePointer.removeEventListener('change', updateSupport)
      reducedMotion.removeEventListener('change', updateSupport)
    }
  }, [enabled])

  const active = enabled && supported

  useEffect(() => {
    if (!mounted || !active || !hideNativeCursor) return

    nativeCursorHiderCount += 1
    document.documentElement.classList.add('void-cursor--native-hidden')
    return () => {
      nativeCursorHiderCount -= 1
      if (nativeCursorHiderCount === 0) document.documentElement.classList.remove('void-cursor--native-hidden')
    }
  }, [active, hideNativeCursor, mounted])

  useEffect(() => {
    if (!mounted || !active) return

    const ring = ringRef.current
    const ringSvg = ringSvgRef.current
    const dot = dotRef.current
    if (!ring || !ringSvg || !dot) return

    let lastFrameTime: number | null = null
    const stopAnimation = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      lastFrameTime = null
    }
    const animate = (timestamp: number) => {
      const position = positionRef.current
      const dt = lastFrameTime === null ? 16.67 : Math.min(50, timestamp - lastFrameTime)
      const factor = 1 - Math.pow(1 - resolvedSmoothing, dt / 16.67)
      lastFrameTime = timestamp
      const dx = position.target.x - position.ring.x
      const dy = position.target.y - position.ring.y

      position.ring.x += dx * factor
      position.ring.y += dy * factor
      moveElement(ring, position.ring)

      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        position.ring = { ...position.target }
        moveElement(ring, position.ring)
        frameRef.current = null
        lastFrameTime = null
        return
      }

      frameRef.current = requestAnimationFrame(animate)
    }
    const scheduleAnimation = () => {
      if (frameRef.current === null && !document.hidden) {
        lastFrameTime = null
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    const updateHover = (target: Element | null) => {
      if (hoverTargetRef.current === target) return

      hoverTargetRef.current = target
      ringSvg.style.transform = target ? `scale(${hoverScale})` : 'scale(1)'
      hoverCbRef.current?.(Boolean(target), target)
    }
    const hideCursor = () => {
      stopAnimation()
      positionRef.current.hasPointer = false
      setVisible(false)
      updateHover(null)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return

      const position = positionRef.current
      position.target = { x: event.clientX, y: event.clientY }
      if (!position.hasPointer) {
        position.hasPointer = true
        position.ring = { ...position.target }
        moveElement(ring, position.ring)
        setVisible(true)
      }

      moveElement(dot, position.target)
      scheduleAnimation()
    }
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') updateHover(getMatchedTarget(event.target, hoverSelector))
    }
    const onPointerOut = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (event.relatedTarget === null) {
        hideCursor()
        return
      }

      const leaving = getMatchedTarget(event.target, hoverSelector)
      const entering = getMatchedTarget(event.relatedTarget, hoverSelector)
      if (leaving && leaving === entering) return
      if (hoverTargetRef.current === leaving) updateHover(entering)
    }
    const onPointerEnter = () => {
      positionRef.current.hasPointer = false
    }
    const onWindowBlur = () => {
      hideCursor()
    }
    const onWindowFocus = () => {
      positionRef.current.hasPointer = false
    }
    const onVisibilityChange = () => {
      if (document.hidden) hideCursor()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerenter', onPointerEnter, { passive: true })
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    document.addEventListener('pointerover', onPointerOver, { passive: true })
    document.addEventListener('pointerout', onPointerOut, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stopAnimation()
      updateHover(null)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerenter', onPointerEnter)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('pointerout', onPointerOut)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [active, hoverScale, hoverSelector, mounted, resolvedSmoothing])

  if (!mounted || !active) return null

  const style = {
    '--void-cursor-ring-size': `${ringSize}px`,
    '--void-cursor-dot-size': `${dotSize}px`,
    '--void-cursor-ring-color': ringColor,
    '--void-cursor-dot-color': dotColor,
    zIndex,
  } as CSSProperties

  return createPortal(
    <div className="void-cursor" style={style} aria-hidden="true" data-visible={visible || undefined}>
      <div ref={ringRef} className="void-cursor__ball void-cursor__ball--ring">
        <svg ref={ringSvgRef} width={ringSize} height={ringSize} viewBox="0 0 30 30" focusable="false">
          <circle cx="15" cy="15" r="12" />
        </svg>
      </div>
      <div ref={dotRef} className="void-cursor__ball void-cursor__ball--dot">
        <svg width={dotSize} height={dotSize} viewBox="0 0 10 10" focusable="false">
          <circle cx="5" cy="5" r="4" />
        </svg>
      </div>
    </div>,
    document.body,
  )
}

export default VoidCursor
