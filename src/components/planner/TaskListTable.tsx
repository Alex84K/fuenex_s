import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"
import { formatDate, formatDateTime } from "../../features/projects/format"
import {
  DEADLINE_URGENCY_BADGE,
  DEADLINE_URGENCY_LABELS,
  TASK_LIMITS,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "../../features/planner/types"
import { deadlineUrgency } from "../../features/planner/utils/deadlineUrgency"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"

type Props = {
  tasks: Task[]
  /** Any mutation in flight — the toolbar's add buttons are disabled while one runs. */
  isPending: boolean
  /** A changing value (list updatedAt) — clears input buffers after a server round-trip. */
  resetToken: string | null
  onToggleDone: (id: string, done: boolean) => void
  onSetStatus: (id: string, status: TaskStatus) => void
  onSetProgress: (id: string, pct: number) => void
  onMove: (from: number, to: number) => void
  onEdit: (task: Task) => void
  onRemove: (task: Task) => void
  onAdd: () => void
  onOpenCatalog: () => void
}

// Desktop table (d-lg-table) + mobile cards (d-lg-none) — the estimate
// table's split (DESIGN_ESTIMATE.md §8.2). Numeric buffers commit on blur;
// status and the done-checkbox commit immediately — the pair status ×
// progressPct is resolved by the parent via statusProgress.ts (D5).
export const TaskListTable: FC<Props> = ({
  tasks,
  isPending,
  resetToken,
  onToggleDone,
  onSetStatus,
  onSetProgress,
  onMove,
  onEdit,
  onRemove,
  onAdd,
  onOpenCatalog,
}) => {
  const [progressBuffer, setProgressBuffer] = useState<
    Partial<Record<string, string>>
  >({})
  const [search, setSearch] = useState("")
  const [removeTarget, setRemoveTarget] = useState<Task | null>(null)

  // After a server round-trip the buffers may hold text for ids that no
  // longer carry it — clear them (the estimate table's resetToken trick).
  useEffect(() => {
    setProgressBuffer({})
  }, [resetToken])

  const atMax = tasks.length >= TASK_LIMITS.maxTasks
  const showCounter = tasks.length >= 900

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === "") return tasks
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q),
    )
  }, [tasks, search])
  const isFiltering = search.trim() !== ""

  const parsePct = (raw: string): number | null => {
    const cleaned = raw.trim().replace(/\s/g, "")
    if (!/^\d+$/.test(cleaned)) return null
    const v = Number(cleaned)
    if (!Number.isFinite(v) || v < 0 || v > 100) return null
    return v
  }

  const commitPct = (task: Task, raw: string) => {
    setProgressBuffer(b => {
      if (!(task.id in b)) return b
      return Object.fromEntries(
        Object.entries(b).filter(([key]) => key !== task.id),
      )
    })
    const pct = parsePct(raw)
    if (pct === null || pct === task.progressPct) return
    onSetProgress(task.id, pct)
  }

  const pctValue = (task: Task): string => {
    const buffered = progressBuffer[task.id]
    if (buffered !== undefined) return buffered
    return String(task.progressPct)
  }

  const isEmptyTask = (t: Task): boolean =>
    t.title === "" &&
    t.description === "" &&
    t.assignee === "" &&
    t.status === "todo" &&
    t.progressPct === 0

  const handleDelete = (task: Task) => {
    if (isEmptyTask(task)) {
      onRemove(task)
      return
    }
    setRemoveTarget(task)
  }

  // Recomputed on every render from wall-clock time, nothing polls or
  // ticks (RECARCH_DEADLINE.md §6.2/§12.4) — "later" and "none" render as
  // plain text, a badge only appears once a deadline is close enough to
  // deserve one.
  const deadlineCell = (task: Task) => {
    if (task.deadline === "") return <span className="text-muted">—</span>
    const urgency = deadlineUrgency(task.deadline)
    const text = formatDate(task.deadline)
    if (urgency === "later" || urgency === "none")
      return <span className="text-muted small">{text}</span>
    return (
      <span
        className={`badge ${DEADLINE_URGENCY_BADGE[urgency]}`}
        title={DEADLINE_URGENCY_LABELS[urgency]}
      >
        {text}
      </span>
    )
  }

  const moveButtons = (index: number) => (
    <div className="d-flex flex-column">
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-decoration-none lh-1"
        disabled={isFiltering || index === 0}
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
        disabled={isFiltering || index === tasks.length - 1}
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

  const actionButtons = (task: Task) => (
    <div className="d-inline-flex gap-1">
      <button
        type="button"
        className={`btn btn-sm ${task.status === "done" ? "btn-primary" : "btn-outline-secondary"}`}
        title={task.status === "done" ? "Отметить как не выполненное" : "Отметить как выполненное"}
        aria-label={task.status === "done" ? "Отметить как не выполненное" : "Отметить как выполненное"}
        onClick={() => {
          onToggleDone(task.id, task.status !== "done")
        }}
      >
        <i className={`bi ${task.status === "done" ? "bi-check-lg" : "bi-check"}`} />
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        title="Редактировать"
        aria-label="Редактировать"
        onClick={() => {
          onEdit(task)
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
          handleDelete(task)
        }}
      >
        <i className="bi bi-trash" />
      </button>
    </div>
  )

  const emptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted py-4">
        {isFiltering
          ? "Ничего не найдено по заданному условию."
          : "Задач пока нет — добавьте из каталога или новую задачу."}
      </td>
    </tr>
  )

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="input-group" style={{ maxWidth: "18rem" }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск по задачам..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
              }}
            />
          </div>
          {showCounter && (
            <span className="text-muted small">
              {tasks.length} / {TASK_LIMITS.maxTasks}
            </span>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={onOpenCatalog}
            disabled={atMax || isPending}
          >
            <i className="bi bi-box-seam me-1" />
            Из каталога
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onAdd}
            disabled={atMax || isPending}
          >
            <i className="bi bi-plus-lg me-1" />
            Новая задача
          </button>
        </div>

        {/* Desktop */}
        <table className="table align-middle d-none d-lg-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "3.5rem" }}>
                №
              </th>
              <th scope="col">Что делать</th>
              <th scope="col" style={{ width: "9rem" }}>
                Исполнитель
              </th>
              <th scope="col" style={{ width: "7rem" }}>
                Дедлайн
              </th>
              <th scope="col" style={{ width: "10rem" }}>
                Статус
              </th>
              <th scope="col" style={{ width: "6rem" }}>
                Прогресс
              </th>
              <th scope="col" style={{ width: "8rem" }}>
                Создана
              </th>
              <th scope="col" style={{ width: "6rem" }} />
            </tr>
          </thead>
          <tbody>
            {visibleTasks.length === 0
              ? emptyRow(8)
              : visibleTasks.map(task => {
                  const index = tasks.indexOf(task)
                  return (
                    <tr
                      key={task.id}
                      className={
                        task.status === "done" ? "table-row-done" : undefined
                      }
                    >
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <span className="small">{index + 1}</span>
                          {moveButtons(index)}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-break">
                          {task.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-muted small text-break">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="small text-break">
                        {task.assignee || "—"}
                      </td>
                      <td>{deadlineCell(task)}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          aria-label={`Статус: ${task.title || "Без названия"}`}
                          value={task.status}
                          onChange={e => {
                            onSetStatus(task.id, e.target.value as TaskStatus)
                          }}
                        >
                          {TASK_STATUSES.map(s => (
                            <option key={s} value={s}>
                              {TASK_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            aria-label={`Прогресс: ${task.title || "Без названия"}`}
                            value={pctValue(task)}
                            onChange={e => {
                              setProgressBuffer(b => ({
                                ...b,
                                [task.id]: e.target.value,
                              }))
                            }}
                            onBlur={e => {
                              commitPct(task, e.target.value)
                            }}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                      </td>
                      <td className="small text-muted">
                        {formatDateTime(task.createdAt)}
                      </td>
                      <td className="text-end">{actionButtons(task)}</td>
                    </tr>
                  )
                })}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="d-lg-none d-flex flex-column gap-2">
          {visibleTasks.length === 0 ? (
            <div className="text-center text-muted py-4">
              {isFiltering
                ? "Ничего не найдено по заданному условию."
                : "Задач пока нет — добавьте из каталога или новую задачу."}
            </div>
          ) : (
            visibleTasks.map(task => {
              const index = tasks.indexOf(task)
              return (
                <div className={`card shadow-sm ${task.status === "done" ? "card-done" : ""}`} key={task.id}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-break">
                          {task.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </div>
                        {task.description && (
                          <div className="text-muted small text-break">
                            {task.description}
                          </div>
                        )}
                      </div>
                      <div className="d-inline-flex flex-column flex-shrink-0 gap-2">
                        <div className="d-flex gap-1">
                          {moveButtons(index)}
                        </div>
                        <div className="d-flex gap-1 justify-content-end">
                          {actionButtons(task)}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <span
                        className={`badge ${TASK_STATUS_BADGE[task.status]}`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                      {deadlineCell(task)}
                    </div>

                    <div className="row g-2">
                      <div className="col-5">
                        <label
                          className="form-label small mb-1"
                          htmlFor={`progress-${task.id}`}
                        >
                          Прогресс
                        </label>
                        <div className="input-group input-group-sm">
                          <input
                            id={`progress-${task.id}`}
                            type="text"
                            inputMode="numeric"
                            className="form-control"
                            value={pctValue(task)}
                            onChange={e => {
                              setProgressBuffer(b => ({
                                ...b,
                                [task.id]: e.target.value,
                              }))
                            }}
                            onBlur={e => {
                              commitPct(task, e.target.value)
                            }}
                          />
                          <span className="input-group-text">%</span>
                        </div>
                      </div>
                      <div className="col-7">
                        <label
                          className="form-label small mb-1"
                          htmlFor={`assignee-${task.id}`}
                        >
                          Исполнитель
                        </label>
                        <div
                          id={`assignee-${task.id}`}
                          className="small text-break pt-1"
                        >
                          {task.assignee || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2 text-muted small">
                      <span>
                        <i className="bi bi-clock me-1" />
                        {formatDateTime(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {removeTarget && (
        <ConfirmDeleteModal
          title="Удаление задачи"
          message={
            <>
              Удалить задачу
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
            onRemove(removeTarget)
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
