import type { FC } from "react"
import { Circle, Group } from "react-konva"

type Props = {
  /** Позиция X в пикселях */
  x: number
  /** Позиция Y в пикселях */
  y: number
  /** Выделена ли вершина */
  isSelected: boolean
  /** Индекс вершины */
  vertexIndex: number
}

/**
 * Хендл вершины контура в режиме редактирования (перенос
 * SimCornerHandle.tsx из образца).
 * Отображает крупный круг с внешним кольцом для удобного захвата.
 * При выделении — подсветка оранжевым цветом.
 *
 * Чисто визуальный компонент — выбор и драг вершины обрабатываются на
 * уровне Stage (ContourEditorView), т.к. они требуют сравнения расстояний
 * между всеми вершинами контура, а не hit-test одного узла (см. комментарий
 * про «точку-двойник» на touch-устройствах).
 */
export const VertexHandle: FC<Props> = ({ x, y, isSelected, vertexIndex }) => {
  const outerRadius = isSelected ? 12 : 10
  const innerRadius = 8

  return (
    <Group>
      {/* Внешнее кольцо (тень/подсветка) */}
      <Circle
        x={x}
        y={y}
        radius={outerRadius}
        fill={isSelected ? "rgba(255, 152, 0, 0.3)" : "rgba(25, 118, 210, 0.15)"}
        stroke={isSelected ? "#e65100" : "#1976d2"}
        strokeWidth={isSelected ? 3 : 2}
        listening={false}
      />
      {/* Внутренний круг (визуальный центр захвата) */}
      <Circle
        x={x}
        y={y}
        radius={innerRadius}
        fill={isSelected ? "#fff3e0" : "#ffffff"}
        stroke={isSelected ? "#e65100" : "#1976d2"}
        strokeWidth={2}
        listening={false}
        name={`vertex-handle-${String(vertexIndex)}`}
      />
    </Group>
  )
}
