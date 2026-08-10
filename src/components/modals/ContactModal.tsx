import type { FC, SyntheticEvent } from "react"
import { useState } from "react"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export const ContactModal: FC<Props> = ({ isOpen, onClose }) => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [agree, setAgree] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    alert("Спасибо мы с вами свяжемся позже!")
    setName("")
    setEmail("")
    setMessage("")
    setAgree(false)
    onClose()
  }

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px" }}>
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ color: "#001C66" }}>
              Связаться с нами
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Закрыть"
            ></button>
          </div>
          <div className="modal-body pt-3">
            <p className="text-muted small mb-3">
              Напишите нам — мы свяжемся с вами в ближайшее время.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Ваше имя</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Иван Иванов"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                  }}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                  }}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Сообщение</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Опишите ваш вопрос или задачу..."
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                  }}
                  required
                ></textarea>
              </div>
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="contact-agree"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked)
                  }}
                  required
                />
                <label className="form-check-label small text-muted" htmlFor="contact-agree">
                  Я согласен на обработку персональных данных
                </label>
              </div>
              <button type="submit" className="btn btn-custom-primary w-100 fw-bold">
                Отправить сообщение <i className="bi bi-send ms-1"></i>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
