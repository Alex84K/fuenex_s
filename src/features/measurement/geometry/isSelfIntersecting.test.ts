import { describe, expect, it } from "vitest"
import { isSelfIntersecting } from "./isSelfIntersecting"
import type { PointCm } from "./polygonArea"

const p = (pts: [number, number][]): PointCm[] =>
  pts.map(([x, y]) => ({ x, y }))

describe("isSelfIntersecting", () => {
  it("figure-eight is self-intersecting", () => {
    // Two triangles sharing a vertex in a bow-tie — the classic case.
    const bowTie = p([
      [0, 0],
      [400, 0],
      [200, 200],
      [0, 400],
      [400, 400],
    ])
    expect(isSelfIntersecting(bowTie)).toBe(true)
  })

  it("a plain triangle is not", () => {
    expect(
      isSelfIntersecting(
        p([
          [0, 0],
          [300, 0],
          [150, 250],
        ]),
      ),
    ).toBe(false)
  })

  it("a non-convex polygon without crossings is not", () => {
    expect(
      isSelfIntersecting(
        p([
          [0, 0],
          [400, 0],
          [400, 100],
          [200, 100],
          [200, 300],
          [0, 300],
        ]),
      ),
    ).toBe(false)
  })

  // The collinear-overlap case from the sample: adjacent sides lying on
  // the same line must NOT count as an intersection (the sample guards it
  // with areCollinearOverlapping).
  it("collinear adjacent sides are not an intersection", () => {
    const points = p([
      [0, 0],
      [100, 0],
      [200, 0],
      [200, 100],
      [0, 100],
    ])
    expect(isSelfIntersecting(points)).toBe(false)
  })

  it("fewer than 4 points can never self-intersect", () => {
    expect(
      isSelfIntersecting(
        p([
          [0, 0],
          [100, 0],
        ]),
      ),
    ).toBe(false)
  })
})
