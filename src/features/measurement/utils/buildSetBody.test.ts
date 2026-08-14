import { describe, expect, it } from "vitest"
import { buildSetBody } from "./buildSetBody"
import type { SetDraft } from "../measurementEditorSlice"
import { buildContour } from "../contour/contourCodec"
import type { ContourDraft } from "../contour/contourCodec"
import type { ContourWireV1 } from "../contour/contourSchema"
import type { PointCm } from "../geometry/polygonArea"

const draft = (overrides: Partial<SetDraft> = {}): SetDraft => ({
  id: "0198f2c1-7a3e-7c11-9f4d-2b8e6a1c0d55",
  projectId: "0198f2c0-1b22-7000-8aaa-5f0c9d3e1122",
  name: "Кухня",
  note: "",
  position: 0,
  scanSource: "MANUAL",
  surfaces: [],
  ...overrides,
})

const points = (): PointCm[] => [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 300 },
  { x: 0, y: 300 },
]

describe("buildSetBody", () => {
  // THE first test case (PLANNING phase 6, §6.4): an empty list must give
  // surfaces: [], never an absent key — on the server they mean the same
  // thing (delete all), and a "skip the key when empty" branch is how users
  // lose their data.
  it("an empty set still carries surfaces: [] — the key is never absent", () => {
    const body = buildSetBody(draft())
    expect(body.surfaces).toEqual([])
    expect("surfaces" in body).toBe(true)
  })

  it("an empty surface still carries openings: []", () => {
    const body = buildSetBody(
      draft({
        surfaces: [
          {
            id: "0198f2c1-8000-7abc-9000-000000000001",
            type: "WALL",
            name: "Стена",
            contourCm: null,
            heightM: null,
            areaM2: 0,
            openings: [],
          },
        ],
      }),
    )
    expect(body.surfaces[0].openings).toEqual([])
    expect("openings" in body.surfaces[0]).toBe(true)
  })

  it("position is the array index on both levels", () => {
    const body = buildSetBody(
      draft({
        surfaces: [
          {
            id: "a",
            type: "WALL",
            name: "А",
            contourCm: null,
            heightM: null,
            areaM2: 0,
            openings: [
              {
                id: "o1",
                kind: "DOOR",
                widthM: 0.9,
                heightM: 2.05,
                deduct: true,
              },
              {
                id: "o2",
                kind: "WINDOW",
                widthM: 1.5,
                heightM: 1.2,
                deduct: false,
              },
            ],
          },
          {
            id: "b",
            type: "FLOOR",
            name: "Б",
            contourCm: null,
            heightM: null,
            areaM2: 0,
            openings: [],
          },
        ],
      }),
    )
    expect(body.surfaces.map(s => s.position)).toEqual([0, 1])
    expect(body.surfaces[0].openings.map(o => o.position)).toEqual([0, 1])
  })

  it("a contour is serialized in metres with its edge sources", () => {
    const contourCm: ContourDraft = {
      points: points(),
      edgeSources: ["lidar", "manual", "lidar", "lidar"],
      schemaVersion: 1,
    }
    const body = buildSetBody(
      draft({
        surfaces: [
          {
            id: "a",
            type: "FLOOR",
            name: "Пол",
            contourCm,
            heightM: null,
            areaM2: 12,
            openings: [],
          },
        ],
      }),
    )
    const wire = buildContour(contourCm)
    expect(body.surfaces[0].contour).toEqual(wire)
    expect((body.surfaces[0].contour as ContourWireV1).vertices[1]).toEqual({
      x: 4,
      y: 0,
    })
  })

  it("no contour (null) stays null — «не снят» is not an empty polygon", () => {
    const body = buildSetBody(
      draft({
        surfaces: [
          {
            id: "a",
            type: "FENCE_SIDE_A",
            name: "Забор",
            contourCm: null,
            heightM: 1.8,
            areaM2: 43.2,
            openings: [],
          },
        ],
      }),
    )
    expect(body.surfaces[0].contour).toBeNull()
  })

  it("scalars pass through untouched", () => {
    const body = buildSetBody(
      draft({
        name: "Двор",
        note: "красим с двух сторон",
        position: 3,
        scanSource: "AR_RULER",
      }),
    )
    expect(body).toMatchObject({
      projectId: "0198f2c0-1b22-7000-8aaa-5f0c9d3e1122",
      name: "Двор",
      note: "красим с двух сторон",
      position: 3,
      scanSource: "AR_RULER",
    })
  })
})
