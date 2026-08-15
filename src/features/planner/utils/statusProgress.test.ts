import { describe, expect, it } from "vitest"
import type { Task } from "../types"
import { progressPatch, statusPatch, toggleDonePatch } from "./statusProgress"

// The status×progressPct invariant (DESIGN_PLANNER.md §4.3, decision D5,
// extended by ADR-013's fourth status): todo ⟺ 0 %, review ⟺ 100 %,
// done ⟺ 100 %, in_progress is free. review and done share 100 % on purpose —
// the two statuses differ on WHO said the work is finished: review is the
// foreman's claim awaiting the customer, done is the customer's acceptance.
// The server checks the pair by OUTCOME and answers 400 on a violation — so
// every helper must return a consistent pair (or null = nothing to send).

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "0198f2c1-8000-7abc-9000-000000000010",
  estimateId: "0198f2c1-8000-7abc-9000-000000000001",
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

  it("review forces progress 100", () => {
    expect(statusPatch(makeTask(), "review")).toEqual({
      status: "review",
      progressPct: 100,
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
        makeTask({ status: "review", progressPct: 100 }),
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
      statusPatch(makeTask({ status: "review", progressPct: 100 }), "review"),
    ).toBeNull()
    expect(
      statusPatch(makeTask({ status: "done", progressPct: 100 }), "done"),
    ).toBeNull()
  })
})

describe("toggleDonePatch", () => {
  it("sending to review sends the full pair review/100", () => {
    expect(toggleDonePatch(makeTask(), true)).toEqual({
      status: "review",
      progressPct: 100,
    })
  })

  it("pulling back from review sends todo/0", () => {
    expect(
      toggleDonePatch(makeTask({ status: "review", progressPct: 100 }), false),
    ).toEqual({ status: "todo", progressPct: 0 })
  })

  it("returns null when the checkbox already matches the state", () => {
    expect(
      toggleDonePatch(makeTask({ status: "review", progressPct: 100 }), true),
    ).toBeNull()
    expect(toggleDonePatch(makeTask(), false)).toBeNull()
  })
})

describe("progressPatch", () => {
  it("100 % sends the stage to review — the status travels in the same request (D5)", () => {
    expect(progressPatch(makeTask(), 100)).toEqual({
      status: "review",
      progressPct: 100,
    })
  })

  it("a non-zero percent on a todo task moves it to in_progress", () => {
    expect(progressPatch(makeTask(), 60)).toEqual({
      status: "in_progress",
      progressPct: 60,
    })
  })

  it("moving off 100 % on a review task goes to in_progress with the new percent", () => {
    expect(
      progressPatch(makeTask({ status: "review", progressPct: 100 }), 60),
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

  it("100 % on an already-review task is a no-op", () => {
    expect(
      progressPatch(makeTask({ status: "review", progressPct: 100 }), 100),
    ).toBeNull()
  })
})
