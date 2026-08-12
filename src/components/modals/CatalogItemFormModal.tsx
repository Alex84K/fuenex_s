import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ApiError } from "../../utils/api"
import {
  usePatchCatalogItem,
  usePutCatalogItem,
} from "../../features/estimates/catalog.hooks"
import {
  CATALOG_UNIT_OPTIONS,
  CATALOG_UNIT_OTHER,
} from "../../features/estimates/constants"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import type {
  CatalogItem,
  CatalogItemInput,
  CatalogItemPatch,
} from "../../features/estimates/types"
import { parseMoneyToMinor } from "../../features/estimates/utils/money"
import { uuidv7 } from "../../utils/uuid"
import { ModalShell } from "./ModalShell"

type Props = {
  /** null → create mode (PUT with a fresh UUIDv7 id); a row → edit mode (PATCH with only the changed fields). */
  item: CatalogItem | null
  onClose: () => void
}

// runeLength counts code points — the same unit the server counts
// (utf8.RuneCountInString).
const runeLength = (s: string): number => Array.from(s).length

// A catalog unit is either one of the presets or a free string ("Другое").
const isPresetUnit = (u: string): boolean =>
  CATALOG_UNIT_OPTIONS.some(o => o.value === u)

export const CatalogItemFormModal: FC<Props> = ({ item, onClose }) => {
  const putCatalogItem = usePutCatalogItem()
  const patchCatalogItem = usePatchCatalogItem()
  const isPending = putCatalogItem.isPending || patchCatalogItem.isPending
  const mutationError = putCatalogItem.error ?? patchCatalogItem.error

  const [title, setTitle] = useState(item?.title ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [unit, setUnit] = useState(item?.unit ?? "")
  const [category, setCategory] = useState(item?.category ?? "")
  const [purchase, setPurchase] = useState(
    item ? String(item.purchasePriceMinor / 100) : "",
  )
  const [selling, setSelling] = useState(
    item ? String(item.sellingPriceMinor / 100) : "",
  )
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CatalogItemInput, string>>
  >({})

  const validate = (
    input: CatalogItemInput,
  ): Partial<Record<keyof CatalogItemInput, string>> => {
    const errors: Partial<Record<keyof CatalogItemInput, string>> = {}
    const check = (key: keyof CatalogItemInput, value: string, max: number) => {
      if (runeLength(value) > max)
        errors[key] = `Не более ${String(max)} символов`
    }
    check("title", input.title, ESTIMATE_LIMITS.title)
    check("description", input.description, ESTIMATE_LIMITS.itemDescription)
    check("unit", input.unit, ESTIMATE_LIMITS.itemUnit)
    check("category", input.category, ESTIMATE_LIMITS.catalogCategory)
    return errors
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const purchaseMinor = parseMoneyToMinor(purchase)
    const sellingMinor = parseMoneyToMinor(selling)
    if (purchaseMinor === null || sellingMinor === null) {
      setFieldErrors({
        ...(purchaseMinor === null
          ? { purchasePriceMinor: "Некорректная цена" }
          : {}),
        ...(sellingMinor === null
          ? { sellingPriceMinor: "Некорректная цена" }
          : {}),
      })
      return
    }

    const input: CatalogItemInput = {
      title,
      description,
      unit,
      category,
      isFavorite: item?.isFavorite ?? false,
      purchasePriceMinor: purchaseMinor,
      sellingPriceMinor: sellingMinor,
    }

    if (item) {
      const patch: CatalogItemPatch = {}
      if (title !== item.title) patch.title = title
      if (description !== item.description) patch.description = description
      if (unit !== item.unit) patch.unit = unit
      if (category !== item.category) patch.category = category
      if (purchaseMinor !== item.purchasePriceMinor)
        patch.purchasePriceMinor = purchaseMinor
      if (sellingMinor !== item.sellingPriceMinor)
        patch.sellingPriceMinor = sellingMinor
      if (Object.keys(patch).length === 0) {
        onClose()
        return
      }
      const errors = validate({ ...input, ...patch })
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      patchCatalogItem.mutate({ id: item.id, patch }, { onSuccess: onClose })
      return
    }

    const errors = validate(input)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    putCatalogItem.mutate({ id: uuidv7(), data: input }, { onSuccess: onClose })
  }

  const errorMessage =
    mutationError instanceof ApiError &&
    mutationError.message.includes("catalog item limit reached")
      ? "Каталог заполнен (5000 позиций). Удалите неиспользуемые расценки."
      : mutationError instanceof ApiError
        ? mutationError.message
        : "Не удалось сохранить расценку"

  const isInvalid = (field: keyof CatalogItemInput): boolean =>
    fieldErrors[field] != null

  return (
    <ModalShell
      title={item ? "Редактирование расценки" : "Новая расценка"}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body">
          {mutationError && (
            <div className="alert alert-danger" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="catalog-title">
              Наименование
            </label>
            <input
              id="catalog-title"
              type="text"
              className={`form-control${isInvalid("title") ? " is-invalid" : ""}`}
              maxLength={ESTIMATE_LIMITS.title}
              value={title}
              onChange={e => {
                setTitle(e.target.value)
              }}
            />
            {fieldErrors.title && (
              <div className="invalid-feedback">{fieldErrors.title}</div>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold" htmlFor="catalog-desc">
              Описание
            </label>
            <textarea
              id="catalog-desc"
              rows={3}
              className={`form-control${isInvalid("description") ? " is-invalid" : ""}`}
              maxLength={ESTIMATE_LIMITS.itemDescription}
              value={description}
              onChange={e => {
                setDescription(e.target.value)
              }}
            />
            {fieldErrors.description && (
              <div className="invalid-feedback">{fieldErrors.description}</div>
            )}
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold" htmlFor="catalog-unit">
                Единица измерения
              </label>
              <select
                id="catalog-unit"
                className={`form-select${isInvalid("unit") ? " is-invalid" : ""}`}
                value={isPresetUnit(unit) ? unit : CATALOG_UNIT_OTHER}
                onChange={e => {
                  const v = e.target.value
                  setUnit(v === CATALOG_UNIT_OTHER ? "" : v)
                }}
              >
                {CATALOG_UNIT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value={CATALOG_UNIT_OTHER}>Другое...</option>
              </select>
              {!isPresetUnit(unit) && (
                <input
                  id="catalog-unit-custom"
                  type="text"
                  className={`form-control mt-2${isInvalid("unit") ? " is-invalid" : ""}`}
                  maxLength={ESTIMATE_LIMITS.itemUnit}
                  placeholder="Своя единица измерения..."
                  value={unit}
                  onChange={e => {
                    setUnit(e.target.value)
                  }}
                />
              )}
              {fieldErrors.unit && (
                <div className="invalid-feedback">{fieldErrors.unit}</div>
              )}
            </div>
            <div className="col-md-6">
              <label
                className="form-label fw-semibold"
                htmlFor="catalog-category"
              >
                Категория
              </label>
              <input
                id="catalog-category"
                type="text"
                className={`form-control${isInvalid("category") ? " is-invalid" : ""}`}
                maxLength={ESTIMATE_LIMITS.catalogCategory}
                value={category}
                onChange={e => {
                  setCategory(e.target.value)
                }}
              />
              {fieldErrors.category && (
                <div className="invalid-feedback">{fieldErrors.category}</div>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label
                className="form-label fw-semibold"
                htmlFor="catalog-purchase"
              >
                Закупочная цена
              </label>
              <input
                id="catalog-purchase"
                type="text"
                inputMode="decimal"
                className={`form-control${isInvalid("purchasePriceMinor") ? " is-invalid" : ""}`}
                placeholder="0,00"
                value={purchase}
                onChange={e => {
                  setPurchase(e.target.value)
                }}
              />
              {fieldErrors.purchasePriceMinor && (
                <div className="invalid-feedback">
                  {fieldErrors.purchasePriceMinor}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label
                className="form-label fw-semibold"
                htmlFor="catalog-selling"
              >
                Цена продажи
              </label>
              <input
                id="catalog-selling"
                type="text"
                inputMode="decimal"
                className={`form-control${isInvalid("sellingPriceMinor") ? " is-invalid" : ""}`}
                placeholder="0,00"
                value={selling}
                onChange={e => {
                  setSelling(e.target.value)
                }}
              />
              {fieldErrors.sellingPriceMinor && (
                <div className="invalid-feedback">
                  {fieldErrors.sellingPriceMinor}
                </div>
              )}
            </div>
          </div>
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
            type="submit"
            className="btn btn-primary fw-bold"
            disabled={isPending}
          >
            {isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
