import { useEffect, useRef } from "react"

import { useFinePointer } from "@/hooks/use-fine-pointer"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { resolveCursorTarget, type CursorTarget } from "@/lib/cursor"

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Medidas del anillo: una burbuja que se adapta un poco al tamaño de lo que señala. */
function ringSize({ state, element, label }: CursorTarget) {
  if (state !== "card" && state !== "link") return null
  const rect = element!.getBoundingClientRect()
  const minWidth = label ? label.length * 7 + 30 : 0
  if (state === "link") {
    return { w: Math.max(minWidth, clamp(rect.width * 0.35, 44, 72)), h: clamp(rect.height * 0.6, 36, 52) }
  }
  return { w: Math.max(minWidth, clamp(rect.width * 0.09, 56, 84)), h: clamp(rect.height * 0.08, 50, 64) }
}

/**
 * Seguidor decorativo del puntero: un punto y un anillo con retraso de resorte que se
 * transforma sobre tarjetas, enlaces, esferas y texto. El cursor del sistema sigue visible.
 * Solo existe con mouse y sin movimiento reducido. Un listener global, posición con
 * requestAnimationFrame + transform y estado en atributos: nunca re-renderiza React.
 */
export function InteractiveCursor() {
  const finePointer = useFinePointer()
  const reduced = useReducedMotion()
  const enabled = finePointer && !reduced
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const dotEl = dot.current
    const ringEl = ring.current
    const labelEl = label.current
    if (!enabled || !dotEl || !ringEl || !labelEl) return

    const pointer = { x: -100, y: -100 }
    const ringPos = { x: -100, y: -100, vx: 0, vy: 0 }
    const loop = { frame: 0 }
    const last = { target: null as Element | null }

    const setState = (next: CursorTarget) => {
      dotEl.dataset.state = next.state
      ringEl.dataset.state = next.state
      labelEl.textContent = next.label ?? ""
      const accent = next.element ? getComputedStyle(next.element).getPropertyValue("--cursor-accent").trim() : ""
      ringEl.style.setProperty("--cursor-color", accent || "var(--ring)")
      dotEl.style.setProperty("--cursor-color", accent || "var(--evoca-ink)")
      const size = ringSize(next)
      ringEl.style.setProperty("--ring-w", size ? `${size.w}px` : "")
      ringEl.style.setProperty("--ring-h", size ? `${size.h}px` : "")
    }

    const tick = () => {
      // Resorte simple: el anillo persigue al punto con un poco de retraso.
      ringPos.vx = (ringPos.vx + (pointer.x - ringPos.x) * 0.2) * 0.62
      ringPos.vy = (ringPos.vy + (pointer.y - ringPos.y) * 0.2) * 0.62
      ringPos.x += ringPos.vx
      ringPos.y += ringPos.vy
      dotEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`
      ringEl.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      const settled = Math.abs(pointer.x - ringPos.x) + Math.abs(pointer.y - ringPos.y) < 0.2
      loop.frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const handle = (event: PointerEvent) => {
      if (event.type === "pointerout") {
        if (!event.relatedTarget) setState({ state: "hidden" })
        last.target = null
        return
      }
      if (event.pointerType !== "mouse") {
        setState({ state: "hidden" })
        return
      }
      if (event.type === "pointerdown") {
        ringEl.dataset.pressed = ""
        dotEl.dataset.pressed = ""
      }
      if (event.type === "pointerup") {
        delete ringEl.dataset.pressed
        delete dotEl.dataset.pressed
      }
      pointer.x = event.clientX
      pointer.y = event.clientY
      const target = event.target instanceof Element ? event.target : null
      if (target !== last.target) {
        last.target = target
        setState(resolveCursorTarget(target))
      }
      if (!loop.frame) loop.frame = requestAnimationFrame(tick)
    }

    const types = ["pointermove", "pointerdown", "pointerup", "pointerout"] as const
    for (const type of types) window.addEventListener(type, handle, { passive: true })
    return () => {
      for (const type of types) window.removeEventListener(type, handle)
      cancelAnimationFrame(loop.frame)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      <div ref={ring} aria-hidden="true" className="evoca-cursor-ring" data-state="hidden" data-testid="cursor-ring">
        <span ref={label} />
      </div>
      <div ref={dot} aria-hidden="true" className="evoca-cursor-dot" data-state="hidden" />
    </>
  )
}
