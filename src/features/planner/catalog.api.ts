import { apiFetch } from "../../utils/api"
import type {
  TaskCatalogItem,
  TaskCatalogItemInput,
  TaskCatalogItemPatch,
} from "./types"

export const taskCatalogApi = {
  // The whole catalog in one request, ORDER BY title, id — no server search
  // or pagination, filtering happens on the client (§8.3).
  getAll: (): Promise<TaskCatalogItem[]> =>
    apiFetch<TaskCatalogItem[]>("/api/v1/task-catalog-items"),

  getById: (id: string): Promise<TaskCatalogItem> =>
    apiFetch<TaskCatalogItem>(`/api/v1/task-catalog-items/${id}`),

  put: (id: string, data: TaskCatalogItemInput): Promise<TaskCatalogItem> =>
    apiFetch<TaskCatalogItem>(`/api/v1/task-catalog-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: (id: string, patch: TaskCatalogItemPatch): Promise<TaskCatalogItem> =>
    apiFetch<TaskCatalogItem>(`/api/v1/task-catalog-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/task-catalog-items/${id}`, { method: "DELETE" }),
}
