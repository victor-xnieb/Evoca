/**
 * Disposición orgánica del mapa de recuerdos (HU10) con una simulación de fuerzas propia y
 * pequeña (sin librerías): los nodos se repelen, las conexiones los acercan según su afinidad,
 * una gravedad suave los mantiene juntos y nunca se superponen.
 *
 * Es determinística (sin azar: parte de una espiral ordenada por el id), así que el mismo
 * grafo siempre se dibuja igual y no depende del orden cronológico.
 */

export interface ForceNode {
  id: string
  /** Radio de choque (px): la esfera más el espacio de su nombre. */
  radius: number
}

export interface ForceLink {
  source: string
  target: string
  /** Afinidad de 0 a 1: más afinidad, conexión más corta y más firme. */
  score: number
}

export interface Point {
  x: number
  y: number
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const CHARGE = -500
const GRAVITY = 0.1
const VELOCITY_DECAY = 0.42
const GAP = 10

/** Número estable a partir de un texto (FNV-1a). */
export function hashId(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export interface LayoutOptions {
  /** Proporción ancho / alto del área donde se dibuja: en un teléfono vertical el grafo crece hacia abajo. */
  aspect?: number
  iterations?: number
}

export function forceLayout(nodes: ForceNode[], links: ForceLink[], options: LayoutOptions = {}): Map<string, Point> {
  const count = nodes.length
  const steps = options.iterations ?? (count > 120 ? 70 : count > 40 ? 200 : 300)
  const aspect = Math.min(Math.max(options.aspect ?? 1, 0.4), 2.5)
  // La gravedad aprieta más el lado corto del área: el grafo toma su forma.
  const gravityX = GRAVITY / Math.min(aspect, 1)
  const gravityY = GRAVITY * Math.max(aspect, 1)
  const x = new Float64Array(count)
  const y = new Float64Array(count)
  const vx = new Float64Array(count)
  const vy = new Float64Array(count)
  const radius = nodes.map((node) => node.radius)
  const index = new Map(nodes.map((node, position) => [node.id, position]))

  // Punto de partida: espiral de girasol, en un orden que solo depende del id.
  nodes
    .map((node, position) => ({ position, key: hashId(node.id) }))
    .sort((a, b) => a.key - b.key)
    .forEach(({ position }, order) => {
      const distance = 60 * Math.sqrt(order + 0.5)
      x[position] = distance * Math.cos(order * GOLDEN_ANGLE)
      y[position] = distance * Math.sin(order * GOLDEN_ANGLE)
    })

  const degree = new Float64Array(count)
  const springs = links.flatMap((link) => {
    const a = index.get(link.source)
    const b = index.get(link.target)
    if (a === undefined || b === undefined || a === b) return []
    degree[a]++
    degree[b]++
    return [{ a, b, score: link.score }]
  })
  const springData = springs.map(({ a, b, score }) => ({
    a,
    b,
    length: radius[a] + radius[b] + 24 + (1 - score) * 110,
    strength: (0.25 + 0.6 * score) / Math.min(degree[a], degree[b]),
  }))

  let alpha = 1
  const decay = 1 - Math.pow(0.002, 1 / steps)

  for (let step = 0; step < steps; step++) {
    // Conexiones: resortes hacia su largo ideal.
    for (const { a, b, length, strength } of springData) {
      const dx = x[b] + vx[b] - x[a] - vx[a]
      const dy = y[b] + vy[b] - y[a] - vy[a]
      const distance = Math.hypot(dx, dy) || 0.01
      const force = ((distance - length) / distance) * alpha * strength
      vx[b] -= dx * force * 0.5
      vy[b] -= dy * force * 0.5
      vx[a] += dx * force * 0.5
      vy[a] += dy * force * 0.5
    }
    // Repulsión entre todos los nodos y gravedad hacia el centro.
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = x[j] - x[i]
        const dy = y[j] - y[i]
        const squared = Math.max(dx * dx + dy * dy, 100)
        const force = (CHARGE * alpha) / squared
        vx[i] += dx * force
        vy[i] += dy * force
        vx[j] -= dx * force
        vy[j] -= dy * force
      }
      vx[i] -= x[i] * gravityX * alpha
      vy[i] -= y[i] * gravityY * alpha
    }
    for (let i = 0; i < count; i++) {
      vx[i] *= 1 - VELOCITY_DECAY
      vy[i] *= 1 - VELOCITY_DECAY
      x[i] += vx[i]
      y[i] += vy[i]
    }
    separate(x, y, radius, 0.7)
    alpha -= alpha * decay
  }
  for (let pass = 0; pass < 4; pass++) separate(x, y, radius, 1)

  return new Map(nodes.map((node, position) => [node.id, { x: x[position], y: y[position] }]))
}

/** Empuja a los nodos que se tocan hasta que quede un pequeño espacio entre ellos. */
function separate(x: Float64Array, y: Float64Array, radius: number[], amount: number) {
  for (let i = 0; i < x.length; i++) {
    for (let j = i + 1; j < x.length; j++) {
      const dx = x[j] - x[i]
      const dy = y[j] - y[i]
      const minimum = radius[i] + radius[j] + GAP
      const squared = dx * dx + dy * dy
      if (squared >= minimum * minimum) continue
      const distance = Math.sqrt(squared) || 0.01
      const push = ((minimum - distance) / distance) * 0.5 * amount
      x[i] -= dx * push
      y[i] -= dy * push
      x[j] += dx * push
      y[j] += dy * push
    }
  }
}

export interface View {
  x: number
  y: number
  /** Escala (zoom). */
  k: number
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.5

/** Lo que ocupa un nodo en pantalla (la esfera y el nombre que cuelga debajo). */
export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/** Vista que encuadra todo el grafo en un área de `width` × `height`, sin pasar de 1:1. */
export function fitView(boxes: Box[], width: number, height: number, padding = 16): View {
  if (boxes.length === 0) return { x: width / 2, y: height / 2, k: 1 }
  const minX = Math.min(...boxes.map((box) => box.left))
  const maxX = Math.max(...boxes.map((box) => box.right))
  const minY = Math.min(...boxes.map((box) => box.top))
  const maxY = Math.max(...boxes.map((box) => box.bottom))
  const k = clampZoom(Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY), 1))
  return { k, x: width / 2 - ((minX + maxX) / 2) * k, y: height / 2 - ((minY + maxY) / 2) * k }
}

export function clampZoom(k: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k))
}

/** Acerca o aleja la vista manteniendo fijo el punto (px, py) de la pantalla. */
export function zoomAround(view: View, factor: number, px: number, py: number): View {
  const k = clampZoom(view.k * factor)
  const ratio = k / view.k
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }
}
