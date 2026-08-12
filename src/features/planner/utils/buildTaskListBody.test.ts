import { describe, expect, it } from "vitest"
import type { Task } from "../types"
import { buildTaskListBody } from "./buildTaskListBody"

// The client normalizes position to 0…n−1 before the collection PUT — the
// array order IS the order (DESIGN_PLANNER.md §4.6), the same rule the
// estimate applies.

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "0198f2c1-8000-7abc-9000-000000000010",
  projectId: "0198f2c1-8000-7abc-9000-000000000001",
  title: "Демонтаж",
  description: "",
  status: "todo",
  progressPct: 0,
  assignee: "",
  position: 7, // server values are NOT normalized — the client rewrites them
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
  ...overrides,
})

describe("buildTaskListBody", () => {
  it("normalizes positions to 0..n−1 and drops projectId", () => {
    const body = buildTaskListBody([
      makeTask(),
      makeTask({
        id: "0198f2c1-8000-7abc-9000-000000000011",
        title: "Стяжка",
        position: 999,
      }),
    ])
    expect(body).toEqual([
      {
        id: "0198f2c1-8000-7abc-9000-000000000010",
        title: "Демонтаж",
        description: "",
        status: "todo",
        progressPct: 0,
        assignee: "",
        position: 0,
      },
      {
        id: "0198f2c1-8000-7abc-9000-000000000011",
        title: "Стяжка",
        description: "",
        status: "todo",
        progressPct: 0,
        assignee: "",
        position: 1,
      },
    ])
  })

  it("an empty list stays an empty array — [] means [] (D3)", () => {
    expect(buildTaskListBody([])).toEqual([])
  })
})
