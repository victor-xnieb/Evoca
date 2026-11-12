import { describe, expect, it } from "vitest"

import { fitView, forceLayout, MAX_ZOOM, MIN_ZOOM, zoomAround, type ForceNode } from "./force-layout"

const nodes = (count: number, radius = 40): ForceNode[] =>
  Array.from({ length: count }, (_, index) => ({ id: `n${index}`, radius }))

describe("HU10 · disposición de fuerzas del mapa", () => {
  it("es determinística: el mismo grafo siempre se dibuja igual", () => {
    const links = [{ source: "n0", target: "n1", score: 0.8 }]
    const first = forceLayout(nodes(8), links)
    const second = forceLayout(nodes(8), links)

    expect([...first.entries()]).toEqual([...second.entries()])
  })

  it("ninguna esfera se superpone con otra", () => {
    const layout = forceLayout(nodes(30, 50), [
      { source: "n0", target: "n1", score: 1 },
      { source: "n1", target: "n2", score: 0.9 },
    ])
    const points = [...layout.values()]

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThanOrEqual(100 - 1)
      }
    }
  })

  it("los recuerdos conectados quedan más cerca que los que no lo están", () => {
    const layout = forceLayout(nodes(10), [{ source: "n0", target: "n1", score: 1 }])
    const distance = (a: string, b: string) => Math.hypot(layout.get(a)!.x - layout.get(b)!.x, layout.get(a)!.y - layout.get(b)!.y)
    const unlinked = [2, 3, 4, 5, 6, 7, 8, 9].map((index) => distance("n0", `n${index}`))

    expect(distance("n0", "n1")).toBeLessThan(Math.min(...unlinked))
  })

  it("en un área vertical el grafo crece más hacia abajo que a los lados", () => {
    const layout = forceLayout(nodes(24), [], { aspect: 0.5 })
    const xs = [...layout.values()].map((point) => point.x)
    const ys = [...layout.values()].map((point) => point.y)

    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(Math.max(...xs) - Math.min(...xs))
  })

  it("con 200 recuerdos termina rápido y sin valores inválidos", () => {
    const links = Array.from({ length: 300 }, (_, index) => ({
      source: `n${index % 200}`,
      target: `n${(index * 7 + 3) % 200}`,
      score: 0.4 + (index % 6) / 10,
    }))
    const started = performance.now()
    const layout = forceLayout(nodes(200), links)

    expect(performance.now() - started).toBeLessThan(1500)
    expect(layout.size).toBe(200)
    expect([...layout.values()].every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true)
  })
})

describe("HU10 · zoom y encuadre del mapa", () => {
  it("encuadra todo el grafo dentro del área, sin agrandarlo más de 1:1", () => {
    const boxes = [
      { left: -300, right: -200, top: -100, bottom: 0 },
      { left: 200, right: 300, top: 400, bottom: 500 },
    ]
    const view = fitView(boxes, 360, 480, 16)

    for (const box of boxes) {
      expect(box.left * view.k + view.x).toBeGreaterThanOrEqual(0)
      expect(box.right * view.k + view.x).toBeLessThanOrEqual(360)
      expect(box.top * view.k + view.y).toBeGreaterThanOrEqual(0)
      expect(box.bottom * view.k + view.y).toBeLessThanOrEqual(480)
    }
    expect(fitView([{ left: 0, right: 10, top: 0, bottom: 10 }], 360, 480).k).toBe(1)
  })

  it("acerca manteniendo fijo el punto tocado y respeta los límites", () => {
    const view = zoomAround({ x: 10, y: 20, k: 1 }, 2, 100, 100)

    expect((100 - view.x) / view.k).toBeCloseTo((100 - 10) / 1)
    expect((100 - view.y) / view.k).toBeCloseTo((100 - 20) / 1)
    expect(zoomAround(view, 100, 0, 0).k).toBe(MAX_ZOOM)
    expect(zoomAround(view, 0.001, 0, 0).k).toBe(MIN_ZOOM)
  })
})
