import { ApiError } from "../../../utils/api"

// Browsers only allow window.open() as a direct result of a click; once a
// fetch has resolved, the "user gesture" window has usually expired and the
// call is treated as a popup and blocked (Safari especially). So the tab is
// opened synchronously in the click handler (EstimateEditorView) before any
// await — this module only ever navigates an already-open handle.

export class PdfPopupBlockedError extends Error {
  constructor() {
    super("popup blocked")
    this.name = "PdfPopupBlockedError"
  }
}

export class PdfSaveFailedError extends Error {
  constructor() {
    super("save failed before pdf could be generated")
    this.name = "PdfSaveFailedError"
  }
}

// window.open("", "_blank") hands back a live about:blank document — no
// need to parse an HTML string into it, plain DOM API reaches the same
// result without document.write (deprecated, and CSP-hostile besides).
export function showPdfLoadingPlaceholder(popup: Window): void {
  popup.document.title = "Смета"
  const { body } = popup.document
  body.style.cssText =
    "display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font:16px system-ui,-apple-system,sans-serif;color:#6c757d"
  body.textContent = "Формируем документ…"
}

// Module-level, not component state: a second click must revoke the first
// blob before minting a new object URL, and the tab holding the first one
// may already be closed by then.
let lastObjectUrl: string | null = null

export function openPdfBlobInTab(blob: Blob, popup: Window): void {
  if (lastObjectUrl) {
    URL.revokeObjectURL(lastObjectUrl)
  }
  const url = URL.createObjectURL(blob)
  lastObjectUrl = url
  popup.location.href = url
}

export function pdfErrorMessage(err: unknown): string {
  if (err instanceof PdfPopupBlockedError) {
    return "Не удалось открыть новую вкладку — разрешите всплывающие окна для этого сайта в браузере и попробуйте снова."
  }
  if (err instanceof PdfSaveFailedError) {
    return "Не удалось сохранить смету — документ не сформирован."
  }
  if (err instanceof ApiError && err.status === 404) {
    return "Смета не найдена — возможно, она удалена."
  }
  return "Не удалось сформировать документ. Попробуйте ещё раз."
}
