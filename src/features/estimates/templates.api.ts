import { apiFetch } from "../../utils/api"
import type {
  EstimateTemplate,
  EstimateTemplateInput,
  EstimateTemplatePatch,
  EstimateTemplateSummary,
} from "./types"

export const templatesApi = {
  // List without items — the server never returns them here (DESIGN §10).
  getAll: (): Promise<EstimateTemplateSummary[]> =>
    apiFetch<EstimateTemplateSummary[]>("/api/v1/estimate-templates"),

  getById: (id: string): Promise<EstimateTemplate> =>
    apiFetch<EstimateTemplate>(`/api/v1/estimate-templates/${id}`),

  put: (id: string, data: EstimateTemplateInput): Promise<EstimateTemplate> =>
    apiFetch<EstimateTemplate>(`/api/v1/estimate-templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: (
    id: string,
    patch: EstimateTemplatePatch,
  ): Promise<EstimateTemplate> =>
    apiFetch<EstimateTemplate>(`/api/v1/estimate-templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/estimate-templates/${id}`, { method: "DELETE" }),
}
