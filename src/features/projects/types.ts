// Wire shape of the project container (DESIGN_PROJECT.md §11.2): six scalar
// fields plus the server-written timestamps. ownerId, deletedAt, rev and
// schemaVersion are never exposed by the API (§5).

export const PROJECT_STATUSES = ["ACTIVE", "DONE", "ARCHIVED"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "В работе",
  DONE: "Завершён",
  ARCHIVED: "Архивирован",
}

// Bootstrap badge color per status.
export const PROJECT_STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE: "text-bg-primary",
  DONE: "text-bg-success",
  ARCHIVED: "text-bg-secondary",
}

// Field length limits from DESIGN_PROJECT.md §4.1, counted in runes. The
// server enforces them; the client mirrors them for instant feedback.
export const PROJECT_FIELD_LIMITS = {
  title: 128,
  customer: 128,
  workType: 128,
  objectAddress: 256,
  note: 512,
} as const

export type Project = {
  id: string
  title: string
  customer: string
  objectAddress: string
  workType: string
  status: ProjectStatus
  note: string
  createdAt: string
  updatedAt: string
  // The planner's contribution to the project LIST (DESIGN_PLANNER.md §8.2):
  // one LEFT JOIN, two counters. Present only in GET /api/v1/projects —
  // GET /api/v1/projects/{id} never carries them, so they are optional
  // here and read as 0 when absent.
  taskCount?: number
  taskDoneCount?: number
}

// PUT body — all six fields required (an absent field would silently mean
// "", so the form always sends all of them).
export type ProjectInput = {
  title: string
  customer: string
  objectAddress: string
  workType: string
  status: ProjectStatus
  note: string
}

// PATCH body — only the fields present in the body change; "" clears a
// field, an absent key leaves it alone (DESIGN_PROJECT.md §11.1).
export type ProjectPatch = Partial<ProjectInput>
