import type { DeadlineUrgency } from "../types"

// How many calendar days out still counts as "soon" — a foreman-relevant
// window, not a physical constant (RECARCH_DEADLINE.md §6.4: the number is
// a product call, this is where it lives so it is easy to retune).
const SOON_WITHIN_DAYS = 3

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Calendar-day difference between a "YYYY-MM-DD" deadline and now's local
// date — NOT a 24h duration. A deadline of today stays "today" at 23:59 the
// same way it was at 00:01; only the calendar date changing moves it,
// exactly how a foreman reads a due date (§12.3). now's own time-of-day is
// discarded by zeroing it out before subtracting.
const daysUntil = (deadline: string, now: Date): number => {
  const [year, month, day] = deadline.split("-").map(Number)
  const deadlineLocal = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((deadlineLocal.getTime() - today.getTime()) / MS_PER_DAY)
}

// deadlineUrgency is pure and takes "now" as a parameter (never reads the
// clock itself) — mirrors statusProgress.ts's shape and makes every bucket
// boundary testable without mocking Date. Called at render time; nothing
// here polls or subscribes (§6.2 — this app has no client-side ticking
// refresh, and this function does not introduce one).
export const deadlineUrgency = (
  deadline: string,
  now: Date = new Date(),
): DeadlineUrgency => {
  if (deadline === "") return "none"
  const days = daysUntil(deadline, now)
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  if (days <= SOON_WITHIN_DAYS) return "soon"
  return "later"
}
