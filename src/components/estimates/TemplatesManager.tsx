import type { FC } from "react"
import { useEffect, useState } from "react"
import { ApiError } from "../../utils/api"
import {
  useGetTemplate,
  useGetTemplates,
  usePatchTemplate,
  usePutTemplate,
  useDeleteTemplate,
} from "../../features/estimates/templates.hooks"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import { makeEmptyDraftItem } from "../../features/estimates/estimateEditorSlice"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import type {
  EstimateTemplate,
  EstimateTemplateInput,
  EstimateTemplatePatch,
  EstimateTemplateSummary,
} from "../../features/estimates/types"
import { formatDateTime } from "../../features/projects/format"
import { EstimateItemsTable } from "./EstimateItemsTable"
import { PercentInput } from "./PercentInput"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"
import { EditEstimateItemModal } from "../modals/EditEstimateItemModal"
import { SelectCatalogItemsModal } from "../modals/SelectCatalogItemsModal"

type TemplateDraft = {
  id: string
  title: string
  note: string
  taxRateBp: number
  discountBp: number
  items: DraftItem[]
  updatedAt: string | null
  isDirty: boolean
  itemsDirty: boolean
}

type Props = {
  onGoToCatalog: () => void
}

const toDraftItem = (it: {
  id: string
  title: string
  description: string
  unit: string
  quantity: number
  purchasePriceMinor: number
  sellingPriceMinor: number
}): DraftItem => ({
  id: it.id,
  title: it.title,
  description: it.description,
  unit: it.unit,
  quantity: it.quantity,
  purchasePriceMinor: it.purchasePriceMinor,
  sellingPriceMinor: it.sellingPriceMinor,
})

const fromTemplate = (t: EstimateTemplate): TemplateDraft => ({
  id: t.id,
  title: t.title,
  note: t.note,
  taxRateBp: t.taxRateBp,
  discountBp: t.discountBp,
  items: t.items.map(toDraftItem),
  updatedAt: t.updatedAt,
  isDirty: false,
  itemsDirty: false,
})

