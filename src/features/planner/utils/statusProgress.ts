import type { Task, TaskPatch, TaskStatus } from "../types"

// The status×progressPct invariant (DESIGN_PLANNER.md §4.3, decision D5,
// extended by ADR-013's fourth status):
//
//   status = todo         ⟹ progressPct = 0
//   status = in_progress  ⟹ 0 ≤ progressPct ≤ 100
//   status = review       ⟹ progressPct = 100  (foreman's claim, awaiting the customer)
//   status = done         ⟹ progressPct = 100  (the customer's acceptance)
//
// review and done share 100 % on purpose: 100 % has always meant "the work is
// finished"; what the two statuses differ on is WHO said so. done is not the
// foreman's to set — the quick action sends a stage to review, acceptance
// comes from the customer (MVP_Scope.md §3.3). The server checks the pair by
// OUTCOME and answers 400 on a violation, so the client always sends a
// consistent pair in one PATCH ("сдвинув процент до 100, UI обязан перевести
// статус в review в том же запросе").
//
// These helpers are pure — they decide WHAT to send; the hook sends it.

export const statusPatch = (
  task: Pick<Task, "status" | "progressPct">,
  status: TaskStatus,
): TaskPatch | null => {
  const pct =
    status === "todo"
      ? 0
      : status === "review" || status === "done"
        ? 100
        : task.progressPct
  if (status === task.status && pct === task.progressPct) return null
  return { status, progressPct: pct }
}

export const toggleDonePatch = (
  task: Pick<Task, "status" | "progressPct">,
  checked: boolean,
): TaskPatch | null => {
  if (checked) {
    // The quick action is "отправить на проверку": the foreman claims the
    // work is finished; acceptance (done) is the customer's action.
    if (task.status === "review" && task.progressPct === 100) return null
    return { status: "review", progressPct: 100 }
  }
  if (task.status === "todo" && task.progressPct === 0) return null
  return { status: "todo", progressPct: 0 }
}

export const progressPatch = (
  task: Pick<Task, "status" | "progressPct">,
  pct: number,
): TaskPatch | null => {
  if (pct === task.progressPct && task.status !== "todo") return null
  // 100 % is "the work is finished" — the stage goes to review, never
  // straight to done: acceptance is the customer's to give. Any other value
  // means "in progress"; a todo task with 0 % stays todo.
  if (pct === 100) {
    if (
      (task.status === "review" || task.status === "done") &&
      task.progressPct === 100
    )
      return null
    return { status: "review", progressPct: 100 }
  }
  if (pct === 0 && task.status === "todo") return null
  return { status: "in_progress", progressPct: pct }
}
