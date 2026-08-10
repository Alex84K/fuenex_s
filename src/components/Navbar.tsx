import type { FC } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutAsync } from "../features/auth/authSlice"

export const Navbar: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const handleLogout = () => {
    void dispatch(logoutAsync()).then(() => {
      void navigate("/login")
    })
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold text-gradient" to="/">
          ⚡ Fuenex SNG
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Главная
              </Link>
            </li>
            {isAuthenticated && (
              <li className="nav-item">
                <Link className="nav-link" to="/profile">
                  Профиль
                </Link>
              </li>
            )}
          </ul>
          <div className="d-flex align-items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="navbar-text text-light small">
                  👤 {user?.email}
                </span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-outline-light btn-sm" to="/login">
                  Вход
                </Link>
                <Link className="btn btn-primary btn-sm" to="/register">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
