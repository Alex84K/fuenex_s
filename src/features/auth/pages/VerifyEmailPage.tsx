import type { FC } from "react"
import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearAuthError, clearSuccessMessage, verifyEmailAsync } from "../authSlice"

export const VerifyEmailPage: FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const dispatch = useAppDispatch()
  const { isLoading, error, successMessage } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(clearAuthError())
    dispatch(clearSuccessMessage())

    if (token) {
      void dispatch(verifyEmailAsync({ token }))
    }
  }, [dispatch, token])

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-sm-5 text-center">
              <h3 className="card-title fw-bold mb-4">Подтверждение Email</h3>

              {isLoading && (
                <div className="py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Проверка...</span>
                  </div>
                  <p className="text-muted mt-3">Проверяем ссылку подтверждения...</p>
                </div>
              )}

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success" role="alert">
                  {successMessage}
                </div>
              )}

              {!token && !isLoading && (
                <div className="alert alert-warning" role="alert">
                  Отсутствует токен верификации в URL.
                </div>
              )}

              <div className="mt-4">
                <Link to="/profile" className="btn btn-primary btn-lg fw-bold w-100">
                  Перейти в профиль
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
