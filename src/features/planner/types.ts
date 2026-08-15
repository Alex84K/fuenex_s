// Wire shapes of the planner feature — taken verbatim from the server DTOs
// (server_go/internal/planner/http_task*.go, DESIGN_PLANNER.md §10). Field
// limits mirror the server validators (§11): the client duplicates them for
// instant feedback, the server stays the authority.

export const TASK_LIMITS = {
  title: 256,
  description: 1000,
  assignee: 128,
  templateNote: 512,
  catalogCategory: 64,
  maxTasks: 1000,
  maxTemplateItems: 1000,
  maxCatalogItems: 5000,
} as const

// Status is deliberately NOT a DB CHECK (decision D4) — the set is a product
// decision that will change (kanban wants a fourth column; ADR-013 delivered
// it). review — "на проверке" — sits between the crew finishing and the
// customer accepting, so done now means the customer's acceptance, not the
// foreman's claim. The client mirrors the handler's accepted set.
export const TASK_STATUSES = ["todo", "in_progress", "review", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  done: "Принято",
}

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "text-bg-secondary",
  in_progress: "text-bg-primary",
  review: "text-bg-info",
  done: "text-bg-success",
}

// A bucket derived from deadline vs. "today", never stored — client-only,
// recomputed on render (RECARCH_DEADLINE.md §6.3/§12.4: the server has no
// user timezone, so it never decides this). "none" is not a badge color —
// components skip rendering one for it, the same way an empty assignee
// renders "—" instead of a badge.
export const DEADLINE_URGENCIES = [
  "overdue",
  "today",
  "soon",
  "later",
  "none",
] as const
export type DeadlineUrgency = (typeof DEADLINE_URGENCIES)[number]

export const DEADLINE_URGENCY_LABELS: Record<DeadlineUrgency, string> = {
  overdue: "Просрочено",
  today: "Сегодня",
  soon: "Скоро",
  later: "",
  none: "",
}

// text-bg-danger's first use in this codebase (RECARCH_DEADLINE.md §6.3).
export const DEADLINE_URGENCY_BADGE: Record<DeadlineUrgency, string> = {
  overdue: "text-bg-danger",
  today: "text-bg-warning",
  soon: "text-bg-warning",
  later: "text-bg-secondary",
  none: "",
}

// GET /api/v1/estimates/{id}/tasks · GET/PUT/PATCH /api/v1/tasks/{id} —
// response. ownerId, deletedAt, rev and schemaVersion never leave the server.
// Unlike estimateItemDTO, createdAt IS on the wire: a task is the planner's
// node, and its "time" is when it landed on the phase (R6, F-2).
//
// deadline is "" when unset — never null (RECARCH_DEADLINE.md §12.1): the
// same "empty string, not the absence of the key" convention as assignee,
// so a PATCH clearing it is an ordinary {"deadline": ""}. A calendar date
// "YYYY-MM-DD", not a moment — no time-of-day, "today" is decided by the
// browser, not the server (§12.2/§12.3).
export type Task = {
  id: string
  // Tasks hang off the estimate, not the project (ADR-013 decision 5: a
  // second estimate on a job is a later phase, and the phase carries its own
  // work).
  estimateId: string
  title: string
  description: string
  status: TaskStatus
  progressPct: number
  assignee: string
  position: number
  deadline: string
  createdAt: string
  updatedAt: string
}

// PUT /api/v1/tasks/{id} — single-task body. estimateId is REQUIRED here:
// the path carries only the task id (D2, DESIGN_PLANNER.md §7.3).
export type TaskInput = {
  estimateId: string
  title: string
  description: string
  status: TaskStatus
  progressPct: number
  assignee: string
  position: number
  deadline: string
}

// One element of the collection PUT /api/v1/estimates/{id}/tasks body — a
// BARE ARRAY, not an object wrapper (D3): [] means [] and nothing else.
// estimateId is absent on purpose — the parent comes from the path; id IS
// required, the client mints each one (UUIDv7).
export type TaskRequest = {
  id: string
  title: string
  description: string
  status: TaskStatus
  progressPct: number
  assignee: string
  position: number
  deadline: string
}

// PATCH /api/v1/tasks/{id} — scalars only, explicit null is rejected by the
// server. The status×progressPct pair is checked against the RESULTING state
// (§7.3), so the client always sends both when either changes (D5). Clearing
// deadline is {"deadline": ""}, an ordinary present value — never null
// (§12.1).
export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "progressPct"
    | "assignee"
    | "position"
    | "deadline"
  >
>

// /api/v1/task-catalog-items — the owner's reusable formulations of work.
// No status, no progress, no assignee: a catalog row describes work, never
// its state (D10).
export type TaskCatalogItem = {
  id: string
  title: string
  description: string
  category: string // free-form rubric, "" when unused
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

export type TaskCatalogItemInput = Omit<
  TaskCatalogItem,
  "id" | "createdAt" | "updatedAt"
>

export type TaskCatalogItemPatch = Partial<TaskCatalogItemInput>

// /api/v1/task-templates — reusable sets of tasks at the owner. Template
// items carry no state either (D10); applying one mints fresh tasks in
// todo / 0 % / nobody.
export type TaskTemplateItem = {
  id: string
  title: string
  description: string
  position: number
}

export type TaskTemplate = {
  id: string
  title: string
  note: string
  items: TaskTemplateItem[]
  createdAt: string
  updatedAt: string
  // no projectId — a template belongs to the owner, not a project
}

// GET /api/v1/task-templates — list of names without items (§8.3).
export type TaskTemplateSummary = Omit<TaskTemplate, "items">

export type TaskTemplateInput = {
  title: string
  note: string
  items: TaskTemplateItem[]
}

export type TaskTemplatePatch = Partial<Pick<TaskTemplate, "title" | "note">>
