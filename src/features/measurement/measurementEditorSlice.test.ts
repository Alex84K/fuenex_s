import { describe, expect, it } from "vitest"
import measurementEditorSlice, {
  addOpening,
  addPoint,
  addSurface,
  commitContour,
  makeEmptySurfaceDraft,
  moveOpening,
  movePoint,
  moveSurface,
  openContourEditor,
  removeOpening,
  removePoint,
  removeSurface,
  resetEditor,
  selectContourEditor,
  selectDraft,
  selectIsDirty,
  selectSetSummary,
  selectSurfaceAreas,
  selectTreeDirty,
  setInitialDraft,
  startNewDraft,
  updateOpening,
  updateSetScalar,
  updateSurface,
} from "./measurementEditorSlice"
import type { MeasurementSet, Opening } from "./types"

const root = (state: ReturnType<typeof reducer>) => ({
  measurementEditor: state,
})

const reducer = (
  state: ReturnType<typeof measurementEditorSlice.reducer> | undefined,
  action: Parameters<typeof measurementEditorSlice.reducer>[1],
) => measurementEditorSlice.reducer(state, action)

const set = (): MeasurementSet => ({
  id: "0198f2c1-7a3e-7c11-9f4d-2b8e6a1c0d55",
  projectId: "0198f2c0-1b22-7000-8aaa-5f0c9d3e1122",
  name: "Кухня",
  note: "",
  position: 0,
  scanSource: "LIDAR",
  createdAt: "2026-08-13T10:00:00.000Z",
  updatedAt: "2026-08-13T10:00:00.000Z",
  surfaces: [
    {
      id: "0198f2c1-8000-7abc-9000-000000000001",
      type: "FLOOR",
      name: "Пол",
      position: 0,
      contour: {
        schemaVersion: 1,
        units: "m",
        vertices: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 3 },
          { x: 0, y: 3 },
        ],
        edges: [
          { index: 0, lengthM: 4, source: "lidar" },
          { index: 1, lengthM: 3, source: "lidar" },
          { index: 2, lengthM: 4, source: "lidar" },
          { index: 3, lengthM: 3, source: "lidar" },
        ],
      },
      heightM: null,
      areaM2: 12,
      createdAt: "2026-08-13T10:00:00.000Z",
      updatedAt: "2026-08-13T10:00:00.000Z",
      openings: [
        {
          id: "0198f2c1-9000-7abc-9000-000000000001",
          kind: "DOOR",
          widthM: 0.9,
          heightM: 2.05,
          deduct: true,
          position: 0,
          createdAt: "2026-08-13T10:00:00.000Z",
          updatedAt: "2026-08-13T10:00:00.000Z",
        },
      ],
    },
  ],
})

const opening = (id: string): Opening => ({
  id,
  kind: "WINDOW",
  widthM: 1.5,
  heightM: 1.2,
  deduct: false,
  position: 0,
  createdAt: "2026-08-13T10:00:00.000Z",
  updatedAt: "2026-08-13T10:00:00.000Z",
})