// Templates: a reusable item set without currency and totals (DESIGN §10).
// The editor reuses EstimateItemsTable over a local draft — no totals are
// shown: a template without a currency is not a document with a sum.
export const TemplatesManager: FC<Props> = ({ onGoToCatalog }) => {
  const { data: templates = [], isLoading, isError, error } = useGetTemplates()
  const putTemplate = usePutTemplate()
  const patchTemplate = usePatchTemplate()
  const deleteTemplate = useDeleteTemplate()

  const [openId, setOpenId] = useState<string | null>(null)
  const { data: opened } = useGetTemplate(openId)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [showPurchase, setShowPurchase] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<EstimateTemplateSummary | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)

  const isPending = putTemplate.isPending || patchTemplate.isPending

  // Seed the editor when the detail arrives; a PUT/PATCH response updates
  // the detail cache, so this also resets isDirty after a save.
  useEffect(() => {
    if (!openId || !opened) return
    setDraft(fromTemplate(opened))
  }, [openId, opened])

  const closeEditor = () => {
    setOpenId(null)
    setDraft(null)
    setSaveError(null)
  }

  const setScalar = (
    patch: Partial<
      Pick<TemplateDraft, "title" | "note" | "taxRateBp" | "discountBp">
    >,
  ) => {
    setDraft(d => (d ? { ...d, ...patch, isDirty: true } : d))
  }

  const setItems = (updater: (items: DraftItem[]) => DraftItem[]) => {
    setDraft(d =>
      d
        ? { ...d, items: updater(d.items), isDirty: true, itemsDirty: true }
        : d,
    )
  }

  const handleSave = async () => {
    if (!draft) return
    setSaveError(null)
    try {
      if (draft.itemsDirty) {
        const input: EstimateTemplateInput = {
          title: draft.title,
          note: draft.note,
          taxRateBp: draft.taxRateBp,
          discountBp: draft.discountBp,
          items: draft.items.map((it, position) => ({ ...it, position })),
        }
        await putTemplate.mutateAsync({ id: draft.id, data: input })
      } else {
        const patch: EstimateTemplatePatch = {
          title: draft.title,
          note: draft.note,
          taxRateBp: draft.taxRateBp,
          discountBp: draft.discountBp,
        }
        await patchTemplate.mutateAsync({ id: draft.id, patch })
      }
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Не удалось сохранить шаблон",
      )
    }
  }

  const loadError =
    error instanceof ApiError ? error.message : "Не удалось загрузить шаблоны"
  const deleteError =
    deleteTemplate.error instanceof ApiError
      ? deleteTemplate.error.message
      : "Не удалось удалить шаблон"

  const editItem = editItemId
    ? (draft?.items.find(it => it.id === editItemId) ?? null)
    : null

  if (draft) {
    return (
      <div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={closeEditor}
          >
            <i className="bi bi-arrow-left me-1" />К списку шаблонов
          </button>
          {draft.isDirty && (
            <span className="badge text-bg-warning">Не сохранено</span>
          )}
        </div>

        <div className="card shadow-sm border-0 mb-3">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label
                  className="form-label fw-semibold"
                  htmlFor="template-editor-title"
                >
                  Название шаблона
                </label>
                <input
                  id="template-editor-title"
                  type="text"
                  className="form-control"
                  maxLength={ESTIMATE_LIMITS.title}
                  value={draft.title}
                  onChange={e => {
                    setScalar({ title: e.target.value })
                  }}
                />
              </div>
              <div className="col-md-3">
                <PercentInput
                  id="template-editor-tax"
                  label="НДС, %"
                  valueBp={draft.taxRateBp}
                  onChange={bp => {
                    setScalar({ taxRateBp: bp })
                  }}
                />
              </div>
              <div className="col-md-3">
                <PercentInput
                  id="template-editor-discount"
                  label="Скидка, %"
                  valueBp={draft.discountBp}
                  onChange={bp => {
                    setScalar({ discountBp: bp })
                  }}
                />
              </div>
              <div className="col-12">
                <label
                  className="form-label fw-semibold"
                  htmlFor="template-editor-note"
                >
                  Заметка
                </label>
                <textarea
                  id="template-editor-note"
                  rows={2}
                  className="form-control"
                  maxLength={ESTIMATE_LIMITS.note}
                  value={draft.note}
                  onChange={e => {
                    setScalar({ note: e.target.value })
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <EstimateItemsTable
          items={draft.items}
          currency={null}
          showPurchase={showPurchase}
          resetToken={draft.updatedAt}
          onAddEmpty={() => {
            setItems(items => [...items, makeEmptyDraftItem()])
          }}
          onOpenCatalog={() => {
            setCatalogOpen(true)
          }}
          onCommit={(id, patch) => {
            setItems(items =>
              items.map(it => (it.id === id ? { ...it, ...patch } : it)),
            )
          }}
          onRemove={id => {
            setItems(items => items.filter(it => it.id !== id))
          }}
          onMove={(from, to) => {
            setItems(items => {
              const next = [...items]
              const [moved] = next.splice(from, 1)
              next.splice(to, 0, moved)
              return next
            })
          }}
          onEditFields={id => {
            setEditItemId(id)
          }}
          onToggleShowPurchase={() => {
            setShowPurchase(v => !v)
          }}
        />

        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button
            type="button"
            className="btn btn-primary fw-bold"
            onClick={() => {
              void handleSave()
            }}
            disabled={!draft.isDirty || isPending}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
          {saveError && (
            <span className="text-danger small" role="alert">
              {saveError}
            </span>
          )}
        </div>

        {editItem && (
          <EditEstimateItemModal
            item={editItem}
            onSave={patch => {
              setItems(items =>
                items.map(it =>
                  it.id === editItem.id ? { ...it, ...patch } : it,
                ),
              )
              setEditItemId(null)
            }}
            onClose={() => {
              setEditItemId(null)
            }}
          />
        )}

        {catalogOpen && (
          <SelectCatalogItemsModal
            onAdd={items => {
              setItems(prev => [...prev, ...items])
            }}
            onClose={() => {
              setCatalogOpen(false)
            }}
            onCreateCatalogItem={() => {
              setCatalogOpen(false)
              onGoToCatalog()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h5 className="fw-bold mb-0">Шаблоны смет</h5>
      </div>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-5" />
              <span className="placeholder col-3 d-block mt-3" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-files d-block fs-1 mb-3" />
          <p className="mb-0">
            Шаблонов пока нет. Сохраните готовую смету как шаблон — кнопка в
            панели итогов редактора.
          </p>
        </div>
      ) : (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {templates.map(t => (
            <div className="list-group-item p-3" key={t.id}>
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div className="me-auto" style={{ minWidth: 0 }}>
                  <div className="fw-bold text-break">
                    {t.title || (
                      <span className="text-muted">Без названия</span>
                    )}
                  </div>
                  <div className="text-muted small mt-1">
                    {t.taxRateBp > 0 && <>НДС {t.taxRateBp / 100} %</>}
                    {t.taxRateBp > 0 && t.discountBp > 0 && " · "}
                    {t.discountBp > 0 && <>скидка {t.discountBp / 100} %</>}
                    {t.taxRateBp === 0 && t.discountBp === 0 && "без ставок"}
                    {" · "}
                    {formatDateTime(t.updatedAt)}
                  </div>
                  {t.note !== "" && (
                    <div
                      className="text-muted small text-truncate"
                      style={{ maxWidth: "60ch" }}
                    >
                      {t.note}
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-semibold"
                    onClick={() => {
                      setOpenId(t.id)
                    }}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    title="Удалить"
                    aria-label="Удалить"
                    onClick={() => {
                      setDeleteTarget(t)
                    }}
                  >
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Удаление шаблона"
          message={
            <>
              Удалить шаблон{" "}
              <strong>{deleteTarget.title || "Без названия"}</strong>? Сметы,
              созданные из него, не изменятся — позиции в них — снимки.
            </>
          }
          error={deleteError}
          isPending={deleteTemplate.isPending}
          onConfirm={() => {
            deleteTemplate.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null)
              },
            })
          }}
          onClose={() => {
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
