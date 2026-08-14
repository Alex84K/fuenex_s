import type { FC } from "react"
import { lazy, Suspense, useState } from "react"
import {
  useGetMeasurementTree,
  usePutMeasurementSet,
} from "../../features/measurement/measurement.hooks"
import { uuidv7 } from "../../utils/uuid"
import type { Project } from "../../features/projects/types"
import { MeasurementSetList } from "./MeasurementSetList"
import { MeasurementSetEditor } from "./MeasurementSetEditor"
import { MeasurementSetFormModal } from "../modals/MeasurementSetFormModal"

// D18 (DESIGN §9): весь Konva живёт только в этом чанке — контурный редактор
// грузится лениво, konva/react-konva не попадают в основной бандл.
const ContourEditorView = lazy(() =>
  import("./contour/ContourEditorView").then(m => ({
    default: m.ContourEditorView,
  })),
)

// Корень фичи (DESIGN §1): три view — list → set → contour, состояние здесь.
export const MeasurementTab: FC<{ project: Project }> = ({ project }) => {
  const [view, setView] = useState<"list" | "set" | "contour">("list")
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [contourSurfaceId, setContourSurfaceId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data } = useGetMeasurementTree(project.id)
  const putSet = usePutMeasurementSet()

  const goList = () => {
    setView("list")
    setSelectedSetId(null)
    setContourSurfaceId(null)
  }

  const handleCreate = (values: {
    name: string
    note: string
    scanSource: "LIDAR" | "AR_RULER" | "MANUAL"
  }) => {
    // New sets go to the end of the list (DESIGN §10.1 ordering).
    const positions = data?.measurementSets.map(s => s.position) ?? []
    const position = positions.length > 0 ? Math.max(...positions) + 1 : 0

    // Фаза 5: создание отправляет литерал с явным surfaces: [] — единственная
    // ручная сборка тела в фиче; в фазе 6 её заменяет buildSetBody.
    const id = uuidv7()
    void putSet.mutateAsync(
      {
        id,
        data: {
          projectId: project.id,
          name: values.name,
          note: values.note,
          position,
          scanSource: values.scanSource,
          surfaces: [],
        },
      },
      {
        onSuccess: () => {
          setCreateOpen(false)
        },
      },
    )
  }

  return (
    <div>
      {view === "list" && (
        <MeasurementSetList
          projectId={project.id}
          onCreate={() => {
            setCreateOpen(true)
          }}
          onOpen={id => {
            setSelectedSetId(id)
            setView("set")
          }}
        />
      )}

      {view === "set" && selectedSetId != null && (
        <MeasurementSetEditor
          project={project}
          setId={selectedSetId}
          onExit={goList}
          onOpenContour={surfaceId => {
            setContourSurfaceId(surfaceId)
            setView("contour")
          }}
        />
      )}

      {view === "contour" &&
        selectedSetId != null &&
        contourSurfaceId != null && (
          <Suspense
            fallback={
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Загрузка редактора...</span>
                </div>
              </div>
            }
          >
            <ContourEditorView
              surfaceId={contourSurfaceId}
              onDone={() => {
                setView("set")
                setContourSurfaceId(null)
              }}
              onCancel={() => {
                setView("set")
                setContourSurfaceId(null)
              }}
            />
          </Suspense>
        )}

      {createOpen && (
        <MeasurementSetFormModal
          mode="create"
          initialName=""
          initialNote=""
          initialScanSource="MANUAL"
          isPending={putSet.isPending}
          error={
            putSet.isError
              ? "Не удалось создать комплект. Попробуйте ещё раз."
              : null
          }
          onSubmit={handleCreate}
          onClose={() => {
            setCreateOpen(false)
          }}
        />
      )}
    </div>
  )
}
