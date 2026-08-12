import type { FC } from "react"
import { useMemo, useState } from "react"
import { useGetTaskCatalog } from "../../features/planner/catalog.hooks"
import type { TaskCatalogItem } from "../../features/planner/types"
import { ModalShell } from "./ModalShell"

type Props = {
  onAdd: (items: TaskCatalogItem[]) => void
  onClose: () => void
  /** "Каталог пуст" → switch to the catalog sub-tab. */
  onCreateCatalogItem: () => void
}

// Multi-select catalog picker: the same row can be added twice — each copy
// mints a fresh UUIDv7 in the parent (taskFromCatalogItem), the list is a
// snapshot, not a reference (§5). No quantity: a task has none.
export const SelectTaskCatalogItemsModal: FC<Props> = ({
  onAdd,
  onClose,
  onCreateCatalogItem,
}) => {
  const { data: catalog = [], isError } = useGetTaskCatalog()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("ALL")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [selected, setSelected] = useState<Record<string, true>>({})

  const categories = useMemo(
    () =>
      Array.from(
        new Set(catalog.map(c => c.category).filter(c => c !== "")),
      ).sort(),
    [catalog],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog.filter(c => {
      if (favoritesOnly && !c.isFavorite) return false
      if (category !== "ALL" && c.category !== category) return false
      if (q === "") return true
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      )
    })
  }, [catalog, search, category, favoritesOnly])

  const toggle = (id: string) => {
    setSelected(prev => {
      if (id in prev) {
        return Object.fromEntries(
          Object.entries(prev).filter(([key]) => key !== id),
        )
      }
      return { ...prev, [id]: true }
    })
  }

  const handleAdd = () => {
    const ids = Object.keys(selected)
    if (ids.length === 0) return
    const rows = catalog.filter(c => c.id in selected)
    onAdd(rows)
  }

  const selectedCount = Object.keys(selected).length

  return (
    <ModalShell
      title="Выбор формулировок из каталога"
      onClose={onClose}
      size="lg"
    >
      <div className="modal-body">
        {isError && (
          <div className="alert alert-danger" role="alert">
            Не удалось загрузить каталог задач
          </div>
        )}

        {catalog.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-box-seam d-block fs-1 mb-3" />
            <p className="mb-3">Каталог задач пуст.</p>
            <button
              type="button"
              className="btn btn-primary fw-bold"
              onClick={onCreateCatalogItem}
            >
              <i className="bi bi-plus-lg me-1" />
              Создать формулировку
            </button>
          </div>
        ) : (
          <>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Поиск по названию, описанию, категории..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value)
                    }}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={category}
                  onChange={e => {
                    setCategory(e.target.value)
                  }}
                >
                  <option value="ALL">Все категории</option>
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-center">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="task-picker-favorites"
                    checked={favoritesOnly}
                    onChange={e => {
                      setFavoritesOnly(e.target.checked)
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="task-picker-favorites"
                  >
                    Только избранные
                  </label>
                </div>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: "18rem" }}>
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: "2.5rem" }} />
                    <th scope="col">Что делать</th>
                    <th scope="col" style={{ width: "10rem" }}>
                      Категория
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const isChecked = c.id in selected
                    return (
                      <tr
                        key={c.id}
                        className={isChecked ? "table-primary" : undefined}
                      >
                        <td>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isChecked}
                            aria-label={`Выбрать: ${c.title || "Без названия"}`}
                            onChange={() => {
                              toggle(c.id)
                            }}
                          />
                        </td>
                        <td>
                          <div className="text-break">
                            {c.title || (
                              <span className="text-muted">Без названия</span>
                            )}
                          </div>
                          {c.description && (
                            <div className="text-muted small text-break">
                              {c.description}
                            </div>
                          )}
                        </td>
                        <td className="text-muted small">{c.category}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="btn btn-primary fw-bold"
          disabled={selectedCount === 0}
          onClick={handleAdd}
        >
          Добавить{" "}
          {selectedCount > 0
            ? `${String(selectedCount)} ${pluralize(selectedCount)}`
            : "формулировки"}
        </button>
      </div>
    </ModalShell>
  )
}

const pluralize = (n: number): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "задачу"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "задачи"
  return "задач"
}
