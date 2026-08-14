import type { FC } from "react"
import { useState } from "react"
import { ModalShell } from "./ModalShell"
import { OPENING_KIND_LABELS } from "../../features/measurement/constants"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import type { OpeningKind } from "../../features/measurement/types"

type Props = {
  isPending?: boolean
  error?: string | null
  onSubmit: (values: {
    kind: OpeningKind
    widthM: number
    heightM: number
    deduct: boolean
  }) => void
  onClose: () => void
}

// Проём с параметрами (DESIGN §10.3): вид, ширина, высота, «вычитать из
// площади». Типовой случай — дверь — добавляется в один клик кнопкой
// «+ Проём» в OpeningsTable; эта модалка — для окна или проёма с другими
// размерами.
export const OpeningFormModal: FC<Props> = ({
  isPending = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [kind, setKind] = useState<OpeningKind>("WINDOW")
  const [width, setWidth] = useState("1.5")
  const [height, setHeight] = useState("1.2")
  const [deduct, setDeduct] = useState(false)

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
    <ModalShell title="Новый проём" onClose={onClose}>
      <div className="modal-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="opening-kind" className="form-label">
            Вид
          </label>
          <select
            id="opening-kind"
            className="form-select"
            value={kind}
            onChange={e => {
              setKind(e.target.value as OpeningKind)
            }}
          >
            {(Object.keys(OPENING_KIND_LABELS) as OpeningKind[]).map(k => (
              <option key={k} value={k}>
                {OPENING_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="row g-3">
          <div className="col-6">
            <label htmlFor="opening-width" className="form-label">
              Ширина, м
            </label>
            <input
              id="opening-width"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={width}
              onChange={e => {
                setWidth(e.target.value)
              }}
            />
          </div>
          <div className="col-6">
            <label htmlFor="opening-height" className="form-label">
              Высота, м
            </label>
            <input
              id="opening-height"
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
        <div className="form-check mt-3">
          <input
            id="opening-deduct"
            type="checkbox"
            className="form-check-input"
            checked={deduct}
            onChange={e => {
              setDeduct(e.target.checked)
            }}
          />
          <label htmlFor="opening-deduct" className="form-check-label">
            Вычитать из площади поверхности
          </label>
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
            onSubmit({ kind, widthM, heightM, deduct })
          }}
          disabled={isPending || !valid}
        >
          {isPending ? "Добавление..." : "Добавить"}
        </button>
      </div>
    </ModalShell>
  )
}
