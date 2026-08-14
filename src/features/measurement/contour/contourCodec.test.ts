import { describe, expect, it } from "vitest"
import {
  buildContour,
  contourByteSize,
  parseContour,
  type ContourDraft,
} from "./contourCodec"
import type { PointCm } from "../geometry/polygonArea"

const cm = (pts: [number, number][]): PointCm[] =>
  pts.map(([x, y]) => ({ x, y }))

// Round-trip fixtures: integer centimetre coordinates, non-convex included.
// parse(build(draft)) must return the draft unchanged — points exact, edge
// sources preserved, schema version as written.
const roundTrips: ContourDraft[] = [
  {
    points: cm([
      [0, 0],
      [400, 0],
      [400, 300],
      [0, 300],
    ]),
    edgeSources: ["manual", "manual", "manual", "manual"],
    schemaVersion: 1,
  },
  {
    points: cm([
      [0, 0],
      [400, 0],
      [400, 100],
      [200, 100],
      [200, 300],
      [0, 300],
    ]),
    edgeSources: ["manual", "manual", "manual", "manual", "manual", "manual"],
    schemaVersion: 1,
  },
  {
    points: cm([
      [0, 0],
      [300, 0],
      [300, 200],
      [500, 200],
      [500, 500],
      [0, 500],
    ]),
    edgeSources: ["manual", "manual", "manual", "manual", "manual", "manual"],
    schemaVersion: 1,
  },
  {
    points: cm([
      [0, 0],
      [300, 0],
      [0, 400],
    ]),
    edgeSources: ["manual", "manual", "manual"],
    schemaVersion: 1,
  },
  {
    points: cm([
      [0, 0],
      [200, 0],
      [260, 120],
      [100, 200],
      [-60, 100],
    ]),
    edgeSources: ["manual", "manual", "manual", "manual", "manual"],
    schemaVersion: 1,
  },
  // Negative coordinates — a yard drawn from an arbitrary origin.
  {
    points: cm([
      [-100, -100],
      [300, -100],
      [300, 200],
      [-100, 200],
    ]),
    edgeSources: ["manual", "manual", "manual", "manual"],
    schemaVersion: 1,
  },
  // Mixed origins (D14): a lidar contour with one manually corrected side.
  {
    points: cm([
      [0, 0],
      [400, 0],
      [400, 300],
      [0, 300],
    ]),
    edgeSources: ["lidar", "manual", "lidar", "lidar"],
    schemaVersion: 1,
  },
]

describe("contourCodec round-trip (cm → m → cm)", () => {
  for (const [i, draft] of roundTrips.entries()) {
    it(`fixture ${String(i + 1)}`, () => {
      expect(parseContour(buildContour(draft))).toEqual(draft)
    })
  }

  it("the wire is always metres", () => {
    const wire = buildContour(roundTrips[0])
    expect(wire.units).toBe("m")
    expect(wire.vertices[1]).toEqual({ x: 4, y: 0 }) // 400 cm → 4 m
    expect(wire.edges[0].lengthM).toBe(4)
  })

  it("edge length is reference-only and derived from the vertices", () => {
    const wire = buildContour(roundTrips[0])
    expect(wire.edges[0].lengthM).toBeCloseTo(4, 9)
  })
})

