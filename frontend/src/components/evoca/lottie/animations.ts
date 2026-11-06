/**
 * Ilustraciones Lottie propias de Evoca, generadas en código a partir de los tokens de
 * color. Así no dependen de archivos externos con licencias dudosas y, si cambia la
 * paleta en styles/tokens.css, las ilustraciones cambian con ella.
 * Solo animan transformaciones y opacidad.
 */

type Rgba = [number, number, number, number]
type Value = number | number[]

interface Keyframe {
  t: number
  s: Value
}

const FPS = 30
const SIZE = 200

function hexToRgba(hex: string): Rgba {
  const clean = hex.trim().replace("#", "")
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean
  const value = Number.parseInt(full.slice(0, 6), 16)
  if (Number.isNaN(value)) return [0.8, 0.7, 0.6, 1]
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1]
}

const fixed = (k: Value) => ({ a: 0, k })

/** Propiedad animada con curva suave entre cada par de fotogramas clave. */
function animated(frames: Keyframe[]) {
  return {
    a: 1,
    k: frames.map((frame, index) => {
      const s = Array.isArray(frame.s) ? frame.s : [frame.s]
      return index < frames.length - 1
        ? { t: frame.t, s, i: { x: 0.45, y: 1 }, o: { x: 0.55, y: 0 } }
        : { t: frame.t, s }
    }),
  }
}

function ellipse(width: number, height: number, color: Rgba, opacity = 100) {
  return [
    { ty: "el", d: 1, nm: "forma", p: fixed([0, 0]), s: fixed([width, height]) },
    { ty: "fl", nm: "relleno", c: fixed(color), o: fixed(opacity), r: 1, bm: 0 },
  ]
}

function ring(diameter: number, color: Rgba, strokeWidth: number) {
  return [
    { ty: "el", d: 1, nm: "anillo", p: fixed([0, 0]), s: fixed([diameter, diameter]) },
    { ty: "st", nm: "trazo", c: fixed(color), o: fixed(100), w: fixed(strokeWidth), lc: 2, lj: 2, ml: 4 },
  ]
}

interface LayerOptions {
  name: string
  shapes: unknown[]
  position: ReturnType<typeof fixed> | ReturnType<typeof animated>
  scale?: ReturnType<typeof fixed> | ReturnType<typeof animated>
  opacity?: ReturnType<typeof fixed> | ReturnType<typeof animated>
  rotation?: ReturnType<typeof fixed> | ReturnType<typeof animated>
}

function layer(index: number, frames: number, options: LayerOptions) {
  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm: options.name,
    sr: 1,
    ks: {
      o: options.opacity ?? fixed(100),
      r: options.rotation ?? fixed(0),
      p: options.position,
      a: fixed([0, 0, 0]),
      s: options.scale ?? fixed([100, 100, 100]),
    },
    ao: 0,
    shapes: [
      {
        ty: "gr",
        nm: "grupo",
        it: [
          ...options.shapes,
          {
            ty: "tr",
            nm: "transformación",
            p: fixed([0, 0]),
            a: fixed([0, 0]),
            s: fixed([100, 100]),
            r: fixed(0),
            o: fixed(100),
            sk: fixed(0),
            sa: fixed(0),
          },
        ],
      },
    ],
    ip: 0,
    op: frames,
    st: 0,
    bm: 0,
  }
}

function composition(name: string, frames: number, layers: unknown[]) {
  return { v: "5.7.4", fr: FPS, ip: 0, op: frames, w: SIZE, h: SIZE, nm: name, ddd: 0, assets: [], layers }
}

export interface IllustrationPalette {
  emotions: string[]
  ink: string
}

/**
 * «Orbes»: cuatro recuerdos de colores que flotan alrededor de una huella que respira.
 * Se usa en los estados vacíos.
 */
