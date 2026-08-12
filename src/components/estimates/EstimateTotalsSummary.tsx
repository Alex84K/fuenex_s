import type { FC } from "react"
import type { EstimateTotals } from "../../features/estimates/types"
import { formatMinor } from "../../features/estimates/utils/money"

type SaveError = { message: string; canSaveAsNew: boolean }

type Props = {
  totals: EstimateTotals | null
  currency: string
  taxRateBp: number
  discountBp: number
  showPurchase: boolean
  isDirty: boolean
  isPending: boolean
  saveError: SaveError | null
  onSave: () => void
  onSaveAsNew: () => void
  onSaveAsTemplate: () => void
  onApplyTemplate: () => void
}

const TotalsRow: FC<{
  label: string
  value: string
  valueClassName?: string
}> = ({ label, value, valueClassName }) => (
  <div className="row align-items-center py-1 g-0">
    <div className="col text-muted">{label}</div>
    <div
      className={`col-auto font-monospace fw-semibold${valueClassName ? ` ${valueClassName}` : ""}`}
    >
      {value}
    </div>
  </div>
)

// Seven rows in formula order (DESIGN §8.3). Cost and margin rows are
// internal — visible only with showPurchase (D7). Discount/tax rows hide at
// zero rates. Sticky at the bottom below lg — the sum must be visible while
// editing, not after scrolling.
export const EstimateTotalsSummary: FC<Props> = ({
  totals,
  currency,
  taxRateBp,
  discountBp,
  showPurchase,
  isDirty,
  isPending,
  saveError,
  onSave,
  onSaveAsNew,
  onSaveAsTemplate,
  onApplyTemplate,
}) => {
  if (!totals) return null

  return (
    <div className="card shadow-sm border-0 position-sticky bottom-0">
      <div className="card-body">
        {saveError && (
          <div
            className="alert alert-danger d-flex flex-wrap align-items-center gap-2 py-2"
            role="alert"
          >
            <span className="me-auto">{saveError.message}</span>
            {saveError.canSaveAsNew && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm fw-semibold"
                onClick={onSaveAsNew}
              >
                Сохранить как новую
              </button>
            )}
          </div>
        )}

        {showPurchase && (
          <TotalsRow
            label="Себестоимость"
            value={formatMinor(totals.costMinor, currency)}
          />
        )}
        <TotalsRow
          label="Нетто"
          value={formatMinor(totals.netMinor, currency)}
        />
        {discountBp > 0 && (
          <TotalsRow
            label={`Скидка ${String(discountBp / 100)} %`}
            value={`−${formatMinor(totals.discountMinor, currency)}`}
          />
        )}
        <TotalsRow
          label="К оплате нетто"
          value={formatMinor(totals.netAfterDiscountMinor, currency)}
        />
        {taxRateBp > 0 && (
          <TotalsRow
            label={`НДС ${String(taxRateBp / 100)} %`}
            value={formatMinor(totals.taxMinor, currency)}
          />
        )}

        <hr className="my-2" />
        <div className="d-flex justify-content-between align-items-center bg-light px-3 py-2 rounded-2">
          <span className="fw-bold">ИТОГО брутто</span>
          <span className="fw-bold fs-5 font-monospace">
            {formatMinor(totals.grossMinor, currency)}
          </span>
        </div>
        {showPurchase && (
          <TotalsRow
            label="Маржа"
            value={formatMinor(totals.marginMinor, currency)}
            valueClassName={totals.marginMinor < 0 ? "text-danger" : undefined}
          />
        )}

        <div className="d-flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className="btn btn-primary fw-bold"
            onClick={onSave}
            disabled={!isDirty || isPending}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onSaveAsTemplate}
          >
            Сохранить как шаблон
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onApplyTemplate}
          >
            Применить шаблон
          </button>
        </div>
      </div>
    </div>
  )
}