describe("measurementEditorSlice", () => {
  it("setInitialDraft converts the server tree, contour via the codec (m → cm)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    const draft = selectDraft(root(state))
    expect(draft?.name).toBe("Кухня")
    expect(draft?.scanSource).toBe("LIDAR")
    expect(selectIsDirty(root(state))).toBe(false)
    expect(selectTreeDirty(root(state))).toBe(false)
    const floor = draft?.surfaces[0]
    // contour parsed into centimetres: 4 m → 400 cm
    expect(floor?.contourCm?.points[1]).toEqual({ x: 400, y: 0 })
    // edge origins preserved (D14)
    expect(floor?.contourCm?.edgeSources).toEqual([
      "lidar",
      "lidar",
      "lidar",
      "lidar",
    ])
    expect(floor?.openings[0]).toMatchObject({
      kind: "DOOR",
      widthM: 0.9,
      deduct: true,
    })
  })

  it("startNewDraft mints a UUIDv7 id and MANUAL scanSource (D13)", () => {
    const action = startNewDraft({ projectId: "p-1", name: "Двор" })
    expect(action.payload.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, action)
    const draft = selectDraft(root(state))
    expect(draft?.name).toBe("Двор")
    expect(draft?.scanSource).toBe("MANUAL")
    expect(draft?.surfaces).toEqual([])
  })

  it("scalars raise isDirty only, subtree actions raise both flags (§6.3)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(state, updateSetScalar({ field: "name", value: "Кухня 2" }))
    expect(selectIsDirty(root(state))).toBe(true)
    expect(selectTreeDirty(root(state))).toBe(false)

    state = reducer(state, addSurface(makeEmptySurfaceDraft()))
    expect(selectIsDirty(root(state))).toBe(true)
    expect(selectTreeDirty(root(state))).toBe(true)
  })

  it("addPoint discards a duplicate vertex (L-3)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(
      state,
      openContourEditor("0198f2c1-8000-7abc-9000-000000000001"),
    )
    state = reducer(state, {
      type: "measurementEditor/setContourMode",
      payload: "draw",
    })

    const p = { x: 100, y: 100 }
    state = reducer(state, addPoint(p))
    state = reducer(state, addPoint(p)) // the double tap
    const editor = selectContourEditor(root(state))
    expect(editor?.points).toHaveLength(5) // 4 existing + 1 new, not 6
  })

  it("movePoint marks the two adjacent edges manual, keeps the others (D14)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(
      state,
      openContourEditor("0198f2c1-8000-7abc-9000-000000000001"),
    )

    const editor0 = selectContourEditor(root(state))
    expect(editor0?.points).toHaveLength(4)

    // Move vertex 1: edges 0 and 1 become manual; edges 2, 3 stay lidar.
    state = reducer(state, movePoint({ index: 1, point: { x: 450, y: 0 } }))
    const editor = selectContourEditor(root(state))
    expect(editor?.edgeSources).toEqual(["manual", "manual", "lidar", "lidar"])
  })

  it("removePoint collapses two edges into one manual edge", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(
      state,
      openContourEditor("0198f2c1-8000-7abc-9000-000000000001"),
    )

    // The floor has 4 vertices; removing one needs ≥ 4 kept, so add one
    // first (draw mode).
    state = reducer(state, {
      type: "measurementEditor/setContourMode",
      payload: "draw",
    })
    state = reducer(state, addPoint({ x: 200, y: 100 }))
    state = reducer(state, removePoint(2))
    const editor = selectContourEditor(root(state))
    expect(editor?.points).toHaveLength(4)
    expect(editor?.edgeSources[1]).toBe("manual") // the merged edge
  })

  it("commitContour writes contour AND area in one operation (D9)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, startNewDraft({ projectId: "p-1", name: "Забор" }))
    const surface = makeEmptySurfaceDraft()
    state = reducer(state, addSurface(surface))
    state = reducer(state, openContourEditor(surface.id))

    // Rectangle 4 × 3 m by hand: 400 × 300 cm.
    state = reducer(state, {
      type: "measurementEditor/setContourMode",
      payload: "draw",
    })
    for (const p of [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 300 },
      { x: 0, y: 300 },
    ]) {
      state = reducer(state, addPoint(p))
    }
    state = reducer(state, commitContour())

    const draft = selectDraft(root(state))
    const s = draft?.surfaces[0]
    expect(s?.contourCm?.points).toHaveLength(4)
    expect(s?.areaM2).toBe(12) // shoelace, not 4 × 3 as a shortcut
    expect(selectContourEditor(root(state))).toBeNull()
    expect(selectTreeDirty(root(state))).toBe(true)
  })

  it("commitContour with fewer than 3 points keeps the contour null (F-5)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, startNewDraft({ projectId: "p-1", name: "Двор" }))
    const surface = makeEmptySurfaceDraft()
    state = reducer(state, addSurface(surface))
    state = reducer(state, openContourEditor(surface.id))
    state = reducer(state, {
      type: "measurementEditor/setContourMode",
      payload: "draw",
    })
    state = reducer(state, addPoint({ x: 0, y: 0 }))
    state = reducer(state, addPoint({ x: 100, y: 0 }))
    state = reducer(state, commitContour())

    const draft = selectDraft(root(state))
    expect(draft?.surfaces[0].contourCm).toBeNull()
  })

  it("surface and opening CRUD keep the array order as the position", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set())) // surfaces: [floor]
    const s1 = makeEmptySurfaceDraft()
    const s2 = makeEmptySurfaceDraft()
    state = reducer(state, addSurface(s1))
    state = reducer(state, addSurface(s2)) // [floor, s1, s2]
    state = reducer(state, moveSurface({ from: 0, to: 2 })) // floor → end
    let draft = selectDraft(root(state))
    expect(draft?.surfaces.map(s => s.id)).toEqual([
      s1.id,
      s2.id,
      "0198f2c1-8000-7abc-9000-000000000001",
    ])

    const op1 = opening("0198f2c1-9000-7abc-9000-000000000002")
    const op2 = opening("0198f2c1-9000-7abc-9000-000000000003")
    state = reducer(state, addOpening({ surfaceId: s2.id, opening: op1 }))
    state = reducer(state, addOpening({ surfaceId: s2.id, opening: op2 }))
    state = reducer(state, moveOpening({ surfaceId: s2.id, from: 1, to: 0 }))
    state = reducer(
      state,
      updateOpening({ surfaceId: s2.id, id: op2.id, patch: { deduct: true } }),
    )
    state = reducer(state, removeOpening({ surfaceId: s2.id, id: op1.id }))
    draft = selectDraft(root(state))
    const surface = draft?.surfaces.find(s => s.id === s2.id)
    expect(surface?.openings.map(o => o.id)).toEqual([op2.id])
    expect(surface?.openings[0].deduct).toBe(true)
  })

  it("resetEditor returns initialState", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(state, resetEditor())
    expect(state).toEqual(measurementEditorSlice.getInitialState())
  })

  it("selectSurfaceAreas computes gross / deduction / net (DESIGN §8.2)", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    const floorId = "0198f2c1-8000-7abc-9000-000000000001"
    const areas = selectSurfaceAreas(floorId)(root(state))
    expect(areas).toEqual({ grossM2: 12, deductedM2: 1.85, netM2: 10.15 })
  })

  it("selectSetSummary groups by type", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    const summary = selectSetSummary(root(state))
    expect(summary[0]).toMatchObject({ type: "FLOOR", count: 1, grossM2: 12 })
  })

  it("updateSurface patch reaches the surface and marks the tree dirty", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    const floorId = "0198f2c1-8000-7abc-9000-000000000001"
    state = reducer(
      state,
      updateSurface({ id: floorId, patch: { name: "Пол 2" } }),
    )
    const draft = selectDraft(root(state))
    expect(draft?.surfaces[0].name).toBe("Пол 2")
    expect(selectTreeDirty(root(state))).toBe(true)
  })

  it("removeSurface drops the surface entirely", () => {
    let state = reducer(undefined, { type: "init" })
    state = reducer(state, setInitialDraft(set()))
    state = reducer(
      state,
      removeSurface("0198f2c1-8000-7abc-9000-000000000001"),
    )
    expect(selectDraft(root(state))?.surfaces).toEqual([])
  })
})
