import { expect, test } from "@playwright/test"

import { CATALOG, mockApi, signInAndUnlock } from "./api"

const EMOTIONS = CATALOG.emotions.map((emotion) => emotion.value)
const SENSATIONS = CATALOG.sensory_types.map((type) => type.value)

function memories(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    name: `Recuerdo ${index + 1}`,
    explanation: "",
    emotion: EMOTIONS[index % EMOTIONS.length],
    trace_count: (index % 9) + 1,
    sensory_types: [SENSATIONS[index % SENSATIONS.length]],
  }))
}

test("HU10 · Escenario 3: con 200 recuerdos el mapa abre en menos de 3 segundos", async ({ page }) => {
  const results = memories(200)
  await mockApi(page, { "GET memories/": { body: { total: 200, count: 200, results } } })
  await signInAndUnlock(page)
  // Un teléfono de gama media: CPU cuatro veces más lenta que la del equipo de pruebas.
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })

  const started = Date.now()
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Recuerdos" }).click()
  await expect(page.getByTestId("memory-sphere")).toHaveCount(200)
  await expect(page.getByTestId("memory-sphere").last()).toBeAttached()
  const elapsed = Date.now() - started

  test.info().annotations.push({ type: "tiempo", description: `${elapsed} ms hasta ver las 200 esferas` })
  console.log(`HU10 · mapa con 200 recuerdos (CPU 4x más lenta): ${elapsed} ms`)
  expect(elapsed).toBeLessThan(3000)
})

test("HU10 · Escenarios 1 y 2: esferas de color, filtro y huellas de un recuerdo", async ({ page }) => {
  const calm = { id: "11111111-0000-4000-8000-000000000001", name: "Días de calma", explanation: "Momentos tranquilos.", emotion: "calma", trace_count: 6, sensory_types: ["aroma", "color"] }
  const songs = { id: "11111111-0000-4000-8000-000000000002", name: "Fiestas y amigos", explanation: "", emotion: "alegria", trace_count: 1, sensory_types: ["song"] }
  await mockApi(page, {
    "GET memories/": (url) => {
      const results = url.searchParams.get("sensory_type") === "song" ? [songs] : [calm, songs]
      return { body: { total: 2, count: results.length, results } }
    },
    [`GET memories/${calm.id}/`]: {
      body: {
        ...calm,
        status: "accepted",
        traces: [
          { id: "t1", sensory_type: "aroma", note: "Olor a lluvia sobre el pasto.", emotion: "calma", mood_intensity: 5, tags: [], happened_at: "2026-11-01T10:00:00-05:00", created_at: "2026-11-01T10:00:00-05:00", updated_at: "2026-11-01T10:00:00-05:00" },
        ],
      },
    },
  })
  await signInAndUnlock(page, "/recuerdos")

  const calmSphere = page.getByRole("button", { name: "Días de calma: Calma, 6 huellas" })
  const songSphere = page.getByRole("button", { name: "Fiestas y amigos: Alegría, 1 huella" })
  await expect(calmSphere).toHaveAttribute("data-emotion", "calma")
  // Más huellas, esfera más grande.
  const calmBox = await calmSphere.locator("span").first().boundingBox()
  const songBox = await songSphere.locator("span").first().boundingBox()
  expect(calmBox!.width).toBeGreaterThan(songBox!.width)

  await calmSphere.click()
  const dialog = page.getByRole("dialog", { name: "Días de calma" })
  await expect(dialog.getByText("Olor a lluvia sobre el pasto.")).toBeVisible()
  await dialog.getByRole("button", { name: "Cerrar" }).click()

  await page.getByRole("button", { name: "Filtrar por sensación o emoción" }).click()
  await page.getByRole("group", { name: "Sensación" }).getByRole("button", { name: "Canción" }).click()
  await expect(page.getByTestId("memory-sphere")).toHaveCount(1)
  await expect(songSphere).toBeVisible()
})
