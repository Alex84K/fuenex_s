import type { FC } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Line, Circle } from "react-konva"
import type Konva from "konva"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import {
  addPoint,
  closeContourEditor,
  commitContour,
  movePoint,
  openContourEditor,
  removePoint,
  replaceContour,
  selectContourEditor,
  selectVertex,
  setContourError,
  setContourMode,
  setGridStep,
} from "../../../features/measurement/measurementEditorSlice"
import { computeAngle } from "../../../features/measurement/geometry/computeAngle"
import {
  polygonPerimeter,
  segmentLength,
} from "../../../features/measurement/geometry/polygonArea"
import type { PointCm } from "../../../features/measurement/geometry/polygonArea"
import { isSelfIntersecting } from "../../../features/measurement/geometry/isSelfIntersecting"
import { grossAreaM2 } from "../../../features/measurement/utils/areas"
import { SCALE_PX_PER_CM } from "../../../features/measurement/constants"
import { ContourStage } from "./ContourStage"
import type { ContourStageHandle } from "./ContourStage"
import { ContourGridLayer } from "./ContourGridLayer"
import { VertexHandle } from "./VertexHandle"
import { DimensionLabel } from "./DimensionLabel"
import { AngleLabel } from "./AngleLabel"
import { ContourToolbar } from "./ContourToolbar"
import { RectangleContourModal, rectangleContourForCommit } from "../../modals/RectangleContourModal"
import { ConfirmDiscardDraftModal } from "../../modals/ConfirmDiscardDraftModal"

type Props = {
  surfaceId: string
  onDone: () => void
  onCancel: () => void
}

/** Запас вокруг bbox контура для сетки (см) */
const GRID_MARGIN_CM = 200
/** Размер сетки по умолчанию (см), когда контур ещё не нарисован */
const GRID_FALLBACK_EXTENT_CM = 500

/**
 * Допуск захвата вершины в edit-mode — реальные экранные пиксели, не
 * зависят от текущего зума контура. Раньше столько давала видимая зона
 * хендла: radius(8) + hitStrokeWidth(24) = 32px.
 */
const VERTEX_HIT_TOLERANCE_PX = 32

/**
 * Порог в экранных px, отличающий тап (клик/добавление точки) от pan по
 * пустому полю — независимо от текущего зума, т.к. сравнение идёт в тех же
 * «сырых» px указателя, в которых считается и сама дельта pan.
 */
const PAN_CLICK_THRESHOLD_PX = 4

/**
 * Находит индекс вершины, геометрически ближайшей к точке указателя
 * (в см), если расстояние до неё не превышает допуск. Используется вместо
 * Konva hit-test, чтобы при тесно расположенных вершинах драг всегда
 * захватывал именно ту точку, к которой палец ближе всего, а не ту, что
 * Konva случайно выбрала по z-order перекрывающихся хит-зон.
 */
function findNearestVertexIndex(
  points: PointCm[],
  pointerCm: { cmX: number; cmY: number },
  toleranceCm: number,
): number | null {
  let nearestIndex = -1
  let nearestDist = Infinity
  points.forEach((p, i) => {
    const dist = Math.hypot(p.x - pointerCm.cmX, p.y - pointerCm.cmY)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestIndex = i
    }
  })
  if (nearestIndex === -1 || nearestDist > toleranceCm) return null
  return nearestIndex
}

/**
 * Экран редактора контура (DESIGN §9, перенос RoomEditorStage.tsx из
 * образца): холст + тулбар + статус-строка + панель вершины. Режимы:
 * draw (тап по пустому полю → вершина со снапом; тап по первой вершине
 * при ≥ 3 → замыкание) и edit (хендлы, длины, углы, самопересечение).
 * «Готово» пишет контур и площадь в черновик комплекта (commitContour) —
 * сервер не трогается (D4).
 */
