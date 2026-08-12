// Currencies offered in the estimate header. The server checks only
// ^[A-Z]{3}$; the select is the client's way of never producing a bad value
// (DESIGN_ESTIMATE.md §8.1).
export const CURRENCIES = [
  "RUB",
  "KZT",
  "UZS",
  "UAH",
  "BYN",
  "AMD",
  "GEL",
  "KGS",
  "TJS",
  "AZN",
] as const

export const DEFAULT_CURRENCY = "RUB"

// The server does not store a default currency (F-10): the last used one
// lives in localStorage (DESIGN_ESTIMATE.md §15, open question 3).
export const LAST_CURRENCY_STORAGE_KEY = "fuenex_last_estimate_currency"

// Unit presets for the catalog item form. The server stores `unit` as a
// free string (≤ 32 runes); the picker is a client convenience — "Другое"
// falls back to a free-text input.
export const CATALOG_UNIT_OPTIONS = [
  { value: "м²", label: "Квадратные метры" },
  { value: "м.п.", label: "Погонные метры" },
  { value: "ч", label: "Часы" },
  { value: "шт", label: "Единицы" },
] as const

// Sentinel value of the "Другое" select option (never stored).
export const CATALOG_UNIT_OTHER = "__other__"
