import { describe, expect, it } from "vitest"
import { deadlineUrgency } from "./deadlineUrgency"

// "now" is always passed explicitly (RECARCH_DEADLINE.md §6.4) — every
// boundary below is a calendar-day difference from a fixed reference date,
// never wall-clock time within that day.
const NOW = new Date(2026, 7, 15, 9, 30) // 2026-08-15, mid-morning

describe("deadlineUrgency", () => {
  it("no deadline is 'none'", () => {
    expect(deadlineUrgency("", NOW)).toBe("none")
  })

  it("a past date is 'overdue'", () => {
    expect(deadlineUrgency("2026-08-14", NOW)).toBe("overdue")
    expect(deadlineUrgency("2026-01-01", NOW)).toBe("overdue")
  })

  it("today's date is 'today' regardless of the time of day", () => {
    expect(deadlineUrgency("2026-08-15", NOW)).toBe("today")
    expect(deadlineUrgency("2026-08-15", new Date(2026, 7, 15, 23, 59))).toBe(
      "today",
    )
    expect(deadlineUrgency("2026-08-15", new Date(2026, 7, 15, 0, 1))).toBe(
      "today",
    )
  })

  it("within the soon window (1-3 days out) is 'soon'", () => {
    expect(deadlineUrgency("2026-08-16", NOW)).toBe("soon")
    expect(deadlineUrgency("2026-08-18", NOW)).toBe("soon")
  })

  it("past the soon window is 'later'", () => {
    expect(deadlineUrgency("2026-08-19", NOW)).toBe("later")
    expect(deadlineUrgency("2027-01-01", NOW)).toBe("later")
  })

  it("defaults now to the current time when omitted", () => {
    // Just exercises the default parameter — no fixed expectation on which
    // bucket, only that it returns something well-formed.
    expect(["overdue", "today", "soon", "later", "none"]).toContain(
      deadlineUrgency(""),
    )
  })
})
