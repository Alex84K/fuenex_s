import { apiFetch } from "../../utils/api"
import type {
  MeasurementSet,
  MeasurementSetInput,
  MeasurementSetPatch,
  MeasurementTree,
} from "./types"

// Thin wrappers over apiFetch, one-to-one with estimates.api.ts.
export const measurementApi = {
  // The whole project's measurement — the ONLY list read: there is no
  // separate "list of sets" endpoint, the tree arrives whole and feeds the
  // list, the area summary and the set editor from one cache
  // (DESIGN §6.1).
  getTree: (projectId: string): Promise<MeasurementTree> =>
    apiFetch<MeasurementTree>(`/api/v1/projects/${projectId}/measurement`),

  getSet: (id: string): Promise<MeasurementSet> =>
    apiFetch<MeasurementSet>(`/api/v1/measurement-sets/${id}`),

  // PUT is both create (201) and replace (200) — the client mints the
  // UUIDv7 id. The body is ALWAYS built by buildSetBody so the surfaces
  // key can never be missing (F-1).
  putSet: (id: string, data: MeasurementSetInput): Promise<MeasurementSet> =>
    apiFetch<MeasurementSet>(`/api/v1/measurement-sets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // PATCH touches only the scalar fields; surfaces are not patchable at
  // all (DESIGN_MEASUREMENT.md §8).
  patchSet: (id: string, patch: MeasurementSetPatch): Promise<MeasurementSet> =>
    apiFetch<MeasurementSet>(`/api/v1/measurement-sets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Idempotent: 204 even for a foreign or missing id.
  removeSet: (id: string): Promise<void> =>
    apiFetch(`/api/v1/measurement-sets/${id}`, { method: "DELETE" }),
}
