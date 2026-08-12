import { describe, expect, it } from "vitest"
import type { CatalogItem, EstimateTemplateItem } from "../types"
import { fromCatalogItem, fromTemplateItems } from "./fromCatalog"

const makeCatalogItem = (): CatalogItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000020",
  title: "Укладка плитки",
  description: "Керамогранит 60×60",
  unit: "м²",
  category: "Плитка",
  isFavorite: true,
  purchasePriceMinor: 45000,
  sellingPriceMinor: 80000,
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
})

describe("fromCatalogItem", () => {
  it("copies the four text fields, the quantity and the two prices", () => {
    const item = fromCatalogItem(makeCatalogItem(), 3)
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(item.title).toBe("Укладка плитки")
    expect(item.description).toBe("Керамогранит 60×60")
    expect(item.unit).toBe("м²")
    expect(item.quantity).toBe(3)
    expect(item.purchasePriceMinor).toBe(45000)
    expect(item.sellingPriceMinor).toBe(80000)
  })

  it("never carries category or isFavorite into the draft item", () => {
    const item = fromCatalogItem(makeCatalogItem(), 1)
    expect("category" in item).toBe(false)
    expect("isFavorite" in item).toBe(false)
    expect("position" in item).toBe(false)
  })

  it("mints a fresh id — the same row added twice gives two items", () => {
    const a = fromCatalogItem(makeCatalogItem(), 1)
    const b = fromCatalogItem(makeCatalogItem(), 1)
    expect(a.id).not.toBe(b.id)
  })
})

describe("fromTemplateItems", () => {
  const templateItem = (): EstimateTemplateItem => ({
    id: "0198f2c1-8000-7abc-9000-000000000030",
    title: "Монтаж",
    description: "",
    unit: "точка",
    quantity: 2,
    purchasePriceMinor: 1000,
    sellingPriceMinor: 2500,
    position: 0,
  })

  it("copies by value with fresh ids and no position", () => {
    const items = fromTemplateItems([templateItem(), templateItem()])
    expect(items).toHaveLength(2)
    expect(items[0].id).not.toBe(items[1].id)
    expect(items[0].quantity).toBe(2)
    expect(items[0].sellingPriceMinor).toBe(2500)
    expect("position" in items[0]).toBe(false)
  })
})
