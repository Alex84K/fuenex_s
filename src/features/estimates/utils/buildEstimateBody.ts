import type { EstimateDraft } from "../estimateEditorSlice"
import type { EstimateInput } from "../types"

// draft → PUT body. position is the array index 0…n−1 — the draft never
// stores a position field, the order of items IS the order (DESIGN §5).
// The items key is ALWAYS present, even empty: an absent key and items: []
// both delete every position (F-2), so omitting it must stay impossible.
export const buildEstimateBody = (draft: EstimateDraft): EstimateInput => ({
  projectId: draft.projectId,
  title: draft.title,
  currency: draft.currency,
  taxRateBp: draft.taxRateBp,
  discountBp: draft.discountBp,
  note: draft.note,
  items: draft.items.map((it, position) => ({ ...it, position })),
})
