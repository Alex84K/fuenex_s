import type { FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppDispatch, useAppSelector, useAppStore } from "../../app/hooks"
import { ApiError } from "../../utils/api"
import {
  DEFAULT_CURRENCY,
  LAST_CURRENCY_STORAGE_KEY,
} from "../../features/estimates/constants"
import {
  addItems,
  makeEmptyDraftItem,
  moveItem,
  regenerateDraftId,
  removeItem,
  resetEditor,
  selectBaseUpdatedAt,
  selectDraft,
  selectDraftTotals,
  selectIsDirty,
  selectShowPurchase,
  setInitialDraft,
  startNewDraft,
  toggleShowPurchase,
  updateItem,
  updateScalar,
} from "../../features/estimates/estimateEditorSlice"
import { estimatesApi } from "../../features/estimates/estimates.api"
import {
  ESTIMATES_QUERY_KEY,
  useGetEstimate,
  usePatchEstimate,
  usePutEstimate,
} from "../../features/estimates/estimates.hooks"
import { buildEstimateBody } from "../../features/estimates/utils/buildEstimateBody"
import { fromTemplateItems } from "../../features/estimates/utils/fromCatalog"
import type {
  Estimate,
  EstimatePatch,
  EstimateTemplate,
} from "../../features/estimates/types"
import type { Project } from "../../features/projects/types"
import { EstimateHeader } from "./EstimateHeader"
import { EstimateItemsTable } from "./EstimateItemsTable"
import { EstimateTotalsSummary } from "./EstimateTotalsSummary"
import { ApplyTemplateModal } from "../modals/ApplyTemplateModal"
import { EditEstimateItemModal } from "../modals/EditEstimateItemModal"
import { SaveAsTemplateModal } from "../modals/SaveAsTemplateModal"
import { SaveConflictModal } from "../modals/SaveConflictModal"
import { SelectCatalogItemsModal } from "../modals/SelectCatalogItemsModal"

type SaveError = { message: string; canSaveAsNew: boolean }

type Props = {
  project: Project
  mode: "create" | "edit"
  estimateId: string | null
  onCreated: (estimate: Estimate) => void
  onExit: () => void
  onGoToCatalog: () => void
}

const readLastCurrency = (): string => {
  const stored = localStorage.getItem(LAST_CURRENCY_STORAGE_KEY)
  return stored ?? DEFAULT_CURRENCY
}

