import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"
import { ApiError } from "../../utils/api"
import {
  useDeleteCatalogItem,
  useGetCatalog,
  usePatchCatalogItem,
} from "../../features/estimates/catalog.hooks"
import type { CatalogItem } from "../../features/estimates/types"
import { formatPlainMinor } from "../../features/estimates/utils/money"
import { CatalogItemFormModal } from "../modals/CatalogItemFormModal"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"

const PAGE_SIZE = 100

// The owner's price list: the whole catalog in one request (F-6), so
// search, filtering and grouping happen on the client. Favorites first,
// then the server order (title, id) — a stable sort keeps it.
export const CatalogManager: FC = () => {
  const { data: catalog = [], isLoading, isError, error } = useGetCatalog()
  const patchCatalogItem = usePatchCatalogItem()
  const deleteCatalogItem = useDeleteCatalogItem()

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("ALL")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [formTarget, setFormTarget] = useState<"new" | CatalogItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null)

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

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
    return copy
  }, [filtered])

  // New filters reset the "Показать ещё" pagination.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [search, category, favoritesOnly])

  const visible = sorted.slice(0, visibleCount)

  const toggleFavorite = (c: CatalogItem) => {
    patchCatalogItem.mutate({ id: c.id, patch: { isFavorite: !c.isFavorite } })
  }

  const loadError =
    error instanceof ApiError ? error.message : "Не удалось загрузить каталог"

  const favoriteError =
    patchCatalogItem.error instanceof ApiError
      ? patchCatalogItem.error.message
      : "Не удалось изменить избранное"

  const deleteError =
    deleteCatalogItem.error instanceof ApiError
      ? deleteCatalogItem.error.message
      : "Не удалось удалить расценку"

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
        <h5 className="fw-bold mb-0">Каталог расценок</h5>
        <button
          type="button"
          className="btn btn-primary btn-sm fw-semibold"
          onClick={() => {
            setFormTarget("new")
          }}
        >
          <i className="bi bi-plus-lg me-1" />
          Новая расценка
        </button>
      </div>
      <p className="text-muted small mb-3">
        Каталог доступен во всех проектах.
      </p>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}
      {patchCatalogItem.error && (
        <div className="alert alert-warning" role="alert">
          {favoriteError}
        </div>
      )}

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
              id="catalog-favorites"
              checked={favoritesOnly}
              onChange={e => {
                setFavoritesOnly(e.target.checked)
              }}
            />
            <label className="form-check-label" htmlFor="catalog-favorites">
              Только избранные
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-5" />
              <span className="placeholder col-3 d-block mt-3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-box-seam d-block fs-1 mb-3" />
          <p className="mb-0">
            {catalog.length === 0
              ? "Каталог пуст — создайте первую расценку."
              : "Ничего не найдено по заданным условиям."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="table-responsive d-none d-lg-block">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th scope="col">Наименование</th>
                  <th scope="col" style={{ width: "8rem" }}>
                    Категория
                  </th>
                  <th scope="col" style={{ width: "5rem" }}>
                    Ед.
                  </th>
                  <th
                    scope="col"
                    className="text-end"
                    style={{ width: "8rem" }}
                  >
                    Закупка
                  </th>
                  <th
                    scope="col"
                    className="text-end"
                    style={{ width: "8rem" }}
                  >
                    Продажа
                  </th>
                  <th scope="col" style={{ width: "3rem" }} />
                  <th scope="col" style={{ width: "6rem" }} />
                </tr>
              </thead>
              <tbody>
                {visible.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-semibold text-break">
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
                    <td className="small text-muted">{c.category}</td>
                    <td className="small text-muted">{c.unit}</td>
                    <td className="text-end font-monospace">
                      {formatPlainMinor(c.purchasePriceMinor)}
                    </td>
                    <td className="text-end font-monospace fw-semibold">
                      {formatPlainMinor(c.sellingPriceMinor)}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-decoration-none"
                        title={
                          c.isFavorite ? "Убрать из избранного" : "В избранное"
                        }
                        aria-label={
                          c.isFavorite ? "Убрать из избранного" : "В избранное"
                        }
                        onClick={() => {
                          toggleFavorite(c)
                        }}
                      >
                        <i
                          className={`bi ${c.isFavorite ? "bi-star-fill text-warning" : "bi-star"}`}
                        />
                      </button>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          title="Редактировать"
                          aria-label="Редактировать"
                          onClick={() => {
                            setFormTarget(c)
                          }}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          title="Удалить"
                          aria-label="Удалить"
                          onClick={() => {
                            setDeleteTarget(c)
                          }}
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="d-lg-none d-flex flex-column gap-2">
            {visible.map(c => (
              <div className="card shadow-sm" key={c.id}>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-break">
                        {c.title || (
                          <span className="text-muted">Без названия</span>
                        )}
                      </div>
                      <div className="text-muted small">
                        {[c.category, c.unit].filter(v => v !== "").join(" · ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0 text-decoration-none flex-shrink-0"
                      title={
                        c.isFavorite ? "Убрать из избранного" : "В избранное"
                      }
                      aria-label={
                        c.isFavorite ? "Убрать из избранного" : "В избранное"
                      }
                      onClick={() => {
                        toggleFavorite(c)
                      }}
                    >
                      <i
                        className={`bi ${c.isFavorite ? "bi-star-fill text-warning" : "bi-star"}`}
                      />
                    </button>
                  </div>
                  {c.description && (
                    <div className="text-muted small text-break mt-1">
                      {c.description}
                    </div>
                  )}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="font-monospace">
                      <span className="fw-semibold">
                        {formatPlainMinor(c.sellingPriceMinor)}
                      </span>
                      <span className="text-muted small">
                        {" "}
                        / закупка {formatPlainMinor(c.purchasePriceMinor)}
                      </span>
                    </div>
                    <div className="d-inline-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title="Редактировать"
                        aria-label="Редактировать"
                        onClick={() => {
                          setFormTarget(c)
                        }}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Удалить"
                        aria-label="Удалить"
                        onClick={() => {
                          setDeleteTarget(c)
                        }}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {visibleCount < sorted.length && (
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setVisibleCount(n => n + PAGE_SIZE)
                }}
              >
                Показать ещё ({sorted.length - visibleCount})
              </button>
            </div>
          )}
        </>
      )}

      {formTarget !== null && (
        <CatalogItemFormModal
          item={formTarget === "new" ? null : formTarget}
          onClose={() => {
            setFormTarget(null)
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Удаление расценки"
          message={
            <>
              Удалить расценку{" "}
              <strong>{deleteTarget.title || "Без названия"}</strong>?
              Существующие сметы не изменятся — позиции в них — снимки.
            </>
          }
          error={deleteError}
          isPending={deleteCatalogItem.isPending}
          onConfirm={() => {
            deleteCatalogItem.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null)
              },
            })
          }}
          onClose={() => {
            setDeleteTarget(null)
          }}
        />
      )}
    </div>
  )
}
