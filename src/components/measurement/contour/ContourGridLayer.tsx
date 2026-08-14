import type { FC } from "react"
import { useMemo } from "react"
import { Line } from "react-konva"

type Props = {
  /** Левая граница области сетки в см (мировые координаты) */
  minXCm: number
  /** Верхняя граница области сетки в см */
  minYCm: number
  /** Правая граница области сетки в см */
  maxXCm: number
  /** Нижняя граница области сетки в см */
  maxYCm: number
  /** Масштаб мир→экран (px на 1 см), БЕЗ учёта zoom стейджа — сами
   *  координаты линий считаются в этой системе, а текущий zoom Stage
   *  применяет Konva автоматически при рендере. */
  scale: number
  /** Масштаб мир→экран С учётом текущего zoom стейджа (baseScale ×
   *  stageScale). Используется только для выбора шага сетки (LOD) — на
   *  сильном отдалении шаг 10 см превращается в визуальную кашу, поэтому
   *  шаг растёт вместе с отдалением. */
  effectiveScale: number
}

/** Кандидаты шага сетки в см — от мелкого к крупному (перенос GridLayer.tsx
 *  из образца). Пользовательский выбор шага (GRID_STEPS_CM из constants)
 *  применяется к снапу; отрисовочный шаг (LOD) — только этот ряд. */
const GRID_STEPS_CM = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]

/** Минимальное комфортное расстояние между линиями сетки на экране (px). */
const MIN_PX_BETWEEN_LINES = 20

/** Шаг крупной (акцентной) линии — каждый метр. */
const MAJOR_STEP_CM = 100

/**
 * Выбирает шаг сетки (см) так, чтобы на экране между линиями было не меньше
 * MIN_PX_BETWEEN_LINES пикселей — иначе на отдалении (большое помещение,
 * вписанное в экран целиком) сетка 10 см превращается в сплошную кашу.
 */
function pickGridStepCm(effectiveScale: number): number {
  for (const step of GRID_STEPS_CM) {
    if (step * effectiveScale >= MIN_PX_BETWEEN_LINES) return step
  }
  return GRID_STEPS_CM[GRID_STEPS_CM.length - 1]
}

/**
 * Отображает сетку на холсте react-konva (перенос GridLayer.tsx из
 * образца). Область сетки задаётся явными границами (min/max), а не
 * фиксированным размером от 0 — для больших контуров (до 30×30 м) сетка
 * должна покрывать сам контур (+ запас), а не обрезаться на жёстко
 * заданных 3 м.
 */
export const ContourGridLayer: FC<Props> = ({
  minXCm,
  minYCm,
  maxXCm,
  maxYCm,
  scale,
  effectiveScale,
}) => {
  const lines = useMemo(() => {
    const result: ReturnType<typeof Line>[] = []
    const step = pickGridStepCm(effectiveScale)

    const startX = Math.ceil(minXCm / step) * step
    const startY = Math.ceil(minYCm / step) * step

    // Вертикальные линии
    for (let x = startX; x <= maxXCm; x += step) {
      const isMajor = Math.round(x) % MAJOR_STEP_CM === 0
      const px = x * scale
      result.push(
        <Line
          key={`v-${String(x)}`}
          points={[px, minYCm * scale, px, maxYCm * scale]}
          stroke={isMajor ? "#bdbdbd" : "#e0e0e0"}
          strokeWidth={isMajor ? 1 : 0.5}
        />,
      )
    }

    // Горизонтальные линии
    for (let y = startY; y <= maxYCm; y += step) {
      const isMajor = Math.round(y) % MAJOR_STEP_CM === 0
      const py = y * scale
      result.push(
        <Line
          key={`h-${String(y)}`}
          points={[minXCm * scale, py, maxXCm * scale, py]}
          stroke={isMajor ? "#bdbdbd" : "#e0e0e0"}
          strokeWidth={isMajor ? 1 : 0.5}
        />,
      )
    }

    return result
  }, [minXCm, minYCm, maxXCm, maxYCm, scale, effectiveScale])

  return <>{lines}</>
}
