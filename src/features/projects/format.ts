// The server stores timestamps as RFC3339 with millisecond precision
// (platform/timefmt). Render them for the user's locale.
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
}

// A calendar date "YYYY-MM-DD" (platform/datefmt on the server, e.g. a
// task's deadline) — no time-of-day to render, unlike formatDateTime.
// Parsed as local, not UTC: "2026-08-20" must read as the 20th regardless
// of the viewer's offset from UTC (RECARCH_DEADLINE.md §12.2/§12.3).
export const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-").map(Number)
  const d = new Date(year, month - 1, day)
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString("ru-RU", { dateStyle: "short" })
}
