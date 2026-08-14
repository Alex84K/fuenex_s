import type { FC } from "react"
import { summarizeByType } from "../../features/measurement/utils/areas"
import type { SurfaceAreaInput } from "../../features/measurement/utils/areas"

type Props = {
  surfaces: SurfaceAreaInput[]
}

// Сводка площадей по типам поверхностей (DESIGN §8.3) — то, ради чего type
// остался в схеме: «площадь пола отдельно от площади стен при переносе в
// смету». На верху списка комплектов это ответ на вопрос «зачем открывать
// проект» (§10.1); в редакторе комплекта — сводка одного комплекта.
// Группировка по строке без нормализации регистра (решение 6): «Стена» и
// «стена» — две группы.
export const AreaSummary: FC<Props> = ({ surfaces }) => {
  const rows = summarizeByType(surfaces)
  if (rows.length === 0) return null

  return (
    <div className="card shadow-sm border-0 mb-3">
      <div className="card-body p-3">
        <h6 className="fw-bold mb-2">Площади по типам поверхностей</h6>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th scope="col">Тип</th>
                <th scope="col" className="text-end">
                  Поверхностей
                </th>
                <th scope="col" className="text-end">
                  Валовая, м²
                </th>
                <th scope="col" className="text-end">
                  Чистая, м²
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.type}>
                  <td className="fw-semibold">{r.type || "—"}</td>
                  <td className="text-end">{r.count}</td>
                  <td className="text-end">{r.grossM2}</td>
                  <td className="text-end">{r.netM2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="form-text mt-1">
          Валовая — без вычета проёмов; чистая — с вычетом (DESIGN §8.2).
        </div>
      </div>
    </div>
  )
}
