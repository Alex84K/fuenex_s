import type { FC } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { CURRENCIES } from "../../features/estimates/constants"
import {
  selectDraft,
  updateScalar,
} from "../../features/estimates/estimateEditorSlice"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import { PercentInput } from "./PercentInput"

// Estimate scalars: title, currency, tax rate, discount, note (DESIGN §8.1).
// The rate fields commit on blur; text fields commit per keystroke. Currency
// change renames the prices, never converts them.
export const EstimateHeader: FC = () => {
  const dispatch = useAppDispatch()
  const draft = useAppSelector(selectDraft)

  if (!draft) return null

  return (
    <div className="card shadow-sm border-0 mb-3">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="estimate-title">
              Название сметы
            </label>
            <input
              id="estimate-title"
              type="text"
              className="form-control"
              maxLength={ESTIMATE_LIMITS.title}
              value={draft.title}
              placeholder="Например: Этап 1 — санузел"
              onChange={e =>
                dispatch(
                  updateScalar({ field: "title", value: e.target.value }),
                )
              }
            />
          </div>

          <div className="col-md-4">
            <label
              className="form-label fw-semibold"
              htmlFor="estimate-currency"
            >
              Валюта
            </label>
            <select
              id="estimate-currency"
              className="form-select"
              value={draft.currency}
              onChange={e =>
                dispatch(
                  updateScalar({ field: "currency", value: e.target.value }),
                )
              }
            >
              {CURRENCIES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="form-text">Смена валюты не пересчитывает цены.</div>
          </div>

          <div className="col-md-4">
            <PercentInput
              id="estimate-tax"
              label="НДС, %"
              valueBp={draft.taxRateBp}
              onChange={bp =>
                dispatch(updateScalar({ field: "taxRateBp", value: bp }))
              }
            />
          </div>

          <div className="col-md-4">
            <PercentInput
              id="estimate-discount"
              label="Скидка, %"
              valueBp={draft.discountBp}
              onChange={bp =>
                dispatch(updateScalar({ field: "discountBp", value: bp }))
              }
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold" htmlFor="estimate-note">
              Заметка
            </label>
            <textarea
              id="estimate-note"
              rows={2}
              className="form-control"
              maxLength={ESTIMATE_LIMITS.note}
              value={draft.note}
              onChange={e =>
                dispatch(updateScalar({ field: "note", value: e.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
