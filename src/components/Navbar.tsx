import type { FC } from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutAsync } from "../features/auth/authSlice"
import { ThemeToggle } from "./ThemeToggle"

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
    // Навбар остаётся тёмным в обеих темах: .bg-dark — это брендовый navy
    // (#2B211B) из токенов, а не серый Bootstrap. `navbar-dark` в 5.3 устарел в
    // пользу data-bs-theme, поэтому подсветку содержимого задаём атрибутом.
    <nav
      className="navbar navbar-expand-lg bg-dark shadow-sm"
      data-bs-theme="dark"
    >
      <div className="container">
        <Link className="navbar-brand fw-bold text-gradient" to="/" onClick={closeMenu}>
          Stroylit
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
            <ThemeToggle />
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
