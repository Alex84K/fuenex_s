import type { ReactNode } from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { Stage, Layer } from "react-konva"
import type Konva from "konva"

// ContourStageHandle — the imperative surface of the canvas: coordinate
// conversion, camera state, DOM stage access and fit-to-bounds.
export type ContourStageHandle = {
  /** Перевести экранные координаты (px) в сантиметры с учётом zoom/pan */
  getPointerCm(): { cmX: number; cmY: number } | null
  /** Получить текущий масштаб камеры */
  getCamera(): {
    stageScale: number
    stageX: number
    stageY: number
    baseScale: number
  }
  /** Получить DOM-ссылку на stage Konva */
  getStage: () => Konva.Stage | null
  /**
   * Вписать прямоугольник (в см, мировые координаты) в видимую область с
   * отступом — для больших контуров (вплоть до 30×30 м), которые не видны
   * целиком при стартовом/ручном зуме. Центрирует и масштабирует Stage так,
   * чтобы bbox поместился с учётом paddingRatio.
   */
  fitToBBox(
    bboxCm: { minX: number; minY: number; maxX: number; maxY: number },
    opts?: { paddingRatio?: number },
  ): void
}

type Props = {
  /** Дочерние слои/компоненты для рендера внутри <Layer> */
  children: ReactNode
  /** Ширина контейнера (px) */
  width: number
  /** Высота контейнера (px) */
  height: number
  /** Масштаб (см → px) */
  scale?: number
  /**
   * Вызывается после изменения zoom (колесо/пинч/fitToBBox) с новой
   * трансформацией Stage — scale (относительный, без учёта baseScale) и
   * экранная позиция x/y. Нужен потребителям, которым важно адаптировать
   * что-то под текущую камеру реактивно — например шаг сетки (LOD) и
   * видимую область сетки, которые иначе остаются «вморожены» в момент
   * рендера, так как сам zoom/pan применяется императивно прямо на
   * Konva-узел, без прохода через React state (см. handleWheel/
   * handleNativeTouchMove).
   */
  onTransformChange?: (transform: {
    scale: number
    x: number
    y: number
  }) => void
  /** Явный override курсора (например 'crosshair' в draw-mode). */
  cursor?: string
  /** Разрешить колесо/pinch-zoom. */
  zoomable?: boolean
}

/** Пикселей на 1 см (по умолчанию) */
const DEFAULT_SCALE = 3
/** Границы zoom. Нижняя занижена относительно «разумного» 0.1, чтобы
 *  вписать в видимую область контур 30×30 м на небольшом экране
 *  (см. fitToBBox). */
const MIN_SCALE = 0.02
const MAX_SCALE = 10

/**
 * Единый холст react-konva контура (перенос SimStage.tsx из образца).
 * Предоставляет zoom/pan и пересчёт координат; pan/выбор/драг вершин
 * ведутся НЕ Konva-пропами, а вручную в ContourEditorView (см. большой
 * комментарий там про «точку-двойник» и гонку drag-pipeline'ов).
 */
