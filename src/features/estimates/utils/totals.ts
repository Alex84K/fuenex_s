import type { EstimateTotals } from "../types"

// The one and only client-side implementation of the server formula
// (service/estimate.go:70). Three invariants, any violation of which
// desyncs the client from the server (DESIGN_ESTIMATE.md §7.2):
//
// 1. Σ round(…) per line, never round(Σ …) — the server rounds every row in
//    SQL (repository/sqlite/estimate.go:354).
// 2. Discount before tax, margin after discount, tax outside margin.
// 3. Everything in whole integers. Math.round rounds halves up; SQLite ROUND
//    rounds half away from zero — identical for the non-negative sums here.

export type TotalsItem = {
  quantity: number
  purchasePriceMinor: number
  sellingPriceMinor: number
}

// round(amount × bp / 10000), half away from zero, on integers. amount ≥ 0
// and bp ∈ [0, 10000] in this product, so no sign handling is needed.
export const roundBp = (amount: number, bp: number): number => {
  const n = amount * bp
  const q = Math.floor(n / 10000)
  return (n - q * 10000) * 2 >= 10000 ? q + 1 : q
}

// The line total shown in the table — the exact number that feeds netMinor.
export const computeItemTotalMinor = (
  quantity: number,
  priceMinor: number,
): number => Math.round(quantity * priceMinor)

export const computeTotals = (
  items: TotalsItem[],
  taxRateBp: number,
  discountBp: number,
): EstimateTotals => {
  const costMinor = items.reduce(
    (sum, it) =>
      sum + computeItemTotalMinor(it.quantity, it.purchasePriceMinor),
    0,
  )
  const netMinor = items.reduce(
    (sum, it) => sum + computeItemTotalMinor(it.quantity, it.sellingPriceMinor),
    0,
  )
  const discountMinor = roundBp(netMinor, discountBp)
  const netAfterDiscountMinor = netMinor - discountMinor
  const taxMinor = roundBp(netAfterDiscountMinor, taxRateBp)
  return {
    costMinor,
    netMinor,
    discountMinor,
    netAfterDiscountMinor,
    taxMinor,
    grossMinor: netAfterDiscountMinor + taxMinor,
    marginMinor: netAfterDiscountMinor - costMinor,
  }
}
