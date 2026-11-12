import { Maximize2, Minus, Plus } from "lucide-react"
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"

import { EMOTION_ORBS } from "@/lib/emotionOrbs"
import { getEmotionVisual, isEmotionSlug } from "@/lib/emotions"
import { fitView, forceLayout, zoomAround, type Point, type View } from "@/lib/force-layout"
import { affinityPercent, sphereDiameter, type MemoryEdge, type MemoryNode } from "@/lib/memories"
import { cn } from "@/lib/utils"

import { LABEL_WIDTH, MemorySphere } from "./MemorySphere"

/** Por debajo de este zoom los nombres se ocultan (salvo el elegido y sus vecinos). */
const LABEL_ZOOM = 0.5
/** Hasta cuántos recuerdos se muestran los nombres desde el primer dibujo. */
const LABELS_UP_TO = 40
/** Movimiento (px) a partir del cual un toque se vuelve arrastre. */
const DRAG_THRESHOLD = 6
/** Solo algunas esferas flotan, y solo en mapas pequeños: con cientos cansaría al teléfono. */
const FLOATING = 12
const FLOATING_MAX_NODES = 60
/** Desde aquí las esferas se dibujan en su versión ligera (sin resplandor), para abrir rápido. */
const LITE_FROM = 60

const edgeKey = (edge: MemoryEdge) => `${edge.source}|${edge.target}`

/** Distancia (px de pantalla) a la que un toque o el puntero «tocan» una línea. */
const EDGE_TOLERANCE = 12

/** Distancia del punto p al segmento a–b. */
function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * La conexión más cercana a un punto del mapa, si está a menos de `tolerance`. Se calcula con
 * geometría en lugar de un elemento invisible por línea: con cientos de conexiones, eso abre el
 * mapa más rápido.
 */
function edgeAt(point: Point, edges: MemoryEdge[], positions: Record<string, Point>, tolerance: number) {
  let best: MemoryEdge | null = null
  let bestDistance = tolerance
  for (const edge of edges) {
    const a = positions[edge.source]
    const b = positions[edge.target]
    if (!a || !b) continue
    const distance = distanceToSegment(point, a, b)
    if (distance <= bestDistance) {
      best = edge
      bestDistance = distance
    }
  }
  return best ? edgeKey(best) : null
}

/** Alto aproximado del nombre bajo la esfera (dos líneas y las huellas). */
const LABEL_HEIGHT = 52

/** Radio de choque: abarca la esfera con su nombre debajo, o el ancho del nombre. */
const radiusOf = (node: MemoryNode) => Math.max(sphereDiameter(node.trace_count) + LABEL_HEIGHT, LABEL_WIDTH) / 2 + 6

/** Lo que ocupa el nodo alrededor del centro de su esfera. */
const boxOf = (node: MemoryNode, point: Point) => {
  const diameter = sphereDiameter(node.trace_count)
  const half = Math.max(diameter, LABEL_WIDTH) / 2
  return { left: point.x - half, right: point.x + half, top: point.y - diameter / 2, bottom: point.y + diameter / 2 + LABEL_HEIGHT }
}

/** Proporción aproximada del mapa: casi todo el ancho de la pantalla y el 62 % de su alto. */
function viewportAspect() {
  if (typeof window === "undefined" || !window.innerHeight) return 1
  return Math.min(window.innerWidth - 40, 1000) / Math.max(420, Math.min(720, window.innerHeight * 0.62))
}

function computeLayout(nodes: MemoryNode[], edges: MemoryEdge[]) {
  const positions = forceLayout(
    nodes.map((node) => ({ id: node.id, radius: radiusOf(node) })),
    edges,
    { aspect: viewportAspect() },
  )
  return Object.fromEntries(positions) as Record<string, Point>
}

