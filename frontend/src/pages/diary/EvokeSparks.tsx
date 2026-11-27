import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface Spark {
  id: number
  from: { x: number; y: number }
  to: { x: number; y: number }
  color: string
  delay: number
}

/**
 * HU18: al evocar, de cada palabra iluminada se desprende una luz que viaja hasta «Recuerdos» en
 * la barra, donde nace la esfera sugerida. Solo es decoración (aria-hidden); con «reducir
 * movimiento» no se muestra.
 */
export function EvokeSparks({ trigger, root, onDone }: { trigger: number; root: HTMLElement | null; onDone?: () => void }) {
  const [sparks, setSparks] = useState<Spark[]>([])

  useEffect(() => {
    if (!trigger || !root) return
    const target = document.querySelector<HTMLElement>('nav[aria-label="Navegación principal"] a[href="/recuerdos"]')
    const words = [...root.querySelectorAll<HTMLElement>(".diary-evoked")].slice(0, 10)
    if (!target || !words.length) return
    const end = target.getBoundingClientRect()
    const next = words.map((word, index) => {
      const box = word.getBoundingClientRect()
      return {
        id: trigger * 100 + index,
        from: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
        to: { x: end.left + end.width / 2, y: end.top + end.height / 2 },
        color: getComputedStyle(word).getPropertyValue("--glow") || "var(--emotion-calma)",
        delay: 0.5 + index * 0.08,
      }
    })
    // Se agregan en el siguiente cuadro, cuando las palabras ya se iluminaron.
    const frame = requestAnimationFrame(() => setSparks(next))
    const timer = window.setTimeout(() => {
      setSparks([])
      onDone?.()
    }, 2200)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [trigger, root, onDone])

  if (!sparks.length) return null
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      {sparks.map((spark) => (
        <motion.span
          key={spark.id}
          className="absolute size-3 rounded-full"
          style={{ left: 0, top: 0, background: spark.color, boxShadow: `0 0 14px 4px ${spark.color}` }}
          initial={{ x: spark.from.x, y: spark.from.y, scale: 0.4, opacity: 0 }}
          animate={{
            x: [spark.from.x, (spark.from.x + spark.to.x) / 2 + 40, spark.to.x],
            y: [spark.from.y, Math.min(spark.from.y, spark.to.y) - 80, spark.to.y],
            scale: [0.4, 1.2, 0.6],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 1.1, delay: spark.delay, ease: "easeInOut" }}
        />
      ))}
    </div>,
    document.body,
  )
}