export function buildOrbs({ emotions, ink }: IllustrationPalette) {
  const frames = 120
  const center = SIZE / 2
  const orbits = [
    { x: -50, y: -34, size: 52 },
    { x: 54, y: -26, size: 42 },
    { x: 44, y: 50, size: 58 },
    { x: -48, y: 46, size: 38 },
  ]
  const orbLayers = orbits.map((orbit, index) => {
    const phase = index * 12
    const lift = index % 2 === 0 ? -8 : 8
    return layer(index + 1, frames, {
      name: `orbe-${index}`,
      shapes: ellipse(orbit.size, orbit.size, hexToRgba(emotions[index % emotions.length]), 92),
      position: animated([
        { t: 0, s: [center + orbit.x, center + orbit.y, 0] },
        { t: 30 + phase, s: [center + orbit.x * 1.06, center + orbit.y + lift, 0] },
        { t: frames, s: [center + orbit.x, center + orbit.y, 0] },
      ]),
      scale: animated([
        { t: 0, s: [100, 100, 100] },
        { t: 60, s: [112, 112, 100] },
        { t: frames, s: [100, 100, 100] },
      ]),
    })
  })
  const inkColor = hexToRgba(ink)
  const ripple = layer(10, frames, {
    name: "onda",
    shapes: ring(70, inkColor, 2.5),
    position: fixed([center, center, 0]),
    scale: animated([
      { t: 0, s: [70, 70, 100] },
      { t: frames, s: [190, 190, 100] },
    ]),
    opacity: animated([
      { t: 0, s: 55 },
      { t: frames, s: 0 },
    ]),
  })
  const core = layer(11, frames, {
    name: "huella",
    shapes: ellipse(38, 38, inkColor),
    position: fixed([center, center, 0]),
    scale: animated([
      { t: 0, s: [100, 100, 100] },
      { t: 60, s: [88, 88, 100] },
      { t: frames, s: [100, 100, 100] },
    ]),
  })
  return composition("orbes", frames, [core, ...orbLayers, ripple])
}

/**
 * «Florecer»: pétalos de emociones que se abren alrededor de un centro. Pensada para
 * la bienvenida y el ejemplo guiado del registro de huellas.
 */
export function buildBloom({ emotions, ink }: IllustrationPalette) {
  const frames = 150
  const center = SIZE / 2
  const petals = emotions.slice(0, 8).map((color, index, all) => {
    const angle = (360 / all.length) * index
    const start = index * 5
    return layer(index + 2, frames, {
      name: `pétalo-${index}`,
      shapes: [
        {
          ty: "gr",
          nm: "pétalo",
          it: [
            ...ellipse(34, 64, hexToRgba(color), 88),
            {
              ty: "tr",
              nm: "desplazamiento",
              p: fixed([0, -42]),
              a: fixed([0, 0]),
              s: fixed([100, 100]),
              r: fixed(0),
              o: fixed(100),
              sk: fixed(0),
              sa: fixed(0),
            },
          ],
        },
      ],
      position: fixed([center, center, 0]),
      rotation: animated([
        { t: 0, s: angle - 20 },
        { t: 40 + start, s: angle },
        { t: 110, s: angle + 6 },
        { t: frames, s: angle - 20 },
      ]),
      scale: animated([
        { t: 0, s: [0, 0, 100] },
        { t: 36 + start, s: [100, 100, 100] },
        { t: 110, s: [104, 104, 100] },
        { t: frames, s: [0, 0, 100] },
      ]),
    })
  })
  const heart = layer(1, frames, {
    name: "centro",
    shapes: ellipse(36, 36, hexToRgba(ink)),
    position: fixed([center, center, 0]),
    scale: animated([
      { t: 0, s: [60, 60, 100] },
      { t: 30, s: [100, 100, 100] },
      { t: 75, s: [92, 92, 100] },
      { t: 120, s: [100, 100, 100] },
      { t: frames, s: [60, 60, 100] },
    ]),
  })
  return composition("florecer", frames, [heart, ...petals])
}

export const ILLUSTRATIONS = { orbs: buildOrbs, bloom: buildBloom } as const
export type IllustrationName = keyof typeof ILLUSTRATIONS
