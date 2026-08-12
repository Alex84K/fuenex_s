import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { taskCatalogApi } from "./catalog.api"
import type { TaskCatalogItemInput, TaskCatalogItemPatch } from "./types"

export const TASK_CATALOG_QUERY_KEY = ["task-catalog-items"]

export const useGetTaskCatalog = () =>
  useQuery({
    queryKey: TASK_CATALOG_QUERY_KEY,
    queryFn: () => taskCatalogApi.getAll(),
  })

export const usePutTaskCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskCatalogItemInput }) =>
      taskCatalogApi.put(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASK_CATALOG_QUERY_KEY })
    },
  })
}

export const usePatchTaskCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskCatalogItemPatch }) =>
      taskCatalogApi.patch(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASK_CATALOG_QUERY_KEY })
    },
  })
}

export const useDeleteTaskCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taskCatalogApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASK_CATALOG_QUERY_KEY })
    },
  })
}
