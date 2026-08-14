import type { FC } from "react"
import { useAppSelector } from "../../app/hooks"
import { selectSurfaceAreas } from "../../features/measurement/measurementEditorSlice"
import type { SurfaceDraft } from "../../features/measurement/measurementEditorSlice"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import { NumberField } from "./NumberField"

type Props = {
  surface: SurfaceDraft
  index: number
  total: number
  onUpdate: (patch: Partial<SurfaceDraft>) => void
  onRemove: () => void
  onMove: (from: number, to: number) => void
  onContour: () => void
  onToggleOpenings: () => void
  variant: "row" | "card"
}

// Строка/карточка поверхности (DESIGN §10.2, D6): тип — <input list> с
// константами плюс свободный ввод (D12), название, высота, площадь
// (ВАЛОВАЯ; при наличии контура — только чтение с подписью «из контура»,
// D9), чистая — производная справочно, кнопки «Контур» / «Проёмы (n)» /
// «⧉» (копировать чистую площадь, D21) / ↑↓ / удалить. Рядом всегда три
// подписанные величины (§8.2); «проёмы больше поверхности» — почти всегда
// опечатка в размерах, показываем предупреждение.
// Правка инлайн, числовые поля — строковый буфер с коммитом по blur (D5).
export const SurfaceRow: FC<Props> = ({
  surface,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onContour,
  onToggleOpenings,
  variant,
}) => {
  const areas = useAppSelector(selectSurfaceAreas(surface.id))
  const hasContour = surface.contourCm != null
  const openingsOverflow = areas != null && areas.deductedM2 > areas.grossM2

  const copyNetArea = () => {
    if (areas == null) return
    void navigator.clipboard.writeText(String(areas.netM2))
  }

  const areaBlock = (
    <div className="text-nowrap">
      <div>
        Валовая: <strong>{areas ? String(areas.grossM2) : "—"} м²</strong>
      </div>
      <div className="text-muted">
        Проёмы (вычет): −{areas ? String(areas.deductedM2) : "0"} м²
      </div>
      <div>
        Чистая: <strong>{areas ? String(areas.netM2) : "—"} м²</strong>{" "}
        <button
          type="button"
          className="btn btn-link btn-sm p-0 align-baseline"
          title="Скопировать чистую площадь"
          aria-label="Скопировать чистую площадь"
          onClick={copyNetArea}
        >
          <i className="bi bi-clipboard" />
        </button>
      </div>
      {openingsOverflow && (
        <div className="text-warning small">Проёмы больше поверхности</div>
      )}
    </div>
  )

  const cells = (
    <>
      <td className="align-middle text-nowrap">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm me-1"
          aria-label="Выше"
          title="Выше"
          onClick={() => {
            onMove(index, index - 1)
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
            onMove(index, index + 1)
          }}
          disabled={index === total - 1}
        >
          <i className="bi bi-arrow-down" />
        </button>
      </td>
      <td className="align-middle">
        <input
          type="text"
          className="form-control form-control-sm"
          list="surface-types-inline"
          value={surface.type}
          maxLength={MEASUREMENT_LIMITS.surfaceType}
          onChange={e => {
            onUpdate({ type: e.target.value })
          }}
          aria-label={`Тип поверхности ${String(index + 1)}`}
        />
      </td>
      <td className="align-middle">
        <input
          type="text"
          className="form-control form-control-sm"
          value={surface.name}
          maxLength={MEASUREMENT_LIMITS.surfaceName}
          onChange={e => {
            onUpdate({ name: e.target.value })
          }}
          aria-label={`Название поверхности ${String(index + 1)}`}
        />
      </td>
      <td className="align-middle" style={{ minWidth: "8rem" }}>
        <NumberField
          id={`surface-height-${surface.id}`}
          value={surface.heightM}
          allowEmpty
          min={0}
          max={MEASUREMENT_LIMITS.maxDimensionM}
          placeholder="не задана"
          onChange={v => {
            onUpdate({ heightM: v })
          }}
        />
      </td>
      <td className="align-middle" style={{ minWidth: "9rem" }}>
        <div className="d-flex align-items-center gap-1">
          <NumberField
            id={`surface-area-${surface.id}`}
            value={surface.areaM2}
            allowEmpty={false}
            min={0}
            max={MEASUREMENT_LIMITS.maxAreaM2}
            readOnly={hasContour}
            onChange={v => {
              onUpdate({ areaM2: v ?? 0 })
            }}
          />
          {hasContour && (
            <i
              className="bi bi-bounding-box text-muted"
              title="Площадь из контура"
            />
          )}
        </div>
      </td>
      <td className="align-middle">{areaBlock}</td>
      <td className="align-middle text-nowrap">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm fw-semibold"
          onClick={onContour}
        >
          <i className="bi bi-pencil-square me-1" />
          Контур
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm ms-1"
          onClick={onToggleOpenings}
          title="Проёмы поверхности"
        >
          <i className="bi bi-door-closed me-1" />
          Проёмы ({String(surface.openings.length)})
        </button>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm ms-1"
          aria-label="Удалить поверхность"
          title="Удалить"
          onClick={onRemove}
        >
          <i className="bi bi-trash" />
        </button>
      </td>
    </>
  )

  if (variant === "row") {
    return <tr>{cells}</tr>
  }

  return (
    <div className="card shadow-sm border-0 mb-2">
      <div className="card-body p-3">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className="text-muted small">№ {String(index + 1)}</span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            aria-label="Выше"
            onClick={() => {
              onMove(index, index - 1)
            }}
            disabled={index === 0}
          >
            <i className="bi bi-arrow-up" />
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            aria-label="Ниже"
            onClick={() => {
              onMove(index, index + 1)
            }}
            disabled={index === total - 1}
          >
            <i className="bi bi-arrow-down" />
          </button>
        </div>
        <div className="row g-2 mb-2">
          <div className="col-6">
            <label
              className="form-label small mb-1"
              htmlFor={`surface-type-${surface.id}-card`}
            >
              Тип
            </label>
            <input
              id={`surface-type-${surface.id}-card`}
              type="text"
              className="form-control form-control-sm"
              list="surface-types-inline"
              value={surface.type}
              maxLength={MEASUREMENT_LIMITS.surfaceType}
              onChange={e => {
                onUpdate({ type: e.target.value })
              }}
            />
          </div>
          <div className="col-6">
            <label
              className="form-label small mb-1"
              htmlFor={`surface-name-${surface.id}-card`}
            >
              Название
            </label>
            <input
              id={`surface-name-${surface.id}-card`}
              type="text"
              className="form-control form-control-sm"
              value={surface.name}
              maxLength={MEASUREMENT_LIMITS.surfaceName}
              onChange={e => {
                onUpdate({ name: e.target.value })
              }}
            />
          </div>
          <div className="col-6">
            <label
              className="form-label small mb-1"
              htmlFor={`surface-height-${surface.id}-card`}
            >
              Высота, м
            </label>
            <NumberField
              id={`surface-height-${surface.id}-card`}
              value={surface.heightM}
              allowEmpty
              min={0}
              max={MEASUREMENT_LIMITS.maxDimensionM}
              placeholder="не задана"
              onChange={v => {
                onUpdate({ heightM: v })
              }}
            />
          </div>
          <div className="col-6">
            <label
              className="form-label small mb-1"
              htmlFor={`surface-area-${surface.id}-card`}
            >
              Площадь, м²
            </label>
            <NumberField
              id={`surface-area-${surface.id}-card`}
              value={surface.areaM2}
              allowEmpty={false}
              min={0}
              max={MEASUREMENT_LIMITS.maxAreaM2}
              readOnly={hasContour}
              onChange={v => {
                onUpdate({ areaM2: v ?? 0 })
              }}
            />
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            {areaBlock}
            {hasContour && (
              <div className="text-muted small">площадь из контура</div>
            )}
          </div>
          <span className="d-flex gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm fw-semibold"
              onClick={onContour}
            >
              <i className="bi bi-pencil-square me-1" />
              Контур
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onToggleOpenings}
              title="Проёмы поверхности"
            >
              <i className="bi bi-door-closed me-1" />
              Проёмы ({String(surface.openings.length)})
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              aria-label="Удалить поверхность"
              title="Удалить"
              onClick={onRemove}
            >
              <i className="bi bi-trash" />
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
