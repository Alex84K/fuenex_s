import { createSelector, createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import { uuidv7 } from "../../utils/uuid"
import type { PointCm } from "./geometry/polygonArea"
import { parseContour, type ContourDraft } from "./contour/contourCodec"
import {
  grossAreaM2,
  netAreaM2,
  openingsDeductedM2,
  summarizeByType,
} from "./utils/areas"
import { DEFAULT_GRID_STEP_CM } from "./constants"
import type {
  MeasurementSet,
  Opening,
  OpeningKind,
  ScanSource,
  Surface,
} from "./types"

// The editor draft (DESIGN §5.1). The unit of the draft is the SET, not a
// surface: PUT writes the whole subtree in one transaction (D3), so the
// client's edit unit must match the write unit. position is NOT stored on
// surfaces or openings — the array order IS the order; position lands in the
// PUT body as the index at build time (buildSetBody.ts).
export type OpeningDraft = {
  id: string
  kind: OpeningKind
  widthM: number
  heightM: number
  deduct: boolean
}

export type SurfaceDraft = {
  id: string
  type: string // free string (D12) — never normalized
  name: string
  contourCm: ContourDraft | null // null = "not measured yet" (F-5); INSIDE — centimetres (D8)
  heightM: number | null
  areaM2: number // GROSS; derived when a contour exists (D9)
  openings: OpeningDraft[]
}

export type SetDraft = {
  id: string // UUIDv7, minted at creation before the first PUT
  projectId: string
  name: string
  note: string
  position: number // comes from the server; not recomputed by the editor (§8.2)
  scanSource: ScanSource // "MANUAL" for own new sets; a foreign one is never rewritten (D13)
  surfaces: SurfaceDraft[]
}

// The contour editor works on a WORKING COPY, not in the draft directly
// (DESIGN §5.2): "Отмена" needs a snapshot, and the copy is it. Commit
// ("Готово") writes the surface in one operation — contourCm AND areaM2 —
// so the two can never diverge.
export type ContourEditorState = {
  surfaceId: string
  mode: "draw" | "edit"
  points: PointCm[]
  edgeSources: ContourDraft["edgeSources"]
  gridStepCm: number
  selectedVertex: number | null
  error: string | null // "самопересечение" and the like
  isDirty: boolean
}

export type MeasurementEditorState = {
  draft: SetDraft | null
  baseUpdatedAt: string | null // updatedAt of the last server version — for the D11 guard
  isDirty: boolean // anything touched → «Сохранить» active
  treeDirty: boolean // subtree touched → PUT; otherwise PATCH scalars (§6.3)
  contour: ContourEditorState | null // the open contour editor of one surface
}

const initialState: MeasurementEditorState = {
  draft: null,
  baseUpdatedAt: null,
  isDirty: false,
  treeDirty: false,
  contour: null,
}

const toOpeningDraft = (o: Opening): OpeningDraft => ({
  id: o.id,
  kind: o.kind,
  widthM: o.widthM,
  heightM: o.heightM,
  deduct: o.deduct,
})

const toSurfaceDraft = (s: Surface): SurfaceDraft => ({
  id: s.id,
  type: s.type,
  name: s.name,
  contourCm: parseContour(s.contour),
  heightM: s.heightM,
  areaM2: s.areaM2,
  openings: s.openings.map(toOpeningDraft),
})

const toSetDraft = (set: MeasurementSet): SetDraft => ({
  id: set.id,
  projectId: set.projectId,
  name: set.name,
  note: set.note,
  position: set.position,
  scanSource: set.scanSource,
  surfaces: set.surfaces.map(toSurfaceDraft),
})

// A blank surface for «Добавить поверхность» (DESIGN §10.2): a wall with
// no contour, no height, zero area — filled in place.
export const makeEmptySurfaceDraft = (): SurfaceDraft => ({
  id: uuidv7(),
  type: "WALL",
  name: "",
  contourCm: null,
  heightM: null,
  areaM2: 0,
  openings: [],
})

const findSurface = (draft: SetDraft, id: string): SurfaceDraft | undefined =>
  draft.surfaces.find(s => s.id === id)

const measurementEditorSlice = createSlice({
  name: "measurementEditor",
  initialState,
  reducers: {
    // Seed the editor from a server set (tree GET, PUT/PATCH responses).
    // Builds a fresh draft — the cache object is never shared. contour is
    // parsed through the tolerant codec: a broken contour becomes null
    // ("not measured") and the surface still opens (§7.4).
    setInitialDraft(state, action: PayloadAction<MeasurementSet>) {
      state.draft = toSetDraft(action.payload)
      state.baseUpdatedAt = action.payload.updatedAt
      state.isDirty = false
      state.treeDirty = false
      state.contour = null
    },
    // Empty draft for create mode. The UUIDv7 id is minted in prepare —
    // reducers stay pure. scanSource is MANUAL: the web creates by hand
    // (D13).
    startNewDraft: {
      reducer(
        state,
        action: PayloadAction<{
          id: string
          projectId: string
          name: string
        }>,
      ) {
        state.draft = {
          id: action.payload.id,
          projectId: action.payload.projectId,
          name: action.payload.name,
          note: "",
          position: 0,
          scanSource: "MANUAL",
          surfaces: [],
        }
        state.baseUpdatedAt = null
        state.isDirty = false
        state.treeDirty = false
        state.contour = null
      },
      prepare(args: { projectId: string; name: string }) {
        return { payload: { ...args, id: uuidv7() } }
      },
    },
    // Scalar fields — raises isDirty only; the PUT/PATCH fork reads
    // treeDirty, so scalars alone never force a full PUT.
    updateSetScalar(
      state,
      action: PayloadAction<{
        field: "name" | "note" | "position" | "scanSource"
        value: string | number
      }>,
    ) {
      if (!state.draft) return
      Object.assign(state.draft, {
        [action.payload.field]: action.payload.value,
      })
      state.isDirty = true
    },
    // "Save as new" after a 404: same content, fresh UUIDv7 address.
    regenerateDraftId: {
      reducer(state, action: PayloadAction<{ id: string }>) {
        if (state.draft) state.draft.id = action.payload.id
      },
      prepare() {
        return { payload: { id: uuidv7() } }
      },
    },
    addSurface(state, action: PayloadAction<SurfaceDraft>) {
      if (!state.draft) return
      state.draft.surfaces.push(action.payload)
      state.isDirty = true
      state.treeDirty = true
    },
    updateSurface(
      state,
      action: PayloadAction<{ id: string; patch: Partial<SurfaceDraft> }>,
    ) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload.id)
      if (!surface) return
      Object.assign(surface, action.payload.patch)
      state.isDirty = true
      state.treeDirty = true
    },
    removeSurface(state, action: PayloadAction<string>) {
      if (!state.draft) return
      state.draft.surfaces = state.draft.surfaces.filter(
        s => s.id !== action.payload,
      )
      state.isDirty = true
      state.treeDirty = true
    },
    moveSurface(state, action: PayloadAction<{ from: number; to: number }>) {
      if (!state.draft) return
      const { from, to } = action.payload
      const list = state.draft.surfaces
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= list.length ||
        to >= list.length
      )
        return
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      state.isDirty = true
      state.treeDirty = true
    },
    addOpening(
      state,
      action: PayloadAction<{ surfaceId: string; opening: OpeningDraft }>,
    ) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload.surfaceId)
      if (!surface) return
      surface.openings.push(action.payload.opening)
      state.isDirty = true
      state.treeDirty = true
    },
    updateOpening(
      state,
      action: PayloadAction<{
        surfaceId: string
        id: string
        patch: Partial<OpeningDraft>
      }>,
    ) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload.surfaceId)
      const opening = surface?.openings.find(o => o.id === action.payload.id)
      if (!surface || !opening) return
      Object.assign(opening, action.payload.patch)
      state.isDirty = true
      state.treeDirty = true
    },
    removeOpening(
      state,
      action: PayloadAction<{ surfaceId: string; id: string }>,
    ) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload.surfaceId)
      if (!surface) return
      surface.openings = surface.openings.filter(
        o => o.id !== action.payload.id,
      )
      state.isDirty = true
      state.treeDirty = true
    },
    moveOpening(
      state,
      action: PayloadAction<{ surfaceId: string; from: number; to: number }>,
    ) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload.surfaceId)
      if (!surface) return
      const { from, to } = action.payload
      const list = surface.openings
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= list.length ||
        to >= list.length
      )
        return
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      state.isDirty = true
      state.treeDirty = true
    },

    // ── Contour editor (the canvas is lazy; the state exists from phase 4) ──

    openContourEditor(state, action: PayloadAction<string>) {
      if (!state.draft) return
      const surface = findSurface(state.draft, action.payload)
      if (!surface) return
      state.contour = {
        surfaceId: action.payload,
        mode: surface.contourCm ? "edit" : "draw",
        points: surface.contourCm ? [...surface.contourCm.points] : [],
        edgeSources: surface.contourCm
          ? [...surface.contourCm.edgeSources]
          : [],
        gridStepCm: DEFAULT_GRID_STEP_CM,
        selectedVertex: null,
        error: null,
        isDirty: false,
      }
    },
    closeContourEditor(state) {
      state.contour = null
    },
    setContourMode(state, action: PayloadAction<"draw" | "edit">) {
      if (!state.contour) return
      state.contour.mode = action.payload
      state.contour.selectedVertex = null
    },
    // The duplicate-vertex guard (L-3, ported with its explanation): one
    // tap on a touch device can arrive twice, and a coincident vertex makes
    // the contour degenerate and breaks the self-intersection check. The
    // guard lives in the reducer so no component can forget it.
    addPoint(state, action: PayloadAction<PointCm>) {
      if (state.contour?.mode !== "draw") return
      const points = state.contour.points
      // The guard must survive an empty array — points[-1] would be
      // undefined — so the emptiness is checked by length, not by the
      // (type-wise always-defined) last element.
      if (points.length > 0) {
        const last = points[points.length - 1]
        if (last.x === action.payload.x && last.y === action.payload.y) {
          return
        }
      }
      points.push(action.payload)
      state.contour.edgeSources.push("manual")
      state.contour.isDirty = true
    },
    movePoint(state, action: PayloadAction<{ index: number; point: PointCm }>) {
      if (!state.contour) return
      const { index, point } = action.payload
      if (index < 0 || index >= state.contour.points.length) return
      state.contour.points[index] = point
      // Moving vertex i marks its two adjacent edges manual (D14); the
      // others keep their origin. The polygon is implicitly closed, so
      // edge (n-1) wraps to vertex 0.
      const n = state.contour.points.length
      state.contour.edgeSources[(index - 1 + n) % n] = "manual"
      state.contour.edgeSources[index] = "manual"
      state.contour.isDirty = true
    },
    removePoint(state, action: PayloadAction<number>) {
      if (!state.contour) return
      const index = action.payload
      if (
        index < 0 ||
        index >= state.contour.points.length ||
        state.contour.points.length <= 3
      )
        return
      state.contour.points.splice(index, 1)
      state.contour.edgeSources.splice(index, 1)
      // Deleting vertex i collapses two edges into one — the merged edge is
      // manual (D14).
      const n = state.contour.points.length
      state.contour.edgeSources[(index - 1 + n) % n] = "manual"
      state.contour.selectedVertex = null
      state.contour.isDirty = true
    },
    selectVertex(state, action: PayloadAction<number | null>) {
      if (!state.contour) return
      state.contour.selectedVertex = action.payload
    },
    setGridStep(state, action: PayloadAction<number>) {
      if (!state.contour) return
      state.contour.gridStepCm = action.payload
    },
    setContourError(state, action: PayloadAction<string | null>) {
      if (!state.contour) return
      state.contour.error = action.payload
    },
    // D20: the rectangle replaces the whole contour at once.
    replaceContour(
      state,
      action: PayloadAction<{
        points: PointCm[]
        edgeSources: ContourDraft["edgeSources"]
      }>,
    ) {
      if (!state.contour) return
      state.contour.points = [...action.payload.points]
      state.contour.edgeSources = [...action.payload.edgeSources]
      state.contour.selectedVertex = null
      state.contour.error = null
      state.contour.isDirty = true
    },
    // «Готово»: the working copy becomes the surface's contour — and the
    // area is recomputed from the points IN THE SAME operation, so the two
    // can never diverge (D9, §5.2). This is the only action that writes
    // contourCm on a surface.
    commitContour(state) {
      if (!state.contour || !state.draft) return
      const surface = findSurface(state.draft, state.contour.surfaceId)
      if (!surface) return
      const points = state.contour.points
      if (points.length >= 3) {
        surface.contourCm = {
          points: [...points],
          edgeSources: [...state.contour.edgeSources],
          schemaVersion: surface.contourCm?.schemaVersion ?? 1,
        }
        surface.areaM2 = grossAreaM2(points)
      }
      state.contour = null
      state.isDirty = true
      state.treeDirty = true
    },
    resetEditor() {
      return initialState
    },
  },
})

