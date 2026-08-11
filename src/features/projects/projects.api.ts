import { apiFetch } from "../../utils/api"
import type { Project, ProjectInput, ProjectPatch } from "./types"

export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    return apiFetch<Project[]>("/api/v1/projects")
  },

  getById: async (id: string): Promise<Project> => {
    return apiFetch<Project>(`/api/v1/projects/${id}`)
  },

  // PUT — "пусть по этому адресу будет ровно это" (DESIGN_PROJECT.md
  // §11.1). There is no POST: the client mints the id (UUIDv7) before the
  // request, so PUT is both create and replace (201 / 200).
  put: async (id: string, data: ProjectInput): Promise<Project> => {
    return apiFetch<Project>(`/api/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  // PATCH — partial scalar update: absent fields stay untouched.
  patch: async (id: string, patch: ProjectPatch): Promise<Project> => {
    return apiFetch<Project>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
  },

  // DELETE — soft delete, idempotent, always 204 (DESIGN_PROJECT.md §9.1).
  remove: async (id: string): Promise<void> => {
    await apiFetch(`/api/v1/projects/${id}`, { method: "DELETE" })
  },
}
