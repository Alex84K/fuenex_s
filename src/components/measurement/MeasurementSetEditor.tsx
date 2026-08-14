import type { FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppDispatch, useAppSelector, useAppStore } from "../../app/hooks"
import { ApiError } from "../../utils/api"
import { measurementApi } from "../../features/measurement/measurement.api"
import {
  measurementTreeKey,
  useGetMeasurementTree,
  usePatchMeasurementSet,
  usePutMeasurementSet,
} from "../../features/measurement/measurement.hooks"
import {
  addSurface,
  regenerateDraftId,
  resetEditor,
  selectBaseUpdatedAt,
  selectDraft,
  selectIsDirty,
  selectTreeDirty,
  setInitialDraft,
  updateSetScalar,
  updateSurface,
} from "../../features/measurement/measurementEditorSlice"
import { buildSetBody } from "../../features/measurement/utils/buildSetBody"
import { SCAN_SOURCE_LABELS } from "../../features/measurement/constants"
import { MEASUREMENT_LIMITS } from "../../features/measurement/types"
import type { MeasurementSet } from "../../features/measurement/types"
import { uuidv7 } from "../../utils/uuid"
import type { Project } from "../../features/projects/types"
import { SurfaceList } from "./SurfaceList"
import { SurfaceFormModal } from "../modals/SurfaceFormModal"
import { SaveConflictModal } from "../modals/SaveConflictModal"
import { ConfirmDiscardDraftModal } from "../modals/ConfirmDiscardDraftModal"

type Props = {
  project: Project
  setId: string
  onExit: () => void
  onOpenContour: (surfaceId: string) => void
}

