import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { TASK_LIMITS } from "../../features/planner/types"
import type { TaskTemplateItem } from "../../features/planner/types"
import { ModalShell } from "./ModalShell"

type Props = {
  item: TaskTemplateItem
  onSave: (patch: Partial<TaskTemplateItem>) => void
  onClose: () => void
}

// Long text fields of one TEMPLATE line (title, description). Deliberately
// no status, no progress, no assignee — a template describes work, not its
// state (D10, DESIGN_PLANNER.md §5.1).
export const EditTaskTemplateItemModal: FC<Props> = ({
  item,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const patch: Partial<TaskTemplateItem> = {}
    if (title !== item.title) patch.title = title
    if (description !== item.description) patch.description = description
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    onSave(patch)
  }

  return (
    <ModalShell title="Позиция шаблона" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          <div className="mb-3">
            <label
              className="form-label fw-semibold"
              htmlFor="template-item-title"
            >
              Что делать
            </label>
            <input
              id="template-item-title"
              type="text"
              className="form-control"
              maxLength={TASK_LIMITS.title}
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
              htmlFor="template-item-desc"
            >
              Описание
            </label>
            <textarea
              id="template-item-desc"
              rows={4}
              className="form-control"
              maxLength={TASK_LIMITS.description}
              value={description}
              onChange={e => {
                setDescription(e.target.value)
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
          <button type="submit" className="btn btn-primary fw-bold">
            Сохранить
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
