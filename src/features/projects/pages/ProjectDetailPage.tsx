import type { FC } from "react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ApiError } from "../../../utils/api"
import { EstimatesTab } from "../../../components/estimates/EstimatesTab"
import { MeasurementTab } from "../../../components/measurement/MeasurementTab"
import { PlannerTab } from "../../../components/planner/PlannerTab"
import { ProjectFormModal } from "../components/ProjectFormModal"
import { formatDateTime } from "../format"
import { useGetProject } from "../projects.hooks"
import {
  PROJECT_STATUS_BADGE,
  PROJECT_STATUS_LABELS,
  type Project,
} from "../types"

// The container's parts (DESIGN_PROJECT.md §1.1): estimate (EstimatesTab),
// the planner (PlannerTab) and measurement (MeasurementTab) are full
// features; the tab list is shared (DESIGN_MEASUREMENT.md §1, D1).
const TABS = [
  { key: "info", label: "Информация" },
  { key: "measurement", label: "Замеры" },
  { key: "planner", label: "Планировщик" },
  { key: "estimate", label: "Сметы" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const InfoTab: FC<{ project: Project }> = ({ project }) => {
  const rows: [string, string][] = [
    ["Название", project.title || "—"],
    ["Заказчик", project.customer || "—"],
    ["Адрес объекта", project.objectAddress || "—"],
    ["Тип работ", project.workType || "—"],
    ["Статус", PROJECT_STATUS_LABELS[project.status]],
    ["Заметка", project.note || "—"],
    ["Создан", formatDateTime(project.createdAt)],
    ["Обновлён", formatDateTime(project.updatedAt)],
  ]
  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-4">
        {rows.map(([label, value]) => (
          <div className="row mb-2" key={label}>
            <div className="col-sm-3 text-muted">{label}</div>
            <div className="col-sm-9 fw-semibold text-break">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ProjectDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading, isError, error } = useGetProject(id)
  const [activeTab, setActiveTab] = useState<TabKey>("info")
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="container py-5 d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (isError || !project) {
    const message =
      error instanceof ApiError && error.status === 404
        ? "Проект не найден — возможно, он был удалён."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить проект."
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
        <Link to="/projects" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" />К списку проектов
        </Link>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <Link
        to="/projects"
        className="text-decoration-none small d-inline-block mb-3"
      >
        <i className="bi bi-arrow-left me-1" />К списку проектов
      </Link>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <h2 className="fw-bold mb-0 text-break">
            {project.title || "Без названия"}
          </h2>
          <span className={`badge ${PROJECT_STATUS_BADGE[project.status]}`}>
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm fw-semibold"
          onClick={() => {
            setEditOpen(true)
          }}
        >
          <i className="bi bi-pencil me-1" />
          Редактировать
        </button>
      </div>

      {/* Tabs are driven by React state — Bootstrap's JS bundle is not
          loaded, and nav-tabs styling is pure CSS. */}
      <ul className="nav nav-tabs">
        {TABS.map(t => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link${activeTab === t.key ? " active" : ""}`}
              aria-current={activeTab === t.key ? "page" : undefined}
              onClick={() => {
                setActiveTab(t.key)
              }}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="tab-content py-4">
        {activeTab === "info" && <InfoTab project={project} />}
        {activeTab === "measurement" && <MeasurementTab project={project} />}
        {activeTab === "planner" && (
          <PlannerTab
            projectId={project.id}
            onGoToEstimates={() => {
              setActiveTab("estimate")
            }}
          />
        )}
        {activeTab === "estimate" && <EstimatesTab project={project} />}
      </div>

      {editOpen && (
        <ProjectFormModal
          project={project}
          onClose={() => {
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
