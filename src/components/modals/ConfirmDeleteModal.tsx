import type { FC, ReactNode } from "react"
import { ModalShell } from "./ModalShell"

type Props = {
  title: string
  message: ReactNode
  confirmLabel?: string
  isPending?: boolean
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

// Generic delete confirmation for catalog rows, template items, templates —
// same shape as DeleteProjectModal, reused instead of one near-identical
// modal per entity.
export const ConfirmDeleteModal: FC<Props> = ({
  title,
  message,
  confirmLabel = "Удалить",
  isPending = false,
  error = null,
  onConfirm,
  onClose,
}) => (
  <ModalShell title={title} onClose={onClose}>
    <div className="modal-body">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <p className="mb-0">{message}</p>
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
        className="btn btn-danger fw-bold"
        onClick={onConfirm}
        disabled={isPending}
      >
        {isPending ? "Удаление..." : confirmLabel}
      </button>
    </div>
  </ModalShell>
)
