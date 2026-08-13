import { describe, expect, it } from "vitest"
import type { TaskCatalogItem, TaskTemplateItem } from "../types"
import { taskFromCatalogItem, tasksFromTemplate } from "./fromTaskCatalog"

const makeCatalogItem = (): TaskCatalogItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000020",
  title: "Демонтаж плитки",
  description: "Санузел, стены и пол",
  category: "Демонтаж",
  isFavorite: true,
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
})

const makeTemplateItem = (): TaskTemplateItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000030",
  title: "Монтаж",
  description: "",
  position: 0,
})

describe("taskFromCatalogItem", () => {
  it("copies the text fields and is born in todo / 0 % / nobody (D10)", () => {
    const task = taskFromCatalogItem(makeCatalogItem(), 4)
    expect(task).toMatchObject({
      title: "Демонтаж плитки",
      description: "Санузел, стены и пол",
      status: "todo",
      progressPct: 0,
      assignee: "",
      position: 4,
      deadline: "",
    })
    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it("never carries category, isFavorite or the catalog id", () => {
    const task = taskFromCatalogItem(makeCatalogItem(), 0)
    expect("category" in task).toBe(false)
    expect("isFavorite" in task).toBe(false)
    expect(task.id).not.toBe(makeCatalogItem().id)
  })

  it("mints a fresh id — the same row added twice gives two tasks", () => {
    const a = taskFromCatalogItem(makeCatalogItem(), 0)
    const b = taskFromCatalogItem(makeCatalogItem(), 1)
    expect(a.id).not.toBe(b.id)
  })
})

describe("tasksFromTemplate", () => {
  it("copies by value with fresh ids and continues positions", () => {
    const tasks = tasksFromTemplate([makeTemplateItem(), makeTemplateItem()], 3)
    expect(tasks).toHaveLength(2)
    expect(tasks[0].id).not.toBe(tasks[1].id)
    expect(tasks[0].position).toBe(3)
    expect(tasks[1].position).toBe(4)
    expect(tasks[0].status).toBe("todo")
    expect(tasks[0].progressPct).toBe(0)
    expect(tasks[0].assignee).toBe("")
    expect(tasks[0].deadline).toBe("")
  })

  it("positions continue from the current list length — applying APPENDS (D6)", () => {
    const tasks = tasksFromTemplate([makeTemplateItem()], 12)
    expect(tasks[0].position).toBe(12)
  })
})
