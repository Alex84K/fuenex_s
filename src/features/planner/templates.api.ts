import { apiFetch } from "../../utils/api"
import type {
  TaskTemplate,
  TaskTemplateInput,
  TaskTemplatePatch,
  TaskTemplateSummary,
} from "./types"

export const taskTemplatesApi = {
  // List of names WITHOUT items (§8.3) — the detail arrives on demand.
  getAll: (): Promise<TaskTemplateSummary[]> =>
    apiFetch<TaskTemplateSummary[]>("/api/v1/task-templates"),

  // GET of a node returns the node WITH its subtree (§8.3).
  getById: (id: string): Promise<TaskTemplate> =>
    apiFetch<TaskTemplate>(`/api/v1/task-templates/${id}`),

  put: (id: string, data: TaskTemplateInput): Promise<TaskTemplate> =>
    apiFetch<TaskTemplate>(`/api/v1/task-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // PATCH touches only title and note — items are never patched.
  patch: (id: string, patch: TaskTemplatePatch): Promise<TaskTemplate> =>
    apiFetch<TaskTemplate>(`/api/v1/task-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/task-templates/${id}`, { method: "DELETE" }),
}
