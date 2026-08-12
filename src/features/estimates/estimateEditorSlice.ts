import { createSelector, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { uuidv7 } from "../../utils/uuid"
import type { Estimate, EstimateItem } from "./types"
import { computeTotals } from "./utils/totals"

// The editor draft (DESIGN_ESTIMATE.md §5). position is NOT stored — the
// array order IS the order; position lands in the PUT body as the index at
// build time (buildEstimateBody.ts).
export type DraftItem = Omit<EstimateItem, "position">

export type EstimateDraft = {
  id: string // UUIDv7, minted in startNewDraft before the first PUT
  projectId: string
  title: string
  currency: string
  taxRateBp: number
  discountBp: number
  note: string
  items: DraftItem[]
}

export type EstimateEditorState = {
  draft: EstimateDraft | null
  baseUpdatedAt: string | null // updatedAt of the last server version — for the D11 guard
  isDirty: boolean
  itemsDirty: boolean // items untouched → PATCH, touched → PUT (DESIGN §6.3)
  showPurchase: boolean // D7: lives beside the draft, never inside it
}

export type DraftScalarField = Pick<
  EstimateDraft,
  "title" | "currency" | "taxRateBp" | "discountBp" | "note"
>

const initialState: EstimateEditorState = {
  draft: null,
  baseUpdatedAt: null,
  isDirty: false,
  itemsDirty: false,
  showPurchase: false,
}

const toDraftItem = (it: EstimateItem): DraftItem => ({
  id: it.id,
  title: it.title,
  description: it.description,
  unit: it.unit,
  quantity: it.quantity,
  purchasePriceMinor: it.purchasePriceMinor,
  sellingPriceMinor: it.sellingPriceMinor,
})

// A blank row, filled in place (DESIGN §8.2). quantity 1 with zero prices —
// the sum stays zero until prices are typed.
export const makeEmptyDraftItem = (): DraftItem => ({
  id: uuidv7(),
  title: "",
  description: "",
  unit: "",
  quantity: 1,
  purchasePriceMinor: 0,
  sellingPriceMinor: 0,
})

const estimateEditorSlice = createSlice({
  name: "estimateEditor",
  initialState,
  reducers: {
    // Seed the editor from a server estimate (detail GET, PUT/PATCH
    // responses). Builds a fresh draft — the cache object is never shared.
    setInitialDraft(state, action: PayloadAction<Estimate>) {
      const e = action.payload
      state.draft = {
        id: e.id,
        projectId: e.projectId,
        title: e.title,
        currency: e.currency,
        taxRateBp: e.taxRateBp,
        discountBp: e.discountBp,
        note: e.note,
        items: e.items.map(toDraftItem),
      }
      state.baseUpdatedAt = e.updatedAt
      state.isDirty = false
      state.itemsDirty = false
    },
    // Empty draft for create mode. The UUIDv7 id is minted in prepare —
    // reducers stay pure.
    startNewDraft: {
      reducer(
        state,
        action: PayloadAction<{
          id: string
          projectId: string
          currency: string
        }>,
      ) {
        state.draft = {
          id: action.payload.id,
          projectId: action.payload.projectId,
          title: "",
          currency: action.payload.currency,
          taxRateBp: 0,
          discountBp: 0,
          note: "",
          items: [],
        }
        state.baseUpdatedAt = null
        state.isDirty = false
        state.itemsDirty = false
      },
      prepare(args: { projectId: string; currency: string }) {
        return { payload: { ...args, id: uuidv7() } }
      },
    },
    // Scalar fields — raises isDirty only; the PATCH-vs-PUT fork reads
    // itemsDirty, so scalars alone never force a full PUT.
    updateScalar(
      state,
      action: PayloadAction<{
        field: keyof DraftScalarField
        value: string | number
      }>,
    ) {
      if (!state.draft) return
      Object.assign(state.draft, {
        [action.payload.field]: action.payload.value,
      })
      state.isDirty = true
    },
    // Anything touching items raises BOTH flags.
    addItems(state, action: PayloadAction<DraftItem[]>) {
      if (!state.draft) return
      state.draft.items.push(...action.payload)
      state.isDirty = true
      state.itemsDirty = true
    },
    updateItem(
      state,
      action: PayloadAction<{ id: string; patch: Partial<DraftItem> }>,
    ) {
      if (!state.draft) return
      const item = state.draft.items.find(it => it.id === action.payload.id)
      if (!item) return
      Object.assign(item, action.payload.patch)
      state.isDirty = true
      state.itemsDirty = true
    },
    removeItem(state, action: PayloadAction<string>) {
      if (!state.draft) return
      state.draft.items = state.draft.items.filter(
        it => it.id !== action.payload,
      )
      state.isDirty = true
      state.itemsDirty = true
    },
    moveItem(state, action: PayloadAction<{ from: number; to: number }>) {
      if (!state.draft) return
      const { from, to } = action.payload
      const items = state.draft.items
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= items.length ||
        to >= items.length
      )
        return
      const [moved] = items.splice(from, 1)
      items.splice(to, 0, moved)
      state.isDirty = true
      state.itemsDirty = true
    },
    // "Save as new" after a 404: same content, fresh UUIDv7 address.
    regenerateDraftId: {
      reducer(state, action: PayloadAction<{ id: string }>) {
        if (state.draft) state.draft.id = action.payload.id
      },
      prepare() {
        return { payload: { id: uuidv7() } }
      },
    },
    toggleShowPurchase(state) {
      state.showPurchase = !state.showPurchase
    },
    resetEditor() {
      return initialState
    },
  },
})

export const {
  setInitialDraft,
  startNewDraft,
  updateScalar,
  addItems,
  updateItem,
  removeItem,
  moveItem,
  regenerateDraftId,
  toggleShowPurchase,
  resetEditor,
} = estimateEditorSlice.actions

type EditorStateRoot = { estimateEditor: EstimateEditorState }

export const selectDraft = (state: EditorStateRoot) =>
  state.estimateEditor.draft
export const selectIsDirty = (state: EditorStateRoot) =>
  state.estimateEditor.isDirty
export const selectItemsDirty = (state: EditorStateRoot) =>
  state.estimateEditor.itemsDirty
export const selectShowPurchase = (state: EditorStateRoot) =>
  state.estimateEditor.showPurchase
export const selectBaseUpdatedAt = (state: EditorStateRoot) =>
  state.estimateEditor.baseUpdatedAt

// Memoized on the draft object — recomputed only when the draft changes.
export const selectDraftTotals = createSelector([selectDraft], draft =>
  draft ? computeTotals(draft.items, draft.taxRateBp, draft.discountBp) : null,
)

export default estimateEditorSlice
