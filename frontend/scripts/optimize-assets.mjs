/*
 * Genera las versiones optimizadas de los recursos visuales a partir del material fuente
 * de diseno/ (que nunca se modifica ni se sirve en producción).
 *
 *   npm run assets
 *
 * - Esferas: src/assets/orbs/orb-<emoción>.webp (500×500) y orb-<emoción>-sm.webp (128×128).
 * - Fondo estático: src/assets/backgrounds/bg-claro-estatico.webp (orientación EXIF aplicada).
 * - Videos: copia a public/media/ con nombres claros. Si hay ffmpeg (en el PATH o en la
 *   variable FFMPEG), además genera WebM (VP9) y los fotogramas fijos (posters).
 *
 * Si se regenera una esfera (por ejemplo la de alegría), basta con reemplazar el PNG en
 * diseno/ y volver a ejecutar el script: ningún componente cambia.
 */
import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const source = path.resolve(frontend, "..", "diseno")
const orbsDir = path.join(frontend, "src/assets/orbs")
const backgroundsDir = path.join(frontend, "src/assets/backgrounds")
const mediaDir = path.join(frontend, "public/media")

/** Archivo de diseno/ → clave de emoción (las mismas de src/lib/emotions.ts). */
const ORBS = {
  "Bola_amarilla.png": "alegria",
  "Bola_calma.png": "calma",
  "Bola_gratitud.png": "gratitud",
  "Bola_nostalgia.png": "nostalgia",
  "Bola_azul.png": "tristeza",
  "Bola_naranja.png": "ansiedad",
  "Bola_roja.png": "enojo",
  "Bola_morado.png": "miedo",
}

const VIDEOS = {
  "fondo_claro_vertical.mp4": "bg-claro-vertical",
  "fondo_claro_loop.mp4": "bg-claro-horizontal",
  "fondo_oscuro_vertical.mp4": "bg-oscuro-vertical",
  "fondo_oscuro_horizontal.mp4": "bg-oscuro-horizontal",
}

const KB = 1024
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`

/** Exporta a WebP bajando la calidad hasta cumplir el peso máximo. */
async function webpWithin(pipeline, file, { quality, minQuality, maxBytes, ...options }) {
  for (let q = quality; q >= minQuality; q -= 5) {
    const info = await pipeline.clone().webp({ quality: q, effort: 6, ...options }).toFile(file)
    if (info.size <= maxBytes) return { q, size: info.size }
  }
  throw new Error(`${path.basename(file)} no cabe en ${kb(maxBytes)} ni con calidad ${minQuality}`)
}

function findFfmpeg() {
  const candidate = process.env.FFMPEG || "ffmpeg"
  try {
    execFileSync(candidate, ["-version"], { stdio: "ignore" })
    return candidate
  } catch {
    return null
  }
}

mkdirSync(orbsDir, { recursive: true })
mkdirSync(backgroundsDir, { recursive: true })
mkdirSync(mediaDir, { recursive: true })

for (const [file, emotion] of Object.entries(ORBS)) {
  const input = sharp(path.join(source, file)).ensureAlpha()
  const large = await webpWithin(input.clone(), path.join(orbsDir, `orb-${emotion}.webp`), {
    quality: 85,
    minQuality: 60,
    maxBytes: 80 * KB,
    alphaQuality: 90,
  })
  const small = await webpWithin(
    input.clone().resize(128, 128, { kernel: "lanczos3" }),
    path.join(orbsDir, `orb-${emotion}-sm.webp`),
    { quality: 85, minQuality: 60, maxBytes: 12 * KB, alphaQuality: 90 },
  )
  console.log(`esfera ${emotion}: ${kb(large.size)} (q${large.q}) · sm ${kb(small.size)} (q${small.q})`)
}

// rotate() sin argumentos aplica la orientación EXIF: los píxeles quedan horizontales.
const background = sharp(path.join(source, "Fondo_estatico.jpg")).rotate().resize({ width: 1920 })
const bg = await webpWithin(background, path.join(backgroundsDir, "bg-claro-estatico.webp"), {
  quality: 80,
  minQuality: 50,
  maxBytes: 250 * KB,
})
const bgMeta = await sharp(path.join(backgroundsDir, "bg-claro-estatico.webp")).metadata()
console.log(`fondo estático: ${bgMeta.width}×${bgMeta.height}, ${kb(bg.size)} (q${bg.q})`)

const ffmpeg = findFfmpeg()
for (const [file, name] of Object.entries(VIDEOS)) {
  const input = path.join(source, file)
  const mp4 = path.join(mediaDir, `${name}.mp4`)
  copyFileSync(input, mp4)
  let line = `video ${name}: mp4 ${kb(statSync(mp4).size)}`
  if (ffmpeg) {
    const webm = path.join(mediaDir, `${name}.webm`)
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", input, "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "38", webm])
    const poster = path.join(mediaDir, `${name}-poster.webp`)
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-ss", "2", "-i", input, "-frames:v", "1", "-c:v", "libwebp", "-quality", "75", poster])
    line += ` · webm ${kb(statSync(webm).size)} · poster ${kb(statSync(poster).size)}`
  }
  console.log(line)
}
if (!ffmpeg) {
  console.warn("Sin ffmpeg: solo se copiaron los MP4. Los posters existentes en public/media/ se conservan.")
}