export interface MemoryGraphProps {
  nodes: MemoryNode[]
  edges: MemoryEdge[]
  /** Etiqueta visible de cada emoción. */
  emotionLabel: (emotion: string) => string
  selectedId: string | null
  onSelect: (id: string | null) => void
  className?: string
}

type Gesture =
  | { kind: "pan"; startX: number; startY: number; origin: View; moved: boolean; edge: string | null }
  | { kind: "node"; id: string; startX: number; startY: number; origin: Point; moved: boolean }
  | { kind: "pinch"; distance: number; mid: Point; origin: View }

/**
 * Mapa de recuerdos como grafo (HU10). Las esferas son nodos (color = emoción, tamaño =
 * huellas) unidos por líneas sutiles cuyo grosor y opacidad dependen de la afinidad.
 *
 * - La disposición se calcula una vez por conjunto de recuerdos (los filtros la conservan).
 * - Arrastrar el fondo desplaza; pellizcar, Ctrl + rueda o los botones acercan; arrastrar
 *   una esfera la mueve. El zoom y el desplazamiento no re-renderizan React.
 * - Tocar o pasar sobre una línea muestra su motivo; tocar una esfera la elige y resalta sus
 *   conexiones.
 */
export function MemoryGraph({ nodes, edges, emotionLabel, selectedId, onSelect, className }: MemoryGraphProps) {
  const container = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const view = useRef<View>({ x: 0, y: 0, k: 1 })
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Point>())
  // Con muchos recuerdos el encuadre aleja el mapa y los nombres se ocultan: empezar sin ellos
  // evita dibujar cientos de nombres para borrarlos enseguida.
  const [showLabels, setShowLabels] = useState(() => nodes.length <= LABELS_UP_TO)
  const [hoverEdge, setHoverEdge] = useState<string | null>(null)
  const [pinnedEdge, setPinnedEdge] = useState<string | null>(null)

  // La disposición depende solo de qué recuerdos hay: filtrar no la recalcula y conserva lo
  // que se haya movido a mano.
  const signature = useMemo(() => nodes.map((node) => node.id).join("|"), [nodes])
  const [layout, setLayout] = useState(() => ({ signature, positions: computeLayout(nodes, edges) }))
  if (layout.signature !== signature) setLayout({ signature, positions: computeLayout(nodes, edges) })
  const positions = layout.positions

  // Lo último que se dibujó, para los gestos (que viven fuera del ciclo de React).
  const latest = useRef({ positions, onSelect, nodes, edges })
  useLayoutEffect(() => {
    latest.current = { positions, onSelect, nodes, edges }
  })

  /** La conexión bajo un punto de la pantalla (relativo al mapa). */
  const edgeUnder = useCallback((screen: Point) => {
    const { x, y, k } = view.current
    const point = { x: (screen.x - x) / k, y: (screen.y - y) / k }
    return edgeAt(point, latest.current.edges, latest.current.positions, EDGE_TOLERANCE / k)
  }, [])

  const apply = useCallback(() => {
    const { x, y, k } = view.current
    if (layer.current) {
      layer.current.style.transform = `translate(${x}px, ${y}px) scale(${k})`
      // Los nombres compensan el zoom (ver .evoca-graph-layer en index.css) para seguir legibles.
      layer.current.style.setProperty("--graph-k", String(k))
    }
    setShowLabels(k >= LABEL_ZOOM)
  }, [])

  const size = () => {
    const element = container.current
    return { width: element?.clientWidth || 360, height: element?.clientHeight || 480 }
  }

  const fit = useCallback(() => {
    const { width, height } = size()
    const boxes = latest.current.nodes.flatMap((node) => {
      const point = latest.current.positions[node.id]
      return point ? [boxOf(node, point)] : []
    })
    view.current = fitView(boxes, width, height)
    apply()
  }, [apply])

  // Encuadra al abrir y con otro conjunto de recuerdos (filtrar no mueve la vista).
  useLayoutEffect(() => {
    fit()
  }, [fit, signature])

  const zoomBy = (factor: number) => {
    const { width, height } = size()
    view.current = zoomAround(view.current, factor, width / 2, height / 2)
    apply()
  }

  // Ctrl + rueda (o el pellizco del trackpad) acerca; la rueda sola sigue desplazando la página.
  useEffect(() => {
    const element = container.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      view.current = zoomAround(view.current, Math.exp(-event.deltaY * 0.0025), event.clientX - rect.left, event.clientY - rect.top)
      apply()
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [apply])

  // Antes del primer pintado: ningún toque puede llegar antes de que el mapa lo escuche.
  useLayoutEffect(() => {
    const local = (event: PointerEvent): Point => {
      const rect = container.current?.getBoundingClientRect()
      return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
    }
    const onMove = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return
      pointers.current.set(event.pointerId, local(event))
      const current = gesture.current
      if (!current) return
      if (current.kind === "pinch") {
        const [a, b] = [...pointers.current.values()]
        if (!a || !b) return
        const distance = Math.hypot(b.x - a.x, b.y - a.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const zoomed = zoomAround(current.origin, distance / current.distance, current.mid.x, current.mid.y)
        view.current = { ...zoomed, x: zoomed.x + mid.x - current.mid.x, y: zoomed.y + mid.y - current.mid.y }
        apply()
        return
      }
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      current.moved = true
      if (current.kind === "pan") {
        view.current = { ...current.origin, x: current.origin.x + dx, y: current.origin.y + dy }
        apply()
      } else {
        const k = view.current.k
        const point = { x: current.origin.x + dx / k, y: current.origin.y + dy / k }
        setLayout((previous) => ({ ...previous, positions: { ...previous.positions, [current.id]: point } }))
      }
    }
    const onEnd = (event: PointerEvent) => {
      if (!pointers.current.delete(event.pointerId)) return
      const current = gesture.current
      if (!current) return
      if (current.kind === "pinch") {
        gesture.current = null
        return
      }
      gesture.current = null
      if (current.moved || event.type === "pointercancel") return
      // Un toque sin arrastre.
      if (current.kind === "node") {
        setPinnedEdge(null)
        latest.current.onSelect(current.id)
      }
      else if (current.edge) setPinnedEdge(current.edge)
      else {
        setPinnedEdge(null)
        latest.current.onSelect(null)
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
    }
  }, [apply])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    const target = event.target as Element
    if (target.closest("[data-graph-control]")) return
    const rect = event.currentTarget.getBoundingClientRect()
    pointers.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        kind: "pinch",
        distance: Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        origin: { ...view.current },
      }
      return
    }
    const node = target.closest<HTMLElement>("[data-node]")?.dataset.node
    const edge = node ? null : edgeUnder({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    const origin = node ? positions[node] : undefined
    gesture.current =
      node && origin
        ? { kind: "node", id: node, startX: event.clientX, startY: event.clientY, origin, moved: false }
        : { kind: "pan", startX: event.clientX, startY: event.clientY, origin: { ...view.current }, moved: false, edge }
  }

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const neighbors = useMemo(() => {
    const set = new Set<string>()
    if (!selectedId) return set
    for (const edge of edges) {
      if (edge.source === selectedId) set.add(edge.target)
      if (edge.target === selectedId) set.add(edge.source)
    }
    return set
  }, [edges, selectedId])

  const activeKey = pinnedEdge ?? hoverEdge
  const active = activeKey ? edges.find((edge) => edgeKey(edge) === activeKey) : undefined
  const floating = nodes.length <= FLOATING_MAX_NODES
    ? new Set([...nodes].sort((a, b) => b.trace_count - a.trace_count).slice(0, FLOATING).map((node) => node.id))
    : new Set<string>()

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border bg-card/35 shadow-soft backdrop-blur-[2px]", className)}>
      <div
        ref={container}
        role="group"
        aria-label="Mapa de recuerdos"
        aria-describedby="mapa-ayuda"
        data-testid="memory-graph"
        className="relative size-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || gesture.current) return
          const target = event.target as Element
          if (target.closest("[data-node], [data-graph-control]")) return setHoverEdge(null)
          const rect = event.currentTarget.getBoundingClientRect()
          setHoverEdge(edgeUnder({ x: event.clientX - rect.left, y: event.clientY - rect.top }))
        }}
        onPointerLeave={() => setHoverEdge(null)}
      >
        <div ref={layer} data-testid="memory-graph-layer" className="evoca-graph-layer absolute top-0 left-0 origin-top-left will-change-transform">
          <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1" aria-hidden="true">
            {edges.map((edge) => {
              const a = positions[edge.source]
              const b = positions[edge.target]
              const from = byId.get(edge.source)
              const to = byId.get(edge.target)
              if (!a || !b || !from || !to) return null
              const key = edgeKey(edge)
              const incident = selectedId !== null && (edge.source === selectedId || edge.target === selectedId)
              return (
                <EdgeView
                  key={key}
                  id={key}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  score={edge.score}
                  colorA={getEmotionVisual(from.emotion).color}
                  colorB={nodes.length < LITE_FROM ? getEmotionVisual(to.emotion).color : undefined}
                  state={key === activeKey ? "active" : incident ? "strong" : selectedId ? "faint" : "normal"}
                />
              )
            })}
          </svg>
          {nodes.map((node) => {
            const point = positions[node.id]
            if (!point) return null
            const selected = node.id === selectedId
            const neighbor = neighbors.has(node.id)
            return (
              <NodeView
                key={node.id}
                node={node}
                x={point.x}
                y={point.y}
                emotionLabel={emotionLabel(node.emotion)}
                selected={selected}
                emphasized={neighbor}
                muted={selectedId !== null && !selected && !neighbor}
                showLabel={showLabels || selected || neighbor}
                animated={floating.has(node.id)}
                lite={nodes.length >= LITE_FROM}
                onKeyboardSelect={onSelect}
              />
            )
          })}
        </div>

        <div data-graph-control className="absolute top-3 right-3 flex flex-col gap-1.5">
          <GraphButton label="Acercar" onClick={() => zoomBy(1.3)}>
            <Plus aria-hidden="true" className="size-4" />
          </GraphButton>
          <GraphButton label="Alejar" onClick={() => zoomBy(1 / 1.3)}>
            <Minus aria-hidden="true" className="size-4" />
          </GraphButton>
          <GraphButton label="Centrar el mapa" onClick={fit}>
            <Maximize2 aria-hidden="true" className="size-4" />
          </GraphButton>
        </div>

        <div aria-live="polite" className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
          {active && (
            <p
              data-testid="edge-reason"
              className="max-w-md rounded-2xl border bg-background/90 px-4 py-2 text-center text-sm shadow-soft backdrop-blur-md"
            >
              <span className="font-semibold">
                {byId.get(active.source)?.name} · {byId.get(active.target)?.name}
              </span>
              <br />
              {active.reason} · afinidad&nbsp;{affinityPercent(active.score)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function GraphButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full border bg-background/85 text-foreground shadow-soft backdrop-blur-md transition-colors hover:bg-background focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  )
}

const EdgeView = memo(function EdgeView({
  id,
  x1,
  y1,
  x2,
  y2,
  score,
  colorA,
  colorB,
  state,
}: {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  score: number
  colorA: string
  colorB?: string
  state: "normal" | "strong" | "faint" | "active"
}) {
  const base = 0.22 + 0.5 * score
  const opacity = state === "active" || state === "strong" ? 0.9 : state === "faint" ? 0.08 : base
  const width = 1.2 + 3.2 * score + (state === "active" ? 1.5 : 0)
  return (
    <line
      data-testid="memory-edge"
      data-edge={id}
      data-state={state}
      data-score={score}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeLinecap="round"
      strokeWidth={width}
      strokeOpacity={opacity}
      vectorEffect="non-scaling-stroke"
      // Mezcla de los dos colores solo en mapas pequeños: con cientos de líneas, calcularla es costoso.
      style={{ stroke: colorB ? `color-mix(in oklab, ${colorA} 50%, ${colorB})` : colorA }}
    />
  )
})

const NodeView = memo(function NodeView({
  node,
  x,
  y,
  emotionLabel,
  selected,
  emphasized,
  muted,
  showLabel,
  animated,
  lite,
  onKeyboardSelect,
}: {
  node: MemoryNode
  x: number
  y: number
  emotionLabel: string
  selected: boolean
  /** Vecino del elegido: su nombre se ve a cualquier zoom. */
  emphasized: boolean
  muted: boolean
  showLabel: boolean
  animated: boolean
  lite: boolean
  onKeyboardSelect: (id: string) => void
}) {
  const diameter = sphereDiameter(node.trace_count)
  const width = Math.max(diameter, LABEL_WIDTH)
  return (
    <div
      data-node={node.id}
      data-match={node.match}
      data-emphasis={selected || emphasized || undefined}
      className={cn("absolute top-0 left-0", !lite && "transition-[opacity,filter] duration-300")}
      style={{
        transform: `translate(${x - width / 2}px, ${y - diameter / 2 - 4}px)`,
        zIndex: selected ? 2 : 1,
        opacity: !node.match ? 0.22 : muted ? 0.5 : 1,
        filter: node.match ? undefined : "saturate(0.4)",
      }}
    >
      {lite && !selected && !showLabel && isEmotionSlug(node.emotion) ? (
        // Mapas grandes: solo la imagen de la esfera. Abre mucho más rápido con cientos de nodos.
        <button
          type="button"
          data-testid="memory-sphere"
          data-emotion={node.emotion}
          aria-label={`${node.name}: ${emotionLabel}, ${node.trace_count} ${node.trace_count === 1 ? "huella" : "huellas"}`}
          aria-pressed={false}
          onClick={(event) => event.detail === 0 && onKeyboardSelect(node.id)}
          className="block rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{ width, height: diameter, padding: `0 ${(width - diameter) / 2}px` }}
        >
          <img
            src={EMOTION_ORBS[node.emotion].srcSm}
            alt=""
            width={diameter}
            height={diameter}
            decoding="async"
            draggable={false}
            className="block size-full select-none"
          />
        </button>
      ) : (
        <MemorySphere
          memory={node}
          emotionLabel={emotionLabel}
          diameter={diameter}
          animated={animated}
          phase={(Math.abs(Math.round(x + y)) % 10) / 10}
          showLabel={showLabel}
          selected={selected}
          lite={lite}
          // El toque y el arrastre los maneja el mapa; aquí solo Enter o Espacio (detail = 0).
          onOpen={(_, event) => event.detail === 0 && onKeyboardSelect(node.id)}
        />
      )}
    </div>
  )
})

/** Esqueleto mientras carga: esferas neutras que respiran (quietas si se pidió reducir el movimiento). */
export function MemoryGraphSkeleton({ className }: { className?: string }) {
  const spheres = [
    { left: "18%", top: "22%", size: 64 },
    { left: "58%", top: "16%", size: 84 },
    { left: "38%", top: "48%", size: 96 },
    { left: "72%", top: "58%", size: 60 },
    { left: "14%", top: "66%", size: 72 },
  ]
  return (
    <div
      role="status"
      aria-label="Cargando tus recuerdos"
      className={cn("relative overflow-hidden rounded-3xl border bg-card/35", className)}
    >
      {spheres.map((sphere, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="absolute animate-pulse rounded-full bg-muted motion-reduce:animate-none"
          style={{ left: sphere.left, top: sphere.top, width: sphere.size, height: sphere.size }}
        />
      ))}
    </div>
  )
}
