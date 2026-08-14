import { buildContour } from "../contour/contourCodec"
import type { SetDraft } from "../measurementEditorSlice"
import type { MeasurementSetInput } from "../types"

// The ONLY body builder of the feature (PLANNING_MEASUREMENT.md, сквозное
// требование 5): a literal PUT body in a component is a regression. Two
// invariants, both pinned by tests:
//
// 1. The surfaces (and openings) keys are ALWAYS present, even empty — an
//    absent key and [] mean the same thing on the server: delete every
//    child (DESIGN_MEASUREMENT.md §8, F-1). A "skip the key when empty"
//    branch is data loss.
// 2. position is the array index — the order of the draft arrays IS the
//    order (§5.2); nothing stores position on a child.
//
// A contour is serialized only when it has >= 3 points — commitContour
// guarantees that on the draft (a contour of fewer points stays null, F-5).
export const buildSetBody = (d: SetDraft): MeasurementSetInput => ({
  projectId: d.projectId,
  name: d.name,
  note: d.note,
  position: d.position,
  scanSource: d.scanSource,
  surfaces: d.surfaces.map((s, position) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    position,
    contour: s.contourCm ? buildContour(s.contourCm) : null,
    heightM: s.heightM,
    areaM2: s.areaM2,
    openings: s.openings.map((o, p) => ({ ...o, position: p })),
  })),
})
