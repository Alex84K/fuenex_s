// Money lives in whole minor units everywhere in state and props
// (DESIGN_ESTIMATE.md §6.2): major representation exists only at the input
// field and at display. All CIS currencies have two fractional digits.

export const MINOR = 100

// "1 234,56" | "1234.5" | "1234" → 123456 | null on garbage.
// Spaces and non-breaking spaces are stripped; both "," and "." are accepted
// as the decimal separator. A third fractional digit is an input error, not
// a reason to round — the server stores whole minor units and rejects
// fractions (F-9).
export const parseMoneyToMinor = (raw: string): number | null => {
  const cleaned = raw.replace(/[\s\u00A0\u202F]/g, "").replace(",", ".")
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ""] = cleaned.split(".")
  const padded = (frac + "00").slice(0, 2)
  return Number(whole) * 100 + Number(padded)
}

// 123456, "RUB" → "1 234,56 ₽"
export const formatMinor = (minor: number, currency: string): string =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency }).format(
    minor / MINOR,
  )

// Catalog prices carry no currency — plain minor units (DESIGN_ESTIMATE.md §9).
export const formatPlainMinor = (minor: number): string =>
  new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / MINOR)
