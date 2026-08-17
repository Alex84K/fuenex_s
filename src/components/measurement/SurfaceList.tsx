import type { FC } from "react"
import { useState } from "react"
import { useAppDispatch } from "../../app/hooks"
import {
  moveSurface,
  removeSurface,
} from "../../features/measurement/measurementEditorSlice"
import type {
  SetDraft,
  SurfaceDraft,
} from "../../features/measurement/measurementEditorSlice"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import { SurfaceRow } from "./SurfaceRow"
import { OpeningsTable } from "./OpeningsTable"

type Props = {
  draft: SetDraft
  onUpdate: (id: string, patch: Partial<SurfaceDraft>) => void
  onContour: (surfaceId: string) => void
  onAdd: () => void
}

// Список поверхностей комплекта (DESIGN §10.2, D6): таблица на lg+, карточки
// на меньших экранах. Обе раскладки рендерятся всегда (одна скрыта CSS) —
// поэтому id полей в карточках имеют суффикс -card (SurfaceRow). Проёмы
// раскрываются под списком — одна поверхность за раз.
export const SurfaceList: FC<Props> = ({
  draft,
  onUpdate,
  onContour,
  onAdd,
}) => {
  const dispatch = useAppDispatch()
  const [openingsFor, setOpeningsFor] = useState<string | null>(null)
  const surfaces = draft.surfaces
  const atLimit = surfaces.length >= MEASUREMENT_LIMITS.maxSurfacesPerSet

  const openSurface = surfaces.find(s => s.id === openingsFor) ?? null

  return (
    <div>
      <datalist id="surface-types-inline">
        {[
          { value: "FLOOR", label: "Пол" },
          { value: "WALL", label: "Стена" },
          { value: "CEILING", label: "Потолок" },
          { value: "FENCE_SIDE_A", label: "Забор, сторона А" },
          { value: "FENCE_SIDE_B", label: "Забор, сторона Б" },
        ].map(t => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </datalist>

      {/* lg+ */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table align-middle">
          <thead>
            <tr>
              <th scope="col">№</th>
              <th scope="col">Тип</th>
              <th scope="col">Название</th>
              <th scope="col">Высота, м</th>
              <th scope="col">Площадь, м²</th>
              <th scope="col">Площади</th>
              <th scope="col">Действия</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((s, index) => (
              <SurfaceRow
                key={s.id}
                surface={s}
                index={index}
                total={surfaces.length}
                variant="row"
                onUpdate={patch => {
                  onUpdate(s.id, patch)
                }}
                onRemove={() => {
                  dispatch(removeSurface(s.id))
                }}
                onMove={(from, to) => {
                  dispatch(moveSurface({ from, to }))
                }}
                onContour={() => {
                  onContour(s.id)
                }}
                onToggleOpenings={() => {
                  setOpeningsFor(openingsFor === s.id ? null : s.id)
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* <lg */}
      <div className="d-lg-none">
        {surfaces.map((s, index) => (
          <SurfaceRow
            key={s.id}
            surface={s}
            index={index}
            total={surfaces.length}
            variant="card"
            onUpdate={patch => {
              onUpdate(s.id, patch)
            }}
            onRemove={() => {
              dispatch(removeSurface(s.id))
            }}
            onMove={(from, to) => {
              dispatch(moveSurface({ from, to }))
            }}
            onContour={() => {
              onContour(s.id)
            }}
            onToggleOpenings={() => {
              setOpeningsFor(openingsFor === s.id ? null : s.id)
            }}
          />
        ))}
      </div>

      {openSurface && (
        <div className="card border-0 bg-body-tertiary mb-3">
          <div className="card-body p-3">
            <h6 className="fw-bold mb-2">
              Проёмы: {openSurface.name || openSurface.type || "поверхность"}
            </h6>
            <OpeningsTable
              surfaceId={openSurface.id}
              openings={openSurface.openings}
            />
          </div>
        </div>
      )}

      {surfaces.length === 0 && (
        <p className="text-muted mb-2">
          В комплекте пока нет поверхностей. Добавьте первую — вырожденный
          комплект можно сохранить и заполнить позже.
        </p>
      )}

      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm fw-semibold"
          onClick={onAdd}
          disabled={atLimit}
        >
          <i className="bi bi-plus-lg me-1" />
          Добавить поверхность
        </button>
        {atLimit && (
          <span className="text-muted small">
            Лимит {String(MEASUREMENT_LIMITS.maxSurfacesPerSet)}
          </span>
        )}
        {surfaces.length >= 150 && surfaces.length < 200 && (
          <span className="text-muted small">
            {String(surfaces.length)} /{" "}
            {String(MEASUREMENT_LIMITS.maxSurfacesPerSet)}
          </span>
        )}
      </div>
    </div>
  )
}
