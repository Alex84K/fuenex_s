import type { FC } from "react"
import { useEffect, useState } from "react"
import { ApiError } from "../../utils/api"
import { uuidv7 } from "../../utils/uuid"
import {
  useDeleteTaskTemplate,
  useGetTaskTemplate,
  useGetTaskTemplates,
  usePatchTaskTemplate,
  usePutTaskTemplate,
} from "../../features/planner/templates.hooks"
import { TASK_LIMITS } from "../../features/planner/types"
import type {
  TaskTemplate,
  TaskTemplateInput,
  TaskTemplateItem,
  TaskTemplatePatch,
  TaskTemplateSummary,
} from "../../features/planner/types"
import { formatDateTime } from "../../features/projects/format"
import { TaskTemplateItemsEditor } from "./TaskTemplateItemsEditor"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"
import { EditTaskTemplateItemModal } from "../modals/EditTaskTemplateItemModal"
import { SelectTaskCatalogItemsModal } from "../modals/SelectTaskCatalogItemsModal"
import { taskFromCatalogItem } from "../../features/planner/utils/fromTaskCatalog"
import type { TaskCatalogItem } from "../../features/planner/types"

type TemplateDraft = {
  id: string
  title: string
  note: string
  items: TaskTemplateItem[]
  updatedAt: string | null
  isDirty: boolean
  itemsDirty: boolean
}

type Props = {
  /** "Каталог пуст" in the picker → switch to the catalog sub-tab. */
  onGoToCatalog: () => void
}

const toTemplateItem = (
  c: TaskCatalogItem,
  position: number,
): TaskTemplateItem => {
  const request = taskFromCatalogItem(c, position)
  const { id, title, description } = request
  return { id, title, description, position }
}

const makeEmptyItem = (): TaskTemplateItem => ({
  id: uuidv7(),
  title: "",
  description: "",
  position: 0,
})

const fromTemplate = (t: TaskTemplate): TemplateDraft => ({
  id: t.id,
  title: t.title,
  note: t.note,
  items: t.items.map(it => ({ ...it })),
  updatedAt: t.updatedAt,
  isDirty: false,
  itemsDirty: false,
})

// Templates: a reusable task set at the owner, without any state — a
// template line is a formulation of work (D10, DESIGN_PLANNER.md §5.1).
// The editor keeps a local draft; saving PUTs the whole tree (one
// transaction) when items changed, or PATCHes just the scalars otherwise —
// the estimate templates' shape.
export const TaskTemplatesManager: FC<Props> = ({ onGoToCatalog }) => {
  const {
    data: templates = [],
    isLoading,
    isError,
    error,
  } = useGetTaskTemplates()
  const putTemplate = usePutTaskTemplate()
  const patchTemplate = usePatchTaskTemplate()
  const deleteTemplate = useDeleteTaskTemplate()

  const [openId, setOpenId] = useState<string | null>(null)
  const { data: opened } = useGetTaskTemplate(openId)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskTemplateSummary | null>(
    null,
  )
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)

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

  const setScalar = (patch: Partial<Pick<TemplateDraft, "title" | "note">>) => {
    setDraft(d => (d ? { ...d, ...patch, isDirty: true } : d))
  }

  const setItems = (
    updater: (items: TaskTemplateItem[]) => TaskTemplateItem[],
  ) => {
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
        const input: TaskTemplateInput = {
          title: draft.title,
          note: draft.note,
          items: draft.items.map((it, position) => ({ ...it, position })),
        }
        await putTemplate.mutateAsync({ id: draft.id, data: input })
      } else {
        const patch: TaskTemplatePatch = {
          title: draft.title,
          note: draft.note,
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
                  htmlFor="task-template-editor-title"
                >
                  Название шаблона
                </label>
                <input
                  id="task-template-editor-title"
                  type="text"
                  className="form-control"
                  maxLength={TASK_LIMITS.title}
                  value={draft.title}
                  onChange={e => {
                    setScalar({ title: e.target.value })
                  }}
                />
              </div>
              <div className="col-md-6">
                <label
                  className="form-label fw-semibold"
                  htmlFor="task-template-editor-note"
                >
                  Заметка
                </label>
                <input
                  id="task-template-editor-note"
                  type="text"
                  className="form-control"
                  maxLength={TASK_LIMITS.templateNote}
                  value={draft.note}
                  onChange={e => {
                    setScalar({ note: e.target.value })
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <TaskTemplateItemsEditor
          items={draft.items}
          onAddEmpty={() => {
            setItems(items => [...items, makeEmptyItem()])
          }}
          onOpenCatalog={() => {
            setCatalogOpen(true)
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
          <EditTaskTemplateItemModal
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
          <SelectTaskCatalogItemsModal
            onAdd={rows => {
              setItems(items => [
                ...items,
                ...rows.map((c, i) => toTemplateItem(c, items.length + i)),
              ])
              setCatalogOpen(false)
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
        <h5 className="fw-bold mb-0">Шаблоны списков задач</h5>
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
            Шаблонов пока нет. Сохраните готовый список задач как шаблон —
            кнопка внизу списка задач.
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
                    <i className="bi bi-clock me-1" />
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
              <strong>{deleteTarget.title || "Без названия"}</strong>? Задачи,
              собранные из него, не изменятся — они снимки.
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
