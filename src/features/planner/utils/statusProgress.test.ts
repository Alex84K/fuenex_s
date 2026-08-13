import { describe, expect, it } from "vitest"
import type { Task } from "../types"
import { progressPatch, statusPatch, toggleDonePatch } from "./statusProgress"

// The status×progressPct invariant (DESIGN_PLANNER.md §4.3, decision D5):
// todo ⟺ 0 %, done ⟺ 100 %, in_progress is free. The server checks the pair
// by OUTCOME and answers 400 on a violation — so every helper must return a
// consistent pair (or null = nothing to send).

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "0198f2c1-8000-7abc-9000-000000000010",
  projectId: "0198f2c1-8000-7abc-9000-000000000001",
  title: "Демонтаж",
  description: "",
  status: "todo",
  progressPct: 0,
  assignee: "",
  position: 0,
  deadline: "",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
  ...overrides,
})

describe("statusPatch", () => {
  it("todo forces progress 0", () => {
    expect(
      statusPatch(makeTask({ status: "in_progress", progressPct: 60 }), "todo"),
    ).toEqual({
      status: "todo",
      progressPct: 0,
    })
  })

  it("done forces progress 100", () => {
    expect(statusPatch(makeTask(), "done")).toEqual({
      status: "done",
      progressPct: 100,
    })
  })

  it("in_progress keeps the current percent", () => {
    expect(
      statusPatch(
        makeTask({ status: "in_progress", progressPct: 60 }),
        "in_progress",
      ),
    ).toBeNull()
    expect(
      statusPatch(
        makeTask({ status: "done", progressPct: 100 }),
        "in_progress",
      ),
    ).toEqual({
      status: "in_progress",
      progressPct: 100,
    })
  })

  it("returns null when nothing changes", () => {
    expect(statusPatch(makeTask(), "todo")).toBeNull()
    expect(
      statusPatch(makeTask({ status: "done", progressPct: 100 }), "done"),
    ).toBeNull()
  })
})

describe("toggleDonePatch", () => {
  it("marking done sends the full pair done/100", () => {
    expect(toggleDonePatch(makeTask(), true)).toEqual({
      status: "done",
      progressPct: 100,
    })
  })

  it("unmarking sends todo/0", () => {
    expect(
      toggleDonePatch(makeTask({ status: "done", progressPct: 100 }), false),
    ).toEqual({ status: "todo", progressPct: 0 })
  })

  it("returns null when the checkbox already matches the state", () => {
    expect(
      toggleDonePatch(makeTask({ status: "done", progressPct: 100 }), true),
    ).toBeNull()
    expect(toggleDonePatch(makeTask(), false)).toBeNull()
  })
})

describe("progressPatch", () => {
  it("100 % means done — the status travels in the same request (D5)", () => {
    expect(progressPatch(makeTask(), 100)).toEqual({
      status: "done",
      progressPct: 100,
    })
  })

  it("a non-zero percent on a todo task moves it to in_progress", () => {
    expect(progressPatch(makeTask(), 60)).toEqual({
      status: "in_progress",
      progressPct: 60,
    })
  })

  it("moving off 100 % on a done task goes to in_progress with the new percent", () => {
    expect(
      progressPatch(makeTask({ status: "done", progressPct: 100 }), 60),
    ).toEqual({ status: "in_progress", progressPct: 60 })
  })

  it("0 % on a todo task is a no-op", () => {
    expect(progressPatch(makeTask(), 0)).toBeNull()
  })

  it("same value on in_progress is a no-op", () => {
    expect(
      progressPatch(makeTask({ status: "in_progress", progressPct: 60 }), 60),
    ).toBeNull()
  })
})
