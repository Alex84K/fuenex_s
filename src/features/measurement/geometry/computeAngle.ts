import type { PointCm } from "./polygonArea"

/**
 * Вычисляет угол между двумя отрезками, сходящимися в вершине.
 *
 * Алгоритм:
 * 1. Вычисляем векторы: a = prev - vertex, b = next - vertex
 * 2. Угол = arccos( (a·b) / (|a|·|b|) )
 * 3. Результат в градусах [0, 180]
 *
 * Показывается в редакторе контура у выделенной вершины (DESIGN §8.5).
 *
 * @param prev Предыдущая вершина (начало первого отрезка)
 * @param vertex Текущая вершина (угол)
 * @param next Следующая вершина (конец второго отрезка)
 * @returns Угол в градусах [0, 180]. 0 для коллинеарных точек, 0 для вырожденных случаев.
 */
export function computeAngle(
  prev: PointCm,
  vertex: PointCm,
  next: PointCm,
): number {
  // Векторы от vertex
  const ax = prev.x - vertex.x
  const ay = prev.y - vertex.y
  const bx = next.x - vertex.x
  const by = next.y - vertex.y

  // Длины векторов
  const lenA = Math.sqrt(ax * ax + ay * ay)
  const lenB = Math.sqrt(bx * bx + by * by)

  // Защита от деления на ноль
  if (lenA === 0 || lenB === 0) return 0

  // Скалярное произведение
  const dot = ax * bx + ay * by

  // Нормализация для защиты от погрешностей floating point
  const cosAngle = Math.max(-1, Math.min(1, dot / (lenA * lenB)))

  // Радианы → градусы
  const angleRad = Math.acos(cosAngle)
  const angleDeg = (angleRad * 180) / Math.PI

  return Math.round(angleDeg * 10) / 10 // округление до 1 знака
}
