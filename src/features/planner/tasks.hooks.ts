import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { tasksApi } from "./tasks.api"
import type { Task, TaskInput, TaskPatch, TaskRequest } from "./types"

export const TASKS_QUERY_KEY = ["tasks"]

// The project list carries the planner's two counters (taskCount,
// taskDoneCount — DESIGN_PLANNER.md §8.2): every task write changes them, so
// every task mutation invalidates the list.
const PROJECTS_QUERY_KEY = ["projects"]

const byProjectKey = (projectId: string) => [
  ...TASKS_QUERY_KEY,
  "byProject",
  projectId,
]

const readList = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
): Task[] => queryClient.getQueryData<Task[]>(byProjectKey(projectId)) ?? []

const setList = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  tasks: Task[],
) => {
  queryClient.setQueryData<Task[]>(byProjectKey(projectId), tasks)
}

const touchProjects = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
}

export const useGetTasksByProject = (projectId: string | undefined) =>
  useQuery({
    queryKey: byProjectKey(projectId ?? ""),
    queryFn: () => {
      if (projectId == null)
        return Promise.reject(new Error("project id is required"))
      return tasksApi.listByProject(projectId)
    },
    enabled: projectId != null,
  })

export const usePutTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectId: string; id: string; data: TaskInput }) =>
      tasksApi.put(args.id, args.data),
    onSuccess: (saved, { projectId }) => {
      // Create (201) appends, replace (200) swaps in place — both are
      // "this id now holds this task", so one upsert covers both.
      const list = readList(queryClient, projectId)
      const exists = list.some(t => t.id === saved.id)
      setList(
        queryClient,
        projectId,
        exists
          ? list.map(t => (t.id === saved.id ? saved : t))
          : [...list, saved],
      )
      touchProjects(queryClient)
    },
  })
}

export const usePatchTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectId: string; id: string; patch: TaskPatch }) =>
      tasksApi.patch(args.id, args.patch),
    onSuccess: (saved, { projectId }) => {
      setList(
        queryClient,
        projectId,
        readList(queryClient, projectId).map(t =>
          t.id === saved.id ? saved : t,
        ),
      )
      touchProjects(queryClient)
    },
  })
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectId: string; id: string }) =>
      tasksApi.remove(args.id),
    onSuccess: (_data, { projectId, id }) => {
      setList(
        queryClient,
        projectId,
        readList(queryClient, projectId).filter(t => t.id !== id),
      )
      touchProjects(queryClient)
    },
  })
}

// The collection PUT — used where replacing the whole list IS the user's
// intent (D6: applying a template appends; reordering). The response is the
// authoritative post-write list.
export const useReplaceTasksByProject = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { projectId: string; tasks: TaskRequest[] }) =>
      tasksApi.replaceByProject(args.projectId, args.tasks),
    onSuccess: (saved, { projectId }) => {
      setList(queryClient, projectId, saved)
      touchProjects(queryClient)
    },
  })
}
