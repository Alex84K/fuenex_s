import { uuidv7 } from "../../../utils/uuid"
import type { DraftItem } from "../estimateEditorSlice"
import type { CatalogItem, EstimateTemplateItem } from "../types"

// Copy-by-value into the draft (DESIGN_ESTIMATE.md §9): a fresh UUIDv7 id,
// the text fields and the two prices. category and isFavorite are
// catalog-only and never travel into an estimate item. The same row added
// twice yields two independent items — the estimate is a snapshot, not a
// reference (DESIGN §7).
export const fromCatalogItem = (
  c: CatalogItem,
  quantity: number,
): DraftItem => ({
  id: uuidv7(),
  title: c.title,
  description: c.description,
  unit: c.unit,
  quantity,
  purchasePriceMinor: c.purchasePriceMinor,
  sellingPriceMinor: c.sellingPriceMinor,
})

// Template items → draft items. Reusing template ids would point at another
// table's rows (F-7): every application mints fresh ids, so editing a
// template never rewrites past estimates.
export const fromTemplateItems = (items: EstimateTemplateItem[]): DraftItem[] =>
  items.map(it => ({
    id: uuidv7(),
    title: it.title,
    description: it.description,
    unit: it.unit,
    quantity: it.quantity,
    purchasePriceMinor: it.purchasePriceMinor,
    sellingPriceMinor: it.sellingPriceMinor,
  }))
