import { describe, expect, it } from "vitest"
import type { EstimateDraft } from "../estimateEditorSlice"
import { buildEstimateBody } from "./buildEstimateBody"

const makeDraft = (items: EstimateDraft["items"]): EstimateDraft => ({
  id: "0198f2c1-8000-7abc-9000-000000000001",
  projectId: "0198f2bf-0000-7000-8000-000000000001",
  title: "Смета",
  currency: "RUB",
  taxRateBp: 2000,
  discountBp: 500,
  note: "заметка",
  items,
})

const item = (id: string) => ({
  id,
  title: `Позиция ${id}`,
  description: "",
  unit: "шт",
  quantity: 1,
  purchasePriceMinor: 100,
  sellingPriceMinor: 200,
})

describe("buildEstimateBody", () => {
  it("assigns position 0…n−1 in array order", () => {
    const body = buildEstimateBody(makeDraft([item("a"), item("b"), item("c")]))
    expect(body.items.map(i => i.position)).toEqual([0, 1, 2])
    expect(body.items[0].id).toBe("a")
    expect(body.items[2].id).toBe("c")
  })

  it("carries the scalar fields through", () => {
    const body = buildEstimateBody(makeDraft([]))
    expect(body.projectId).toBe("0198f2bf-0000-7000-8000-000000000001")
    expect(body.title).toBe("Смета")
    expect(body.currency).toBe("RUB")
    expect(body.taxRateBp).toBe(2000)
    expect(body.discountBp).toBe(500)
    expect(body.note).toBe("заметка")
  })

  it("always includes the items key, even when empty", () => {
    const body = buildEstimateBody(makeDraft([]))
    expect(body).toHaveProperty("items")
    expect(body.items).toEqual([])
  })
})