export const ContourEditorView: FC<Props> = ({ surfaceId, onDone, onCancel }) => {
  const dispatch = useAppDispatch()
  const contour = useAppSelector(selectContourEditor)

  const stageRef = useRef<ContourStageHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [stageTransform, setStageTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  })
  const [rectangleOpen, setRectangleOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  // Open the working copy on mount (once per surface), close on unmount.
  useEffect(() => {
    if (contour?.surfaceId !== surfaceId) {
      dispatch(openContourEditor(surfaceId))
    }
    return () => {
      dispatch(closeContourEditor())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, [surfaceId, dispatch])

  const points = contour?.points ?? []
  const mode = contour?.mode ?? "draw"
  const gridStepCm = contour?.gridStepCm ?? 10
  const selectedVertex = contour?.selectedVertex ?? null
  const error = contour?.error ?? null
  const isDirty = contour?.isDirty ?? false

  // Зеркала «живых» значений в рефах — обработчики ниже навешиваются на
  // Konva Stage один раз (через stage.on(...)) и не должны пересоздаваться
  // на каждый ре-рендер/кадр драга, поэтому читают актуальные данные через
  // рефы, а не через замыкание над пропсами/state.
  const pointsRef = useRef(points)
  const modeRef = useRef(mode)
  const gridStepRef = useRef(gridStepCm)
  const selectedVertexRef = useRef(selectedVertex)
  useEffect(() => {
    pointsRef.current = points
  }, [points])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    gridStepRef.current = gridStepCm
  }, [gridStepCm])
  useEffect(() => {
    selectedVertexRef.current = selectedVertex
  }, [selectedVertex])

  // Коалесация трансформации через requestAnimationFrame: pointermove
  // приходит чаще, чем рисуются кадры (L-6 переноса).
  const pendingTransformRef = useRef<{ scale: number; x: number; y: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const scheduleTransformUpdate = (t: { scale: number; x: number; y: number }) => {
    pendingTransformRef.current = t
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pending = pendingTransformRef.current
      pendingTransformRef.current = null
      if (pending) setStageTransform(pending)
    })
  }

  // Область сетки в мировых координатах (см): объединение видимой области
  // экрана (всегда!) и bbox контура с запасом. Привязка к текущему viewport
  // гарантирует, что сетка всегда покрывает весь экран независимо от
  // количества точек и не «прыгает» при их добавлении (L-6).
  const gridBBox = useMemo(() => {
    const haveViewport = containerSize.width > 0 && containerSize.height > 0
    const totalScale = SCALE_PX_PER_CM * stageTransform.scale
    const viewport = haveViewport
      ? {
          minX: (0 - stageTransform.x) / totalScale,
          minY: (0 - stageTransform.y) / totalScale,
          maxX: (containerSize.width - stageTransform.x) / totalScale,
          maxY: (containerSize.height - stageTransform.y) / totalScale,
        }
      : {
          minX: 0,
          minY: 0,
          maxX: GRID_FALLBACK_EXTENT_CM,
          maxY: GRID_FALLBACK_EXTENT_CM,
        }

    if (points.length === 0) {
      return {
        minX: viewport.minX - GRID_MARGIN_CM,
        minY: viewport.minY - GRID_MARGIN_CM,
        maxX: viewport.maxX + GRID_MARGIN_CM,
        maxY: viewport.maxY + GRID_MARGIN_CM,
      }
    }
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    return {
      minX: Math.min(viewport.minX, ...xs) - GRID_MARGIN_CM,
      minY: Math.min(viewport.minY, ...ys) - GRID_MARGIN_CM,
      maxX: Math.max(viewport.maxX, ...xs) + GRID_MARGIN_CM,
      maxY: Math.max(viewport.maxY, ...ys) + GRID_MARGIN_CM,
    }
  }, [points, stageTransform, containerSize.width, containerSize.height])

  // Точный bbox контура (без запаса) — для fitToBBox/кнопки «⤢ Fit».
  const tightBBox = useMemo(() => {
    if (points.length < 3) return null
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    }
  }, [points])

  // Автоматический fit-to-content при первом входе в edit-mode (после
  // замыкания контура) — иначе контур 30×30 м остаётся в том же zoom, в
  // котором его рисовали.
  const lastFitModeRef = useRef<"draw" | "edit">("draw")
  useEffect(() => {
    if (mode === "edit" && lastFitModeRef.current !== "edit") {
      if (tightBBox && containerSize.width > 0 && containerSize.height > 0) {
        stageRef.current?.fitToBBox(tightBBox)
        lastFitModeRef.current = "edit"
      }
    } else if (mode !== "edit") {
      lastFitModeRef.current = mode
    }
  }, [mode, tightBBox, containerSize.width, containerSize.height])

  // ====== Локальный state для drag (производительность!) ======
  // Драг ведётся в локальных точках, в Redux уходит один movePoint на
  // pointerup (§9.4).
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    draggedIndex: number
    localPoints: PointCm[]
  }>({ isDragging: false, draggedIndex: -1, localPoints: [] })

  // Состояние активного захвата вершины между pointerdown и pointerup.
  // currentPoint обновляется на каждый move и читается на up — в ref, а не
  // в React state, чтобы не зависеть от того, успел ли отрендериться
  // очередной кадр к моменту отжатия.
  const dragAnchorRef = useRef<{
    index: number
    // Экранные координаты пальца/курсора в момент захвата (px контейнера
    // Stage, НЕ см). Дельту драга считаем в этих стабильных к трансформации
    // Stage координатах и делим на scaleAtDown — так смена scale/position
    // Stage ПОСРЕДИ жеста (микро-pinch вторым касанием на планшете) не
    // ломает координаты (L-4).
    startScreenX: number
    startScreenY: number
    scaleAtDown: number
    originalPoint: PointCm
    currentPoint: PointCm
    moved: boolean
  } | null>(null)

  // Pan холста ведём вручную. Анкор хранит экранные px на старте и исходную
  // позицию Stage. moved отличает реальный pan от чистого тапа по пустому
  // полю (в draw-mode тап по пустому полю — это добавление точки).
  const panAnchorRef = useRef<{
    startScreenX: number
    startScreenY: number
    startStageX: number
    startStageY: number
    moved: boolean
  } | null>(null)

  // Отслеживание размера контейнера: ResizeObserver реагирует на любое
  // изменение реального размера блока (flex-reflow и т.п.), а не только на
  // событие window.resize.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      setContainerSize({ width: node.offsetWidth, height: node.offsetHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  // ====== Обработчики жестов (единый pointer-пайплайн, перенос L-1…L-6) ======
  // ВАЖНО: выбор вершины и драг не основаны на Konva-хендлерах конкретного
  // узла (draggable Circle + native hit-test). Когда две вершины находятся
  // близко друг к другу на экране, их хит-зоны перекрываются, и на touch
  // Konva мог отдать drag не той вершине («точка-двойник»). Правильное
  // решение (Mapbox GL Draw / Leaflet.Editable / Figma): не доверять
  // hit-test канвас-библиотеки, а считать выбор самим — по реальному
  // расстоянию пальца до каждой вершины. Перетаскивание идёт по
  // ОТНОСИТЕЛЬНОЙ дельте пальца от точки захвата.
  //
  // КРИТИЧНО: подписываемся ИСКЛЮЧИТЕЛЬНО на 'pointerdown/move/up', а НЕ на
  // 'mousedown touchstart' / 'mousemove touchmove' / 'mouseup touchend'.
  // Konva.Stage регистрирует нативные DOM-листенеры сразу на ВСЕ три
  // семейства событий; один физический тап приходит и как 'pointerdown', и
  // как 'touchstart' (а часто ещё и 'mousedown'). Подписка одним обработчиком
  // на 'mousedown touchstart' получала ДВА вызова на один жест — второй
  // приходил уже В СЕРЕДИНЕ драга и перезаписывал dragAnchorRef новым
  // анкором, и точка «отскакивала» обратно.
  useEffect(() => {
    const stage = stageRef.current?.getStage()
    if (!stage) return

    const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
      // Защита от повторного pointerdown посреди уже идущего жеста.
      if (dragAnchorRef.current || panAnchorRef.current) return

      const pointerCm = stageRef.current?.getPointerCm()
      const screenPointer = stage.getPointerPosition()
      if (!pointerCm || !screenPointer) return

      // Подавляем компат-события мыши/тача, которые браузер может выслать
      // вдогонку родному pointerdown.
      if (e.evt.cancelable) e.evt.preventDefault()

      const camera = stageRef.current?.getCamera()
      if (!camera) return
      const scaleAtDown = camera.baseScale * camera.stageScale
      // Допуск захвата в «физических» экранных пикселях (не зависит от
      // зума контура).
      const toleranceCm = VERTEX_HIT_TOLERANCE_PX / scaleAtDown

      const nearestIndex = findNearestVertexIndex(
        pointsRef.current,
        pointerCm,
        toleranceCm,
      )

      if (nearestIndex === null) {
        // Палец не рядом ни с одной вершиной — pan по пустому полю
        // (в draw-mode — потенциально клик «добавить точку»).
        panAnchorRef.current = {
          startScreenX: screenPointer.x,
          startScreenY: screenPointer.y,
          startStageX: stage.x(),
          startStageY: stage.y(),
          moved: false,
        }
        return
      }

      dispatch(setContourError(null))
      dragAnchorRef.current = {
        index: nearestIndex,
        startScreenX: screenPointer.x,
        startScreenY: screenPointer.y,
        scaleAtDown,
        originalPoint: { ...pointsRef.current[nearestIndex] },
        currentPoint: { ...pointsRef.current[nearestIndex] },
        moved: false,
      }
      setDragState({
        isDragging: true,
        draggedIndex: nearestIndex,
        localPoints: pointsRef.current.map(p => ({ x: p.x, y: p.y })),
      })
    }

    const handlePointerMove = () => {
      const anchor = dragAnchorRef.current
      if (anchor) {
        const screenPointer = stage.getPointerPosition()
        if (!screenPointer) return

        // Дельта в ЭКРАННЫХ пикселях / масштаб на момент захвата → см.
        const deltaX = (screenPointer.x - anchor.startScreenX) / anchor.scaleAtDown
        const deltaY = (screenPointer.y - anchor.startScreenY) / anchor.scaleAtDown
        if (!anchor.moved && Math.hypot(deltaX, deltaY) > 0.5) {
          anchor.moved = true
        }
        const newPoint = {
          x: anchor.originalPoint.x + deltaX,
          y: anchor.originalPoint.y + deltaY,
        }
        anchor.currentPoint = newPoint

        setDragState(prev => {
          if (!prev.isDragging) return prev
          return {
            ...prev,
            localPoints: prev.localPoints.map((p, i) =>
              i === anchor.index ? newPoint : p,
            ),
          }
        })
        return
      }

      const panAnchor = panAnchorRef.current
      if (panAnchor) {
        const screenPointer = stage.getPointerPosition()
        if (!screenPointer) return
        const dx = screenPointer.x - panAnchor.startScreenX
        const dy = screenPointer.y - panAnchor.startScreenY
        // Порог в экранных px — отличает реальный pan от дрожания на тапе.
        // КРИТИЧНО: пока порог не превышен, stage.position() вообще не
        // трогаем — иначе микро-дрожание навсегда сдвигает камеру (L-5).
        if (!panAnchor.moved && Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD_PX) {
          panAnchor.moved = true
        }
        if (panAnchor.moved) {
          const newX = panAnchor.startStageX + dx
          const newY = panAnchor.startStageY + dy
          stage.position({ x: newX, y: newY })
          stage.batchDraw()
          // Сетка должна следовать за камерой во время pan (gridBBox).
          scheduleTransformUpdate({ scale: stage.scaleX(), x: newX, y: newY })
        }
      }
    }

    const handlePointerUp = () => {
      const isDraw = modeRef.current === "draw"

      // ====== Ветка: жест начался на пустом поле (pan / draw-тап) ======
      const panAnchor = panAnchorRef.current
      if (panAnchor) {
        panAnchorRef.current = null

        if (!panAnchor.moved && isDraw) {
          // Чистый тап по пустому полю в draw-mode — добавляем точку.
          const pointerCm = stageRef.current?.getPointerCm()
          if (pointerCm) {
            const step = gridStepRef.current
            const snapped = {
              x: Math.round(pointerCm.cmX / step) * step,
              y: Math.round(pointerCm.cmY / step) * step,
            }
            dispatch(addPoint(snapped))
          }
        }
        return
      }

      // ====== Ветка: жест начался на вершине ======
      const anchor = dragAnchorRef.current
      if (!anchor) return
      dragAnchorRef.current = null

      if (!anchor.moved) {
        if (isDraw) {
          // Тап по первой точке без перемещения — замыкание контура (нужно
          // ≥ 3 точки). Тап по любой другой вершине в draw-mode ничего не
          // делает.
          if (anchor.index === 0 && pointsRef.current.length >= 3) {
            dispatch(setContourMode("edit"))
          }
        } else {
          // Чистый тап без перемещения — переключаем выделение вершины.
          dispatch(
            selectVertex(
              selectedVertexRef.current === anchor.index ? null : anchor.index,
            ),
          )
        }
        setDragState({ isDragging: false, draggedIndex: -1, localPoints: [] })
        return
      }

      const step = gridStepRef.current
      const snapped = {
        x: Math.round(anchor.currentPoint.x / step) * step,
        y: Math.round(anchor.currentPoint.y / step) * step,
      }

      if (isDraw) {
        // draw-mode: просто переносим вершину, без проверки самопересечения
        // (контур ещё не замкнут окончательно — промежуточная восьмёрка
        // нормальна, DESIGN §8.4).
        dispatch(movePoint({ index: anchor.index, point: snapped }))
        setDragState({ isDragging: false, draggedIndex: -1, localPoints: [] })
        return
      }

      const pointsToCheck = pointsRef.current.map((p, i) =>
        i === anchor.index ? snapped : p,
      )

      if (isSelfIntersecting(pointsToCheck)) {
        // Правка отклоняется, точка возвращается на место (D15).
        dispatch(
          setContourError("Стороны пересекаются — контур так не замкнуть"),
        )
      } else {
        dispatch(setContourError(null))
        dispatch(movePoint({ index: anchor.index, point: snapped }))
      }
      setDragState({ isDragging: false, draggedIndex: -1, localPoints: [] })
    }

    stage.on("pointerdown", handlePointerDown)
    stage.on("pointermove", handlePointerMove)
    stage.on("pointerup pointercancel", handlePointerUp)

    return () => {
      stage.off("pointerdown", handlePointerDown)
      stage.off("pointermove", handlePointerMove)
      stage.off("pointerup pointercancel", handlePointerUp)
      dragAnchorRef.current = null
      panAnchorRef.current = null
    }
  }, [dispatch])

  // Клавиатура (DESIGN §13): Esc снимает выделение, Delete удаляет
  // выделенную вершину (при ≥ 4 вершинах — слайс сам хранит guard).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch(selectVertex(null))
      } else if (e.key === "Delete" && selectedVertex != null) {
        dispatch(removePoint(selectedVertex))
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [dispatch, selectedVertex])

  // ====== Данные для рендера ======
  const renderPoints = dragState.isDragging ? dragState.localPoints : points
  const linePoints = renderPoints.flatMap(p => [
    p.x * SCALE_PX_PER_CM,
    p.y * SCALE_PX_PER_CM,
  ])
  const isClosed = renderPoints.length >= 3
  const perimeterM = renderPoints.length > 0
    ? polygonPerimeter(renderPoints) / 100
    : 0
  const areaM2 = isClosed ? grossAreaM2(renderPoints) : null

  const requestCancel = () => {
    if (isDirty) {
      setConfirmCancelOpen(true)
    } else {
      dispatch(closeContourEditor())
      onCancel()
    }
  }

  return (
    <div>
      <ContourToolbar
        mode={mode}
        pointsCount={renderPoints.length}
        gridStepCm={gridStepCm}
        error={error}
        onModeChange={m => {
          dispatch(setContourMode(m))
        }}
        onGridStepChange={step => {
          dispatch(setGridStep(step))
        }}
        onFit={() => {
          if (tightBBox) stageRef.current?.fitToBBox(tightBBox)
        }}
        onRectangle={() => {
          setRectangleOpen(true)
        }}
        onDone={() => {
          if (renderPoints.length >= 3) {
            dispatch(commitContour())
            onDone()
          }
        }}
        onCancel={requestCancel}
      />

      <div
        ref={containerRef}
        style={{ position: "relative", height: "70vh", width: "100%" }}
      >
        <ContourStage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scale={SCALE_PX_PER_CM}
          cursor={mode === "draw" ? "crosshair" : undefined}
          onTransformChange={t => {
            scheduleTransformUpdate(t)
          }}
        >
          {/* Сетка */}
          <ContourGridLayer
            minXCm={gridBBox.minX}
            minYCm={gridBBox.minY}
            maxXCm={gridBBox.maxX}
            maxYCm={gridBBox.maxY}
            scale={SCALE_PX_PER_CM}
            effectiveScale={SCALE_PX_PER_CM * stageTransform.scale}
          />

          {/* Линии контура */}
          {renderPoints.length > 0 && (
            <Line
              points={linePoints}
              stroke="#333"
              strokeWidth={2}
              closed={isClosed}
              fill={isClosed ? "rgba(25, 118, 210, 0.1)" : undefined}
            />
          )}

          {/* Вершины — разное поведение в draw/edit */}
          {renderPoints.map((point, index) =>
            mode === "draw" ? (
              /* DRAW: маленькие круги (чисто визуальные — драг и тап на точку
                 обрабатываются на уровне Stage, см. handlePointerDown/Up). */
              <Circle
                key={index}
                x={point.x * SCALE_PX_PER_CM}
                y={point.y * SCALE_PX_PER_CM}
                radius={5}
                fill={index === 0 ? "#4caf50" : "#1976d2"}
                stroke="#fff"
                strokeWidth={2}
                listening={false}
              />
            ) : (
              /* EDIT: крупные хендлы */
              <VertexHandle
                key={index}
                x={point.x * SCALE_PX_PER_CM}
                y={point.y * SCALE_PX_PER_CM}
                isSelected={selectedVertex === index}
                vertexIndex={index}
              />
            ),
          )}

          {/* EDIT ONLY: подписи длин */}
          {mode === "edit" &&
            renderPoints.length >= 2 &&
            renderPoints.map((_, i) => {
              const j = (i + 1) % renderPoints.length
              const from = renderPoints[i]
              const to = renderPoints[j]
              const length = segmentLength(from, to)
              const isHighlighted =
                selectedVertex !== null &&
                (selectedVertex === i || selectedVertex === j)
              return (
                <DimensionLabel
                  key={`dim-${String(i)}`}
                  fromX={from.x * SCALE_PX_PER_CM}
                  fromY={from.y * SCALE_PX_PER_CM}
                  toX={to.x * SCALE_PX_PER_CM}
                  toY={to.y * SCALE_PX_PER_CM}
                  lengthCm={length}
                  isHighlighted={isHighlighted}
                  zoomScale={stageTransform.scale}
                />
              )
            })}

          {/* EDIT ONLY + выбранная вершина: дуга угла */}
          {mode === "edit" &&
            selectedVertex !== null &&
            renderPoints.length >= 3 &&
            (() => {
              const n = renderPoints.length
              const idx = selectedVertex
              const prev = (idx - 1 + n) % n
              const next = (idx + 1) % n
              const angle = computeAngle(
                renderPoints[prev],
                renderPoints[idx],
                renderPoints[next],
              )
              return (
                <AngleLabel
                  vertexX={renderPoints[idx].x * SCALE_PX_PER_CM}
                  vertexY={renderPoints[idx].y * SCALE_PX_PER_CM}
                  angleDegrees={angle}
                  zoomScale={stageTransform.scale}
                />
              )
            })()}
        </ContourStage>
      </div>

      {/* Статус-строка (§9.1): вершины · периметр · площадь */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 text-muted small">
        <span>
          {String(renderPoints.length)} вершин · периметр {perimeterM.toFixed(1)} м
          {areaM2 != null && ` · площадь ${String(areaM2)} м²`}
          {renderPoints.length > 0 && renderPoints.length < 3 && " · замкните контур"}
        </span>
      </div>

      {/* Панель вершины (edit + выделенная) */}
      {mode === "edit" &&
        selectedVertex !== null &&
        renderPoints.length >= 3 &&
        (() => {
          const n = renderPoints.length
          const idx = selectedVertex
          const prev = (idx - 1 + n) % n
          const next = (idx + 1) % n
          const len1 = segmentLength(renderPoints[prev], renderPoints[idx]) / 100
          const len2 = segmentLength(renderPoints[idx], renderPoints[next]) / 100
          const angle = computeAngle(
            renderPoints[prev],
            renderPoints[idx],
            renderPoints[next],
          )
          return (
            <div className="card border-warning mt-2">
              <div className="card-body py-2 px-3">
                <div className="row g-1 small">
                  <div className="col-auto fw-bold">Вершина {String(idx + 1)}</div>
                  <div className="col-auto">стороны: {len1.toFixed(1)} м и {len2.toFixed(1)} м</div>
                  <div className="col-auto">угол {angle.toFixed(1)}°</div>
                  <div className="col-auto text-muted">
                    Del — удалить вершину (нужно ≥ 4)
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      {rectangleOpen && (
        <RectangleContourModal
          surfaceName="Контур"
          hasContour={renderPoints.length >= 3}
          onSubmit={(widthM, heightM) => {
            dispatch(replaceContour(rectangleContourForCommit(widthM, heightM)))
            setRectangleOpen(false)
          }}
          onClose={() => {
            setRectangleOpen(false)
          }}
        />
      )}

      {confirmCancelOpen && (
        <ConfirmDiscardDraftModal
          onConfirm={() => {
            setConfirmCancelOpen(false)
            dispatch(closeContourEditor())
            onCancel()
          }}
          onClose={() => {
            setConfirmCancelOpen(false)
          }}
        />
      )}
    </div>
  )
}
