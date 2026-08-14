import type { PointCm } from "./polygonArea"

// Snaps a point to the grid (DESIGN §9.2, D16): the snap happens at gesture
// COMMIT, not on every frame — the editor keeps the raw finger position
// while dragging and rounds it only when the vertex lands. Math.round works
// for negative coordinates too (-17 / 5 → -3 → -15).
export function snapPointToGrid(point: PointCm, stepCm: number): PointCm {
  return {
    x: Math.round(point.x / stepCm) * stepCm,
    y: Math.round(point.y / stepCm) * stepCm,
  }
}
