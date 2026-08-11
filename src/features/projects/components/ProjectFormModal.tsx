import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ApiError } from "../../../utils/api"
import { useCreateProject, useUpdateProject } from "../projects.hooks"
import {
  PROJECT_FIELD_LIMITS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectInput,
  type ProjectPatch,
  type ProjectStatus,
} from "../types"

// runeLength counts Unicode code points — the same unit the server uses
// (utf8.RuneCountInString, DESIGN_PROJECT.md §4.1).
const runeLength = (s: string): number => Array.from(s).length

type Props = {
  /** null → create mode (client mints a fresh UUIDv7 id via PUT); a project → edit mode (PATCH with only the changed fields). */
  project: Project | null
  onClose: () => void
}

export const ProjectFormModal: FC<Props> = ({ project, onClose }) => {
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const isPending = createProject.isPending || updateProject.isPending
  const mutationError = createProject.error ?? updateProject.error

  // The modal is mounted only while open, so the initial state is always
  // fresh — no sync effect needed.
  const [title, setTitle] = useState(project?.title ?? "")
  const [customer, setCustomer] = useState(project?.customer ?? "")
  const [objectAddress, setObjectAddress] = useState(project?.objectAddress ?? "")
  const [workType, setWorkType] = useState(project?.workType ?? "")
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ACTIVE")
  const [note, setNote] = useState(project?.note ?? "")
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})

  const validate = (input: ProjectInput): Partial<Record<keyof ProjectInput, string>> => {
    const errors: Partial<Record<keyof ProjectInput, string>> = {}
    // Only the five free-string fields have length limits; status is an
    // enum constrained by the select.
    const check = (field: keyof typeof PROJECT_FIELD_LIMITS, value: string) => {
      const max = PROJECT_FIELD_LIMITS[field]
      if (runeLength(value) > max) {
        errors[field] = `Не более ${String(max)} символов`
      }
    }
    check("title", input.title)
    check("customer", input.customer)
    check("workType", input.workType)
    check("objectAddress", input.objectAddress)
    check("note", input.note)
    return errors
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const input: ProjectInput = { title, customer, objectAddress, workType, status, note }

    if (project) {
      // PATCH semantics (DESIGN_PROJECT.md §11.1): send only the fields
      // that actually changed; "" clears, an absent key leaves the field
      // alone. Nothing changed → nothing to write.
      const patch: ProjectPatch = {}
      if (title !== project.title) patch.title = title
      if (customer !== project.customer) patch.customer = customer
      if (objectAddress !== project.objectAddress) patch.objectAddress = objectAddress
      if (workType !== project.workType) patch.workType = workType
      if (status !== project.status) patch.status = status
      if (note !== project.note) patch.note = note

      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }
      const errors = validate({ ...input, ...project, ...patch })
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      updateProject.mutate(
        { id: project.id, patch },
        { onSuccess: onClose },
      )
      return
    }

    const errors = validate(input)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    createProject.mutate(input, { onSuccess: onClose })
  }

  const errorMessage =
    mutationError instanceof ApiError ? mutationError.message : "Не удалось сохранить проект"

  const isInvalid = (field: keyof ProjectInput): boolean => fieldErrors[field] != null

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {project ? "Редактирование проекта" : "Новый проект"}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Закрыть" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {mutationError && (
                  <div className="alert alert-danger" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="project-title">
                    Название
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    className={`form-control${isInvalid("title") ? " is-invalid" : ""}`}
                    maxLength={PROJECT_FIELD_LIMITS.title}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                    }}
                  />
                  {fieldErrors.title && (
                    <div className="invalid-feedback">{fieldErrors.title}</div>
                  )}
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="project-customer">
                      Заказчик
                    </label>
                    <input
                      id="project-customer"
                      type="text"
                      className={`form-control${isInvalid("customer") ? " is-invalid" : ""}`}
                      maxLength={PROJECT_FIELD_LIMITS.customer}
                      value={customer}
                      onChange={(e) => {
                        setCustomer(e.target.value)
                      }}
                    />
                    {fieldErrors.customer && (
                      <div className="invalid-feedback">{fieldErrors.customer}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="project-worktype">
                      Тип работ
                    </label>
                    <input
                      id="project-worktype"
                      type="text"
                      className={`form-control${isInvalid("workType") ? " is-invalid" : ""}`}
                      maxLength={PROJECT_FIELD_LIMITS.workType}
                      value={workType}
                      onChange={(e) => {
                        setWorkType(e.target.value)
                      }}
                    />
                    {fieldErrors.workType && (
                      <div className="invalid-feedback">{fieldErrors.workType}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="project-address">
                    Адрес объекта
                  </label>
                  <input
                    id="project-address"
                    type="text"
                    className={`form-control${isInvalid("objectAddress") ? " is-invalid" : ""}`}
                    maxLength={PROJECT_FIELD_LIMITS.objectAddress}
                    value={objectAddress}
                    onChange={(e) => {
                      setObjectAddress(e.target.value)
                    }}
                  />
                  {fieldErrors.objectAddress && (
                    <div className="invalid-feedback">{fieldErrors.objectAddress}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="project-status">
                    Статус
                  </label>
                  <select
                    id="project-status"
                    className="form-select"
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as ProjectStatus)
                    }}
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PROJECT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-1">
                  <label className="form-label fw-semibold" htmlFor="project-note">
                    Заметка
                  </label>
                  <textarea
                    id="project-note"
                    className={`form-control${isInvalid("note") ? " is-invalid" : ""}`}
                    rows={3}
                    maxLength={PROJECT_FIELD_LIMITS.note}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value)
                    }}
                  />
                  {fieldErrors.note && <div className="invalid-feedback">{fieldErrors.note}</div>}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary fw-bold" disabled={isPending}>
                  {isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
