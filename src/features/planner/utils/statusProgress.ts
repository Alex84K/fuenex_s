import type { Task, TaskPatch, TaskStatus } from "../types"

// The status×progressPct invariant (DESIGN_PLANNER.md §4.3, decision D5):
//
//   status = todo        ⟹ progressPct = 0
//   status = in_progress ⟹ 0 ≤ progressPct ≤ 100
//   status = done        ⟹ progressPct = 100
//
// The server checks the pair by OUTCOME and answers 400 on a violation, so
// the client always sends a consistent pair in one PATCH ("сдвинув процент
// до 100, UI обязан перевести статус в done в том же запросе").
//
// These helpers are pure — they decide WHAT to send; the hook sends it.

export const statusPatch = (
  task: Pick<Task, "status" | "progressPct">,
  status: TaskStatus,
): TaskPatch | null => {
  const pct = status === "todo" ? 0 : status === "done" ? 100 : task.progressPct
  if (status === task.status && pct === task.progressPct) return null
  return { status, progressPct: pct }
}

export const toggleDonePatch = (
  task: Pick<Task, "status" | "progressPct">,
  done: boolean,
): TaskPatch | null => {
  if (done) {
    if (task.status === "done" && task.progressPct === 100) return null
    return { status: "done", progressPct: 100 }
  }
  if (task.status === "todo" && task.progressPct === 0) return null
  return { status: "todo", progressPct: 0 }
}

export const progressPatch = (
  task: Pick<Task, "status" | "progressPct">,
  pct: number,
): TaskPatch | null => {
  if (pct === task.progressPct && task.status !== "todo") return null
  // 100 % is "done" by definition; any other value means "in progress".
  // A todo task with 0 % stays todo.
  if (pct === 100) {
    if (task.status === "done" && task.progressPct === 100) return null
    return { status: "done", progressPct: 100 }
  }
  if (pct === 0 && task.status === "todo") return null
  return { status: "in_progress", progressPct: pct }
}
