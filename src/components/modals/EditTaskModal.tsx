import type { FC, SyntheticEvent } from "react"
import { useMemo, useState } from "react"
import { ApiError } from "../../utils/api"
import { uuidv7 } from "../../utils/uuid"
import {
  TASK_LIMITS,
  TASK_STATUS_LABELS,
  type Task,
  type TaskInput,
  type TaskPatch,
} from "../../features/planner/types"
import { usePatchTask, usePutTask } from "../../features/planner/tasks.hooks"
import { ModalShell } from "./ModalShell"

// runeLength counts code points — the same unit the server counts
// (utf8.RuneCountInString, DESIGN_PLANNER.md §11).
const runeLength = (s: string): number => Array.from(s).length

type Props = {
  projectId: string
  /** null → create mode (PUT with a fresh UUIDv7 id); a task → edit mode (PATCH with only the changed fields). */
  task: Task | null
  /** assignee names already seen on this project — the autocomplete datalist (§4.4). */
  knownAssignees: string[]
  /** position for a NEW task — the current list length (append). */
  nextPosition: number
  onClose: () => void
}

// Long text fields of one task (title, description, assignee) — in the
// table they are only shown, edited here (the estimate's item-modal shape,
// DESIGN_ESTIMATE.md §8.2). Create mode PUTs a full task in todo / 0 %;
// edit mode PATCHes only the changed fields. The status×progress pair is
// never touched here — it lives on the row controls.
export const EditTaskModal: FC<Props> = ({
  projectId,
  task,
  knownAssignees,
  nextPosition,
  onClose,
}) => {
  const putTask = usePutTask()
  const patchTask = usePatchTask()
  const isPending = putTask.isPending || patchTask.isPending
  const mutationError = putTask.error ?? patchTask.error

  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [assignee, setAssignee] = useState(task?.assignee ?? "")
  const [deadline, setDeadline] = useState(task?.deadline ?? "")
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string
    description?: string
    assignee?: string
  }>({})

  // Unique non-empty names already used on this project, for the datalist
  // (§4.4: autocomplete from already loaded tasks — zero server cost, no
  // worker directory, no PII storage).
  const assigneeOptions = useMemo(
    () => Array.from(new Set(knownAssignees.filter(a => a !== ""))),
    [knownAssignees],
  )

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {}
    if (runeLength(title) > TASK_LIMITS.title)
      errors.title = `Не более ${String(TASK_LIMITS.title)} символов`
    if (runeLength(description) > TASK_LIMITS.description)
      errors.description = `Не более ${String(TASK_LIMITS.description)} символов`
    if (runeLength(assignee) > TASK_LIMITS.assignee)
      errors.assignee = `Не более ${String(TASK_LIMITS.assignee)} символов`
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return

    if (task) {
      const patch: TaskPatch = {}
      if (title !== task.title) patch.title = title
      if (description !== task.description) patch.description = description
      if (assignee !== task.assignee) patch.assignee = assignee
      // "" is an ordinary present value here, same as every other field —
      // clearing the deadline is not a null (RECARCH_DEADLINE.md §12.1).
      if (deadline !== task.deadline) patch.deadline = deadline
      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }
      patchTask.mutate(
        { projectId, id: task.id, patch },
        { onSuccess: onClose },
      )
      return
    }

    const input: TaskInput = {
      projectId,
      title,
      description,
      status: "todo",
      progressPct: 0,
      assignee,
      position: nextPosition,
      deadline,
    }
    putTask.mutate(
      { projectId, id: uuidv7(), data: input },
      { onSuccess: onClose },
    )
  }

  const errorMessage =
    mutationError instanceof ApiError
      ? mutationError.message
      : "Не удалось сохранить задачу"

  const isInvalid = (field: keyof typeof fieldErrors): boolean =>
    fieldErrors[field] != null

  return (
    <ModalShell
      title={task ? "Задача" : "Новая задача"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {mutationError && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="task-title">
              Что делать
            </label>
            <input
              id="task-title"
              type="text"
              className={`form-control${isInvalid("title") ? " is-invalid" : ""}`}
              maxLength={TASK_LIMITS.title}
              value={title}
              autoFocus
              onChange={e => {
                setTitle(e.target.value)
              }}
            />
            {fieldErrors.title && (
              <div className="invalid-feedback">{fieldErrors.title}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="task-desc">
              Описание
            </label>
            <textarea
              id="task-desc"
              rows={4}
              className={`form-control${isInvalid("description") ? " is-invalid" : ""}`}
              maxLength={TASK_LIMITS.description}
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
            />
            {fieldErrors.description && (
              <div className="invalid-feedback">{fieldErrors.description}</div>
            )}
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold" htmlFor="task-assignee">
              Исполнитель
            </label>
            <input
              id="task-assignee"
              type="text"
              className={`form-control${isInvalid("assignee") ? " is-invalid" : ""}`}
              maxLength={TASK_LIMITS.assignee}
              placeholder="Необязательно"
              list="task-assignees"
              value={assignee}
              onChange={e => {
                setAssignee(e.target.value)
              }}
            />
            <datalist id="task-assignees">
              {assigneeOptions.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {fieldErrors.assignee && (
              <div className="invalid-feedback">{fieldErrors.assignee}</div>
            )}
            {task && (
              <div className="form-text">
                Статус: {TASK_STATUS_LABELS[task.status]}. Процент и отметку
                выполнения ставьте в списке задач.
              </div>
            )}
          </div>

          <div className="mb-1">
            <label className="form-label fw-semibold" htmlFor="task-deadline">
              Дедлайн
            </label>
            <div className="input-group" style={{ maxWidth: "16rem" }}>
              <input
                id="task-deadline"
                type="date"
                className="form-control"
                value={deadline}
                onChange={e => {
                  setDeadline(e.target.value)
                }}
              />
              {deadline !== "" && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  title="Убрать дедлайн"
                  aria-label="Убрать дедлайн"
                  onClick={() => {
                    setDeadline("")
                  }}
                >
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
            <div className="form-text">Необязательно.</div>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="btn btn-primary fw-bold"
            disabled={isPending}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
