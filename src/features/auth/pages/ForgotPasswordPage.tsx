import type { FC, SyntheticEvent } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearAuthError, clearSuccessMessage, forgotPasswordAsync } from "../authSlice"

export const ForgotPasswordPage: FC = () => {
  const dispatch = useAppDispatch()
  const { isLoading, error, successMessage } = useAppSelector((state) => state.auth)

  const [email, setEmail] = useState("")

  useEffect(() => {
    dispatch(clearAuthError())
    dispatch(clearSuccessMessage())
  }, [dispatch])

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email) return
    void dispatch(forgotPasswordAsync({ email }))
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-sm-5">
              <h3 className="card-title text-center fw-bold mb-3">Сброс пароля</h3>
              <p className="text-muted text-center mb-4">
                Введите адрес электронной почты, указанный при регистрации. Мы отправим инструкции по сбросу.
              </p>

              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      dispatch(clearAuthError())
                    }}
                  ></button>
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success fade show" role="alert">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 mt-3 fw-bold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить инструкцию"
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <Link to="/login" className="fw-semibold text-decoration-none">
                  ← Вернуться к входу
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
