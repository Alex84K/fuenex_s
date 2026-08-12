import { apiFetch } from "../../utils/api"
import type { Task, TaskInput, TaskPatch, TaskRequest } from "./types"

export const tasksApi = {
  // Live tasks of one project, ORDER BY position, id (DESIGN_PLANNER.md
  // §8.1). Deleted tasks never come back.
  listByProject: (projectId: string): Promise<Task[]> =>
    apiFetch<Task[]>(`/api/v1/projects/${projectId}/tasks`),

  // Collection PUT — "пусть у этого проекта будет ровно этот список"
  // (§7.2). The body is a bare array: [] deletes every task (D3); the
  // response is the full list after the write, always 200.
  replaceByProject: (
    projectId: string,
    tasks: TaskRequest[],
  ): Promise<Task[]> =>
    apiFetch<Task[]>(`/api/v1/projects/${projectId}/tasks`, {
      method: "PUT",
      body: JSON.stringify(tasks),
    }),

  getById: (id: string): Promise<Task> => apiFetch<Task>(`/api/v1/tasks/${id}`),

  // PUT is create (201) or replace (200) — the client mints the UUIDv7 id.
  // projectId is required in the body (D2, §7.3).
  put: (id: string, data: TaskInput): Promise<Task> =>
    apiFetch<Task>(`/api/v1/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // PATCH — the product's most frequent operation ("отметить сделанной") is
  // one small request, not a whole-list PUT (D2, §7.1).
  patch: (id: string, patch: TaskPatch): Promise<Task> =>
    apiFetch<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Idempotent: 204 even for a foreign or missing id (§9.1).
  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/tasks/${id}`, { method: "DELETE" }),
}
