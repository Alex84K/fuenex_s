import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { taskTemplatesApi } from "./templates.api"
import type { TaskTemplateInput, TaskTemplatePatch } from "./types"

export const TASK_TEMPLATES_QUERY_KEY = ["task-templates"]

export const useGetTaskTemplates = () =>
  useQuery({
    queryKey: TASK_TEMPLATES_QUERY_KEY,
    queryFn: () => taskTemplatesApi.getAll(),
  })

export const useGetTaskTemplate = (id: string | null) =>
  useQuery({
    queryKey: [...TASK_TEMPLATES_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (id == null)
        return Promise.reject(new Error("template id is required"))
      return taskTemplatesApi.getById(id)
    },
    enabled: id != null,
  })

export const usePutTaskTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskTemplateInput }) =>
      taskTemplatesApi.put(id, data),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...TASK_TEMPLATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({ queryKey: TASK_TEMPLATES_QUERY_KEY })
    },
  })
}

export const usePatchTaskTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskTemplatePatch }) =>
      taskTemplatesApi.patch(id, patch),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...TASK_TEMPLATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({ queryKey: TASK_TEMPLATES_QUERY_KEY })
    },
  })
}

export const useDeleteTaskTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => taskTemplatesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: [...TASK_TEMPLATES_QUERY_KEY, "detail", id],
      })
      void queryClient.invalidateQueries({ queryKey: TASK_TEMPLATES_QUERY_KEY })
    },
  })
}
