import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { estimatesApi } from "./estimates.api"
import type { EstimateInput, EstimatePatch } from "./types"

export const ESTIMATES_QUERY_KEY = ["estimates"]

export const useGetEstimatesByProject = (projectId: string | undefined) =>
  useQuery({
    queryKey: [...ESTIMATES_QUERY_KEY, "byProject", projectId],
    queryFn: () => {
      if (projectId == null)
        return Promise.reject(new Error("project id is required"))
      return estimatesApi.listByProject(projectId)
    },
    enabled: projectId != null,
  })

export const useGetEstimate = (id: string | null) =>
  useQuery({
    queryKey: [...ESTIMATES_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (id == null)
        return Promise.reject(new Error("estimate id is required"))
      return estimatesApi.getById(id)
    },
    enabled: id != null,
  })

export const usePutEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstimateInput }) =>
      estimatesApi.put(id, data),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...ESTIMATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", saved.projectId],
      })
    },
  })
}

export const usePatchEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EstimatePatch }) =>
      estimatesApi.patch(id, patch),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...ESTIMATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", saved.projectId],
      })
    },
  })
}

export const useDeleteEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      estimatesApi.remove(id),
    onSuccess: (_data, { id, projectId }) => {
      queryClient.removeQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "detail", id],
      })
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", projectId],
      })
    },
  })
}
