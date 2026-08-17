import type { FC } from "react"
import { Link } from "react-router-dom"

export const PrivacyPage: FC = () => {
  return (
    <div className="landing-page">
      {/* Simple nav */}
      <nav className="landing-nav landing-nav--scrolled">
        <div className="landing-container landing-nav__inner">
          <Link to="/" className="landing-brand">
            <span className="landing-brand__logo">Stroylit</span>
            <span className="landing-brand__sub">
              Платформа для мастеров отделочных работ
            </span>
          </Link>
          <div className="landing-nav__actions">
            <Link to="/" className="landing-btn-outline">
              На главную
            </Link>
            <Link to="/login" className="landing-btn-primary">
              Войти
            </Link>
          </div>
        </div>
      </nav>

      <main className="landing-privacy-content">
        <div className="landing-container">
          <div className="landing-privacy-inner">
            <span className="landing-section-tag">Юридическая информация</span>
            <h1 className="landing-privacy-title">
              Политика конфиденциальности
            </h1>
            <p className="landing-privacy-meta">
              Последнее обновление: {new Date().toLocaleDateString("ru-RU")}
            </p>

            <div className="landing-privacy-stub">
              <div className="landing-privacy-stub__icon">🔒</div>
              <h2 className="landing-privacy-stub__title">
                Страница в разработке
              </h2>
              <p className="landing-privacy-stub__desc">
                Полная политика конфиденциальности будет опубликована
                в ближайшее время. Если у вас есть вопросы о том, как мы
                обрабатываем ваши данные, пожалуйста, свяжитесь с нами.
              </p>
              <Link
                to="/"
                id="privacy-back-link"
                className="landing-btn-primary landing-btn-lg"
              >
                ← Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__brand">
            <span className="landing-brand__logo">Stroylit</span>
            <span className="landing-brand__sub">
              Платформа для мастеров отделочных работ
            </span>
          </div>
          <p className="landing-footer__copy">
            © {new Date().getFullYear()} Stroylit. Все права защищены.
          </p>
        </div>
      </footer>
    </div>
  )
}
