import { describe, expect, it } from "vitest"
import fixtures from "./__fixtures__/polygon_area.json"
import { polygonArea, polygonPerimeter } from "./polygonArea"
import type { PointCm } from "./polygonArea"

type Fixture = {
  name: string
  points: number[][]
  expectedAreaCm2: number
  expectedPerimeterCm?: number
  toleranceCm2?: number
}

const toPoints = (pts: number[][]): PointCm[] => pts.map(([x, y]) => ({ x, y }))

const allFixtures = (fixtures as { fixtures: Fixture[] }).fixtures

describe("polygonArea — shoelace, the one area calculator in the product", () => {
  // Exact fixtures: square, non-convex, L-shape, degenerate.
  for (const f of allFixtures.filter(f => f.toleranceCm2 == null)) {
    it(f.name, () => {
      expect(polygonArea(toPoints(f.points))).toBe(f.expectedAreaCm2)
    })
  }

  // The 480-gon: its vertices lie ON the circle, so the polygon area is
  // slightly less than πR² (125 663.7… cm²) — a tolerance, not an exact
  // value (fixed in the fixture as 125 660 ± 10 cm²).
  it("circle-r2m-480 is within tolerance of πR²", () => {
    const circle = allFixtures.find(f => f.name === "circle-r2m-480")
    if (!circle) throw new Error("fixture missing: circle-r2m-480")
    const tolerance = circle.toleranceCm2 ?? 0
    expect(
      Math.abs(polygonArea(toPoints(circle.points)) - circle.expectedAreaCm2),
    ).toBeLessThanOrEqual(tolerance)
  })

  // The winding order must not matter: |Σ|/2 has no sign. Reversing the
  // traversal is the same polygon.
  it("reversed order gives the same area (sign is absorbed)", () => {
    const points = toPoints(allFixtures[0].points)
    expect(polygonArea([...points].reverse())).toBe(polygonArea(points))
  })

  it("perimeter of the 4×3 square is 1400 cm", () => {
    const points = toPoints(allFixtures[0].points)
    expect(polygonPerimeter(points)).toBe(1400)
  })
})
