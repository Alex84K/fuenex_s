import type { FC, ReactNode } from "react"
import { formatDateTime } from "../../features/projects/format"
import { ModalShell } from "./ModalShell"

type Props = {
  // Shell title, entity-specific: «Смета изменилась в другом окне»,
  // «Комплект замеров изменился в другом окне» (§11.3).
  title: string
  updatedAt: string // the fresh server version that differs from baseUpdatedAt
  onRead: () => void
  onOverwrite: () => void
  onClose: () => void
  // Extra price-of-overwrite wording. The measurement set's PUT replaces a
  // THREE-level subtree (set → surfaces → openings), so "overwrite" there
  // deletes foreign surfaces — the caller names that (DESIGN §11.3).
  overwriteNote?: ReactNode
}

// D11 conflict guard: the control GET before PUT found a different
// updatedAt. The window narrows, it does not close (DESIGN §11.3).
export const SaveConflictModal: FC<Props> = ({
  title,
  updatedAt,
  onRead,
  onOverwrite,
  onClose,
  overwriteNote,
}) => (
  <ModalShell title={title} onClose={onClose}>
    <div className="modal-body">
      <p>
        Данные обновлены <strong>{formatDateTime(updatedAt)}</strong>. Это может
        быть правка из другого окна или другого устройства.
      </p>
      {overwriteNote && <p className="mb-1">{overwriteNote}</p>}
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
