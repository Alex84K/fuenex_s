import { apiFetch } from "../../utils/api"
import type { Task, TaskInput, TaskPatch, TaskRequest } from "./types"

export const tasksApi = {
  // Live tasks of one estimate, ORDER BY position, id (DESIGN_PLANNER.md
  // §8.1 — re-parented by ADR-013 decision 5: a second estimate on a job is
  // a later phase, and the phase carries its own work). Deleted tasks never
  // come back.
  listByEstimate: (estimateId: string): Promise<Task[]> =>
    apiFetch<Task[]>(`/api/v1/estimates/${estimateId}/tasks`),

  // Collection PUT — "пусть у этой сметы будет ровно этот список" (§7.2).
  // The body is a bare array: [] deletes every task (D3); the response is
  // the full list after the write, always 200.
  replaceByEstimate: (
    estimateId: string,
    tasks: TaskRequest[],
  ): Promise<Task[]> =>
    apiFetch<Task[]>(`/api/v1/estimates/${estimateId}/tasks`, {
      method: "PUT",
      body: JSON.stringify(tasks),
    }),

  getById: (id: string): Promise<Task> => apiFetch<Task>(`/api/v1/tasks/${id}`),

  // PUT is create (201) or replace (200) — the client mints the UUIDv7 id.
  // estimateId is required in the body (D2, §7.3).
  put: (id: string, data: TaskInput): Promise<Task> =>
    apiFetch<Task>(`/api/v1/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // PATCH — the product's most frequent operation ("отправить на проверку")
  // is one small request, not a whole-list PUT (D2, §7.1).
  patch: (id: string, patch: TaskPatch): Promise<Task> =>
    apiFetch<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Idempotent: 204 even for a foreign or missing id (§9.1).
  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" }),
}
