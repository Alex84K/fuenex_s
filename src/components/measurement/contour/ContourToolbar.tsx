import type { FC } from "react"
import { GRID_STEPS_CM } from "../../../features/measurement/constants"

type Props = {
  mode: "draw" | "edit"
  pointsCount: number
  gridStepCm: number
  error: string | null
  onModeChange: (mode: "draw" | "edit") => void
  onGridStepChange: (step: number) => void
  onFit: () => void
  onRectangle: () => void
  onDone: () => void
  onCancel: () => void
}

// Тулбар редактора контура (DESIGN §9.1): режим, шаг сетки, «⤢ Fit»,
// «Прямоугольник» (D20), «Замкнуть» — через смену режима, «Готово» и
// «Отмена». «Готово» блокируется, пока контур не нарисован (≥ 3 вершин).
export const ContourToolbar: FC<Props> = ({
  mode,
  pointsCount,
  gridStepCm,
  error,
  onModeChange,
  onGridStepChange,
  onFit,
  onRectangle,
  onDone,
  onCancel,
}) => {
  const closable = pointsCount >= 3

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
      <div className="btn-group" role="group" aria-label="Режим контура">
        <button
          type="button"
          className={`btn btn-sm ${mode === "draw" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            onModeChange("draw")
          }}
        >
          <i className="bi bi-pencil me-1" />
          Рисовать
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "edit" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => {
            onModeChange("edit")
          }}
          disabled={!closable}
        >
          <i className="bi bi-hand-index-thumb me-1" />
          Правка
        </button>
      </div>

      {mode === "draw" && (
        <button
          type="button"
          className="btn btn-outline-success btn-sm"
          onClick={() => {
            onModeChange("edit")
          }}
          disabled={!closable}
          title="Замкнуть контур и перейти к правке"
        >
          <i className="bi bi-check-lg me-1" />
          Замкнуть
        </button>
      )}

      <label className="form-label small mb-0 text-nowrap" htmlFor="grid-step">
        Сетка
      </label>
      <select
        id="grid-step"
        className="form-select form-select-sm w-auto"
        value={gridStepCm}
        onChange={e => {
          onGridStepChange(Number(e.target.value))
        }}
      >
        {GRID_STEPS_CM.map(step => (
          <option key={step} value={step}>
            {step} см
          </option>
        ))}
      </select>

      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={onFit}
        disabled={!closable}
        title="Вписать контур в экран"
      >
        <i className="bi bi-arrows-angle-expand me-1" />
        Fit
      </button>

      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={onRectangle}
        title="Контур прямоугольником по двум числам"
      >
        <i className="bi bi-square me-1" />
        Прямоугольник
      </button>

      {error && (
        <span className="text-danger small" role="alert">
          {error}
        </span>
      )}

      <span className="ms-auto d-flex gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onCancel}
        >
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm fw-bold"
          onClick={onDone}
          disabled={!closable}
        >
          <i className="bi bi-check-lg me-1" />
          Готово
        </button>
      </span>
    </div>
  )
}
