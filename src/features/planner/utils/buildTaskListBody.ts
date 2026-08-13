import type { Task, TaskRequest } from "../types"

// tasks → collection PUT body (DESIGN_PLANNER.md §4.6): the client
// normalizes position to 0…n−1 before sending — the array order IS the
// order, exactly as the estimate does. Used by reordering and by template
// application (D6) — both are "replacing the list IS the user's intent".
export const buildTaskListBody = (tasks: Task[]): TaskRequest[] =>
  tasks.map((t, position) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    progressPct: t.progressPct,
    assignee: t.assignee,
    position,
    deadline: t.deadline,
  }))
