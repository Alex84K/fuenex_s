import type { FC } from "react"
import { useState } from "react"
import {
  useGetTemplate,
  useGetTemplates,
} from "../../features/estimates/templates.hooks"
import type { EstimateTemplate } from "../../features/estimates/types"
import { formatDateTime } from "../../features/projects/format"
import { ModalShell } from "./ModalShell"

type Props = {
  /** default on when the estimate's rates are both zero (DESIGN §10). */
  defaultCopyRates: boolean
  onApply: (template: EstimateTemplate, copyRates: boolean) => void
  onClose: () => void
}

// Pick a template, fetch its detail, apply: fresh UUIDv7 per item via
// fromTemplateItems in the parent.
export const ApplyTemplateModal: FC<Props> = ({
  defaultCopyRates,
  onApply,
  onClose,
}) => {
  const { data: templates = [], isError } = useGetTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copyRates, setCopyRates] = useState(defaultCopyRates)
  const { data: selected } = useGetTemplate(selectedId)

  return (
    <ModalShell title="Применить шаблон" onClose={onClose} size="lg">
      <div className="modal-body">
        {isError && (
          <div className="alert alert-danger" role="alert">
            Не удалось загрузить шаблоны
          </div>
        )}

        {templates.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-files d-block fs-1 mb-3" />
            <p className="mb-0">
              Шаблонов пока нет. Сохраните готовую смету как шаблон — кнопка в
              панели итогов.
            </p>
          </div>
        ) : (
          <div
            className="list-group mb-3"
            style={{ maxHeight: "16rem", overflowY: "auto" }}
          >
            {templates.map(t => (
              <button
                type="button"
                key={t.id}
                className={`list-group-item list-group-item-action text-start${selectedId === t.id ? " active" : ""}`}
                onClick={() => {
                  setSelectedId(t.id)
                }}
              >
                <div className="fw-semibold text-break">
                  {t.title || "Без названия"}
                </div>
                <div className="small opacity-75">
                  {t.taxRateBp > 0 && <>НДС {t.taxRateBp / 100} %</>}
                  {t.taxRateBp > 0 && t.discountBp > 0 && " · "}
                  {t.discountBp > 0 && <>скидка {t.discountBp / 100} %</>}
                  {t.note !== "" && t.note}
                </div>
                <div className="small opacity-75">
                  обновлён {formatDateTime(t.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="apply-copy-rates"
              checked={copyRates}
              onChange={e => {
                setCopyRates(e.target.checked)
              }}
            />
            <label className="form-check-label" htmlFor="apply-copy-rates">
              Перенести ставку и скидку шаблона
            </label>
          </div>
        )}
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
          disabled={!selected}
          onClick={() => {
            if (selected) onApply(selected, copyRates)
          }}
        >
          {selected
            ? `Применить шаблон (${String(selected.items.length)} поз.)`
            : "Выберите шаблон"}
        </button>
      </div>
    </ModalShell>
  )
}
