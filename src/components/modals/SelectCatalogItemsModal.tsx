import type { FC } from "react"
import { useMemo, useState } from "react"
import { useGetCatalog } from "../../features/estimates/catalog.hooks"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import type { CatalogItem } from "../../features/estimates/types"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import { fromCatalogItem } from "../../features/estimates/utils/fromCatalog"
import { formatPlainMinor } from "../../features/estimates/utils/money"
import { ModalShell } from "./ModalShell"

type Props = {
  onAdd: (items: DraftItem[]) => void
  onClose: () => void
  /** "Каталог пуст" → switch to the catalog sub-tab (DESIGN §11.2). */
  onCreateCatalogItem: () => void
}

// Multiple-select catalog picker (D12): the same row can be added twice —
// each copy mints a fresh UUIDv7, the estimate is a snapshot. Quantity is
// per selected row, default 1.
export const SelectCatalogItemsModal: FC<Props> = ({
  onAdd,
  onClose,
  onCreateCatalogItem,
}) => {
  const { data: catalog = [], isError } = useGetCatalog()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("ALL")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  // id → quantity string of the selected rows
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  const toggle = (c: CatalogItem) => {
    setErrorMessage(null)
    setSelected(prev => {
      if (c.id in prev) {
        return Object.fromEntries(
          Object.entries(prev).filter(([id]) => id !== c.id),
        )
      }
      return { ...prev, [c.id]: "1" }
    })
  }

  const setQuantity = (id: string, value: string) => {
    setErrorMessage(null)
    setSelected(prev => ({ ...prev, [id]: value }))
  }

  const handleAdd = () => {
    const ids = Object.keys(selected)
    const drafts: DraftItem[] = []
    for (const id of ids) {
      const row = catalog.find(c => c.id === id)
      if (!row) continue
      const qty = parseQuantity(selected[id])
      if (qty === null) {
        setErrorMessage("Проверьте количество у выбранных позиций")
        return
      }
      drafts.push(fromCatalogItem(row, qty))
    }
    if (drafts.length === 0) return
    onAdd(drafts)
  }

  const selectedCount = Object.keys(selected).length

  return (
    <ModalShell title="Выбор позиций из каталога" onClose={onClose} size="lg">
      <div className="modal-body">
        {isError && (
          <div className="alert alert-danger" role="alert">
            Не удалось загрузить каталог
          </div>
        )}
        {errorMessage && (
          <div className="alert alert-warning" role="alert">
            {errorMessage}
          </div>
        )}

        {catalog.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-box-seam d-block fs-1 mb-3" />
            <p className="mb-3">Каталог пуст.</p>
            <button
              type="button"
              className="btn btn-primary fw-bold"
              onClick={onCreateCatalogItem}
            >
              <i className="bi bi-plus-lg me-1" />
              Создать расценку
            </button>
          </div>
        ) : (
          <>
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-surface">
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
                    id="picker-favorites"
                    checked={favoritesOnly}
                    onChange={e => {
                      setFavoritesOnly(e.target.checked)
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="picker-favorites"
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
                    <th scope="col">Наименование</th>
                    <th scope="col" style={{ width: "6rem" }}>
                      Ед.
                    </th>
                    <th
                      scope="col"
                      className="text-end"
                      style={{ width: "8rem" }}
                    >
                      Цена
                    </th>
                    <th scope="col" style={{ width: "6rem" }}>
                      Кол-во
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
                              toggle(c)
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
                        <td className="text-muted">{c.unit}</td>
                        <td className="text-end font-monospace">
                          {formatPlainMinor(c.sellingPriceMinor)}
                        </td>
                        <td>
                          {isChecked && (
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-control form-control-sm"
                              value={selected[c.id]}
                              aria-label={`Количество: ${c.title || "Без названия"}`}
                              onChange={e => {
                                setQuantity(c.id, e.target.value)
                              }}
                            />
                          )}
                        </td>
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
            : "позиции"}
        </button>
      </div>
    </ModalShell>
  )
}

const parseQuantity = (raw: string): number | null => {
  const cleaned = raw
    .trim()
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(",", ".")
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const v = Number(cleaned)
  if (!Number.isFinite(v) || v < 0 || v > ESTIMATE_LIMITS.maxQuantity)
    return null
  return v
}

const pluralize = (n: number): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "позицию"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "позиции"
  return "позиций"
}
