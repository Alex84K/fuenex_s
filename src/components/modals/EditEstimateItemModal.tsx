import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import { ModalShell } from "./ModalShell"

type Props = {
  item: DraftItem
  onSave: (patch: Partial<DraftItem>) => void
  onClose: () => void
}

// Long text fields of one item (title, description, unit) — in the table
// they are only shown, edited here (DESIGN §8.2).
export const EditEstimateItemModal: FC<Props> = ({ item, onSave, onClose }) => {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [unit, setUnit] = useState(item.unit)

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const patch: Partial<DraftItem> = {}
    if (title !== item.title) patch.title = title
    if (description !== item.description) patch.description = description
    if (unit !== item.unit) patch.unit = unit
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    onSave(patch)
  }

  return (
    <ModalShell title="Позиция сметы" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="edit-item-title">
              Наименование
            </label>
            <input
              id="edit-item-title"
              type="text"
              className="form-control"
              maxLength={ESTIMATE_LIMITS.itemTitle}
              value={title}
              onChange={e => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="edit-item-desc">
              Описание
            </label>
            <textarea
              id="edit-item-desc"
              rows={4}
              className="form-control"
              maxLength={ESTIMATE_LIMITS.itemDescription}
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="mb-1">
            <label className="form-label fw-semibold" htmlFor="edit-item-unit">
              Единица измерения
            </label>
            <input
              id="edit-item-unit"
              type="text"
              className="form-control"
              maxLength={ESTIMATE_LIMITS.itemUnit}
              value={unit}
              onChange={e => {
                setUnit(e.target.value)
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
