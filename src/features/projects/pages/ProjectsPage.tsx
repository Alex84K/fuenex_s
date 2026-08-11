import type { FC } from "react"
import { useMemo, useState } from "react"
import { ApiError } from "../../../utils/api"
import { DeleteProjectModal } from "../components/DeleteProjectModal"
import { ProjectFormModal } from "../components/ProjectFormModal"
import { useGetProjects } from "../projects.hooks"
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_BADGE,
  PROJECT_STATUS_LABELS,
  type Project,
} from "../types"

// The server stores timestamps as RFC3339 with millisecond precision
// (platform/timefmt). Render them for the user's locale.
const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
}

export const ProjectsPage: FC = () => {
  const { data: projects = [], isLoading, isError, error } = useGetProjects()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | (typeof PROJECT_STATUSES)[number]>(
    "ALL",
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter
      const matchSearch =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.objectAddress.toLowerCase().includes(q) ||
        p.workType.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [projects, search, statusFilter])

  const loadError =
    error instanceof ApiError ? error.message : "Не удалось загрузить список проектов"

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <h2 className="fw-bold mb-0">Проекты</h2>
        <button className="btn btn-primary fw-bold" onClick={() => { setCreateOpen(true) }}>
          <i className="bi bi-plus-lg me-1" />
          Новый проект
        </button>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-4">
        <div className="col-md-7">
          <div className="input-group">
            <span className="input-group-text bg-white">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск по названию, заказчику, адресу, типу работ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
            }}
          >
            <option value="ALL">Все статусы</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}

      {/* List of long cards */}
      <div className="list-group shadow-sm rounded-4 overflow-hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-6" />
              <span className="placeholder col-3 d-block mt-3" />
              <span className="placeholder col-4 d-block mt-2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="list-group-item p-5 text-center text-muted">
            {projects.length === 0
              ? "Проектов пока нет — создайте первый."
              : "Ничего не найдено по заданным условиям."}
          </div>
        ) : (
          filtered.map((p) => (
            <div className="list-group-item p-3 p-md-4" key={p.id}>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div className="me-auto" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                    <h6 className="fw-bold mb-0 text-break">
                      {p.title || <span className="text-muted">Без названия</span>}
                    </h6>
                    <span className={`badge ${PROJECT_STATUS_BADGE[p.status]}`}>
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </div>

                  <div className="d-flex flex-wrap column-gap-4 row-gap-1 text-muted small mb-1">
                    {p.customer !== "" && (
                      <span>
                        <i className="bi bi-person me-1" />
                        {p.customer}
                      </span>
                    )}
                    {p.objectAddress !== "" && (
                      <span>
                        <i className="bi bi-geo-alt me-1" />
                        {p.objectAddress}
                      </span>
                    )}
                    {p.workType !== "" && (
                      <span>
                        <i className="bi bi-hammer me-1" />
                        {p.workType}
                      </span>
                    )}
                  </div>

                  {p.note !== "" && (
                    <div className="text-muted small text-truncate" style={{ maxWidth: "60ch" }}>
                      {p.note}
                    </div>
                  )}
                </div>

                <div className="d-flex flex-column align-items-end gap-2">
                  <div className="btn-group btn-group-sm" role="group" aria-label="Действия">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      title="Редактировать"
                      onClick={() => { setEditTarget(p) }}
                    >
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      title="Удалить"
                      onClick={() => { setDeleteTarget(p) }}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                  <small className="text-muted">
                    <i className="bi bi-clock me-1" />
                    {formatDateTime(p.updatedAt)}
                  </small>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {createOpen && <ProjectFormModal project={null} onClose={() => { setCreateOpen(false) }} />}

      {editTarget && (
        <ProjectFormModal project={editTarget} onClose={() => { setEditTarget(null) }} />
      )}

      {deleteTarget && (
        <DeleteProjectModal project={deleteTarget} onClose={() => { setDeleteTarget(null) }} />
      )}
    </div>
  )
}
