import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoidCursor } from './VoidCursor'

function pointerEvent(type: string, target: EventTarget, relatedTarget: EventTarget | null = null) {
  const event = new Event(type, { bubbles: true }) as PointerEvent
  Object.defineProperties(event, { clientX: { value: 120 }, clientY: { value: 80 }, pointerType: { value: 'mouse' }, relatedTarget: { value: relatedTarget } })
  target.dispatchEvent(event)
}

async function mount(element: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  return { container, root }
}

async function unmount(root: Root, container: HTMLElement) {
  await act(async () => root.unmount())
  container.remove()
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) })
})

afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.classList.remove('void-cursor--native-hidden')
})

describe('VoidCursor', () => {
  it('keeps multiple instances independent', async () => {
    const { container, root } = await mount(<><VoidCursor hoverSelector="#first" /><VoidCursor hoverSelector="#second" /></>)
    const first = document.createElement('button')
    first.id = 'first'
    document.body.append(first)
    const rings = document.querySelectorAll<HTMLDivElement>('.void-cursor__ball--ring')
    pointerEvent('pointerover', first)
    expect(rings).toHaveLength(2)
    expect(rings[0].style.scale).toBe('2.5')
    expect(rings[1].style.scale).toBe('1')
    await unmount(root, container)
    first.remove()
  })

  it('only expands opted-in hover targets by default', async () => {
    const { container, root } = await mount(<VoidCursor />)
    const plainButton = document.createElement('button')
    const optedIn = document.createElement('button')
    optedIn.dataset.voidCursor = 'hover'
    document.body.append(plainButton, optedIn)
    const ring = document.querySelector<HTMLDivElement>('.void-cursor__ball--ring')!
    pointerEvent('pointerover', plainButton)
    expect(ring.style.scale).toBe('1')
    pointerEvent('pointerover', optedIn)
    expect(ring.style.scale).toBe('2.5')
    pointerEvent('pointerout', optedIn)
    expect(ring.style.scale).toBe('1')
    await unmount(root, container)
    plainButton.remove()
    optedIn.remove()
  })

  it('removes global listeners and native cursor state on unmount', async () => {
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    const { container, root } = await mount(<VoidCursor hideNativeCursor />)
    expect(document.documentElement.classList.contains('void-cursor--native-hidden')).toBe(true)
    await unmount(root, container)
    expect(removeWindowListener).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeDocumentListener).toHaveBeenCalledWith('pointerover', expect.any(Function))
    expect(document.documentElement.classList.contains('void-cursor--native-hidden')).toBe(false)
    removeWindowListener.mockRestore()
    removeDocumentListener.mockRestore()
  })

  it('is safe to render on the server', () => {
    expect(() => renderToString(<VoidCursor />)).not.toThrow()
    expect(renderToString(<VoidCursor />)).toBe('')
  })
})
