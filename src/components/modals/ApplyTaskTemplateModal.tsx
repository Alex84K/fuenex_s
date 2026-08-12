import type { FC } from "react"
import { useState } from "react"
import {
  useGetTaskTemplate,
  useGetTaskTemplates,
} from "../../features/planner/templates.hooks"
import type { TaskTemplate } from "../../features/planner/types"
import { formatDateTime } from "../../features/projects/format"
import { ModalShell } from "./ModalShell"

type Props = {
  onApply: (template: TaskTemplate) => void
  onClose: () => void
}

// Pick a template, fetch its detail, apply: the parent APPENDS its items to
// the end of the current list with fresh UUIDv7s and sends ONE collection
// PUT (D6, DESIGN_PLANNER.md §5.2) — applying never replaces the list.
export const ApplyTaskTemplateModal: FC<Props> = ({ onApply, onClose }) => {
  const { data: templates = [], isError } = useGetTaskTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: selected } = useGetTaskTemplate(selectedId)

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
              Шаблонов пока нет. Сохраните готовый список как шаблон — кнопка
              внизу списка задач.
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
                {t.note !== "" && (
                  <div className="small opacity-75 text-truncate">{t.note}</div>
                )}
                <div className="small opacity-75">
                  обновлён {formatDateTime(t.updatedAt)}
                </div>
              </button>
            ))}
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
            if (selected) onApply(selected)
          }}
        >
          {selected
            ? `Дописать в конец (${String(selected.items.length)} ${pluralize(selected.items.length)})`
            : "Выберите шаблон"}
        </button>
      </div>
    </ModalShell>
  )
}

const pluralize = (n: number): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "задача"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задачи"
  return "задач"
}
