import type { FC } from "react"
import { useState } from "react"
import { useGetEstimatesByProject } from "../../features/estimates/estimates.hooks"
import { useGetTaskCatalog } from "../../features/planner/catalog.hooks"
import { TaskCatalogManager } from "./TaskCatalogManager"
import { TaskListView } from "./TaskListView"
import { TaskTemplatesManager } from "./TaskTemplatesManager"

type SubTab = "tasks" | "catalog" | "templates"

type Props = {
  projectId: string
  /** Switch the parent tab to «Сметы» when the order has no estimate to plan. */
  onGoToEstimates: () => void
}

// Root of the planner feature (DESIGN_PLANNER.md §3): three sub-tabs
// (Этапы · Каталог · Шаблоны) — the estimate feature's navigation shape.
// Tasks hang off the estimate, not the project (ADR-013 decision 5): a second
// estimate on a job is a later phase, and the phase carries its own work, so
// «Задачи» needs a phase chosen first — the list belongs to the estimate, and
// an estimate nobody has planned yet owns an empty set (decision D1: no list
// table, the estimate IS the list's identity). Unlike the estimate editor
// there is no draft to guard: every change commits individually (D2), so
// leaving a sub-tab never loses work.
export const PlannerTab: FC<Props> = ({ projectId, onGoToEstimates }) => {
  const { data: estimates = [], isLoading } =
    useGetEstimatesByProject(projectId)
  const [subTab, setSubTab] = useState<SubTab>("tasks")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Prefetch the catalog so the picker opens warm (same trick as
  // EstimatesTab).
  useGetTaskCatalog()

  // The phase to plan: the one the foreman picked, or the first of the
  // order's phases. Only meaningful once estimates have loaded — the empty
  // list is handled in the render below.
  const selected =
    estimates.length > 0
      ? (estimates.find(e => e.id === selectedId) ?? estimates[0])
      : null

  return (
    <div>
      <ul className="nav nav-pills mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${subTab === "tasks" ? " active" : ""}`}
            onClick={() => {
              setSubTab("tasks")
            }}
          >
            Этапы
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${subTab === "catalog" ? " active" : ""}`}
            onClick={() => {
              setSubTab("catalog")
            }}
          >
            Каталог
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${subTab === "templates" ? " active" : ""}`}
            onClick={() => {
              setSubTab("templates")
            }}
          >
            Шаблоны
          </button>
        </li>
      </ul>

      {subTab === "catalog" && <TaskCatalogManager />}
      {subTab === "templates" && (
        <TaskTemplatesManager
          onGoToCatalog={() => {
            setSubTab("catalog")
          }}
        />
      )}
      {subTab === "tasks" &&
        (isLoading ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Загрузка...</span>
            </div>
          </div>
        ) : estimates.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-list-check d-block fs-1 mb-3" />
            <p className="mb-3">
              У заказа нет сметы — этапы планируются внутри сметы (фазы работ).
              Создайте смету, чтобы собирать этапы.
            </p>
            <button
              type="button"
              className="btn btn-primary fw-bold"
              onClick={onGoToEstimates}
            >
              <i className="bi bi-journal-text me-1" />К сметам
            </button>
          </div>
        ) : (
          selected && (
            <>
              {estimates.length > 1 && (
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <label
                    className="form-label fw-semibold mb-0"
                    htmlFor="planner-estimate"
                  >
                    Фаза работ
                  </label>
                  <select
                    id="planner-estimate"
                    className="form-select form-select-sm"
                    style={{ maxWidth: "24rem" }}
                    value={selected.id}
                    onChange={e => {
                      setSelectedId(e.target.value)
                    }}
                  >
                    {estimates.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title || "Без названия"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <TaskListView
                estimateId={selected.id}
                onGoToCatalog={() => {
                  setSubTab("catalog")
                }}
              />
            </>
          )
        ))}
    </div>
  )
}
