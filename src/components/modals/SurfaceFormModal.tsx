import type { FC } from "react"
import { useState } from "react"
import { ModalShell } from "./ModalShell"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import { SURFACE_TYPES } from "../../features/measurement/constants"

type Props = {
  isPending?: boolean
  error?: string | null
  onSubmit: (values: {
    type: string
    name: string
    heightM: number | null
    areaM2: number
  }) => void
  onClose: () => void
}

// Новая поверхность (DESIGN §10.2): тип — <input list> из констант плюс
// свободный ввод (D12, регистр не нормализуется никогда), имя, высота
// (пусто = «не задана»), площадь. Поля коммитятся кнопкой «Добавить»; для
// правки существующих поверхностей — инлайн-поля в SurfaceRow.
export const SurfaceFormModal: FC<Props> = ({
  isPending = false,
  error = null,
  onSubmit,
  onClose,
}) => {
  const [type, setType] = useState("WALL")
  const [name, setName] = useState("")
  const [height, setHeight] = useState("")
  const [area, setArea] = useState("")

  const heightM = height.trim() === "" ? null : Number(height)
  const areaM2 = Number(area)

  const valid =
    type.length <= MEASUREMENT_LIMITS.surfaceType &&
    name.length <= MEASUREMENT_LIMITS.surfaceName &&
    (height.trim() === "" || Number.isFinite(heightM)) &&
    Number.isFinite(areaM2) &&
    areaM2 >= 0 &&
    areaM2 <= MEASUREMENT_LIMITS.maxAreaM2

  return (
    <ModalShell title="Новая поверхность" onClose={onClose}>
      <div className="modal-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="surface-type" className="form-label">
            Тип
          </label>
          <input
            id="surface-type"
            type="text"
            className="form-control"
            list="surface-types"
            value={type}
            maxLength={MEASUREMENT_LIMITS.surfaceType}
            onChange={e => {
              setType(e.target.value)
            }}
          />
          <datalist id="surface-types">
            {SURFACE_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </datalist>
          <div className="form-text">
            Можно ввести своё значение — оно не проверяется и не нормализуется.
          </div>
        </div>
        <div className="mb-3">
          <label htmlFor="surface-name" className="form-label">
            Название
          </label>
          <input
            id="surface-name"
            type="text"
            className="form-control"
            value={name}
            maxLength={MEASUREMENT_LIMITS.surfaceName}
            onChange={e => {
              setName(e.target.value)
            }}
          />
        </div>
        <div className="row g-3">
          <div className="col-6">
            <label htmlFor="surface-height" className="form-label">
              Высота, м
            </label>
            <input
              id="surface-height"
              type="text"
              inputMode="decimal"
              className="form-control"
              placeholder="не задана"
              value={height}
              onChange={e => {
                setHeight(e.target.value)
              }}
            />
          </div>
          <div className="col-6">
            <label htmlFor="surface-area" className="form-label">
              Площадь, м² (валовая)
            </label>
            <input
              id="surface-area"
              type="text"
              inputMode="decimal"
              className="form-control"
              value={area}
              onChange={e => {
                setArea(e.target.value)
              }}
            />
          </div>
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
            onSubmit({
              type,
              name: name.trim(),
              heightM,
              areaM2,
            })
          }}
          disabled={isPending || !valid}
        >
          {isPending ? "Добавление..." : "Добавить"}
        </button>
      </div>
    </ModalShell>
  )
}
