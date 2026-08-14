import type { PointCm } from "../geometry/polygonArea"
import {
  CONTOUR_SCHEMA_VERSION,
  type ContourEdgeWireV1,
  type ContourWireV1,
  type EdgeSource,
} from "./contourSchema"

// The editor's internal contour (DESIGN §5.1): centimetres (D8) — the wire
// speaks metres and the conversion lives in THIS file and nowhere else
// (§7.3, checked by grep: /100 and *100 appear only here).
export type ContourDraft = {
  points: PointCm[] // { x, y } in centimetres
  edgeSources: EdgeSource[] // parallel array, length == points.length (D14)
  schemaVersion: number // the version the contour was READ from (§7.4)
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v)

// A proper narrowing instead of a cast: an unknown string from a foreign
// contour is only an EdgeSource if it is one of the four known values;
// anything else (a future client's new source) falls back to "manual"
// when writing (DESIGN §7.4: unknown fields are tolerated, not trusted).
const asEdgeSource = (v: unknown): v is EdgeSource =>
  v === "manual" || v === "lidar" || v === "ar_ruler" || v === "laser"

// The ONLY unit conversions in the feature (DESIGN §7.3, checked by grep:
// /100 and *100 must not appear anywhere else). The editor works in
// centimetres, the wire speaks metres.
export const mToCm = (v: number): number => v * 100
export const cmToM = (v: number): number => v / 100

// parseContour — the tolerant READER (DESIGN §7.4). contour arrives as
// unknown: the server never looked at it, so this is a guard, not a cast.
// It must NOT throw on any input — one broken contour must not take down a
// screen where nine more sets are fine. Returns centimetres.
//
// | input | behaviour |
// |---|---|
// | null | null — "not measured yet" (F-5) |
// | not an object / no vertices / < 3 vertices | null + console.warn |
// | units "cm" | coordinates as-is (inside we ARE in centimetres) |
// | units missing or "m" | × 100 (the v1 writer always writes "m") |
// | anything else as units | null — misreading feet as metres is worse than saying "unreadable" |
// | no edges or wrong length | reconstructed: lengthM from vertices, source "manual" |
// | lengthCm instead of lengthM | accepted (the sample's format) |
// | unknown schemaVersion (> 1) | still read by v1 rules — the editor warns before overwriting |
// | unknown fields | ignored; lost on rewrite (the price is named in §16) |
// | NaN/Infinity in a coordinate | the whole contour is null |
export function parseContour(raw: unknown): ContourDraft | null {
  if (raw == null) return null
  if (!isRecord(raw)) {
    console.warn(
      "measurement: contour is not an object, treating as not measured",
    )
    return null
  }

  const vertices = raw.vertices
  if (!Array.isArray(vertices) || vertices.length < 3) {
    console.warn("measurement: contour has no usable vertices")
    return null
  }

  const units = raw.units
  const toCm = units === "cm" ? 1 : units == null || units === "m" ? 100 : null
  if (toCm == null) {
    console.warn("measurement: contour units are neither m nor cm, unreadable")
    return null
  }

  const points: PointCm[] = []
  for (const v of vertices) {
    if (!isRecord(v) || !isFiniteNumber(v.x) || !isFiniteNumber(v.y)) {
      console.warn("measurement: contour has a broken vertex, unreadable")
      return null
    }
    points.push({ x: v.x * toCm, y: v.y * toCm })
  }

  // edgeSources: prefer the edges array; fall back to all-"manual" when it
  // is missing or does not line up with the vertices (§7.4). The sample's
  // lengthCm is accepted as a length field and ignored — length is
  // reference-only, geometry lives in the vertices (§7.2).
  const schemaVersion = isFiniteNumber(raw.schemaVersion)
    ? raw.schemaVersion
    : CONTOUR_SCHEMA_VERSION

  const rawEdges = Array.isArray(raw.edges) ? raw.edges : []
  let edgeSources: EdgeSource[]
  if (rawEdges.length === points.length) {
    edgeSources = rawEdges.map(e =>
      isRecord(e) && asEdgeSource(e.source) ? e.source : "manual",
    )
  } else {
    edgeSources = points.map(() => "manual")
  }
  // A parsed contour always carries the schema version it was read with, so
  // the editor can warn before rewriting a newer format (DESIGN §7.4).
  if (edgeSources.length !== points.length) {
    edgeSources = points.map(() => "manual")
  }

  return { points, edgeSources, schemaVersion }
}

// buildContour — the strict WRITER (DESIGN §7.3): draft (cm) → wire (m).
// Called only from buildSetBody, which guarantees points.length >= 3 — a
// contour of fewer than 3 points is never serialized, only null (F-5).
export function buildContour(draft: ContourDraft): ContourWireV1 {
  const n = draft.points.length
  if (n < 3) {
    throw new Error(
      "measurement: contour with fewer than 3 points cannot be serialized",
    )
  }

  const edges: ContourEdgeWireV1[] = []
  for (let i = 0; i < n; i++) {
    const a = draft.points[i]
    const b = draft.points[(i + 1) % n]
    const dx = cmToM(b.x - a.x)
    const dy = cmToM(b.y - a.y)
    const source = draft.edgeSources[i] ?? "manual"
    edges.push({
      index: i,
      // Reference-only (DESIGN §7.2) — rounded to centimetre precision so
      // a pathological 480-vertex contour keeps the whole wire under the
      // 32 KB limit instead of carrying 17-digit float noise per side.
      lengthM: Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100,
      source,
    })
  }

  return {
    schemaVersion: CONTOUR_SCHEMA_VERSION,
    units: "m",
    vertices: draft.points.map(p => ({ x: cmToM(p.x), y: cmToM(p.y) })),
    edges,
  }
}

// Byte size of the ready-to-send contour (DESIGN §12): the client checks it
// against MEASUREMENT_LIMITS.maxContourBytes before PUT, because the server
// will reject a bigger one with 400.
export function contourByteSize(wire: ContourWireV1): number {
  return new TextEncoder().encode(JSON.stringify(wire)).length
}
