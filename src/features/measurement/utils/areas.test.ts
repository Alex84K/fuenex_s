import { describe, expect, it } from "vitest"
import {
  grossAreaM2,
  netAreaM2,
  openingsDeductedM2,
  summarizeByType,
} from "./areas"
import type { SurfaceAreaInput } from "./areas"
import type { PointCm } from "../geometry/polygonArea"

describe("grossAreaM2", () => {
  it("4×3 m square is 12 m²", () => {
    const points: PointCm[] = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ]
    expect(grossAreaM2(points)).toBe(12)
  })
})

describe("openingsDeductedM2", () => {
  it("only deduct=true openings are subtracted", () => {
    const openings = [
      { widthM: 0.9, heightM: 2.05, deduct: true },
      { widthM: 1.5, heightM: 1.2, deduct: false },
    ]
    // round2: 0.9 × 2.05 = 1.845… → 1.85 (the single rounding at the
    // boundary, DESIGN §8.1).
    expect(openingsDeductedM2(openings)).toBe(1.85)
  })

  it("empty list deducts nothing", () => {
    expect(openingsDeductedM2([])).toBe(0)
  })
})

describe("netAreaM2", () => {
  it("never negative — the floor at zero is a rule, not cosmetics", () => {
    expect(netAreaM2(1.5, 4)).toBe(0)
  })

  it("ordinary case subtracts once", () => {
    expect(netAreaM2(12.44, 1.85)).toBe(10.59)
  })
})

describe("summarizeByType", () => {
  const surface = (
    type: string,
    areaM2: number,
    openings: SurfaceAreaInput["openings"] = [],
  ): SurfaceAreaInput => ({
    type,
    areaM2,
    openings,
  })

  it("groups by type with NO case normalization — Стена and стена are two groups", () => {
    const rows = summarizeByType([
      surface("Стена", 10),
      surface("стена", 5),
      surface("Стена", 3),
    ])
    expect(rows).toHaveLength(2)
    const wall = rows.find(r => r.type === "Стена")
    const wallLower = rows.find(r => r.type === "стена")
    expect(wall?.grossM2).toBe(13)
    expect(wall?.count).toBe(2)
    expect(wallLower?.grossM2).toBe(5)
  })

  // The known constants are the VALUES (FLOOR, CEILING…); the Russian
  // labels live only in the <datalist> (constants.ts). A user-typed value
  // is unknown and goes after the known ones, alphabetically.
  it("known constants come first in SURFACE_TYPES order, user values after alphabetically", () => {
    const rows = summarizeByType([
      surface("CEILING", 1),
      surface("Забор", 2),
      surface("FLOOR", 3),
    ])
    expect(rows.map(r => r.type)).toEqual(["FLOOR", "CEILING", "Забор"])
  })

  it("net area inside the summary honors deduct", () => {
    const rows = summarizeByType([
      surface("Стена", 10, [
        { widthM: 2, heightM: 1, deduct: true },
        { widthM: 1, heightM: 1, deduct: false },
      ]),
    ])
    expect(rows[0].netM2).toBe(8)
    expect(rows[0].grossM2).toBe(10)
  })
})
