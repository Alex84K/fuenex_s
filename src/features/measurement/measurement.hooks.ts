import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { measurementApi } from "./measurement.api"
import type { MeasurementSetInput, MeasurementSetPatch } from "./types"

export const MEASUREMENT_QUERY_KEY = ["measurement"]

// DESIGN §6.1: the tree read feeds the list, the summary and the editor
// from one cache key. Mutations appear in the phases that call them (5–6)
// and invalidate this key.
export const measurementTreeKey = (projectId: string) => [
  ...MEASUREMENT_QUERY_KEY,
  "byProject",
  projectId,
]

export const measurementSetKey = (id: string) => [
  ...MEASUREMENT_QUERY_KEY,
  "set",
  id,
]

export const useGetMeasurementTree = (projectId: string | undefined) =>
  useQuery({
    queryKey: measurementTreeKey(projectId ?? ""),
    queryFn: () => {
      if (projectId == null)
        return Promise.reject(new Error("project id is required"))
      return measurementApi.getTree(projectId)
    },
    enabled: projectId != null,
  })

export const useGetMeasurementSet = (id: string | undefined) =>
  useQuery({
    queryKey: measurementSetKey(id ?? ""),
    queryFn: () => {
      if (id == null) return Promise.reject(new Error("set id is required"))
      return measurementApi.getSet(id)
    },
    enabled: id != null,
  })

// ── Mutations (PLANNING_MEASUREMENT.md phase 5) ──
// Cache rules from DESIGN §6.1: every write answers with the saved set —
// setQueryData on the set key, invalidate the project tree. projectId
// travels in the mutation args only so the tree knows where to invalidate.

export const usePutMeasurementSet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MeasurementSetInput }) =>
      measurementApi.putSet(id, data),
    onSuccess: saved => {
      queryClient.setQueryData(measurementSetKey(saved.id), saved)
      void queryClient.invalidateQueries({
        queryKey: measurementTreeKey(saved.projectId),
      })
    },
  })
}

export const usePatchMeasurementSet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MeasurementSetPatch }) =>
      measurementApi.patchSet(id, patch),
    onSuccess: saved => {
      queryClient.setQueryData(measurementSetKey(saved.id), saved)
      void queryClient.invalidateQueries({
        queryKey: measurementTreeKey(saved.projectId),
      })
    },
  })
}

export const useDeleteMeasurementSet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      measurementApi.removeSet(id),
    onSuccess: (_data, { id, projectId }) => {
      queryClient.removeQueries({ queryKey: measurementSetKey(id) })
      void queryClient.invalidateQueries({
        queryKey: measurementTreeKey(projectId),
      })
    },
  })
}
