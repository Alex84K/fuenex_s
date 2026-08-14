import { polygonArea } from "../geometry/polygonArea"
import type { PointCm } from "../geometry/polygonArea"
import { SURFACE_TYPES } from "../constants"

// round2 is hundredths-ROUNDING, not a unit conversion: the grep rule of
// DESIGN §7.3 (/100 and *100 appear only in contourCodec.ts) guards against
// cm↔m conversion drifting into other functions — an error by two orders of
// magnitude. Rounding to two decimal places is symmetric and lives here,
// next to the cm²→m² boundary it serves (§8.1).
const round2 = (v: number): number => Math.round(v * 100) / 100

// Structural inputs — deliberately NOT the slice's draft types: this module
// is phase 2 and must not depend on phase 4. SurfaceDraft/OpeningDraft
// satisfy these shapes structurally, so the editor passes them in directly.
export type OpeningAreaInput = {
  widthM: number
  heightM: number
  deduct: boolean
}

export type SurfaceAreaInput = {
  type: string
  areaM2: number
  openings: OpeningAreaInput[]
}

// Gross area from a contour: shoelace in cm², divided by 10 000 once — the
// single rounding at the cm²→m² boundary (DESIGN §8.1). areaM2 goes to the
// server as-is and is shown to the user as-is; storing 12.443999999999999
// and showing 12.44 would be two numbers where one exists.
export const grossAreaM2 = (points: PointCm[]): number =>
  round2(polygonArea(points) / 10_000)

// The deduction for net area: only openings with deduct=true, width ×
// height in metres (the wire unit). Server never computes this — ADR-001 §6
// — the client owns it (D10).
export const openingsDeductedM2 = (openings: OpeningAreaInput[]): number =>
  round2(
    openings.reduce((sum, o) => sum + (o.deduct ? o.widthM * o.heightM : 0), 0),
  )

// The floor at zero is not cosmetics (DESIGN §8.2): three doors on a small
// partition give a negative net area, and showing it is worse than showing
// zero. The "openings bigger than the surface" warning is separate and lives
// in the UI.
export const netAreaM2 = (gross: number, deducted: number): number =>
  Math.max(0, round2(gross - deducted))

// The set summary grouped by surface type (DESIGN §8.3) — the one thing
// type is FOR on the client: "floor area apart from wall area when
// carrying to the estimate". Grouping is by the raw string with NO case
// normalization (decision 6: Стена ≠ стена — two groups). Known constants
// come first in SURFACE_TYPES order, user-typed values after, alphabetically.
export type TypeSummaryRow = {
  type: string
  count: number
  grossM2: number
  netM2: number
}

export function summarizeByType(
  surfaces: SurfaceAreaInput[],
): TypeSummaryRow[] {
  const groups = new Map<string, TypeSummaryRow>()
  for (const s of surfaces) {
    const row = groups.get(s.type) ?? {
      type: s.type,
      count: 0,
      grossM2: 0,
      netM2: 0,
    }
    row.count += 1
    row.grossM2 = round2(row.grossM2 + s.areaM2)
    row.netM2 = round2(
      row.netM2 + netAreaM2(s.areaM2, openingsDeductedM2(s.openings)),
    )
    groups.set(s.type, row)
  }

  const known = SURFACE_TYPES.map(t => t.value)
  return [...groups.values()].sort((a, b) => {
    const ai = known.indexOf(a.type)
    const bi = known.indexOf(b.type)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.type.localeCompare(b.type, "ru")
  })
}