// Редактор комплекта (DESIGN §10.2): шапка (имя, заметка, scanSource как
// статичный бейдж — происхождение не переписывается, D13), список
// поверхностей с инлайн-правкой, кнопка «Контур» ведёт в редактор контура.
// Запись — развилка PUT/PATCH по treeDirty (§6.3): касание поддерева → PUT
// целиком (buildSetBody), только скаляры → PATCH.
export const MeasurementSetEditor: FC<Props> = ({
  project,
  setId,
  onExit,
  onOpenContour,
}) => {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const draft = useAppSelector(selectDraft)
  const isDirty = useAppSelector(selectIsDirty)
  const treeDirty = useAppSelector(selectTreeDirty)
  const baseUpdatedAt = useAppSelector(selectBaseUpdatedAt)

  const { data: tree } = useGetMeasurementTree(project.id)
  const set = tree?.measurementSets.find(s => s.id === setId)

  const putSet = usePutMeasurementSet()
  const patchSet = usePatchMeasurementSet()
  const isPending = putSet.isPending || patchSet.isPending

  const queryClient = useQueryClient()

  type SaveError = { message: string; canSaveAsNew: boolean }
  const [saveError, setSaveError] = useState<SaveError | null>(null)
  const [conflict, setConflict] = useState<MeasurementSet | null>(null)
  const overwriteRef = useRef(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [addSurfaceOpen, setAddSurfaceOpen] = useState(false)

  // Seed the draft from the tree cache once per set id. The save flow
  // re-seeds via setInitialDraft(response) — same id, no re-seed loop.
  useEffect(() => {
    if (!set) return
    if (draft?.id !== set.id) dispatch(setInitialDraft(set))
  }, [set, draft?.id, dispatch])

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

  // Leaving resets the editor (the draft lives only in memory).
  useEffect(
    () => () => {
      dispatch(resetEditor())
    },
    [dispatch],
  )

  // Guard for the editor staying open on a set deleted elsewhere: the tree
  // no longer has it. A live draft (the save-as-new case — same content
  // under a fresh id, DESIGN §11.1) keeps the editor open.
  if (!set && !draft) {
    return (
      <div>
        <div className="alert alert-warning" role="alert">
          Комплект не найден в дереве проекта.
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onExit}
        >
          К списку
        </button>
      </div>
    )
  }

  if (!draft) return null

  const handleSaveError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 404) {
      // DESIGN §11.1: 404 on PUT — the set or its project was deleted in
      // another window. The draft is NOT lost: same content, fresh UUIDv7
      // address (regenerateDraftId).
      setSaveError({
        message:
          "Комплект или проект удалены в другом окне. Черновик не потерян — можно сохранить его как новый комплект.",
        canSaveAsNew: true,
      })
    } else if (err instanceof ApiError && err.status === 413) {
      setSaveError({
        message:
          "Замер слишком большой — упростите контуры (меньше вершин) или разбейте комплект.",
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

  const handleSave = async () => {
    if (isPending) return
    setSaveError(null)
    try {
      // D11 guard (DESIGN §11.3): a control GET before the write; a
      // different updatedAt means someone else edited the set. The PUT
      // replaces THREE levels (set → surfaces → openings), so "overwrite"
      // deletes foreign surfaces — the modal names that price. A
      // never-saved draft (baseUpdatedAt null) cannot be edited by anyone
      // else — its id does not exist on the server, and the control GET
      // would 404 — so there is nothing to guard.
      if (!overwriteRef.current) {
        const state = store.getState()
        const d = state.measurementEditor.draft
        if (!d) return
        const base = state.measurementEditor.baseUpdatedAt
        if (base != null) {
          const fresh = await measurementApi.getSet(d.id)
          if (fresh.updatedAt !== base) {
            setConflict(fresh)
            return
          }
        }
      }
      // The save reads the fresh state from the store, not the closure: an
      // input may still hold an uncommitted buffer, and blurring commits
      // first (the estimate editor's trick).
      const state = store.getState()
      const d = state.measurementEditor.draft
      if (!d) return
      const dirtyTree = state.measurementEditor.treeDirty
      const saved = dirtyTree
        ? await putSet.mutateAsync({ id: d.id, data: buildSetBody(d) })
        : await patchSet.mutateAsync({
            id: d.id,
            patch: {
              name: d.name,
              note: d.note,
              position: d.position,
              scanSource: d.scanSource,
            },
          })
      dispatch(setInitialDraft(saved))
    } catch (err) {
      handleSaveError(err)
    } finally {
      overwriteRef.current = false
    }
  }

  // 404 on PUT: same content under a fresh UUIDv7 address (DESIGN §11.1).
  // No D11 guard here — the fresh id cannot exist yet, the control GET
  // would 404.
  const handleSaveAsNew = async () => {
    if (isPending) return
    setSaveError(null)
    try {
      dispatch(regenerateDraftId())
      const state = store.getState()
      const d = state.measurementEditor.draft
      if (!d) return
      const saved = await putSet.mutateAsync({
        id: d.id,
        data: buildSetBody(d),
      })
      dispatch(setInitialDraft(saved))
    } catch (err) {
      handleSaveError(err)
    }
  }

  const requestExit = () => {
    if (isDirty) {
      setDiscardOpen(true)
    } else {
      onExit()
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={requestExit}
        >
          <i className="bi bi-arrow-left me-1" />К списку
        </button>
        {isDirty && <span className="badge text-bg-warning">Не сохранено</span>}
      </div>

      {/* Шапка комплекта (§10.2). scanSource — бейдж, не select: происхождение
          комплекта не меняется от правки (D13). */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-12 col-md-5">
              <label htmlFor="set-name" className="form-label fw-semibold">
                Название
              </label>
              <input
                id="set-name"
                type="text"
                className="form-control"
                value={draft.name}
                maxLength={MEASUREMENT_LIMITS.setName}
                onChange={e => {
                  dispatch(
                    updateSetScalar({ field: "name", value: e.target.value }),
                  )
                }}
              />
            </div>
            <div className="col-12 col-md-5">
              <label htmlFor="set-note" className="form-label fw-semibold">
                Заметка
              </label>
              <textarea
                id="set-note"
                className="form-control"
                rows={1}
                value={draft.note}
                maxLength={MEASUREMENT_LIMITS.setNote}
                onChange={e => {
                  dispatch(
                    updateSetScalar({ field: "note", value: e.target.value }),
                  )
                }}
              />
            </div>
            <div className="col-6 col-md-2">
              <span className="form-label d-block fw-semibold">Источник</span>
              <span className="badge bg-secondary">
                {SCAN_SOURCE_LABELS[draft.scanSource]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SurfaceList
        draft={draft}
        onUpdate={(id, patch) => {
          dispatch(updateSurface({ id, patch }))
        }}
        onContour={surfaceId => {
          onOpenContour(surfaceId)
        }}
        onAdd={() => {
          setAddSurfaceOpen(true)
        }}
      />

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3 sticky-bottom bg-white py-2 border-top">
        <button
          type="button"
          className="btn btn-primary fw-bold"
          onClick={() => {
            void handleSave()
          }}
          disabled={!isDirty || isPending}
        >
          {isPending ? "Сохранение..." : "Сохранить"}
        </button>
        {saveError && (
          <span className="text-danger small" role="alert">
            {saveError.message}
          </span>
        )}
        {saveError?.canSaveAsNew && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold"
            onClick={() => {
              void handleSaveAsNew()
            }}
            disabled={isPending}
          >
            Сохранить как новый
          </button>
        )}
        {treeDirty && (
          <span className="text-muted small">
            Сохранится весь комплект (тронуты поверхности).
          </span>
        )}
        <span className="text-muted small ms-auto">
          Обновлено:{" "}
          {baseUpdatedAt
            ? new Date(baseUpdatedAt).toLocaleString("ru-RU")
            : "—"}
        </span>
      </div>

      {addSurfaceOpen && (
        <SurfaceFormModal
          isPending={false}
          onSubmit={values => {
            dispatch(
              addSurface({
                id: uuidv7(),
                type: values.type,
                name: values.name,
                contourCm: null,
                heightM: values.heightM,
                areaM2: values.areaM2,
                openings: [],
              }),
            )
            setAddSurfaceOpen(false)
          }}
          onClose={() => {
            setAddSurfaceOpen(false)
          }}
        />
      )}

      {discardOpen && (
        <ConfirmDiscardDraftModal
          onConfirm={() => {
            setDiscardOpen(false)
            onExit()
          }}
          onClose={() => {
            setDiscardOpen(false)
          }}
        />
      )}

      {conflict && (
        <SaveConflictModal
          title="Комплект замеров изменился в другом окне"
          updatedAt={conflict.updatedAt}
          overwriteNote="Перезапись заменит весь комплект целиком — его поверхности и проёмы. Поверхности, добавленные в другом окне, будут удалены."
          onClose={() => {
            setConflict(null)
          }}
          onRead={() => {
            setConflict(null)
            // Replace the draft with the fresh server version and refresh
            // the tree so the list and re-entry show the foreign edits.
            dispatch(setInitialDraft(conflict))
            void queryClient.invalidateQueries({
              queryKey: measurementTreeKey(project.id),
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
