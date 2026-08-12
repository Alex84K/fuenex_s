import type { FC } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import { formatDateTime } from "../../features/projects/format"
import { useGetEstimatesByProject } from "../../features/estimates/estimates.hooks"
import type { EstimateSummary } from "../../features/estimates/types"
import { formatMinor } from "../../features/estimates/utils/money"
import { DeleteEstimateModal } from "../modals/DeleteEstimateModal"

type Props = {
  projectId: string
  onCreate: () => void
  onOpen: (id: string) => void
}

// The list takes totals ONLY from the server response — computeTotals is
// never called here (DESIGN §7.3). The server orders by updated_at DESC
// (F-5): editing a smeta jumps it to the top; the client does not re-sort.
export const EstimateListByProject: FC<Props> = ({
  projectId,
  onCreate,
  onOpen,
}) => {
  const {
    data: estimates = [],
    isLoading,
    isError,
    error,
  } = useGetEstimatesByProject(projectId)
  const [deleteTarget, setDeleteTarget] = useState<EstimateSummary | null>(null)

  const loadError =
    error instanceof ApiError
      ? error.message
      : "Не удалось загрузить сметы проекта"

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h5 className="fw-bold mb-0">Сметы проекта</h5>
        <button
          type="button"
          className="btn btn-primary btn-sm fw-semibold"
          onClick={onCreate}
        >
          <i className="bi bi-plus-lg me-1" />
          Новая смета
        </button>
      </div>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-6" />
              <span className="placeholder col-3 d-block mt-3" />
            </div>
          ))}
        </div>
      ) : estimates.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-journal-text d-block fs-1 mb-3" />
          <p className="mb-3">У проекта пока нет смет.</p>
          <button
            type="button"
            className="btn btn-primary fw-bold"
            onClick={onCreate}
          >
            <i className="bi bi-plus-lg me-1" />
            Создать первую смету
          </button>
        </div>
      ) : (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {estimates.map(e => (
            <div className="list-group-item p-3 p-md-4" key={e.id}>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div className="me-auto" style={{ minWidth: 0 }}>
                  <div className="fw-bold text-break">
                    {e.title || (
                      <span className="text-muted">Без названия</span>
                    )}
                  </div>
                  <div className="text-muted small mt-1">
                    <i className="bi bi-clock me-1" />
                    {formatDateTime(e.updatedAt)}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                    <span className="fs-5 fw-bold font-monospace">
                      {formatMinor(e.totals.grossMinor, e.currency)}
                    </span>
                    <span className="text-muted small">
                      нетто {formatMinor(e.totals.netMinor, e.currency)}
                    </span>
                    {e.discountBp > 0 && (
                      <span className="text-muted small">
                        скидка {e.discountBp / 100} %
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-semibold"
                    onClick={() => {
                      onOpen(e.id)
                    }}
                  >
                    <i className="bi bi-pencil me-1" />
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    title="Удалить"
                    aria-label="Удалить"
                    onClick={() => {
                      setDeleteTarget(e)
                    }}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <DeleteEstimateModal
          estimate={deleteTarget}
          onClose={() => {
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
