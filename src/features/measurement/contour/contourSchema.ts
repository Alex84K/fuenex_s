// The contour wire schema v1 — and THIS file is the clients' contract
// (DESIGN §7.1): the server never parses contour, so its shape is defined
// here, before the first data. A second client (iOS SNG) reads this section
// when it starts.

// Origin of ONE side of the contour (DESIGN §7.1, §7.5): where the edge's
// measurement came from. The web writes "manual" for everything it creates
// or edits; a future iOS client would write lidar/ar_ruler/laser. When a
// vertex is moved, its two adjacent edges become "manual" and foreign
// markings are preserved (D14).
export type EdgeSource = "manual" | "lidar" | "ar_ruler" | "laser"

export const CONTOUR_SCHEMA_VERSION = 1

// Edge i connects vertices[i] → vertices[(i + 1) % n] (the polygon is
// implicitly closed — no duplicate closing vertex).
export type ContourEdgeWireV1 = {
  index: number
  lengthM: number // REFERENCE only — geometry lives in vertices (§7.2)
  source: EdgeSource
}

// On the wire units are ALWAYS metres (DESIGN_MEASUREMENT.md §3.6, D8).
export type ContourWireV1 = {
  schemaVersion: number
  units: "m"
  vertices: { x: number; y: number }[]
  edges: ContourEdgeWireV1[]
}
