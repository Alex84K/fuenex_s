import type { FC } from "react"
import { ApiError } from "../../../utils/api"
import { useDeleteProject } from "../projects.hooks"
import type { Project } from "../types"

type Props = {
  project: Project
  onClose: () => void
}

export const DeleteProjectModal: FC<Props> = ({ project, onClose }) => {
  const deleteProject = useDeleteProject()

  const handleDelete = () => {
    deleteProject.mutate(project.id, { onSuccess: onClose })
  }

  const errorMessage =
    deleteProject.error instanceof ApiError
      ? deleteProject.error.message
      : "Не удалось удалить проект"

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">Удаление проекта</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Закрыть" />
            </div>
            <div className="modal-body">
              {deleteProject.error && (
                <div className="alert alert-danger" role="alert">
                  {errorMessage}
                </div>
              )}
              <p className="mb-0">
                Удалить проект{" "}
                <strong>{project.title || "Без названия"}</strong>? Проект станет недоступен, но
                может быть восстановлен в течение 90 дней.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-danger fw-bold"
                onClick={handleDelete}
                disabled={deleteProject.isPending}
              >
                {deleteProject.isPending ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
