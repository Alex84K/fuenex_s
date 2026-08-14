// Wire shapes of the measurement feature — taken verbatim from the server
// DTOs (server_go/internal/measurement/http_measurement_set.go,
// http_surface.go, http_opening.go, DESIGN_MEASUREMENT.md §8). Field limits
// mirror the server validators (§9): the client duplicates them for instant
// feedback, the server stays the authority. ownerId, rev and deletedAt are
// never on the wire and never appear here.

export const MEASUREMENT_LIMITS = {
  setName: 128,
  setNote: 512,
  surfaceName: 128,
  surfaceType: 64,
  maxPosition: 9999,
  maxSurfacesPerSet: 200,
  maxOpeningsPerSurface: 50,
  maxContourBytes: 32 * 1024,
  maxAreaM2: 100_000,
  maxDimensionM: 100,
} as const

// The one closed enum of the feature (DESIGN_MEASUREMENT.md §3.1): how you
// measured does not depend on what you measured.
export type ScanSource = "LIDAR" | "AR_RULER" | "MANUAL"

// Keeps its closed set because OPENING is a catch-all member (§3.5).
export type OpeningKind = "DOOR" | "WINDOW" | "OPENING"

// GET /api/v1/measurement-sets/{id} · PUT · PATCH — response node of one
// level. contour is UNKNOWN: the server never parses it (§3.2), so the
// client must guard it (contour/contourCodec.ts) instead of casting.
export type Opening = {
  id: string
  kind: OpeningKind
  widthM: number
  heightM: number
  deduct: boolean
  position: number
  createdAt: string
  updatedAt: string
}

export type Surface = {
  id: string
  type: string // FREE string — constants plus user-typed values (§3.3, decision 6)
  name: string
  position: number
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- unknown | null is deliberate documentation: null is a DISTINCT meaningful state ("not measured yet", §3.2) even though the type system collapses the union
  contour: unknown | null
  heightM: number | null // null = unknown or not applicable (a yard has none)
  areaM2: number // GROSS polygon area, openings NOT subtracted (§3.4)
  openings: Opening[] // ORDER BY position, id
  createdAt: string
  updatedAt: string
}

export type MeasurementSet = {
  id: string
  projectId: string
  name: string
  note: string
  position: number
  scanSource: ScanSource
  surfaces: Surface[] // ORDER BY position, id
  createdAt: string
  updatedAt: string
}

// GET /api/v1/projects/{id}/measurement — the whole project tree. The
// collection key is measurementSets everywhere, including the root
// (DESIGN_MEASUREMENT.md §8).
export type MeasurementTree = {
  measurementSets: MeasurementSet[]
}

// PUT /api/v1/measurement-sets/{id} — full replacement body. The surfaces
// and openings keys MUST always be present, even empty: an absent key and
// [] mean the same thing on the server — delete every child
// (DESIGN_MEASUREMENT.md §8, the most dangerous handle of the feature).
// Only buildSetBody may construct this shape.
export type OpeningInput = {
  id: string
  kind: OpeningKind
  widthM: number
  heightM: number
  deduct: boolean
  position: number
}

export type SurfaceInput = {
  id: string
  type: string
  name: string
  position: number
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- see Surface.contour
  contour: unknown | null
  heightM: number | null
  areaM2: number
  openings: OpeningInput[]
}

export type MeasurementSetInput = {
  projectId: string
  name: string
  note: string
  position: number
  scanSource: ScanSource
  surfaces: SurfaceInput[]
}

// PATCH /api/v1/measurement-sets/{id} — scalars only; explicit null is
// rejected by the server (DESIGN_PROJECT.md §11.1). Surfaces are not
// patchable at all.
export type MeasurementSetPatch = Partial<
  Pick<MeasurementSet, "name" | "note" | "position" | "scanSource">
>
