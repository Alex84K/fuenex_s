import { uuidv7 } from "../../../utils/uuid"
import type { TaskCatalogItem, TaskRequest, TaskTemplateItem } from "../types"

// Copy-by-value into the task list (DESIGN_PLANNER.md §5): a fresh UUIDv7
// id and the text fields. Status, progress, assignee and deadline are
// deliberately NOT carried — a catalog row or a template line describes
// work, not its state or a schedule (D10, RECARCH_DEADLINE.md §8). The
// applied task is born in todo / 0 % / nobody / no deadline, exactly as the
// server would create it.
export const taskFromCatalogItem = (
  c: TaskCatalogItem,
  position: number,
): TaskRequest => ({
  id: uuidv7(),
  title: c.title,
  description: c.description,
  status: "todo",
  progressPct: 0,
  assignee: "",
  position,
  deadline: "",
})

// Template items → task requests. Reusing template ids would point at
// another table's rows: every application mints fresh ids, so editing a
// template never rewrites tasks collected from it earlier (D6, §5 — the
// client-side analogue of
// TestEstimateTemplates_ApplyThenEdit_DoesNotAffectExistingEstimate).
// Positions continue from startPosition — applying APPENDS to the end of a
// possibly non-empty list (D6, §5.2).
export const tasksFromTemplate = (
  items: TaskTemplateItem[],
  startPosition: number,
): TaskRequest[] =>
  items.map((it, i) => ({
    id: uuidv7(),
    title: it.title,
    description: it.description,
    status: "todo",
    progressPct: 0,
    assignee: "",
    position: startPosition + i,
    deadline: "",
  }))
