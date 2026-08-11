import type { FC } from "react"
import { Link } from "react-router-dom"
import { useAppSelector } from "../app/hooks"

export const HomePage: FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  return (
    <div className="container py-5">
      <div className="row justify-content-center text-center">
        <div className="col-lg-8 py-5">
          <h1 className="display-4 fw-bold mb-3">Fuenex SNG Platform</h1>
          <p className="lead text-muted mb-4">
            Современная платформа для быстрого AR-замера и управления проектами.
          </p>

          {isAuthenticated ? (
            <div className="card shadow border-0 rounded-4 p-4 d-inline-block text-start">
              <h5 className="fw-bold">С возвращением!</h5>
              <p className="mb-3 text-muted">Вы вошли как: {user?.email}</p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/projects" className="btn btn-primary fw-bold">
                  Мои проекты
                </Link>
                <Link to="/profile" className="btn btn-outline-primary fw-bold">
                  Личный кабинет
                </Link>
              </div>
            </div>
          ) : (
            <div className="d-flex justify-content-center gap-3">
              <Link to="/login" className="btn btn-primary btn-lg px-4 fw-bold">
                Войти в аккаунт
              </Link>
              <Link to="/register" className="btn btn-outline-secondary btn-lg px-4">
                Зарегистрироваться
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
