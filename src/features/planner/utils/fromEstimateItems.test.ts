import { describe, expect, it } from "vitest"
import type { EstimateItem } from "../../estimates/types"
import { tasksFromEstimateItems } from "./fromEstimateItems"

const makeItem = (overrides: Partial<EstimateItem> = {}): EstimateItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000001",
  title: "Демонтаж плитки",
  description: "Санузел, стены и пол",
  unit: "м²",
  quantity: 12,
  purchasePriceMinor: 0,
  sellingPriceMinor: 150000,
  position: 0,
  ...overrides,
})

describe("tasksFromEstimateItems", () => {
  it("maps every item to a fresh task in todo / 0 % / nobody, positions 0..n−1", () => {
    const tasks = tasksFromEstimateItems([
      makeItem(),
      makeItem({
        id: "0198f2c1-8000-7abc-9000-000000000002",
        title: "Стяжка",
        description: "",
        position: 1,
      }),
    ])
    expect(tasks).toHaveLength(2)
    tasks.forEach((t, i) => {
      expect(t.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
      expect(t.status).toBe("todo")
      expect(t.progressPct).toBe(0)
      expect(t.assignee).toBe("")
      expect(t.deadline).toBe("")
      expect(t.position).toBe(i)
    })
    expect(tasks[0]).toMatchObject({
      title: "Демонтаж плитки",
      description: "Санузел, стены и пол",
    })
    expect(tasks[1]).toMatchObject({ title: "Стяжка", description: "" })
    expect(tasks[0].id).not.toBe(tasks[1].id)
  })

  it("skips rows without a title", () => {
    const tasks = tasksFromEstimateItems([
      makeItem({ title: "", position: 0 }),
      makeItem({ title: "  ", position: 1 }),
      makeItem({ title: "Электрика", position: 2 }),
    ])
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({ title: "Электрика", position: 0 })
  })

  it("an empty list stays an empty array", () => {
    expect(tasksFromEstimateItems([])).toEqual([])
  })
})
