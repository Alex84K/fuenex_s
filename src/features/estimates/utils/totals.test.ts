import { describe, expect, it } from "vitest"
import fixtures from "./__fixtures__/estimate_totals_fixtures.json"
import { computeItemTotalMinor, computeTotals, roundBp } from "./totals"

// Parity with the server: every fixture case is checked one-to-one on all
// seven numbers. The fixture inputs are already-aggregated netMinor/
// costMinor (they cover only the percent stage), so a single quantity-1
// item reproduces them exactly.
describe("computeTotals — parity with server fixtures", () => {
  for (const f of fixtures) {
    it(f.name, () => {
      const totals = computeTotals(
        [
          {
            quantity: 1,
            purchasePriceMinor: f.costMinor,
            sellingPriceMinor: f.netMinor,
          },
        ],
        f.taxRateBp,
        f.discountBp,
      )
      expect(totals.costMinor).toBe(f.costMinor)
      expect(totals.netMinor).toBe(f.netMinor)
      expect(totals.discountMinor).toBe(f.want.discountMinor)
      expect(totals.netAfterDiscountMinor).toBe(f.want.netAfterDiscountMinor)
      expect(totals.taxMinor).toBe(f.want.taxMinor)
      expect(totals.grossMinor).toBe(f.want.grossMinor)
      expect(totals.marginMinor).toBe(f.want.marginMinor)
    })
  }
})

// Per-line rounding (F-4): the fixtures cover only the percent stage; the
// line stage is where the client diverges from the server most easily.
describe("computeTotals — per-line rounding (Σ round ≠ round Σ)", () => {
  it("rounds a fractional quantity per line", () => {
    // 12.44 × 45000 = 559800 exactly in round terms
    expect(computeItemTotalMinor(12.44, 45000)).toBe(559800)
  })

  it("rounds a line landing exactly on half a minor unit up", () => {
    expect(computeItemTotalMinor(0.5, 1)).toBe(1)
  })

  it("1000 lines of 0.5 differ from rounding the sum once", () => {
    const items = Array.from({ length: 1000 }, () => ({
      quantity: 0.5,
      purchasePriceMinor: 0,
      sellingPriceMinor: 1,
    }))
    const totals = computeTotals(items, 0, 0)
    expect(totals.netMinor).toBe(1000) // Σ round(0.5 × 1)
    expect(Math.round(1000 * 0.5)).toBe(500) // round(Σ) — the trap
    expect(totals.grossMinor).toBe(1000)
  })
})

describe("roundBp — half away from zero on integers", () => {
  it("rounds the half-minor-unit boundary up", () => {
    expect(roundBp(1, 5000)).toBe(1) // 1 × 5000/10000 = 0.5 → 1
    expect(roundBp(3, 5000)).toBe(2) // 1.5 → 2
  })

  it("matches the DESIGN example", () => {
    expect(roundBp(995200, 500)).toBe(49760)
  })

  it("handles the extremes", () => {
    expect(roundBp(100000, 10000)).toBe(100000) // 100 %
    expect(roundBp(0, 5000)).toBe(0)
  })
})
