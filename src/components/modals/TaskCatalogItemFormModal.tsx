import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import { uuidv7 } from "../../utils/uuid"
import { TASK_LIMITS } from "../../features/planner/types"
import type {
  TaskCatalogItem,
  TaskCatalogItemInput,
  TaskCatalogItemPatch,
} from "../../features/planner/types"
import {
  usePatchTaskCatalogItem,
  usePutTaskCatalogItem,
} from "../../features/planner/catalog.hooks"
import { ModalShell } from "./ModalShell"

// runeLength counts code points — the same unit the server counts
// (utf8.RuneCountInString, DESIGN_PLANNER.md §11).
const runeLength = (s: string): number => Array.from(s).length

type Props = {
  /** null → create mode (PUT with a fresh UUIDv7 id); a row → edit mode (PATCH with only the changed fields). */
  item: TaskCatalogItem | null
  onClose: () => void
}

// A catalog row is a formulation of work — title, description, category —
// with no status, no progress, no assignee (D10). Same form shape as the
// estimate's CatalogItemFormModal, minus money and units.
export const TaskCatalogItemFormModal: FC<Props> = ({ item, onClose }) => {
  const putCatalogItem = usePutTaskCatalogItem()
  const patchCatalogItem = usePatchTaskCatalogItem()
  const isPending = putCatalogItem.isPending || patchCatalogItem.isPending
  const mutationError = putCatalogItem.error ?? patchCatalogItem.error

  const [title, setTitle] = useState(item?.title ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [category, setCategory] = useState(item?.category ?? "")
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof TaskCatalogItemInput, string>>
  >({})

  const validate = (
    input: TaskCatalogItemInput,
  ): Partial<Record<keyof TaskCatalogItemInput, string>> => {
    const errors: Partial<Record<keyof TaskCatalogItemInput, string>> = {}
    const check = (
      key: keyof TaskCatalogItemInput,
      value: string,
      max: number,
    ) => {
      if (runeLength(value) > max)
        errors[key] = `Не более ${String(max)} символов`
    }
    check("title", input.title, TASK_LIMITS.title)
    check("description", input.description, TASK_LIMITS.description)
    check("category", input.category, TASK_LIMITS.catalogCategory)
    return errors
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (item) {
      const patch: TaskCatalogItemPatch = {}
      if (title !== item.title) patch.title = title
      if (description !== item.description) patch.description = description
      if (category !== item.category) patch.category = category
      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }
      const errors = validate({ ...item, ...patch })
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      patchCatalogItem.mutate({ id: item.id, patch }, { onSuccess: onClose })
      return
    }

    const input: TaskCatalogItemInput = {
      title,
      description,
      category,
      isFavorite: false,
    }
    const errors = validate(input)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    putCatalogItem.mutate({ id: uuidv7(), data: input }, { onSuccess: onClose })
  }

  const errorMessage =
    mutationError instanceof ApiError &&
    mutationError.message.includes("catalog item limit reached")
      ? "Каталог заполнен (5000 строк). Удалите неиспользуемые формулировки."
      : mutationError instanceof ApiError
        ? mutationError.message
        : "Не удалось сохранить формулировку"

  const isInvalid = (field: keyof TaskCatalogItemInput): boolean =>
    fieldErrors[field] != null

  return (
    <ModalShell
      title={item ? "Редактирование формулировки" : "Новая формулировка"}
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
            <label className="form-label fw-semibold" htmlFor="task-cat-title">
              Что делать
            </label>
            <input
              id="task-cat-title"
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
            <label className="form-label fw-semibold" htmlFor="task-cat-desc">
              Описание
            </label>
            <textarea
              id="task-cat-desc"
              rows={3}
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
            <label
              className="form-label fw-semibold"
              htmlFor="task-cat-category"
            >
              Категория
            </label>
            <input
              id="task-cat-category"
              type="text"
              className={`form-control${isInvalid("category") ? " is-invalid" : ""}`}
              maxLength={TASK_LIMITS.catalogCategory}
              placeholder="Например: Демонтаж, Электрика"
              value={category}
              onChange={e => {
                setCategory(e.target.value)
              }}
            />
            <div className="form-text">
              Необязательная рубрика для навигации по каталогу.
            </div>
            {fieldErrors.category && (
              <div className="invalid-feedback">{fieldErrors.category}</div>
            )}
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
