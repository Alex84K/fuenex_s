import { describe, expect, it } from "vitest"
import type { AppStore } from "../../app/store"
import { makeStore } from "../../app/store"
import type { Estimate } from "./types"
import { computeTotals } from "./utils/totals"
import {
  addItems,
  moveItem,
  regenerateDraftId,
  removeItem,
  resetEditor,
  selectDraft,
  selectDraftTotals,
  selectIsDirty,
  selectItemsDirty,
  setInitialDraft,
  startNewDraft,
  toggleShowPurchase,
  updateItem,
  updateScalar,
} from "./estimateEditorSlice"
import type { DraftItem } from "./estimateEditorSlice"

const makeEstimate = (): Estimate => ({
  id: "0198f2c1-8000-7abc-9000-000000000001",
  projectId: "0198f2bf-0000-7000-8000-000000000001",
  title: "Смета",
  currency: "RUB",
  taxRateBp: 2000,
  discountBp: 500,
  note: "заметка",
  items: [
    {
      id: "0198f2c1-8000-7abc-9000-000000000002",
      title: "Позиция 1",
      description: "описание",
      unit: "шт",
      quantity: 2,
      purchasePriceMinor: 100,
      sellingPriceMinor: 200,
      position: 0,
    },
    {
      id: "0198f2c1-8000-7abc-9000-000000000003",
      title: "Позиция 2",
      description: "",
      unit: "м",
      quantity: 3,
      purchasePriceMinor: 50,
      sellingPriceMinor: 100,
      position: 1,
    },
  ],
  totals: {
    costMinor: 350,
    netMinor: 700,
    discountMinor: 35,
    netAfterDiscountMinor: 665,
    taxMinor: 133,
    grossMinor: 798,
    marginMinor: 315,
  },
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
})

const makeItem = (): DraftItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000009",
  title: "Новая",
  description: "",
  unit: "шт",
  quantity: 1,
  purchasePriceMinor: 10,
  sellingPriceMinor: 20,
})

const run = (fn: (store: AppStore) => void) => {
  const store = makeStore()
  fn(store)
  return store
}

describe("estimateEditorSlice", () => {
  it("startNewDraft mints a draft with a UUIDv7 id and no dirty flags", () => {
    const store = makeStore()
    store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
    const draft = selectDraft(store.getState())
    expect(draft).not.toBeNull()
    expect(draft?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(draft?.projectId).toBe("p1")
    expect(draft?.currency).toBe("RUB")
    expect(draft?.items).toEqual([])
    expect(selectIsDirty(store.getState())).toBe(false)
    expect(selectItemsDirty(store.getState())).toBe(false)
  })

  it("updateScalar raises isDirty but not itemsDirty", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      store.dispatch(updateScalar({ field: "title", value: "Название" }))
      expect(selectIsDirty(store.getState())).toBe(true)
      expect(selectItemsDirty(store.getState())).toBe(false)
    })
  })

  it("addItems raises both flags and appends", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      store.dispatch(addItems([makeItem()]))
      expect(selectDraft(store.getState())?.items).toHaveLength(1)
      expect(selectIsDirty(store.getState())).toBe(true)
      expect(selectItemsDirty(store.getState())).toBe(true)
    })
  })

  it("updateItem patches the right item and raises both flags", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      store.dispatch(addItems([makeItem()]))
      store.dispatch(updateItem({ id: makeItem().id, patch: { quantity: 5 } }))
      const items = selectDraft(store.getState())?.items ?? []
      expect(items[0].quantity).toBe(5)
      expect(selectIsDirty(store.getState())).toBe(true)
      expect(selectItemsDirty(store.getState())).toBe(true)
    })
  })

  it("removeItem removes by id", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      const a = makeItem()
      const b = {
        ...makeItem(),
        id: "0198f2c1-8000-7abc-9000-000000000010",
        title: "B",
      }
      store.dispatch(addItems([a, b]))
      store.dispatch(removeItem(a.id))
      expect(selectDraft(store.getState())?.items.map(i => i.id)).toEqual([
        b.id,
      ])
    })
  })

  it("moveItem reorders without losing or duplicating items", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      const a = makeItem()
      const b = {
        ...makeItem(),
        id: "0198f2c1-8000-7abc-9000-000000000010",
        title: "B",
      }
      const c = {
        ...makeItem(),
        id: "0198f2c1-8000-7abc-9000-000000000011",
        title: "C",
      }
      store.dispatch(addItems([a, b, c]))
      store.dispatch(moveItem({ from: 0, to: 2 }))
      expect(selectDraft(store.getState())?.items.map(i => i.id)).toEqual([
        b.id,
        c.id,
        a.id,
      ])
      expect(
        new Set(selectDraft(store.getState())?.items.map(i => i.id)).size,
      ).toBe(3)
    })
  })

  it("moveItem ignores out-of-range indices", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      store.dispatch(addItems([makeItem()]))
      store.dispatch(moveItem({ from: 0, to: 5 }))
      expect(selectDraft(store.getState())?.items).toHaveLength(1)
    })
  })

  it("setInitialDraft seeds the draft without position and resets both flags", () => {
    const store = makeStore()
    store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
    store.dispatch(updateItem({ id: "x", patch: { quantity: 9 } }))
    store.dispatch(setInitialDraft(makeEstimate()))
    const draft = selectDraft(store.getState())
    expect(draft?.title).toBe("Смета")
    expect(draft?.items).toHaveLength(2)
    expect(draft?.items[0]).not.toHaveProperty("position")
    expect(selectIsDirty(store.getState())).toBe(false)
    expect(selectItemsDirty(store.getState())).toBe(false)
  })

  it("regenerateDraftId changes the id, keeping everything else", () => {
    const store = makeStore()
    store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
    const old = selectDraft(store.getState())
    const oldId = old?.id ?? ""
    store.dispatch(updateScalar({ field: "title", value: "X" }))
    store.dispatch(regenerateDraftId())
    const next = selectDraft(store.getState())
    expect(next?.id).not.toBe(oldId)
    expect(next?.title).toBe("X")
    expect(selectIsDirty(store.getState())).toBe(true)
  })

  it("toggleShowPurchase flips without dirtying the draft", () => {
    run(store => {
      store.dispatch(startNewDraft({ projectId: "p1", currency: "RUB" }))
      store.dispatch(toggleShowPurchase())
      expect(selectDraft(store.getState())?.items).toBeDefined()
      expect(store.getState().estimateEditor.showPurchase).toBe(true)
      expect(selectIsDirty(store.getState())).toBe(false)
    })
  })

  it("resetEditor clears the draft", () => {
    const store = makeStore()
    store.dispatch(setInitialDraft(makeEstimate()))
    store.dispatch(resetEditor())
    expect(selectDraft(store.getState())).toBeNull()
    expect(selectIsDirty(store.getState())).toBe(false)
  })

  it("selectDraftTotals equals computeTotals on the draft", () => {
    const store = makeStore()
    store.dispatch(setInitialDraft(makeEstimate()))
    const draft = selectDraft(store.getState())
    expect(draft).not.toBeNull()
    const expected = computeTotals(
      (draft?.items ?? []).map(i => ({
        quantity: i.quantity,
        purchasePriceMinor: i.purchasePriceMinor,
        sellingPriceMinor: i.sellingPriceMinor,
      })),
      draft?.taxRateBp ?? 0,
      draft?.discountBp ?? 0,
    )
    expect(selectDraftTotals(store.getState())).toEqual(expected)
  })
})
