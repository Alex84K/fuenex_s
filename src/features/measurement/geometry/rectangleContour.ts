import type { PointCm } from "./polygonArea"

// D20 (DESIGN §9.5): the fast path for fence, facade, pavement and wall
// "by tape measure" — a rectangle from two numbers, no canvas needed. The
// AREA is never width × height here: it is computed by the same shoelace
// (polygonArea) as everything else, so the product has exactly one
// calculator in the system.
//
// Arguments are CENTIMETRES — the geometry module is unit-pure. The modal
// collects metres from the user and converts with mToCm from the codec
// (the one place unit conversion lives, §7.3).
export function rectangleContourCm(wCm: number, hCm: number): PointCm[] {
  return [
    { x: 0, y: 0 },
    { x: wCm, y: 0 },
    { x: wCm, y: hCm },
    { x: 0, y: hCm },
  ]
}
