import type { FC, SyntheticEvent } from "react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearAuthError, loginAsync } from "../authSlice"

export const LoginPage: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      void navigate("/profile")
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !password) return

    void dispatch(loginAsync({ email, password })).then((result) => {
      if (loginAsync.fulfilled.match(result)) {
        void navigate("/profile")
      }
    })
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-sm-5">
              <h3 className="card-title text-center fw-bold mb-4">Вход в систему</h3>

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

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label fw-semibold mb-0">Пароль</label>
                    <Link to="/forgot-password" className="text-decoration-none small">
                      Забыли пароль?
                    </Link>
                  </div>
                  <input
                    type="password"
                    className="form-control form-control-lg mt-1"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
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
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <span className="text-muted">Нет аккаунта? </span>
                <Link to="/register" className="fw-semibold text-decoration-none">
                  Зарегистрироваться
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
