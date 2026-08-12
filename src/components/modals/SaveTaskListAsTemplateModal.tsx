import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import { uuidv7 } from "../../utils/uuid"
import { usePutTaskTemplate } from "../../features/planner/templates.hooks"
import { TASK_LIMITS } from "../../features/planner/types"
import type { Task, TaskTemplateInput } from "../../features/planner/types"
import { ModalShell } from "./ModalShell"

type Props = {
  tasks: Task[]
  onClose: () => void
}

// The current task list → a new template. State is deliberately dropped
// (D10): the template line carries title and description only, and applying
// it later mints fresh tasks in todo / 0 % / nobody. Editing this template
// never rewrites tasks already collected from it (D6, §5).
export const SaveTaskListAsTemplateModal: FC<Props> = ({ tasks, onClose }) => {
  const putTemplate = usePutTaskTemplate()
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")

  const errorMessage =
    putTemplate.error instanceof ApiError
      ? putTemplate.error.message
      : "Не удалось сохранить шаблон"

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input: TaskTemplateInput = {
      title: title.trim(),
      note,
      items: tasks.map((t, position) => ({
        id: uuidv7(),
        title: t.title,
        description: t.description,
        position,
      })),
    }
    putTemplate.mutate({ id: uuidv7(), data: input }, { onSuccess: onClose })
  }

  return (
    <ModalShell title="Сохранить список как шаблон" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {putTemplate.error && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}
          <p className="text-muted small">
            В шаблон войдёт {tasks.length} {pluralize(tasks.length)} — только
            названия и описания. Статусы, проценты и исполнители не переносятся.
          </p>
          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              htmlFor="task-template-title"
            >
              Название шаблона
            </label>
            <input
              id="task-template-title"
              type="text"
              className="form-control"
              maxLength={TASK_LIMITS.title}
              placeholder="Например: Ремонт санузла под ключ"
              value={title}
              autoFocus
              onChange={e => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div className="mb-1">
            <label
              className="form-label fw-semibold"
              htmlFor="task-template-note"
            >
              Заметка
            </label>
            <textarea
              id="task-template-note"
              rows={3}
              className="form-control"
              maxLength={TASK_LIMITS.templateNote}
              value={note}
              onChange={e => {
                setNote(e.target.value)
              }}
            />
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
            disabled={putTemplate.isPending}
          >
            {putTemplate.isPending ? "Сохранение..." : "Сохранить шаблон"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

const pluralize = (n: number): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "задачу"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задачи"
  return "задач"
}
