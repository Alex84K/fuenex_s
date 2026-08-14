import type { FC } from "react"
import { useMemo } from "react"
import { Arc, Text, Group } from "react-konva"

type Props = {
  /** Позиция вершины угла (px) */
  vertexX: number
  vertexY: number
  /** Угол в градусах [0, 180] */
  angleDegrees: number
  /** Радиус дуги (px) */
  radius?: number
  /** Текущий zoom Stage (scaleX/scaleY, без baseScale=SCALE). Контр-
   *  масштабирование — см. подробный комментарий в DimensionLabel.tsx. */
  zoomScale?: number
}

/**
 * Отображает дугу угла и подпись градусов рядом с вершиной (перенос
 * SimAngleLabel.tsx из образца). Используется в режиме редактирования при
 * выбранной вершине. Для угла 0° дуга не рисуется (Arc с angle=0 невидим).
 * Для угла 180° рисуется полукруг.
 */
export const AngleLabel: FC<Props> = ({
  vertexX,
  vertexY,
  angleDegrees,
  radius = 40,
  zoomScale = 1,
}) => {
  // Нормализуем угол для отображения
  const displayAngle = Math.max(0, Math.min(180, Math.round(angleDegrees)))
  // Группа: позиция в мировых px (следует за вершиной/зумом как обычно),
  // её собственный scale = 1/zoom компенсирует zoom предка (Stage) — дуга
  // и подпись получают постоянный размер на экране на любом zoom.
  const invScale = 1 / Math.max(zoomScale, 0.0001)

  const arcConfig = useMemo(() => {
    // Дуга рисуется как полукруг сверху от вершины
    // Rotation: -90° чтобы дуга смотрела "вверх"
    // Angle: сам угол
    return {
      innerRadius: radius - 5,
      outerRadius: radius,
      angle: Math.max(1, displayAngle), // Arc с angle=0 не рендерится
      rotation: -90,
      fill:
        displayAngle === 0 ? undefined : "rgba(230, 81, 0, 0.2)",
      stroke: "#e65100",
      strokeWidth: 1.5,
    }
  }, [radius, displayAngle])

  // Позиция текста — по центру дуги
  const textConfig = useMemo(() => {
    const midAngleRad = ((-90 + displayAngle / 2) * Math.PI) / 180
    const textRadius = radius + 18
    const tx = textRadius * Math.cos(midAngleRad)
    const ty = textRadius * Math.sin(midAngleRad)

    return { x: tx - 14, y: ty - 7 }
  }, [radius, displayAngle])

  if (displayAngle === 0) {
    // Для 0° ничего не рисуем
    return null
  }

  return (
    <Group x={vertexX} y={vertexY} scaleX={invScale} scaleY={invScale}>
      <Arc x={0} y={0} {...arcConfig} />
      <Text
        x={textConfig.x}
        y={textConfig.y}
        text={`${String(displayAngle)}°`}
        fontSize={12}
        fontFamily="Arial, sans-serif"
        fill="#e65100"
        fontStyle="bold"
        align="center"
        width={28}
      />
    </Group>
  )
}
