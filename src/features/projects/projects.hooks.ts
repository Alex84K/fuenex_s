import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { projectsApi } from "./projects.api"
import type { ProjectInput, ProjectPatch } from "./types"
import { uuidv7 } from "../../utils/uuid"

export const PROJECTS_QUERY_KEY = ["projects"]

export const useGetProjects = () => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => projectsApi.getAll(),
  })
}

export const useGetProject = (id: string | undefined) => {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (id == null) {
        return Promise.reject(new Error("project id is required"))
      }
      return projectsApi.getById(id)
    },
    enabled: id != null,
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    // The client mints the UUIDv7 id — the same PUT is a create (201) or a
    // replace (200), so there is no separate create endpoint.
    mutationFn: (data: ProjectInput) => projectsApi.put(uuidv7(), data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }) =>
      projectsApi.patch(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })
}
