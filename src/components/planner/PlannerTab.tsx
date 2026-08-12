import type { FC } from "react"
import { useState } from "react"
import { useGetTaskCatalog } from "../../features/planner/catalog.hooks"
import type { Project } from "../../features/projects/types"
import { TaskCatalogManager } from "./TaskCatalogManager"
import { TaskListView } from "./TaskListView"
import { TaskTemplatesManager } from "./TaskTemplatesManager"

type SubTab = "tasks" | "catalog" | "templates"

// Root of the planner feature (DESIGN_PLANNER.md §3): three sub-tabs
// (Задачи · Каталог · Шаблоны) — the estimate feature's navigation shape.
// Unlike the estimate editor there is no draft to guard: every change
// commits individually (D2), so leaving a sub-tab never loses work.
export const PlannerTab: FC<{ project: Project }> = ({ project }) => {
  const [subTab, setSubTab] = useState<SubTab>("tasks")

  // Prefetch the catalog so the picker opens warm (same trick as
  // EstimatesTab).
  useGetTaskCatalog()

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
            Задачи
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

      {subTab === "tasks" && (
        <TaskListView
          projectId={project.id}
          onGoToCatalog={() => {
            setSubTab("catalog")
          }}
        />
      )}
      {subTab === "catalog" && <TaskCatalogManager />}
      {subTab === "templates" && (
        <TaskTemplatesManager
          onGoToCatalog={() => {
            setSubTab("catalog")
          }}
        />
      )}
    </div>
  )
}
