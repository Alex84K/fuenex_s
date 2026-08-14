import type { FC } from "react"
import { useState } from "react"
import { ModalShell } from "./ModalShell"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import { SCAN_SOURCE_LABELS } from "../../features/measurement/constants"
import type { ScanSource } from "../../features/measurement/types"

type Props = {
  // create: a NEW set — scanSource is fixed to MANUAL (D13: the web
  // creates by hand; a foreign origin is never invented). rename (phase 6)
  // enables the select so a set can be re-labelled without touching its
  // subtree.
  mode: "create" | "rename"
  initialName: string
  initialNote: string
  initialScanSource: ScanSource
  isPending?: boolean
  error?: string | null
  onSubmit: (values: {
    name: string
    note: string
    scanSource: ScanSource
  }) => void
  onClose: () => void
}

// Создание и переименование комплекта (DESIGN §10.2): имя, заметка,
// scanSource. Поля коммитятся кнопкой, не по blur — здесь нет редактора с
// черновиком, значения приходят готовыми (create) или из открытого
// комплекта (rename).
export const MeasurementSetFormModal: FC<Props> = ({
  mode,
  initialName,
  initialNote,
  initialScanSource,
  isPending = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(initialName)
  const [note, setNote] = useState(initialNote)
  const [scanSource, setScanSource] = useState<ScanSource>(initialScanSource)

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({
      name: trimmed,
      note,
      // Create path never lies about the origin (D13).
      scanSource: mode === "create" ? "MANUAL" : scanSource,
    })
  }

  return (
    <ModalShell
      title={mode === "create" ? "Новый комплект" : "Переименовать комплект"}
      onClose={onClose}
    >
      <div className="modal-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="measurement-set-name" className="form-label">
            Название
          </label>
          <input
            id="measurement-set-name"
            type="text"
            className="form-control"
            value={name}
            maxLength={MEASUREMENT_LIMITS.setName}
            onChange={e => {
              setName(e.target.value)
            }}
            autoFocus
          />
        </div>
        <div className="mb-3">
          <label htmlFor="measurement-set-note" className="form-label">
            Заметка
          </label>
          <textarea
            id="measurement-set-note"
            className="form-control"
            rows={2}
            value={note}
            maxLength={MEASUREMENT_LIMITS.setNote}
            onChange={e => {
              setNote(e.target.value)
            }}
          />
        </div>
        <div className="mb-1">
          <label htmlFor="measurement-set-scan-source" className="form-label">
            Источник замера
          </label>
          <select
            id="measurement-set-scan-source"
            className="form-select"
            value={mode === "create" ? "MANUAL" : scanSource}
            disabled={mode === "create"}
            onChange={e => {
              setScanSource(e.target.value as ScanSource)
            }}
          >
            {(Object.keys(SCAN_SOURCE_LABELS) as ScanSource[]).map(s => (
              <option key={s} value={s}>
                {SCAN_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          {mode === "create" && (
            <div className="form-text">
              Комплект, заведённый на вебе, всегда помечается «Вручную».
            </div>
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
          type="button"
          className="btn btn-primary fw-bold"
          onClick={submit}
          disabled={isPending || name.trim().length === 0}
        >
          {isPending
            ? "Сохранение..."
            : mode === "create"
              ? "Создать"
              : "Переименовать"}
        </button>
      </div>
    </ModalShell>
  )
}
