import type { FC } from "react"
import { useState } from "react"
import { TASK_LIMITS } from "../../features/planner/types"
import type { TaskTemplateItem } from "../../features/planner/types"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"

type Props = {
  items: TaskTemplateItem[]
  onAddEmpty: () => void
  onOpenCatalog: () => void
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
  onEditFields: (id: string) => void
}

// The item list of ONE open template. A template line carries title and
// description only — no status, no progress, no assignee (D10). The whole
// tree is written by one PUT on Save (DESIGN_PLANNER.md §7, one transaction).
export const TaskTemplateItemsEditor: FC<Props> = ({
  items,
  onAddEmpty,
  onOpenCatalog,
  onRemove,
  onMove,
  onEditFields,
}) => {
  const [removeTarget, setRemoveTarget] = useState<TaskTemplateItem | null>(
    null,
  )

  const atMax = items.length >= TASK_LIMITS.maxTemplateItems

  const moveButtons = (index: number) => (
    <div className="d-flex flex-column">
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-decoration-none lh-1"
        disabled={index === 0}
        onClick={() => {
          onMove(index, index - 1)
        }}
        title="Выше"
        aria-label="Выше"
      >
        <i className="bi bi-chevron-up" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-decoration-none lh-1"
        disabled={index === items.length - 1}
        onClick={() => {
          onMove(index, index + 1)
        }}
        title="Ниже"
        aria-label="Ниже"
      >
        <i className="bi bi-chevron-down" />
      </button>
    </div>
  )

  const actionButtons = (item: TaskTemplateItem) => (
    <div className="d-inline-flex gap-1">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title="Редактировать"
        aria-label="Редактировать"
        onClick={() => {
          onEditFields(item.id)
        }}
      >
        <i className="bi bi-pencil" />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        title="Удалить"
        aria-label="Удалить"
        onClick={() => {
          setRemoveTarget(item)
        }}
      >
        <i className="bi bi-trash" />
      </button>
    </div>
  )

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={onOpenCatalog}
            disabled={atMax}
          >
            <i className="bi bi-box-seam me-1" />
            Из каталога
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onAddEmpty}
            disabled={atMax}
          >
            <i className="bi bi-plus-lg me-1" />
            Пустая строка
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-muted py-4">
            Позиций пока нет — добавьте пустую строку.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <table className="table align-middle d-none d-lg-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: "3.5rem" }}>
                    №
                  </th>
                  <th scope="col">Что делать</th>
                  <th scope="col" style={{ width: "6rem" }} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span className="small">{index + 1}</span>
                        {moveButtons(index)}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold text-break">
                        {item.title || (
                          <span className="text-muted">Без названия</span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-muted small text-break">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="text-end">{actionButtons(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile */}
            <div className="d-lg-none d-flex flex-column gap-2">
              {items.map((item, index) => (
                <div className="card shadow-sm" key={item.id}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-break">
                          {item.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-muted small text-break">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="d-inline-flex flex-column flex-shrink-0">
                        <div className="d-flex gap-1 mb-1">
                          {moveButtons(index)}
                        </div>
                        <div className="d-flex gap-1 justify-content-end">
                          {actionButtons(item)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {removeTarget && (
        <ConfirmDeleteModal
          title="Удаление позиции"
          message={
            <>
              Удалить позицию
              {removeTarget.title ? (
                <>
                  {" "}
                  <strong>{removeTarget.title}</strong>
                </>
              ) : null}
              ?
            </>
          }
          onConfirm={() => {
            onRemove(removeTarget.id)
            setRemoveTarget(null)
          }}
          onClose={() => {
            setRemoveTarget(null)
          }}
        />
      )}
    </div>
  )
}