export const EstimateEditorView: FC<Props> = ({
  project,
  mode,
  estimateId,
  onCreated,
  onExit,
  onGoToCatalog,
}) => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const queryClient = useQueryClient()
  const draft = useAppSelector(selectDraft)
  const isDirty = useAppSelector(selectIsDirty)
  const showPurchase = useAppSelector(selectShowPurchase)
  const baseUpdatedAt = useAppSelector(selectBaseUpdatedAt)
  const totals = useAppSelector(selectDraftTotals)

  const putEstimate = usePutEstimate()
  const patchEstimate = usePatchEstimate()
  const isPending = putEstimate.isPending || patchEstimate.isPending

  const [saveError, setSaveError] = useState<SaveError | null>(null)
  const [conflict, setConflict] = useState<Estimate | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const overwriteRef = useRef(false)

  const id = mode === "edit" ? estimateId : null
  const { data: estimate, isLoading, isError, error } = useGetEstimate(id)

  // create mode: an empty draft is minted once; leaving resets the editor.
  useEffect(() => {
    if (mode !== "create") return
    dispatch(
      startNewDraft({ projectId: project.id, currency: readLastCurrency() }),
    )
    return () => {
      dispatch(resetEditor())
    }
  }, [mode, project.id, dispatch])

  // edit mode: seed from the server version; leaving resets the editor.
  useEffect(() => {
    if (mode !== "edit" || !estimate) return
    dispatch(setInitialDraft(estimate))
    return () => {
      dispatch(resetEditor())
    }
  }, [mode, estimate, dispatch])

  // beforeunload — the only native dialog left (DESIGN §11.2).
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => {
      window.removeEventListener("beforeunload", handler)
    }
  }, [isDirty])

  if (mode === "edit" && isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (mode === "edit" && (isError || !estimate)) {
    const message =
      error instanceof ApiError && error.status === 404
        ? "Смета не найдена — возможно, она удалена."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить смету."
    return (
      <div>
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onExit}
        >
          К списку смет
        </button>
      </div>
    )
  }

  if (!draft) return null

  const handleSaveError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 404 && mode === "edit") {
      setSaveError({
        message:
          "Смета или проект удалены в другом окне. Черновик не потерян — можно сохранить его как новую смету.",
        canSaveAsNew: true,
      })
    } else if (err instanceof ApiError && err.status === 413) {
      setSaveError({
        message: "Смета слишком большая — сократите описания позиций.",
        canSaveAsNew: false,
      })
    } else if (err instanceof ApiError) {
      setSaveError({
        message: `Не удалось сохранить: ${err.message}`,
        canSaveAsNew: false,
      })
    } else {
      setSaveError({
        message: "Не удалось сохранить. Черновик остался в редакторе.",
        canSaveAsNew: false,
      })
    }
  }

  // The save button works while an input still holds an uncommitted buffer:
  // blurring the input commits first, so the fresh state is read from the
  // store here, not from the closure.
  const persist = async (isCreate: boolean) => {
    const state = store.getState()
    const d = state.estimateEditor.draft
    if (!d) return
    const dirtyItems = state.estimateEditor.itemsDirty
    if (isCreate || dirtyItems) {
      const saved = await putEstimate.mutateAsync({
        id: d.id,
        data: buildEstimateBody(d),
      })
      dispatch(setInitialDraft(saved))
      localStorage.setItem(LAST_CURRENCY_STORAGE_KEY, saved.currency)
      if (isCreate) onCreated(saved)
    } else {
      const patch: EstimatePatch = {
        title: d.title,
        currency: d.currency,
        taxRateBp: d.taxRateBp,
        discountBp: d.discountBp,
        note: d.note,
      }
      const saved = await patchEstimate.mutateAsync({ id: d.id, patch })
      dispatch(setInitialDraft(saved))
    }
  }

  const handleSave = async () => {
    if (isPending) return
    setSaveError(null)
    try {
      // D11 guard (edit mode only): a control GET before the write; a
      // different updatedAt means someone else edited it.
      if (mode === "edit" && !overwriteRef.current) {
        const state = store.getState()
        const d = state.estimateEditor.draft
        if (!d) return
        const base = state.estimateEditor.baseUpdatedAt
        const fresh = await estimatesApi.getById(d.id)
        if (base && fresh.updatedAt !== base) {
          setConflict(fresh)
          return
        }
      }
      await persist(mode === "create")
    } catch (err) {
      handleSaveError(err)
    } finally {
      overwriteRef.current = false
    }
  }

  // 404 on PUT in edit mode: same content under a fresh UUIDv7 address.
  const handleSaveAsNew = async () => {
    if (isPending) return
    setSaveError(null)
    try {
      dispatch(regenerateDraftId())
      const state = store.getState()
      const d = state.estimateEditor.draft
      if (!d) return
      const saved = await putEstimate.mutateAsync({
        id: d.id,
        data: buildEstimateBody(d),
      })
      dispatch(setInitialDraft(saved))
      localStorage.setItem(LAST_CURRENCY_STORAGE_KEY, saved.currency)
      onCreated(saved)
    } catch (err) {
      handleSaveError(err)
    }
  }

  const applyTemplate = (t: EstimateTemplate, copyRates: boolean) => {
    dispatch(addItems(fromTemplateItems(t.items)))
    if (copyRates) {
      dispatch(updateScalar({ field: "taxRateBp", value: t.taxRateBp }))
      dispatch(updateScalar({ field: "discountBp", value: t.discountBp }))
    }
  }

  const editItem = editItemId
    ? (draft.items.find(it => it.id === editItemId) ?? null)
    : null

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onExit}
        >
          <i className="bi bi-arrow-left me-1" />
          {mode === "create" ? "Отмена" : "К списку смет"}
        </button>
        {isDirty && <span className="badge text-bg-warning">Не сохранено</span>}
      </div>

      <EstimateHeader />

      <EstimateItemsTable
        items={draft.items}
        currency={draft.currency}
        showPurchase={showPurchase}
        resetToken={baseUpdatedAt}
        onAddEmpty={() => dispatch(addItems([makeEmptyDraftItem()]))}
        onOpenCatalog={() => {
          setCatalogOpen(true)
        }}
        onCommit={(itemId, patch) =>
          dispatch(updateItem({ id: itemId, patch }))
        }
        onRemove={itemId => dispatch(removeItem(itemId))}
        onMove={(from, to) => dispatch(moveItem({ from, to }))}
        onEditFields={itemId => {
          setEditItemId(itemId)
        }}
        onToggleShowPurchase={() => dispatch(toggleShowPurchase())}
      />

      <div className="mt-3">
        <EstimateTotalsSummary
          totals={totals}
          currency={draft.currency}
          taxRateBp={draft.taxRateBp}
          discountBp={draft.discountBp}
          showPurchase={showPurchase}
          isDirty={isDirty}
          isPending={isPending}
          saveError={saveError}
          onSave={() => {
            void handleSave()
          }}
          onSaveAsNew={() => {
            void handleSaveAsNew()
          }}
          onSaveAsTemplate={() => {
            setSaveAsTemplateOpen(true)
          }}
          onApplyTemplate={() => {
            setApplyTemplateOpen(true)
          }}
        />
      </div>

      {catalogOpen && (
        <SelectCatalogItemsModal
          onAdd={items => dispatch(addItems(items))}
          onClose={() => {
            setCatalogOpen(false)
          }}
          onCreateCatalogItem={() => {
            setCatalogOpen(false)
            onGoToCatalog()
          }}
        />
      )}

      {applyTemplateOpen && (
        <ApplyTemplateModal
          defaultCopyRates={draft.taxRateBp === 0 && draft.discountBp === 0}
          onApply={(t, copyRates) => {
            applyTemplate(t, copyRates)
            setApplyTemplateOpen(false)
          }}
          onClose={() => {
            setApplyTemplateOpen(false)
          }}
        />
      )}

      {saveAsTemplateOpen && (
        <SaveAsTemplateModal
          draft={draft}
          onClose={() => {
            setSaveAsTemplateOpen(false)
          }}
        />
      )}

      {editItem && (
        <EditEstimateItemModal
          item={editItem}
          onSave={patch => {
            dispatch(updateItem({ id: editItem.id, patch }))
            setEditItemId(null)
          }}
          onClose={() => {
            setEditItemId(null)
          }}
        />
      )}

      {conflict && (
        <SaveConflictModal
          estimate={conflict}
          onClose={() => {
            setConflict(null)
          }}
          onRead={() => {
            setConflict(null)
            void queryClient.invalidateQueries({
              queryKey: [...ESTIMATES_QUERY_KEY, "detail", conflict.id],
            })
          }}
          onOverwrite={() => {
            setConflict(null)
            overwriteRef.current = true
            void handleSave()
          }}
        />
      )}
    </div>
  )
}
