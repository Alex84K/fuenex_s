import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { tasksApi } from "./tasks.api"
import type { Task, TaskInput, TaskPatch, TaskRequest } from "./types"

export const TASKS_QUERY_KEY = ["tasks"]

// The project list carries the planner's two counters (taskCount,
// taskDoneCount — DESIGN_PLANNER.md §8.2): every task write changes them, so
// every task mutation invalidates the list.
const PROJECTS_QUERY_KEY = ["projects"]

const byEstimateKey = (estimateId: string) => [
  ...TASKS_QUERY_KEY,
  "byEstimate",
  estimateId,
]

const readList = (
  queryClient: ReturnType<typeof useQueryClient>,
  estimateId: string,
): Task[] => queryClient.getQueryData<Task[]>(byEstimateKey(estimateId)) ?? []

const setList = (
  queryClient: ReturnType<typeof useQueryClient>,
  estimateId: string,
  tasks: Task[],
) => {
  queryClient.setQueryData<Task[]>(byEstimateKey(estimateId), tasks)
}

const touchProjects = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
}

export const useGetTasksByEstimate = (estimateId: string | undefined) =>
  useQuery({
    queryKey: byEstimateKey(estimateId ?? ""),
    queryFn: () => {
      if (estimateId == null)
        return Promise.reject(new Error("estimate id is required"))
      return tasksApi.listByEstimate(estimateId)
    },
    enabled: estimateId != null,
  })

export const usePutTask = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { estimateId: string; id: string; data: TaskInput }) =>
      tasksApi.put(args.id, args.data),
    onSuccess: (saved, { estimateId }) => {
      // Create (201) appends, replace (200) swaps in place — both are
      // "this id now holds this task", so one upsert covers both.
      const list = readList(queryClient, estimateId)
      const exists = list.some(t => t.id === saved.id)
      setList(
        queryClient,
        estimateId,
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
    mutationFn: (args: { estimateId: string; id: string; patch: TaskPatch }) =>
      tasksApi.patch(args.id, args.patch),
    onSuccess: (saved, { estimateId }) => {
      setList(
        queryClient,
        estimateId,
        readList(queryClient, estimateId).map(t =>
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
    mutationFn: (args: { estimateId: string; id: string }) =>
      tasksApi.remove(args.id),
    onSuccess: (_data, { estimateId, id }) => {
      setList(
        queryClient,
        estimateId,
        readList(queryClient, estimateId).filter(t => t.id !== id),
      )
      touchProjects(queryClient)
    },
  })
}

// The collection PUT — used where replacing the whole list IS the user's
// intent (D6: applying a template appends; reordering). The response is the
// authoritative post-write list.
export const useReplaceTasksByEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { estimateId: string; tasks: TaskRequest[] }) =>
      tasksApi.replaceByEstimate(args.estimateId, args.tasks),
    onSuccess: (saved, { estimateId }) => {
      setList(queryClient, estimateId, saved)
      touchProjects(queryClient)
    },
  })
}
