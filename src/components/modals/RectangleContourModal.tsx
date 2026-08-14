import type { FC } from "react"
import { useState } from "react"
import { ModalShell } from "./ModalShell"
import { rectangleContourCm } from "../../features/measurement/geometry/rectangleContour"
import { mToCm } from "../../features/measurement/contour/contourCodec"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"

type Props = {
  surfaceName: string
  // True when the surface already has a contour — the rectangle replaces it.
  hasContour: boolean
  isPending?: boolean
  error?: string | null
  onSubmit: (widthM: number, heightM: number) => void
  onClose: () => void
}

// D20 (DESIGN §9.5): контур по двум числам — основной путь для забора,
// фасада, тротуара и стены «по рулетке», без холста. Ширина и высота в
// метрах; сама площадь считается шнуровкой в onSubmit через
// rectangleContourCm → commitContour, а НЕ умножением — у площади один
// вычислитель в системе.
export const RectangleContourModal: FC<Props> = ({
  surfaceName,
  hasContour,
  isPending = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [width, setWidth] = useState("")
  const [height, setHeight] = useState("")

  const widthM = Number(width)
  const heightM = Number(height)
  const valid =
    Number.isFinite(widthM) &&
    Number.isFinite(heightM) &&
    widthM > 0 &&
    heightM > 0 &&
    widthM <= MEASUREMENT_LIMITS.maxDimensionM &&
    heightM <= MEASUREMENT_LIMITS.maxDimensionM

  return (
    <ModalShell title="Контур прямоугольником" onClose={onClose}>
      <div className="modal-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <p className="mb-3">
          Поверхность «<strong>{surfaceName}</strong>». Укажите размеры в метрах
          — контур из четырёх вершин будет создан автоматически.
        </p>
        {hasContour && (
          <div className="alert alert-warning py-2" role="alert">
            У поверхности уже есть контур — он будет заменён.
          </div>
        )}
        <div className="row g-3">
          <div className="col-6">
            <label htmlFor="rect-width" className="form-label">
              Ширина, м
            </label>
            <input
              id="rect-width"
              type="text"
              inputMode="decimal"
              className="form-control"
              autoFocus
              value={width}
              onChange={e => {
                setWidth(e.target.value)
              }}
            />
          </div>
          <div className="col-6">
            <label htmlFor="rect-height" className="form-label">
              Высота, м
            </label>
            <input
              id="rect-height"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={height}
              onChange={e => {
                setHeight(e.target.value)
              }}
            />
          </div>
        </div>
        <div className="form-text mt-2">
          {valid
            ? `Площадь: ${String(Math.round(widthM * heightM * 100) / 100)} м²`
            : "Введите положительные размеры."}
        </div>
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary fw-bold"
          onClick={() => {
            onSubmit(widthM, heightM)
          }}
          disabled={isPending || !valid}
        >
          {isPending ? "Создание..." : "Создать контур"}
        </button>
      </div>
    </ModalShell>
  )
}

// Полезная функция для вызывающей стороны: четыре вершины в сантиметрах +
// четыре «manual»-ребра (D14) — то, что кладёт в черновик commitContour.
export const rectangleContourForCommit = (widthM: number, heightM: number) => ({
  points: rectangleContourCm(mToCm(widthM), mToCm(heightM)),
  edgeSources: Array(4).fill("manual") as "manual"[],
})