export const {
  setInitialDraft,
  startNewDraft,
  updateSetScalar,
  regenerateDraftId,
  addSurface,
  updateSurface,
  removeSurface,
  moveSurface,
  addOpening,
  updateOpening,
  removeOpening,
  moveOpening,
  openContourEditor,
  closeContourEditor,
  setContourMode,
  addPoint,
  movePoint,
  removePoint,
  selectVertex,
  setGridStep,
  setContourError,
  replaceContour,
  commitContour,
  resetEditor,
} = measurementEditorSlice.actions

type EditorStateRoot = { measurementEditor: MeasurementEditorState }

export const selectDraft = (state: EditorStateRoot) =>
  state.measurementEditor.draft
export const selectIsDirty = (state: EditorStateRoot) =>
  state.measurementEditor.isDirty
export const selectTreeDirty = (state: EditorStateRoot) =>
  state.measurementEditor.treeDirty
export const selectBaseUpdatedAt = (state: EditorStateRoot) =>
  state.measurementEditor.baseUpdatedAt
export const selectContourEditor = (state: EditorStateRoot) =>
  state.measurementEditor.contour

// The set summary by surface type (DESIGN §8.3) — memoized on the draft.
export const selectSetSummary = createSelector([selectDraft], draft =>
  draft ? summarizeByType(draft.surfaces) : [],
)

// Per-surface areas: gross, deduction and net (DESIGN §8.2). A factory so
// each surface gets its own memoized selector.
export const selectSurfaceAreas = (surfaceId: string) =>
  createSelector([selectDraft], draft => {
    const surface = draft?.surfaces.find(s => s.id === surfaceId)
    if (!surface) return null
    const deducted = openingsDeductedM2(surface.openings)
    return {
      grossM2: surface.areaM2,
      deductedM2: deducted,
      netM2: netAreaM2(surface.areaM2, deducted),
    }
  })

export default measurementEditorSlice
