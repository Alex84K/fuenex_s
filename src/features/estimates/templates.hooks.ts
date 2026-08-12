import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { templatesApi } from "./templates.api"
import type { EstimateTemplateInput, EstimateTemplatePatch } from "./types"

export const TEMPLATES_QUERY_KEY = ["estimate-templates"]

export const useGetTemplates = () =>
  useQuery({
    queryKey: TEMPLATES_QUERY_KEY,
    queryFn: () => templatesApi.getAll(),
  })

export const useGetTemplate = (id: string | null) =>
  useQuery({
    queryKey: [...TEMPLATES_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (id == null)
        return Promise.reject(new Error("template id is required"))
      return templatesApi.getById(id)
    },
    enabled: id != null,
  })

export const usePutTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstimateTemplateInput }) =>
      templatesApi.put(id, data),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...TEMPLATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY })
    },
  })
}

export const usePatchTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EstimateTemplatePatch }) =>
      templatesApi.patch(id, patch),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...TEMPLATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY })
    },
  })
}

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => templatesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({
        queryKey: [...TEMPLATES_QUERY_KEY, "detail", id],
      })
      void queryClient.invalidateQueries({ queryKey: TEMPLATES_QUERY_KEY })
    },
  })
}
