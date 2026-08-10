import type { FC, SyntheticEvent } from "react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearAuthError, clearSuccessMessage, resetPasswordAsync } from "../authSlice"

export const ResetPasswordPage: FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const dispatch = useAppDispatch()
  const { isLoading, error, successMessage } = useAppSelector((state) => state.auth)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    dispatch(clearAuthError())
    dispatch(clearSuccessMessage())
  }, [dispatch])

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationError(null)

    if (!token) {
      setValidationError("Невалидный токен сброса пароля")
      return
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      setValidationError("Пароль должен содержать от 8 до 72 символов")
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError("Пароли не совпадают")
      return
    }

    void dispatch(resetPasswordAsync({ token, newPassword }))
  }

  const activeError = validationError ?? error

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-sm-5">
              <h3 className="card-title text-center fw-bold mb-3">Новый пароль</h3>
              <p className="text-muted text-center mb-4">Придумайте новый надежный пароль.</p>

              {activeError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {activeError}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setValidationError(null)
                      dispatch(clearAuthError())
                    }}
                  ></button>
                </div>
              )}

              {successMessage ? (
                <div className="text-center">
                  <div className="alert alert-success" role="alert">
                    {successMessage}
                  </div>
                  <Link to="/login" className="btn btn-primary btn-lg w-100 fw-bold mt-2">
                    Перейти ко входу
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Новый пароль</label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      placeholder="От 8 до 72 символов"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                      }}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Повторите пароль</label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      placeholder="Повторите новый пароль"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                      }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mt-3 fw-bold"
                    disabled={isLoading || !token}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Сохранение...
                      </>
                    ) : (
                      "Сохранить пароль"
                    )}
                  </button>
                </form>
              )}

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
