import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import { computeItemTotalMinor } from "../../features/estimates/utils/totals"
import {
  formatMinor,
  formatPlainMinor,
  MINOR,
  parseMoneyToMinor,
} from "../../features/estimates/utils/money"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"

type Props = {
  items: DraftItem[]
  /** null → template editor (no currency on templates). */
  currency: string | null
  showPurchase: boolean
  /** baseUpdatedAt / template.updatedAt — clears input buffers after a server round-trip. */
  resetToken: string | null
  onAddEmpty: () => void
  onOpenCatalog: () => void
  onCommit: (id: string, patch: Partial<DraftItem>) => void
  onRemove: (id: string) => void
  onMove: (from: number, to: number) => void
  onEditFields: (id: string) => void
  onToggleShowPurchase: () => void
}

// Desktop table (d-lg-table) + mobile cards (d-lg-none) — the only pure-
// Bootstrap part of the feature, taken from the offer sample (DESIGN §8.2).
// Numeric fields are string buffers committed on blur; garbage or out-of-
// range values revert to the draft value (D5).
export const EstimateItemsTable: FC<Props> = ({
  items,
  currency,
  showPurchase,
  resetToken,
  onAddEmpty,
  onOpenCatalog,
  onCommit,
  onRemove,
  onMove,
  onEditFields,
  onToggleShowPurchase,
}) => {
  const [qtyBuffer, setQtyBuffer] = useState<Partial<Record<string, string>>>(
    {},
  )
  const [purchaseBuffer, setPurchaseBuffer] = useState<
    Partial<Record<string, string>>
  >({})
  const [sellingBuffer, setSellingBuffer] = useState<
    Partial<Record<string, string>>
  >({})
  const [search, setSearch] = useState("")
  const [removeTarget, setRemoveTarget] = useState<DraftItem | null>(null)

  // After setInitialDraft (server response / conflict reload) the buffers
  // may hold text for ids that no longer carry it — clear them.
  useEffect(() => {
    setQtyBuffer({})
    setPurchaseBuffer({})
    setSellingBuffer({})
  }, [resetToken])

  const atMax = items.length >= ESTIMATE_LIMITS.maxItems
  const showCounter = items.length >= 900

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === "") return items
    return items.filter(
      it =>
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q),
    )
  }, [items, search])
  const isFiltering = search.trim() !== ""

  const fmt = (minor: number) =>
    currency ? formatMinor(minor, currency) : formatPlainMinor(minor)

  const dropKey = (
    rec: Partial<Record<string, string>>,
    id: string,
  ): Partial<Record<string, string>> => {
    if (!(id in rec)) return rec
    return Object.fromEntries(Object.entries(rec).filter(([key]) => key !== id))
  }

  const parseQty = (raw: string): number | null => {
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

  const commitQty = (item: DraftItem, raw: string) => {
    setQtyBuffer(b => dropKey(b, item.id))
    const qty = parseQty(raw)
    if (qty === null || qty === item.quantity) return
    onCommit(item.id, { quantity: qty })
  }

  const commitPrice = (
    item: DraftItem,
    field: "purchasePriceMinor" | "sellingPriceMinor",
    raw: string,
  ) => {
    const setBuffer =
      field === "purchasePriceMinor" ? setPurchaseBuffer : setSellingBuffer
    setBuffer(b => dropKey(b, item.id))
    const minor = parseMoneyToMinor(raw)
    if (
      minor === null ||
      minor > ESTIMATE_LIMITS.maxPriceMinor ||
      minor === item[field]
    )
      return
    onCommit(item.id, { [field]: minor })
  }

  const qtyValue = (item: DraftItem) =>
    qtyBuffer[item.id] ?? String(item.quantity)
  const priceValue = (
    item: DraftItem,
    field: "purchasePriceMinor" | "sellingPriceMinor",
  ) => {
    const buffer =
      field === "purchasePriceMinor" ? purchaseBuffer : sellingBuffer
    const buffered = buffer[item.id]
    if (buffered !== undefined) return buffered
    return (item[field] / MINOR).toString()
  }

  const isEmptyItem = (it: DraftItem): boolean =>
    it.title === "" &&
    it.description === "" &&
    it.unit === "" &&
    it.purchasePriceMinor === 0 &&
    it.sellingPriceMinor === 0

  const handleDelete = (item: DraftItem) => {
    if (isEmptyItem(item)) {
      onRemove(item.id)
      return
    }
    setRemoveTarget(item)
  }

  const rowMargin = (item: DraftItem): number =>
    computeItemTotalMinor(item.quantity, item.sellingPriceMinor) -
    computeItemTotalMinor(item.quantity, item.purchasePriceMinor)

  const emptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="text-center text-muted py-4">
        {isFiltering
          ? "Ничего не найдено по заданному условию."
          : "Позиций пока нет — добавьте из каталога или пустую строку."}
      </td>
    </tr>
  )

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="input-group" style={{ maxWidth: "18rem" }}>
            <span className="input-group-text bg-surface">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск по позициям..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
              }}
            />
          </div>
          <div className="form-check form-switch ms-auto">
            <input
              className="form-check-input"
              type="checkbox"
              id="show-purchase"
              checked={showPurchase}
              onChange={onToggleShowPurchase}
            />
            <label className="form-check-label" htmlFor="show-purchase">
              Показать закупку
            </label>
          </div>
          {showCounter && (
            <span className="text-muted small">
              {items.length} / {ESTIMATE_LIMITS.maxItems}
            </span>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={onOpenCatalog}
            disabled={atMax}
          >
            <i className="bi bi-box-seam me-1" />
            Из каталога
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onAddEmpty}
            disabled={atMax}
          >
            <i className="bi bi-plus-lg me-1" />
            Пустая строка
          </button>
        </div>

        {/* Desktop */}
        <table className="table align-middle d-none d-lg-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: "3.5rem" }}>
                №
              </th>
              <th scope="col">Наименование</th>
              <th scope="col" style={{ width: "5rem" }}>
                Ед.
              </th>
              <th scope="col" style={{ width: "7rem" }}>
                Кол-во
              </th>
              {showPurchase && (
                <th scope="col" style={{ width: "8rem" }}>
                  Закупка
                </th>
              )}
              <th scope="col" style={{ width: "8rem" }}>
                Продажа
              </th>
              {showPurchase && (
                <th scope="col" className="text-end" style={{ width: "8rem" }}>
                  Маржа
                </th>
              )}
              <th scope="col" className="text-end" style={{ width: "9rem" }}>
                Сумма
              </th>
              <th scope="col" style={{ width: "5rem" }} />
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0
              ? emptyRow(showPurchase ? 9 : 7)
              : visibleItems.map(item => {
                  const index = items.indexOf(item)
                  const total = computeItemTotalMinor(
                    item.quantity,
                    item.sellingPriceMinor,
                  )
                  const margin = rowMargin(item)
                  return (
                    <tr
                      key={item.id}
                      className={
                        item.quantity === 0 || total === 0
                          ? "text-muted"
                          : undefined
                      }
                    >
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <span className="small">{index + 1}</span>
                          <div className="d-flex flex-column">
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-decoration-none lh-1"
                              disabled={isFiltering || index === 0}
                              onClick={() => {
                                onMove(index, index - 1)
                              }}
                              title="Выше"
                              aria-label="Выше"
                            >
                              <i className="bi bi-chevron-up" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-link p-0 text-decoration-none lh-1"
                              disabled={
                                isFiltering || index === items.length - 1
                              }
                              onClick={() => {
                                onMove(index, index + 1)
                              }}
                              title="Ниже"
                              aria-label="Ниже"
                            >
                              <i className="bi bi-chevron-down" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-break">
                          {item.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-muted small text-break">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="small">{item.unit}</td>
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="form-control form-control-sm"
                          aria-label="Количество"
                          value={qtyValue(item)}
                          onChange={e => {
                            setQtyBuffer(b => ({
                              ...b,
                              [item.id]: e.target.value,
                            }))
                          }}
                          onBlur={e => {
                            commitQty(item, e.target.value)
                          }}
                        />
                      </td>
                      {showPurchase && (
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control form-control-sm"
                            aria-label="Закупка"
                            value={priceValue(item, "purchasePriceMinor")}
                            onChange={e => {
                              setPurchaseBuffer(b => ({
                                ...b,
                                [item.id]: e.target.value,
                              }))
                            }}
                            onBlur={e => {
                              commitPrice(
                                item,
                                "purchasePriceMinor",
                                e.target.value,
                              )
                            }}
                          />
                        </td>
                      )}
                      <td>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="form-control form-control-sm"
                          aria-label="Продажа"
                          value={priceValue(item, "sellingPriceMinor")}
                          onChange={e => {
                            setSellingBuffer(b => ({
                              ...b,
                              [item.id]: e.target.value,
                            }))
                          }}
                          onBlur={e => {
                            commitPrice(
                              item,
                              "sellingPriceMinor",
                              e.target.value,
                            )
                          }}
                        />
                      </td>
                      {showPurchase && (
                        <td
                          className={`text-end font-monospace${margin < 0 ? " text-danger" : ""}`}
                        >
                          {fmt(margin)}
                        </td>
                      )}
                      <td className="text-end font-monospace fw-semibold">
                        {fmt(total)}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title="Редактировать поля"
                            aria-label="Редактировать поля"
                            onClick={() => {
                              onEditFields(item.id)
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
                              handleDelete(item)
                            }}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="d-lg-none d-flex flex-column gap-2">
          {visibleItems.length === 0 ? (
            <div className="text-center text-muted py-4">
              {isFiltering
                ? "Ничего не найдено по заданному условию."
                : "Позиций пока нет — добавьте из каталога или пустую строку."}
            </div>
          ) : (
            visibleItems.map(item => {
              const index = items.indexOf(item)
              const total = computeItemTotalMinor(
                item.quantity,
                item.sellingPriceMinor,
              )
              const margin = rowMargin(item)
              return (
                <div className="card shadow-sm" key={item.id}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-semibold text-break">
                          {item.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="text-muted small text-break">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="d-inline-flex flex-column flex-shrink-0">
                        <div className="d-flex gap-1 mb-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title="Выше"
                            aria-label="Выше"
                            disabled={isFiltering || index === 0}
                            onClick={() => {
                              onMove(index, index - 1)
                            }}
                          >
                            <i className="bi bi-chevron-up" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title="Ниже"
                            aria-label="Ниже"
                            disabled={isFiltering || index === items.length - 1}
                            onClick={() => {
                              onMove(index, index + 1)
                            }}
                          >
                            <i className="bi bi-chevron-down" />
                          </button>
                        </div>
                        <div className="d-flex gap-1 justify-content-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            title="Редактировать поля"
                            aria-label="Редактировать поля"
                            onClick={() => {
                              onEditFields(item.id)
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
                              handleDelete(item)
                            }}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="row g-2">
                      <div className="col-4">
                        <label
                          className="form-label small mb-1"
                          htmlFor={`qty-${item.id}`}
                        >
                          Кол-во
                        </label>
                        <input
                          id={`qty-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          className="form-control form-control-sm"
                          value={qtyValue(item)}
                          onChange={e => {
                            setQtyBuffer(b => ({
                              ...b,
                              [item.id]: e.target.value,
                            }))
                          }}
                          onBlur={e => {
                            commitQty(item, e.target.value)
                          }}
                        />
                      </div>
                      {showPurchase && (
                        <div className="col-4">
                          <label
                            className="form-label small mb-1"
                            htmlFor={`purchase-${item.id}`}
                          >
                            Закупка
                          </label>
                          <input
                            id={`purchase-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            className="form-control form-control-sm"
                            value={priceValue(item, "purchasePriceMinor")}
                            onChange={e => {
                              setPurchaseBuffer(b => ({
                                ...b,
                                [item.id]: e.target.value,
                              }))
                            }}
                            onBlur={e => {
                              commitPrice(
                                item,
                                "purchasePriceMinor",
                                e.target.value,
                              )
                            }}
                          />
                        </div>
                      )}
                      <div className="col-4">
                        <label
                          className="form-label small mb-1"
                          htmlFor={`selling-${item.id}`}
                        >
                          Продажа
                        </label>
                        <input
                          id={`selling-${item.id}`}
                          type="text"
                          inputMode="decimal"
                          className="form-control form-control-sm"
                          value={priceValue(item, "sellingPriceMinor")}
                          onChange={e => {
                            setSellingBuffer(b => ({
                              ...b,
                              [item.id]: e.target.value,
                            }))
                          }}
                          onBlur={e => {
                            commitPrice(
                              item,
                              "sellingPriceMinor",
                              e.target.value,
                            )
                          }}
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                      <div className="small">
                        {showPurchase && (
                          <span
                            className={
                              margin < 0 ? "text-danger" : "text-muted"
                            }
                          >
                            Маржа: {fmt(margin)}
                          </span>
                        )}
                      </div>
                      <div className="fw-bold font-monospace">{fmt(total)}</div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {removeTarget && (
        <ConfirmDeleteModal
          title="Удаление позиции"
          message={
            <>
              Удалить позицию
              {removeTarget.title ? (
                <>
                  {" "}
                  <strong>{removeTarget.title}</strong>
                </>
              ) : null}
              ?
            </>
          }
          onConfirm={() => {
            onRemove(removeTarget.id)
            setRemoveTarget(null)
          }}
          onClose={() => {
            setRemoveTarget(null)
          }}
        />
      )}
    </div>
  )
}
