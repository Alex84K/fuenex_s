// PointCm — the editor's internal point: centimetres (DESIGN §7.3, D8).
// The wire speaks metres; the conversion lives in exactly one file
// (contour/contourCodec.ts). The name carries the unit, as everywhere in
// this feature: pointsCm, areaM2, widthM, gridStepCm.
export type PointCm = { x: number; y: number }

/**
 * Вычисляет площадь многоугольника по формуле Гаусса (шнуровка).
 * Координаты в см → результат в см².
 * Поддерживает невыпуклые многоугольники.
 *
 * Единственная реализация площади в проекте (DESIGN §8.1): при появлении
 * iOS-клиента у одного контура будет два вычислителя, и этот — эталон,
 * покрытый фикстурами geometry/__fixtures__/polygon_area.json.
 */
export function polygonArea(points: PointCm[]): number {
  if (points.length < 3) return 0

  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area) / 2
}

/**
 * Вычисляет периметр многоугольника.
 * Координаты в см → результат в см.
 */
export function polygonPerimeter(points: PointCm[]): number {
  if (points.length < 2) return 0

  let perimeter = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const dx = points[j].x - points[i].x
    const dy = points[j].y - points[i].y
    perimeter += Math.sqrt(dx * dx + dy * dy)
  }

  return perimeter
}

/**
 * Вычисляет длину отрезка между двумя точками.
 */
export function segmentLength(a: PointCm, b: PointCm): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}
