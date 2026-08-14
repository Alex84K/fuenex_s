import type { PointCm } from "./polygonArea"

/**
 * Проверяет, является ли полигон самопересекающимся.
 *
 * Алгоритм:
 * Для каждой пары несмежных отрезков (i, i+1) и (j, j+1) проверяем,
 * пересекаются ли они. Отрезки считаются смежными, если они
 * имеют общую вершину: j == i-1, j == i, j == i+1, j == i+2 (с учётом
 * замыкания полигона).
 *
 * Используется на коммите переноса вершины в edit-режиме (D15): если
 * перетаскивание приводит к самопересечению, правка отклоняется и точка
 * возвращается на место. В draw-режиме проверка не выполняется — контур
 * ещё строится, и промежуточная восьмёрка нормальна (DESIGN §8.4).
 *
 * @param points Массив точек замкнутого полигона
 * @returns true, если полигон самопересекается
 */
export function isSelfIntersecting(points: PointCm[]): boolean {
  const n = points.length

  // Для треугольника самопересечение невозможно
  if (n < 4) return false

  for (let i = 0; i < n; i++) {
    const iNext = (i + 1) % n

    for (let j = i + 1; j < n; j++) {
      const jNext = (j + 1) % n

      // Пропускаем смежные отрезки (имеют общую вершину)
      // Смежные: j == i (одинаковый отрезок), j == i+1, j == i-1 (с учётом замыкания)
      if (
        j === i ||
        j === iNext ||
        jNext === i ||
        (i === 0 && jNext === n - 1)
      ) {
        continue
      }

      // Проверка пересечения отрезков
      if (
        segmentsIntersect(points[i], points[iNext], points[j], points[jNext])
      ) {
        // Дополнительная проверка: если отрезки коллинеарны и перекрываются
        // по конечным точкам — это не считается самопересечением для полигона
        if (
          areCollinearOverlapping(
            points[i],
            points[iNext],
            points[j],
            points[jNext],
          )
        ) {
          continue
        }
        return true
      }
    }
  }

  return false
}

/**
 * Проверяет, пересекаются ли два отрезка [a, b] и [c, d].
 * Использует метод ориентированных площадей (CCW).
 */
function segmentsIntersect(
  a: PointCm,
  b: PointCm,
  c: PointCm,
  d: PointCm,
): boolean {
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)

  // Общий случай: концы отрезков лежат по разные стороны от другого отрезка
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true
  }

  // Проверка на коллинеарность и наложение
  if (d1 === 0 && isPointOnSegment(c, d, a)) return true
  if (d2 === 0 && isPointOnSegment(c, d, b)) return true
  if (d3 === 0 && isPointOnSegment(a, b, c)) return true
  if (d4 === 0 && isPointOnSegment(a, b, d)) return true

  return false
}

/**
 * Проверяет, являются ли два отрезка коллинеарными и перекрывающимися.
 * Такие отрезки в контексте полигона не считаются самопересечением.
 */
function areCollinearOverlapping(
  a: PointCm,
  b: PointCm,
  c: PointCm,
  d: PointCm,
): boolean {
  // Проверка коллинеарности: cross(c, d, a) === 0 && cross(c, d, b) === 0
  if (cross(c, d, a) !== 0 || cross(c, d, b) !== 0) return false

  // Проверка перекрытия проекций на оси
  const projA = projectOnAxis(a, b, a)
  const projB = projectOnAxis(a, b, b)
  const projC = projectOnAxis(a, b, c)
  const projD = projectOnAxis(a, b, d)

  const min1 = Math.min(projA, projB)
  const max1 = Math.max(projA, projB)
  const min2 = Math.min(projC, projD)
  const max2 = Math.max(projC, projD)

  return max1 >= min2 && max2 >= min1
}

/**
 * Проекция точки на ось отрезка (скалярное значение для одномерного сравнения).
 */
function projectOnAxis(from: PointCm, to: PointCm, point: PointCm): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const px = point.x - from.x
  const py = point.y - from.y
  return px * dx + py * dy
}

/**
 * Ориентированная площадь (z-компонента векторного произведения).
 * Положительное = левый поворот, отрицательное = правый, 0 = коллинеарно.
 */
function cross(a: PointCm, b: PointCm, c: PointCm): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/**
 * Проверяет, лежит ли точка p на отрезке [a, b] (предполагается коллинеарность).
 */
function isPointOnSegment(a: PointCm, b: PointCm, p: PointCm): boolean {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
}
