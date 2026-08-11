import type { FC } from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutAsync } from "../features/auth/authSlice"

// The app loads Bootstrap's CSS only, not its JS bundle — every
// data-bs-* behavior (toggler, collapse, modal) is therefore driven from
// React state instead. The hamburger button toggles the collapse class
// manually; without this, the mobile menu would be dead.
export const Navbar: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const handleLogout = () => {
    closeMenu()
    void dispatch(logoutAsync()).then(() => {
      void navigate("/login")
    })
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold text-gradient" to="/" onClick={closeMenu}>
          ⚡ Fuenex SNG
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={menuOpen}
          aria-label="Переключить меню"
          onClick={() => {
            setMenuOpen((v) => !v)
          }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className={`collapse navbar-collapse${menuOpen ? " show" : ""}`} id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/" onClick={closeMenu}>
                Главная
              </Link>
            </li>
            {isAuthenticated && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/projects" onClick={closeMenu}>
                    Проекты
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/profile" onClick={closeMenu}>
                    Профиль
                  </Link>
                </li>
              </>
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
                <Link className="btn btn-outline-light btn-sm" to="/login" onClick={closeMenu}>
                  Вход
                </Link>
                <Link className="btn btn-primary btn-sm" to="/register" onClick={closeMenu}>
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
