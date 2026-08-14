import type { FC } from "react"
import { useMemo } from "react"
import { Text, Line, Group } from "react-konva"

type Props = {
  /** Начало отрезка (px) */
  fromX: number
  fromY: number
  /** Конец отрезка (px) */
  toX: number
  toY: number
  /** Длина отрезка в см */
  lengthCm: number
  /** Подсветить (если отрезок смежный с выбранной вершиной) */
  isHighlighted?: boolean
  /** Текущий zoom Stage (scaleX/scaleY, без baseScale=SCALE). Подпись
   *  контр-масштабируется этим значением (см. invScale ниже), чтобы текст
   *  и выноска оставались одного размера на экране независимо от
   *  приближения/отдаления камеры — раньше fontSize был задан в мировых
   *  px и съёживался вместе с контуром при зуме на больших комнатах. */
  zoomScale?: number
}

/** Расстояние от линии до подписи и отступы текста — в экранных px,
 *  остаются постоянными на любом zoom благодаря контр-масштабированию. */
const OFFSET_DIST_PX = 25

/**
 * Подпись длины отрезка на холсте (перенос SimDimensionLabel.tsx из
 * образца). Размещается рядом с отрезком со смещением перпендикулярно
 * линии. Показывает длину в метрах — единица продукта (DESIGN §3.6),
 * в отличие от образца, где подписи были в сантиметрах.
 */
export const DimensionLabel: FC<Props> = ({
  fromX,
  fromY,
  toX,
  toY,
  lengthCm,
  isHighlighted = false,
  zoomScale = 1,
}) => {
  const { midX, midY, offsetX, offsetY } = useMemo(() => {
    // Центр отрезка — точка крепления выноски, должна следовать за линией
    // (масштабируется ансцестор-трансформацией Stage как обычно).
    const mx = (fromX + toX) / 2
    const my = (fromY + toY) / 2

    // Перпендикулярное направление (единичный вектор — не зависит от zoom).
    const dx = toX - fromX
    const dy = toY - fromY
    const len = Math.sqrt(dx * dx + dy * dy)
    const ox = len > 0 ? (-dy / len) * OFFSET_DIST_PX : 0
    const oy = len > 0 ? (dx / len) * OFFSET_DIST_PX : 0

    return { midX: mx, midY: my, offsetX: ox, offsetY: oy }
  }, [fromX, fromY, toX, toY])

  const color = isHighlighted ? "#e65100" : "#555555"
  // Группа: позиция — в мировых px (следует за линией/зумом как обычно),
  // а её собственный scale = 1/zoom компенсирует zoom предка (Stage), так
  // что всё нарисованное внутри (выноска + текст) получает суммарный
  // масштаб zoom × (1/zoom) = 1 — то есть постоянный размер на экране.
  const invScale = 1 / Math.max(zoomScale, 0.0001)
  const lengthM = lengthCm / 100

  return (
    <Group x={midX} y={midY} scaleX={invScale} scaleY={invScale}>
      {/* Линия-выноска от центра отрезка до подписи */}
      <Line
        points={[0, 0, offsetX, offsetY]}
        stroke={color}
        strokeWidth={0.5}
        dash={[3, 3]}
      />
      {/* Текст подписи */}
      <Text
        x={offsetX - 24}
        y={offsetY - 8}
        text={`${lengthM.toFixed(1)} м`}
        fontSize={11}
        fontFamily="Arial, sans-serif"
        fill={color}
        align="center"
        width={48}
      />
    </Group>
  )
}
