// The server stores timestamps as RFC3339 with millisecond precision
// (platform/timefmt). Render them for the user's locale.
export const formatDateTime = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
}
