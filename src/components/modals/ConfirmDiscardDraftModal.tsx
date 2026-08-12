import type { FC } from "react"
import { ModalShell } from "./ModalShell"

type Props = {
  onConfirm: () => void
  onClose: () => void
}

// Unsaved-draft guard for every navigation inside the EstimatesTab
// (DESIGN §11.2): leaving the editor while isDirty requires confirmation —
// never a native confirm().
export const ConfirmDiscardDraftModal: FC<Props> = ({ onConfirm, onClose }) => (
  <ModalShell title="Черновик не сохранён" onClose={onClose}>
    <div className="modal-body">
      <p className="mb-0">
        В редакторе есть несохранённые изменения. Если выйти сейчас, они будут
        потеряны.
      </p>
    </div>
    <div className="modal-footer">
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onClose}
      >
        Остаться
      </button>
      <button
        type="button"
        className="btn btn-danger fw-bold"
        onClick={onConfirm}
      >
        Выйти без сохранения
      </button>
    </div>
  </ModalShell>
)