describe("parseContour tolerance table (DESIGN §7.4)", () => {
  it("null → null (not measured yet)", () => {
    expect(parseContour(null)).toBeNull()
  })

  it("not an object → null", () => {
    expect(parseContour("мусор")).toBeNull()
    expect(parseContour(42)).toBeNull()
  })

  it("no vertices or fewer than 3 → null", () => {
    expect(parseContour({})).toBeNull()
    expect(parseContour({ vertices: [] })).toBeNull()
    expect(
      parseContour({
        vertices: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
        ],
      }),
    ).toBeNull()
  })

  it('units "cm" — coordinates as-is', () => {
    const draft = parseContour({
      units: "cm",
      vertices: [
        { x: 0, y: 0 },
        { x: 400, y: 0 },
        { x: 400, y: 300 },
        { x: 0, y: 300 },
      ],
    })
    expect(draft?.points[1]).toEqual({ x: 400, y: 0 })
  })

  it('units missing is treated as "m" (×100)', () => {
    const draft = parseContour({
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    })
    expect(draft?.points[1]).toEqual({ x: 400, y: 0 })
  })

  it('units "m" (the v1 writer) — ×100', () => {
    const draft = parseContour({
      units: "m",
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    })
    expect(draft?.points[1]).toEqual({ x: 400, y: 0 })
  })

  it('unknown units (e.g. "ft") → null — misreading is worse than unreadable', () => {
    expect(
      parseContour({
        units: "ft",
        vertices: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 3 },
          { x: 0, y: 3 },
        ],
      }),
    ).toBeNull()
  })

  it("missing edges are reconstructed as all-manual", () => {
    const draft = parseContour({
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    })
    expect(draft?.edgeSources).toEqual(["manual", "manual", "manual", "manual"])
  })

  it("edges of the wrong length are ignored, all-manual again", () => {
    const draft = parseContour({
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      edges: [{ index: 0, lengthM: 4, source: "lidar" }],
    })
    expect(draft?.edgeSources).toEqual(["manual", "manual", "manual", "manual"])
  })

  it("edges carry their sources through", () => {
    const draft = parseContour({
      units: "m",
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      edges: [
        { index: 0, lengthM: 4, source: "lidar" },
        { index: 1, lengthM: 3, source: "manual" },
        { index: 2, lengthM: 4, source: "lidar" },
        { index: 3, lengthM: 3, source: "lidar" },
      ],
    })
    expect(draft?.edgeSources).toEqual(["lidar", "manual", "lidar", "lidar"])
  })

  it("lengthCm (the sample's field name) is accepted — length is reference-only", () => {
    const draft = parseContour({
      units: "m",
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
      edges: [
        { index: 0, lengthCm: 400, source: "manual" },
        { index: 1, lengthCm: 300, source: "manual" },
        { index: 2, lengthCm: 400, source: "manual" },
        { index: 3, lengthCm: 300, source: "manual" },
      ],
    })
    expect(draft).not.toBeNull()
    expect(draft?.points[1]).toEqual({ x: 400, y: 0 })
  })

  it("schemaVersion 99 is still READ by v1 rules, and its version is kept", () => {
    const draft = parseContour({
      schemaVersion: 99,
      units: "m",
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    })
    expect(draft?.schemaVersion).toBe(99)
  })

  it("unknown fields are ignored", () => {
    const draft = parseContour({
      deviceId: "abc",
      measuredAt: "2026-08-13",
      units: "m",
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 3 },
        { x: 0, y: 3 },
      ],
    })
    expect(draft).not.toBeNull()
  })

  it("NaN or Infinity in a coordinate → the whole contour is null", () => {
    expect(
      parseContour({
        vertices: [
          { x: 0, y: 0 },
          { x: NaN, y: 0 },
          { x: 4, y: 3 },
          { x: 0, y: 3 },
        ],
      }),
    ).toBeNull()
    expect(
      parseContour({
        vertices: [
          { x: 0, y: 0 },
          { x: 4, y: Infinity },
          { x: 4, y: 3 },
          { x: 0, y: 3 },
        ],
      }),
    ).toBeNull()
  })

  it("a vertex that is not an object → null", () => {
    expect(
      parseContour({
        vertices: [{ x: 0, y: 0 }, [4, 0], { x: 4, y: 3 }, { x: 0, y: 3 }],
      }),
    ).toBeNull()
  })
})

describe("contourByteSize", () => {
  it("a 480-vertex contour (grid-snapped, integer cm) stays under the 32 KB wire limit", () => {
    // Grid-realistic: the editor snaps to a 5/10/25/50 cm grid, so
    // coordinates are integer centimetres — not the 2-decimal noise a
    // naive generator would produce. This is the pathological case the
    // server limit (32 KB per contour) has to accept.
    const points: PointCm[] = []
    const n = 480
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n
      points.push({
        x: Math.round(200 * Math.cos(a)),
        y: Math.round(200 * Math.sin(a)),
      })
    }
    const draft: ContourDraft = {
      points,
      edgeSources: points.map(() => "manual" as const),
      schemaVersion: 1,
    }
    expect(contourByteSize(buildContour(draft))).toBeLessThan(32 * 1024)
  })
})

describe("buildContour strictness", () => {
  it("fewer than 3 points is a programming error — throws, never serialized (F-5)", () => {
    const draft: ContourDraft = {
      points: cm([
        [0, 0],
        [400, 0],
      ]),
      edgeSources: ["manual", "manual"],
      schemaVersion: 1,
    }
    expect(() => buildContour(draft)).toThrow()
  })
})
