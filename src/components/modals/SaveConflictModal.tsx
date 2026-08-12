import type { FC } from "react"
import { formatDateTime } from "../../features/projects/format"
import type { Estimate } from "../../features/estimates/types"
import { ModalShell } from "./ModalShell"

type Props = {
  estimate: Estimate // the fresh server version that differs from baseUpdatedAt
  onRead: () => void
  onOverwrite: () => void
  onClose: () => void
}

// D11 conflict guard: the control GET before PUT found a different
// updatedAt. The window narrows, it does not close (DESIGN §11.3).
export const SaveConflictModal: FC<Props> = ({
  estimate,
  onRead,
  onOverwrite,
  onClose,
}) => (
  <ModalShell title="Смета изменилась в другом окне" onClose={onClose}>
    <div className="modal-body">
      <p>
        Смета была обновлена{" "}
        <strong>{formatDateTime(estimate.updatedAt)}</strong>. Это может быть
        правка из другого окна или другого устройства.
      </p>
      <ul className="mb-0">
        <li>
          <strong>Перечитать</strong> — заменить черновик серверной версией
          (текущие правки будут потеряны).
        </li>
        <li>
          <strong>Перезаписать</strong> — сохранить текущий черновик поверх
          чужой правки.
        </li>
      </ul>
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
        className="btn btn-outline-primary"
        onClick={onRead}
      >
        Перечитать
      </button>
      <button
        type="button"
        className="btn btn-primary fw-bold"
        onClick={onOverwrite}
      >
        Перезаписать
      </button>
    </div>
  </ModalShell>
)
