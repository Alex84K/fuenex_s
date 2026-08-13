import type { FC } from "react"
import { useState } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import {
  resetEditor,
  selectIsDirty,
} from "../../features/estimates/estimateEditorSlice"
import { useGetCatalog } from "../../features/estimates/catalog.hooks"
import type { Estimate } from "../../features/estimates/types"
import type { Project } from "../../features/projects/types"
import { CatalogManager } from "./CatalogManager"
import { EstimateEditorView } from "./EstimateEditorView"
import { EstimateListByProject } from "./EstimateListByProject"
import { TemplatesManager } from "./TemplatesManager"
import { ConfirmDiscardDraftModal } from "../modals/ConfirmDiscardDraftModal"

type SubTab = "estimates" | "catalog" | "templates"
type View = "list" | "create" | "edit"

type Transition =
  | { kind: "subtab"; subTab: SubTab }
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; id: string }

// Root of the feature (DESIGN §3): three sub-tabs (Сметы · Каталог ·
// Шаблоны) plus view-navigation inside «Сметы». Leaving the editor while
// the draft is dirty requires confirmation — otherwise the draft dies
// silently.
export const EstimatesTab: FC<{ project: Project }> = ({ project }) => {
  const dispatch = useAppDispatch()
  const isDirty = useAppSelector(selectIsDirty)
  const [subTab, setSubTab] = useState<SubTab>("estimates")
  const [view, setView] = useState<View>("list")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState<Transition | null>(null)

  // Prefetch the catalog so the picker opens warm (same trick as OffersTab).
  useGetCatalog()

  const apply = (t: Transition) => {
    switch (t.kind) {
      case "subtab":
        setSubTab(t.subTab)
        break
      case "list":
        setView("list")
        setSelectedId(null)
        break
      case "create":
        setView("create")
        setSelectedId(null)
        break
      case "edit":
        setView("edit")
        setSelectedId(t.id)
        break
    }
  }

  const request = (t: Transition) => {
    if (isDirty) {
      setPending(t)
    } else {
      apply(t)
    }
  }

  const confirmDiscard = () => {
    if (!pending) return
    dispatch(resetEditor())
    apply(pending)
    setPending(null)
  }

  const onCreated = (estimate: Estimate) => {
    // First save in create mode: the draft is clean now, switch to edit.
    apply({ kind: "edit", id: estimate.id })
  }

  return (
    <div>
      <ul className="nav nav-pills mb-3">
        <li className="nav-item me-2">
          <button
            type="button"
            className={`btn btn-primary btn-sm`}
            onClick={() => {
              request({ kind: "subtab", subTab: "estimates" })
            }}
          >
            Сметы
          </button>
        </li>
        <li className="nav-item  me-2">
          <button
            type="button"
            className={`btn btn-primary btn-sm`}
            onClick={() => {
              request({ kind: "subtab", subTab: "catalog" })
            }}
          >
            Каталог
          </button>
        </li>
        <li className="nav-item  me-2">
          <button
            type="button"
            className={`btn btn-primary btn-sm`}
            onClick={() => {
              request({ kind: "subtab", subTab: "templates" })
            }}
          >
            Шаблоны
          </button>
        </li>
      </ul>

      {subTab === "catalog" && <CatalogManager />}
      {subTab === "templates" && (
        <TemplatesManager
          onGoToCatalog={() => {
            request({ kind: "subtab", subTab: "catalog" })
          }}
        />
      )}
      {subTab === "estimates" && view === "list" && (
        <EstimateListByProject
          projectId={project.id}
          onCreate={() => {
            request({ kind: "create" })
          }}
          onOpen={id => {
            request({ kind: "edit", id })
          }}
        />
      )}
      {subTab === "estimates" && (view === "create" || view === "edit") && (
        <EstimateEditorView
          project={project}
          mode={view}
          estimateId={selectedId}
          onCreated={onCreated}
          onExit={() => {
            request({ kind: "list" })
          }}
          onGoToCatalog={() => {
            request({ kind: "subtab", subTab: "catalog" })
          }}
        />
      )}

      {pending && (
        <ConfirmDiscardDraftModal
          onConfirm={confirmDiscard}
          onClose={() => {
            setPending(null)
          }}
        />
      )}
    </div>
  )
}
