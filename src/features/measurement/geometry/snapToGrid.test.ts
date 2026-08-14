import { describe, expect, it } from "vitest"
import { snapPointToGrid } from "./snapToGrid"

describe("snapToGrid", () => {
  it("snaps to the 10 cm step both ways", () => {
    expect(snapPointToGrid({ x: 17, y: 24 }, 10)).toEqual({ x: 20, y: 20 })
    expect(snapPointToGrid({ x: 13, y: 6 }, 10)).toEqual({ x: 10, y: 10 })
  })

  it("handles every selectable step", () => {
    expect(snapPointToGrid({ x: 12, y: 12 }, 5)).toEqual({ x: 10, y: 10 })
    expect(snapPointToGrid({ x: 37, y: 39 }, 25)).toEqual({ x: 25, y: 50 })
    expect(snapPointToGrid({ x: 74, y: 26 }, 50)).toEqual({ x: 50, y: 50 })
  })

  it("works for negative coordinates (Math.round is symmetric-ish)", () => {
    expect(snapPointToGrid({ x: -17, y: -24 }, 10)).toEqual({ x: -20, y: -20 })
    expect(snapPointToGrid({ x: -12, y: -14 }, 5)).toEqual({ x: -10, y: -15 })
  })

  it("an already-snapped point stays put", () => {
    expect(snapPointToGrid({ x: 30, y: 50 }, 10)).toEqual({ x: 30, y: 50 })
  })
})
