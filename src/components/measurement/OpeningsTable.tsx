import type { FC } from "react"
import { useState } from "react"
import { useAppDispatch } from "../../app/hooks"
import {
  addOpening,
  moveOpening,
  removeOpening,
  updateOpening,
} from "../../features/measurement/measurementEditorSlice"
import type { OpeningDraft } from "../../features/measurement/measurementEditorSlice"
import {
  OPENING_DEFAULTS,
  OPENING_KIND_LABELS,
} from "../../features/measurement/constants"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import type { OpeningKind } from "../../features/measurement/types"
import { uuidv7 } from "../../utils/uuid"
import { NumberField } from "./NumberField"
import { OpeningFormModal } from "../modals/OpeningFormModal"

type Props = {
  surfaceId: string
  openings: OpeningDraft[]
}

// Проёмы поверхности (DESIGN §10.3): строка — вид (select), ширина, высота,
// площадь (производная w × h, справочно), чекбокс «Вычитать из площади»,
// порядок стрелками, 🗑. «+ Проём» добавляет дверь 0.9 × 2.05 с deduct —
// типовой случай в один клик; «+ Окно…» открывает модалку для остальных.
// Геометрии у проёма нет — ни на холсте, ни в форме (F-14).
export const OpeningsTable: FC<Props> = ({ surfaceId, openings }) => {
  const dispatch = useAppDispatch()
  const [customOpen, setCustomOpen] = useState(false)
  const atLimit = openings.length >= MEASUREMENT_LIMITS.maxOpeningsPerSurface

  return (
    <div>
      {openings.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-2">
            <thead>
              <tr>
                <th scope="col">№</th>
                <th scope="col">Вид</th>
                <th scope="col" style={{ minWidth: "7rem" }}>
                  Ширина, м
                </th>
                <th scope="col" style={{ minWidth: "7rem" }}>
                  Высота, м
                </th>
                <th scope="col">Площадь</th>
                <th scope="col">Вычитать</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {openings.map((o, index) => (
                <tr key={o.id}>
                  <td className="align-middle text-nowrap">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm me-1"
                      aria-label="Выше"
                      title="Выше"
                      onClick={() => {
                        dispatch(
                          moveOpening({
                            surfaceId,
                            from: index,
                            to: index - 1,
                          }),
                        )
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
                        dispatch(
                          moveOpening({
                            surfaceId,
                            from: index,
                            to: index + 1,
                          }),
                        )
                      }}
                      disabled={index === openings.length - 1}
                    >
                      <i className="bi bi-arrow-down" />
                    </button>
                  </td>
                  <td className="align-middle">
                    <select
                      className="form-select form-select-sm"
                      value={o.kind}
                      aria-label={`Вид проёма ${String(index + 1)}`}
                      onChange={e => {
                        dispatch(
                          updateOpening({
                            surfaceId,
                            id: o.id,
                            patch: { kind: e.target.value as OpeningKind },
                          }),
                        )
                      }}
                    >
                      {(Object.keys(OPENING_KIND_LABELS) as OpeningKind[]).map(
                        k => (
                          <option key={k} value={k}>
                            {OPENING_KIND_LABELS[k]}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td className="align-middle">
                    <NumberField
                      id={`opening-width-${o.id}`}
                      value={o.widthM}
                      allowEmpty={false}
                      min={0}
                      max={MEASUREMENT_LIMITS.maxDimensionM}
                      onChange={v => {
                        dispatch(
                          updateOpening({
                            surfaceId,
                            id: o.id,
                            patch: { widthM: v ?? 0 },
                          }),
                        )
                      }}
                    />
                  </td>
                  <td className="align-middle">
                    <NumberField
                      id={`opening-height-${o.id}`}
                      value={o.heightM}
                      allowEmpty={false}
                      min={0}
                      max={MEASUREMENT_LIMITS.maxDimensionM}
                      onChange={v => {
                        dispatch(
                          updateOpening({
                            surfaceId,
                            id: o.id,
                            patch: { heightM: v ?? 0 },
                          }),
                        )
                      }}
                    />
                  </td>
                  <td className="align-middle text-nowrap">
                    {String(Math.round(o.widthM * o.heightM * 100) / 100)} м²
                  </td>
                  <td className="align-middle">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={o.deduct}
                      aria-label="Вычитать из площади"
                      onChange={e => {
                        dispatch(
                          updateOpening({
                            surfaceId,
                            id: o.id,
                            patch: { deduct: e.target.checked },
                          }),
                        )
                      }}
                    />
                  </td>
                  <td className="align-middle text-end">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      aria-label="Удалить проём"
                      title="Удалить"
                      onClick={() => {
                        dispatch(removeOpening({ surfaceId, id: o.id }))
                      }}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            dispatch(
              addOpening({
                surfaceId,
                opening: {
                  id: uuidv7(),
                  ...OPENING_DEFAULTS,
                },
              }),
            )
          }}
          disabled={atLimit}
        >
          <i className="bi bi-plus-lg me-1" />
          Проём
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            setCustomOpen(true)
          }}
          disabled={atLimit}
        >
          <i className="bi bi-plus-lg me-1" />
          Окно / другой...
        </button>
        {atLimit && (
          <span className="text-muted small">
            Лимит {String(MEASUREMENT_LIMITS.maxOpeningsPerSurface)}
          </span>
        )}
        {openings.length >= 40 && openings.length < 50 && (
          <span className="text-muted small">
            {String(openings.length)} /{" "}
            {String(MEASUREMENT_LIMITS.maxOpeningsPerSurface)}
          </span>
        )}
      </div>

      {customOpen && (
        <OpeningFormModal
          onSubmit={values => {
            dispatch(
              addOpening({
                surfaceId,
                opening: {
                  id: uuidv7(),
                  ...values,
                },
              }),
            )
            setCustomOpen(false)
          }}
          onClose={() => {
            setCustomOpen(false)
          }}
        />
      )}
    </div>
  )
}
