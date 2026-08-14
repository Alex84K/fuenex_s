import type { FC } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import {
  useDeleteMeasurementSet,
  useGetMeasurementTree,
  usePatchMeasurementSet,
} from "../../features/measurement/measurement.hooks"
import { SCAN_SOURCE_LABELS } from "../../features/measurement/constants"
import {
  netAreaM2,
  openingsDeductedM2,
} from "../../features/measurement/utils/areas"
import type { MeasurementSet } from "../../features/measurement/types"
import { AreaSummary } from "./AreaSummary"
import { DeleteMeasurementSetModal } from "../modals/DeleteMeasurementSetModal"

type Props = {
  projectId: string
  onCreate: () => void
  onOpen: (id: string) => void
}

// Список комплектов проекта (DESIGN §10.1): карточка комплекта — имя,
// бейдж scanSource, число поверхностей, валовая и чистая площадь суммарно,
// заметка одной строкой, кнопки «Открыть» / «↑↓» / «🗑». Порядок — по
// position (дерево приходит уже отсортированным); перестановка — две
// PATCH-ручки соседям, атомарности здесь не требуется (разъехавшийся
// порядок чинится следующей стрелкой, §15 п. 4).
export const MeasurementSetList: FC<Props> = ({
  projectId,
  onCreate,
  onOpen,
}) => {
  const { data, isLoading, isError, error } = useGetMeasurementTree(projectId)
  const patchSet = usePatchMeasurementSet()
  const deleteSet = useDeleteMeasurementSet()
  const [deleting, setDeleting] = useState<MeasurementSet | null>(null)

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    const message =
      error instanceof ApiError && error.status === 404
        ? "Проект не найден — возможно, он был удалён."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить замер проекта."
    return (
      <div className="alert alert-danger" role="alert">
        {message}
      </div>
    )
  }

  const sets = data.measurementSets

  // Две PATCH-ручки: поменять position двух соседей местами. Ответ первой
  // ручки игнорируется — инвалидация дерева обновит список целиком.
  const swapPositions = (a: MeasurementSet, b: MeasurementSet) => {
    void patchSet.mutateAsync({
      id: a.id,
      patch: { position: b.position },
    })
    void patchSet.mutateAsync({
      id: b.id,
      patch: { position: a.position },
    })
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    swapPositions(sets[index], sets[index - 1])
  }

  const moveDown = (index: number) => {
    if (index >= sets.length - 1) return
    swapPositions(sets[index], sets[index + 1])
  }

  const setTotals = (s: MeasurementSet) => {
    const gross = s.surfaces.reduce((sum, sf) => sum + sf.areaM2, 0)
    const deducted = s.surfaces.reduce(
      (sum, sf) => sum + openingsDeductedM2(sf.openings),
      0,
    )
    return { gross, net: netAreaM2(gross, deducted) }
  }

  return (
    <div>
      <AreaSummary surfaces={sets.flatMap(s => s.surfaces)} />

      {sets.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="bi bi-rulers d-block fs-1 mb-3" />
          <p className="mb-3">В проекте пока нет замеров</p>
          <button
            type="button"
            className="btn btn-primary fw-semibold"
            onClick={onCreate}
          >
            <i className="bi bi-plus-lg me-1" />
            Создать комплект
          </button>
        </div>
      )}

      {sets.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {sets.map((s, index) => {
            const totals = setTotals(s)
            return (
              <div className="card shadow-sm border-0" key={s.id}>
                <div className="card-body p-3">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-bold text-break">
                      {s.name || "Без названия"}
                    </span>
                    <span className="badge bg-secondary">
                      {SCAN_SOURCE_LABELS[s.scanSource]}
                    </span>
                    <span className="text-muted small">
                      {s.surfaces.length}{" "}
                      {s.surfaces.length === 1 ? "поверхность" : "поверхностей"}
                    </span>
                    <span className="text-muted small ms-auto text-nowrap">
                      {totals.gross} м² валовая · {totals.net} м² чистая
                    </span>
                  </div>
                  {s.note && (
                    <div className="text-muted text-truncate small mt-1">
                      {s.note}
                    </div>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm fw-semibold"
                      onClick={() => {
                        onOpen(s.id)
                      }}
                    >
                      Открыть
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      aria-label="Выше"
                      title="Выше"
                      onClick={() => {
                        moveUp(index)
                      }}
                      disabled={index === 0}
                    >
                      <i className="bi bi-arrow-up" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      aria-label="Ниже"
                      title="Ниже"
                      onClick={() => {
                        moveDown(index)
                      }}
                      disabled={index === sets.length - 1}
                    >
                      <i className="bi bi-arrow-down" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      aria-label="Удалить комплект"
                      title="Удалить"
                      onClick={() => {
                        setDeleting(s)
                      }}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleting && (
        <DeleteMeasurementSetModal
          name={deleting.name || "Без названия"}
          isPending={deleteSet.isPending}
          error={
            deleteSet.isError
              ? "Не удалось удалить комплект. Попробуйте ещё раз."
              : null
          }
          onConfirm={() => {
            void deleteSet.mutateAsync(
              { id: deleting.id, projectId },
              {
                onSuccess: () => {
                  setDeleting(null)
                },
              },
            )
          }}
          onClose={() => {
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}
