import type { FC, ReactNode } from "react"
import { useEffect } from "react"

type Props = {
  title: string
  onClose: () => void
  size?: "sm" | "lg"
  children: ReactNode
}

// Hand-built Bootstrap modal — the JS bundle is not loaded (the pattern is
// ProjectFormModal.tsx). Shared by every modal of the feature so Esc close,
// backdrop close and role="dialog" live in exactly one place (DESIGN §13).
export const ModalShell: FC<Props> = ({ title, onClose, size, children }) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered${size === "lg" ? " modal-lg" : ""}${size === "sm" ? " modal-sm" : ""}`}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">{title}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Закрыть"
              />
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
