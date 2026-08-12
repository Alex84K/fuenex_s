import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import { usePutTemplate } from "../../features/estimates/templates.hooks"
import type { EstimateDraft } from "../../features/estimates/estimateEditorSlice"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import type { EstimateTemplateInput } from "../../features/estimates/types"
import { uuidv7 } from "../../utils/uuid"
import { ModalShell } from "./ModalShell"

type Props = {
  draft: EstimateDraft
  onClose: () => void
}

// draft → new template: fresh item ids, current rates. Currency and
// projectId never travel (the template has neither) (DESIGN §10).
export const SaveAsTemplateModal: FC<Props> = ({ draft, onClose }) => {
  const putTemplate = usePutTemplate()
  const [title, setTitle] = useState(draft.title || "")
  const [note, setNote] = useState("")

  const errorMessage =
    putTemplate.error instanceof ApiError
      ? putTemplate.error.message
      : "Не удалось сохранить шаблон"

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const input: EstimateTemplateInput = {
      title: title.trim(),
      note,
      taxRateBp: draft.taxRateBp,
      discountBp: draft.discountBp,
      items: draft.items.map((it, position) => ({ ...it, position })),
    }
    putTemplate.mutate({ id: uuidv7(), data: input }, { onSuccess: onClose })
  }

  return (
    <ModalShell title="Сохранить как шаблон" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {putTemplate.error && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}
          <p className="text-muted small">
            Шаблон содержит {draft.items.length}{" "}
            {draft.items.length === 1 ? "позицию" : "позиций"} и текущие ставку
            и скидку. Валюта в шаблон не переносится.
          </p>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="template-title">
              Название шаблона
            </label>
            <input
              id="template-title"
              type="text"
              className="form-control"
              maxLength={ESTIMATE_LIMITS.title}
              value={title}
              autoFocus
              onChange={e => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div className="mb-1">
            <label className="form-label fw-semibold" htmlFor="template-note">
              Заметка
            </label>
            <textarea
              id="template-note"
              rows={3}
              className="form-control"
              maxLength={ESTIMATE_LIMITS.note}
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
