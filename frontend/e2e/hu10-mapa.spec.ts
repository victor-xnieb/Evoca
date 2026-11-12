import { expect, test } from "@playwright/test"

import { CATALOG, mockApi, signInAndUnlock } from "./api"

const EMOTIONS = CATALOG.emotions.map((emotion) => emotion.value)
const SENSATIONS = CATALOG.sensory_types.map((type) => type.value)

/** Un grafo como el del servidor: 200 recuerdos y conexiones de hasta 4 por recuerdo. */
function bigGraph(count: number) {
  const nodes = Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    name: `Recuerdo ${index + 1}`,
    explanation: "",
    emotion: EMOTIONS[index % EMOTIONS.length],
    trace_count: (index % 9) + 1,
    sensory_types: [SENSATIONS[index % SENSATIONS.length]],
    match: true,
  }))
  const degree = new Map<string, number>()
  const edges = []
  for (let index = 0; index < count * 2; index++) {
    const a = nodes[index % count].id
    const b = nodes[(index * 7 + 5) % count].id
    if (a === b || (degree.get(a) ?? 0) >= 4 || (degree.get(b) ?? 0) >= 4) continue
    degree.set(a, (degree.get(a) ?? 0) + 1)
    degree.set(b, (degree.get(b) ?? 0) + 1)
    edges.push({ source: a, target: b, score: 0.4 + (index % 6) / 10, reason: "Comparten aromas y un tono luminoso" })
  }
  return { total: count, count, nodes, edges, max_links: 4 }
}

test("HU10 · Escenario 3: con 200 recuerdos el mapa abre en menos de 3 segundos", async ({ page }) => {
  const graph = bigGraph(200)
  await mockApi(page, { "GET memories/": { body: graph } })
  await signInAndUnlock(page)
  // Un teléfono de gama media: CPU cuatro veces más lenta que la del equipo de pruebas
  // (E2E_CPU_RATE=1 lo quita, por ejemplo si el equipo está ocupado con otras tareas).
  const rate = Number(process.env.E2E_CPU_RATE ?? 4)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate })

  // Tres aperturas desde Inicio y se compara la mediana: una sola medición depende mucho de lo
  // que esté haciendo el equipo en ese momento.
  const nav = page.getByRole("navigation", { name: "Navegación principal" })
  const times: number[] = []
  for (let round = 0; round < 3; round++) {
    const started = Date.now()
    await nav.getByRole("link", { name: "Recuerdos" }).click()
    await expect(page.getByTestId("memory-sphere")).toHaveCount(200, { timeout: 10_000 })
    await expect(page.getByTestId("memory-edge")).toHaveCount(graph.edges.length)
    await expect(page.getByTestId("memory-sphere").first()).toBeVisible()
    times.push(Date.now() - started)
    await nav.getByRole("link", { name: "Inicio" }).click()
    await expect(page.getByTestId("memory-graph")).toHaveCount(0)
  }
  const median = [...times].sort((a, b) => a - b)[1]

  test.info().annotations.push({ type: "tiempo", description: `${times.join(", ")} ms (mediana ${median} ms)` })
  console.log(
    `HU10 · grafo con 200 recuerdos y ${graph.edges.length} conexiones (CPU ${rate}x más lenta): ${times.join(", ")} ms · mediana ${median} ms`,
  )
  expect(median).toBeLessThan(3000)
})

test("HU10 · Escenarios 1 y 2: grafo, motivo de una conexión, huellas y filtro", async ({ page }) => {
  const calm = { id: "11111111-0000-4000-8000-000000000001", name: "Días de calma", explanation: "Momentos tranquilos.", emotion: "calma", trace_count: 6, sensory_types: ["aroma", "color"], match: true }
  const family = { id: "11111111-0000-4000-8000-000000000002", name: "La familia", explanation: "", emotion: "gratitud", trace_count: 3, sensory_types: ["aroma", "song"], match: true }
  const party = { id: "11111111-0000-4000-8000-000000000003", name: "Fiestas", explanation: "", emotion: "alegria", trace_count: 1, sensory_types: ["song"], match: true }
  const link = { source: calm.id, target: family.id, score: 0.72, reason: "Comparten aromas y un tono luminoso" }
  await mockApi(page, {
    "GET memories/": (url) => {
      const song = url.searchParams.get("sensory_type") === "song"
      const nodes = [calm, family, party].map((node) => ({ ...node, match: !song || node.sensory_types.includes("song") }))
      return { body: { total: 3, count: nodes.filter((node) => node.match).length, nodes, edges: song ? [] : [link], max_links: 4 } }
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
  const partySphere = page.getByRole("button", { name: "Fiestas: Alegría, 1 huella" })
  await expect(calmSphere).toHaveAttribute("data-emotion", "calma")
  await expect(page.getByTestId("memory-edge")).toHaveCount(1)
  // Más huellas, esfera más grande.
  const calmBox = await calmSphere.locator("span").first().boundingBox()
  const partyBox = await partySphere.locator("span").first().boundingBox()
  expect(calmBox!.width).toBeGreaterThan(partyBox!.width)

  // Tocar la línea muestra su motivo (se toca el punto medio entre las dos esferas).
  const a = (await calmSphere.locator("span").first().boundingBox())!
  const b = (await page.getByRole("button", { name: /^La familia/ }).locator("span").first().boundingBox())!
  await page.mouse.click((a.x + a.width / 2 + b.x + b.width / 2) / 2, (a.y + a.height / 2 + b.y + b.height / 2) / 2)
  await expect(page.getByTestId("edge-reason")).toContainText("Comparten aromas y un tono luminoso · afinidad 72")

  // Tocar una esfera resalta su conexión y muestra sus huellas.
  await calmSphere.click()
  await expect(page.getByTestId("memory-edge").first()).toHaveAttribute("data-state", "strong")
  await expect(page.getByRole("region", { name: "Días de calma" }).getByText("Olor a lluvia sobre el pasto.")).toBeVisible()

  // Arrastrar una esfera la mueve.
  const node = page.locator(`[data-node="${party.id}"]`)
  const before = await node.getAttribute("style")
  const box = (await partySphere.locator("span").first().boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 })
  await page.mouse.up()
  expect(await node.getAttribute("style")).not.toBe(before)

  // El filtro atenúa lo que no coincide y quita las conexiones con ellos.
  await page.getByRole("button", { name: "Filtrar por sensación o emoción" }).click()
  await page.getByRole("group", { name: "Sensación" }).getByRole("button", { name: "Canción" }).click()
  await expect(page.locator(`[data-node="${calm.id}"]`)).toHaveAttribute("data-match", "false")
  await expect(node).toHaveAttribute("data-match", "true")
  await expect(page.getByTestId("memory-edge")).toHaveCount(0)
})