export const ContourStage = forwardRef<ContourStageHandle, Props>(
  (
    {
      children,
      width,
      height,
      scale: scaleProp,
      onTransformChange,
      cursor,
      zoomable = true,
    },
    ref,
  ) => {
    const stageRef = useRef<Konva.Stage>(null)
    const baseScale = scaleProp ?? DEFAULT_SCALE

    // Зеркало в рефе — тот же приём, что и для onTransformChangeRef ниже:
    // pinch-обработчик навешан один раз (deps: []) и не должен
    // пересоздаваться из-за смены zoomable между рендерами.
    const zoomableRef = useRef(zoomable)
    useEffect(() => {
      zoomableRef.current = zoomable
    }, [zoomable])

    const onTransformChangeRef = useRef(onTransformChange)
    useEffect(() => {
      onTransformChangeRef.current = onTransformChange
    }, [onTransformChange])

    // Pinch-zoom (мобильные/тач): нет события "wheel" на тач-устройствах,
    // поэтому масштаб по жесту двумя пальцами считаем отдельно по дистанции
    // между касаниями.
    const lastPinchDistRef = useRef(0)
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null)

    useImperativeHandle(
      ref,
      () => ({
        getPointerCm() {
          const stage = stageRef.current
          if (!stage) return null
          const pointer = stage.getPointerPosition()
          if (!pointer) return null
          return {
            cmX: (pointer.x - stage.x()) / (stage.scaleX() * baseScale),
            cmY: (pointer.y - stage.y()) / (stage.scaleY() * baseScale),
          }
        },
        getCamera() {
          const stage = stageRef.current
          return {
            stageScale: stage?.scaleX() ?? 1,
            stageX: stage?.x() ?? 0,
            stageY: stage?.y() ?? 0,
            baseScale,
          }
        },
        getStage: () => stageRef.current,
        fitToBBox(bboxCm, opts) {
          const stage = stageRef.current
          if (!stage) return

          const paddingRatio = opts?.paddingRatio ?? 0.88
          const bboxWidthCm = Math.max(bboxCm.maxX - bboxCm.minX, 1)
          const bboxHeightCm = Math.max(bboxCm.maxY - bboxCm.minY, 1)
          const bboxWidthPx = bboxWidthCm * baseScale
          const bboxHeightPx = bboxHeightCm * baseScale

          const scaleX = (width * paddingRatio) / bboxWidthPx
          const scaleY = (height * paddingRatio) / bboxHeightPx
          const newScale = Math.max(MIN_SCALE, Math.min(scaleX, scaleY, MAX_SCALE))

          const centerXCm = (bboxCm.minX + bboxCm.maxX) / 2
          const centerYCm = (bboxCm.minY + bboxCm.maxY) / 2

          const newX = width / 2 - centerXCm * baseScale * newScale
          const newY = height / 2 - centerYCm * baseScale * newScale
          stage.scale({ x: newScale, y: newScale })
          stage.position({ x: newX, y: newY })
          stage.batchDraw()
          onTransformChangeRef.current?.({ scale: newScale, x: newX, y: newY })
        },
      }),
      [baseScale, width, height],
    )

    // Zoom колесом мыши — устанавливаем значения напрямую на Konva Stage,
    // без state
    const handleWheel = useCallback(
      (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault()
        if (!zoomable) return
        const stage = stageRef.current
        if (!stage) return

        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()
        if (!pointer) return

        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        }

        const direction = e.evt.deltaY > 0 ? -1 : 1
        const newScale = direction > 0 ? oldScale * 1.05 : oldScale / 1.05
        const clampedScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE))

        const newX = pointer.x - mousePointTo.x * clampedScale
        const newY = pointer.y - mousePointTo.y * clampedScale
        stage.scale({ x: clampedScale, y: clampedScale })
        stage.position({ x: newX, y: newY })
        stage.batchDraw()
        onTransformChangeRef.current?.({
          scale: clampedScale,
          x: newX,
          y: newY,
        })
      },
      [baseScale, zoomable],
    )

    // Pinch-zoom двумя пальцами — нативные DOM-листенеры прямо на контейнере
    // Stage, а НЕ Konva-пропы onTouchMove/onTouchEnd. Причина: Stage
    // draggable по умолчанию, и как только первый палец касается экрана,
    // Konva уходит в свой внутренний drag-pipeline (pan) — Konva-событие
    // "touchmove" в этот момент может не доходить до обработчика, заданного
    // через проп (наблюдалось в Safari И Opera одинаково). Нативный
    // addEventListener на контейнере получает ВСЕ touchmove от браузера
    // напрямую, независимо от внутреннего состояния Konva.
    useEffect(() => {
      const stage = stageRef.current
      if (!stage) return
      const container = stage.container()

      const handleNativeTouchMove = (evt: TouchEvent) => {
        if (evt.touches.length !== 2) return
        if (!zoomableRef.current) return
        evt.preventDefault()

        if (stage.isDragging()) {
          stage.stopDrag()
        }

        const rect = container.getBoundingClientRect()
        const p1 = {
          x: evt.touches[0].clientX - rect.left,
          y: evt.touches[0].clientY - rect.top,
        }
        const p2 = {
          x: evt.touches[1].clientX - rect.left,
          y: evt.touches[1].clientY - rect.top,
        }

        const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

        if (!lastPinchCenterRef.current || !lastPinchDistRef.current) {
          lastPinchCenterRef.current = center
          lastPinchDistRef.current = dist
          return
        }

        const oldScale = stage.scaleX()
        const pointTo = {
          x: (lastPinchCenterRef.current.x - stage.x()) / oldScale,
          y: (lastPinchCenterRef.current.y - stage.y()) / oldScale,
        }

        const scaleBy = dist / lastPinchDistRef.current
        const newScale = Math.max(MIN_SCALE, Math.min(oldScale * scaleBy, MAX_SCALE))

        const dx = center.x - lastPinchCenterRef.current.x
        const dy = center.y - lastPinchCenterRef.current.y

        const newX = center.x - pointTo.x * newScale + dx
        const newY = center.y - pointTo.y * newScale + dy
        stage.scale({ x: newScale, y: newScale })
        stage.position({ x: newX, y: newY })
        stage.batchDraw()
        onTransformChangeRef.current?.({ scale: newScale, x: newX, y: newY })

        lastPinchDistRef.current = dist
        lastPinchCenterRef.current = center
      }

      const handleNativeTouchEnd = (evt: TouchEvent) => {
        if (evt.touches.length < 2) {
          lastPinchDistRef.current = 0
          lastPinchCenterRef.current = null
        }
      }

      // passive:false — обязательно, иначе preventDefault() в touchmove
      // игнорируется браузером (включая Opera/Chromium).
      container.addEventListener("touchmove", handleNativeTouchMove, {
        passive: false,
      })
      container.addEventListener("touchend", handleNativeTouchEnd, {
        passive: false,
      })
      container.addEventListener("touchcancel", handleNativeTouchEnd, {
        passive: false,
      })

      return () => {
        container.removeEventListener("touchmove", handleNativeTouchMove)
        container.removeEventListener("touchend", handleNativeTouchEnd)
        container.removeEventListener("touchcancel", handleNativeTouchEnd)
      }
    }, [])

    return (
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={false}
        onWheel={handleWheel}
        style={{
          background: "#f8f9fa",
          cursor: cursor ?? "default",
          touchAction: "none",
        }}
      >
        <Layer>{children}</Layer>
      </Stage>
    )
  },
)

ContourStage.displayName = "ContourStage"
