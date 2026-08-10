import type { FC } from "react"
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"

/* ─── Контактная форма (модальное окно) ─────────────────────────── */
const ContactModal: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("Спасибо, мы с вами свяжемся позже!")
    onClose()
  }

  return (
    <div
      className="landing-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="landing-modal-content" ref={dialogRef}>
        <div className="landing-modal-header">
          <h2 id="contact-modal-title" className="landing-modal-title">
            Связаться с нами
          </h2>
          <button
            className="landing-modal-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
        <p className="landing-modal-desc">
          Напишите нам — и мы свяжемся с вами в кратчайшие сроки.
        </p>
        <form id="landing-contact-form" onSubmit={handleSubmit} noValidate>
          <div className="landing-form-group">
            <label htmlFor="lc-name" className="landing-form-label">
              Имя
            </label>
            <input
              type="text"
              id="lc-name"
              className="landing-form-input"
              required
              maxLength={100}
            />
          </div>
          <div className="landing-form-group">
            <label htmlFor="lc-email" className="landing-form-label">
              E-mail
            </label>
            <input
              type="email"
              id="lc-email"
              className="landing-form-input"
              required
              maxLength={150}
            />
          </div>
          <div className="landing-form-group">
            <label htmlFor="lc-message" className="landing-form-label">
              Сообщение
            </label>
            <textarea
              id="lc-message"
              className="landing-form-input landing-form-textarea"
              rows={4}
              required
              minLength={5}
              maxLength={2000}
            />
          </div>
          <button type="submit" id="lc-submit" className="landing-btn-primary landing-btn-full">
            Отправить сообщение →
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Основная страница лендинга ─────────────────────────────────── */
export const LandingPage: FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  const faqItems = [
    {
      q: "Готова ли платформа к требованиям электронного документооборота?",
      a: "Да. FUENEX поддерживает формирование структурированных электронных документов, соответствующих современным регуляторным стандартам. Все документы создаются автоматически, без необходимости в дополнительных внешних системах.",
    },
    {
      q: "Как работает цифровое 3D-замер помещений в приложении?",
      a: "На устройствах с поддержкой LiDAR (Apple iPhone 12 Pro и новее) FUENEX использует Apple RoomPlan API. Просто направьте камеру на комнату — стены, окна, двери и ниши будут распознаны и измерены с точностью до сантиметра. Для других устройств доступен ручной режим ввода.",
    },
    {
      q: "Можно ли задать собственные цены на материалы и услуги?",
      a: "Да. В профиле компании вы можете создать собственный каталог услуг и прайс-листы на материалы. FUENEX автоматически использует ваши данные при расчёте материалов и формировании коммерческих предложений.",
    },
  ]

  return (
    <div className="landing-page">
      {/* ── Навигация ── */}
      <nav
        className={`landing-nav${scrolled ? " landing-nav--scrolled" : ""}`}
      >
        <div className="landing-container landing-nav__inner">
          <a
            href="#home"
            className="landing-brand"
            onClick={(e) => {
              e.preventDefault()
              scrollTo("home")
            }}
          >
            <span className="landing-brand__logo">FUENEX</span>
            <span className="landing-brand__sub">
              Digital Solutions for the Future
            </span>
          </a>

          {/* Desktop links */}
          <ul className="landing-nav__links" aria-label="Навигация">
            <li>
              <a
                href="#home"
                className="landing-nav__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("home")
                }}
              >
                Главная
              </a>
            </li>
            <li>
              <a
                href="#features"
                className="landing-nav__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("features")
                }}
              >
                Функции
              </a>
            </li>
            <li>
              <a
                href="#about"
                className="landing-nav__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("about")
                }}
              >
                О нас
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className="landing-nav__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("faq")
                }}
              >
                FAQ
              </a>
            </li>
          </ul>

          <div className="landing-nav__actions">
            <Link
              to="/login"
              id="landing-nav-login"
              className="landing-btn-outline"
            >
              Войти
            </Link>
            <button
              id="landing-nav-contact"
              className="landing-btn-primary"
              onClick={() => setContactOpen(true)}
            >
              Связаться
            </button>
          </div>

          {/* Hamburger */}
          <button
            className={`landing-hamburger${menuOpen ? " is-active" : ""}`}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="landing-mobile-menu">
            <div className="landing-container">
              <a
                href="#home"
                className="landing-mobile-menu__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("home")
                }}
              >
                Главная
              </a>
              <a
                href="#features"
                className="landing-mobile-menu__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("features")
                }}
              >
                Функции
              </a>
              <a
                href="#about"
                className="landing-mobile-menu__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("about")
                }}
              >
                О нас
              </a>
              <a
                href="#faq"
                className="landing-mobile-menu__link"
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo("faq")
                }}
              >
                FAQ
              </a>
              <hr className="landing-mobile-menu__divider" />
              <Link
                to="/login"
                className="landing-mobile-menu__link"
                onClick={() => setMenuOpen(false)}
              >
                Войти
              </Link>
              <button
                className="landing-btn-primary landing-btn-full mt-2"
                onClick={() => {
                  setMenuOpen(false)
                  setContactOpen(true)
                }}
              >
                Связаться с нами
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="landing-hero" id="home">
        <div className="landing-container landing-hero__inner">
          <div className="landing-hero__text">
            <span className="landing-hero__badge">🚀 Новое поколение инструментов</span>
            <h1 className="landing-hero__title">
              FUENEX — интуитивная платформа для профессионалов
            </h1>
            <p className="landing-hero__subtitle">
              Замер, расчёт материалов и оформление коммерческого предложения —
              всё в одном приложении. Экономьте время, зарабатывайте больше.
            </p>
            <div className="landing-hero__cta">
              <Link
                to="/register"
                id="landing-hero-register"
                className="landing-btn-primary landing-btn-lg"
              >
                Попробовать бесплатно →
              </Link>
              <button
                id="landing-hero-contact"
                className="landing-btn-outline landing-btn-lg"
                onClick={() => setContactOpen(true)}
              >
                Связаться с нами
              </button>
            </div>
            <p className="landing-hero__note">
              Бесплатный доступ · Без кредитной карты
            </p>
          </div>

          <div className="landing-hero__visual">
            <div className="landing-hero__img-wrapper">
              <img
                src="/app-screenshot.png"
                alt="Интерфейс приложения FUENEX — замер помещения и расчёт материалов"
                className="landing-hero__img"
                loading="eager"
              />
              <div className="landing-hero__img-badge landing-hero__img-badge--left">
                <span className="landing-hero__img-badge-icon">📐</span>
                <div>
                  <div className="landing-hero__img-badge-title">
                    Точность замера
                  </div>
                  <div className="landing-hero__img-badge-sub">до 1 см</div>
                </div>
              </div>
              <div className="landing-hero__img-badge landing-hero__img-badge--right">
                <span className="landing-hero__img-badge-icon">⚡</span>
                <div>
                  <div className="landing-hero__img-badge-title">
                    Смета готова
                  </div>
                  <div className="landing-hero__img-badge-sub">за 10 минут</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-hero__wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </div>
      </header>

      {/* ── Шаги (Как это работает) ───────────────────────────── */}
      <section className="landing-process" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Как это работает</span>
            <h2 className="landing-section-title">
              4 шага до готовой сметы
            </h2>
            <p className="landing-section-desc">
              Оцифруйте свой рабочий процесс — быстро, точно и без лишних усилий.
            </p>
          </div>

          <div className="landing-steps">
            {[
              {
                icon: (
                  <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
                    <path d="M304 70.1C313.1 61.9 326.9 61.9 336 70.1L568 278.1C577.9 286.9 578.7 302.1 569.8 312C560.9 321.9 545.8 322.7 535.9 313.8L527.9 306.6L527.9 511.9C527.9 547.2 499.2 575.9 463.9 575.9L175.9 575.9C140.6 575.9 111.9 547.2 111.9 511.9L111.9 306.6L103.9 313.8C94 322.6 78.9 321.8 70 312C61.1 302.2 62 287 71.8 278.1L304 70.1zM320 120.2L160 263.7L160 512C160 520.8 167.2 528 176 528L224 528L224 424C224 384.2 256.2 352 296 352L344 352C383.8 352 416 384.2 416 424L416 528L464 528C472.8 528 480 520.8 480 512L480 263.7L320 120.3zM272 528L368 528L368 424C368 410.7 357.3 400 344 400L296 400C282.7 400 272 410.7 272 424L272 528z" />
                  </svg>
                ),
                title: "Замерьте помещение",
                desc: "Используйте AR/LiDAR или введите размеры вручную. Стены, двери и ниши — всё автоматически.",
              },
              {
                icon: (
                  <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
                    <path d="M314.6 142.1C322.6 114.8 347.6 96 376 96L576 96C593.7 96 608 110.3 608 128C608 145.7 593.7 160 576 160L376 160L270.7 521C267.1 533.3 256.6 542.2 243.9 543.8C231.2 545.4 218.8 539.2 212.4 528.2L109.6 352L64 352C46.3 352 32 337.7 32 320C32 302.3 46.3 288 64 288L109.6 288C132.4 288 153.4 300.1 164.9 319.8L230.1 431.6L314.5 142.1zM425.4 297.4C437.9 284.9 458.2 284.9 470.7 297.4L512.1 338.8L553.5 297.4C566 284.9 586.3 284.9 598.8 297.4C611.3 309.9 611.3 330.2 598.8 342.7L557.4 384.1L598.8 425.5C611.3 438 611.3 458.3 598.8 470.8C586.3 483.3 566 483.3 553.5 470.8L512.1 429.4L470.7 470.8C458.2 483.3 437.9 483.3 425.4 470.8C412.9 458.3 412.9 438 425.4 425.5L466.8 384.1L425.4 342.7C412.9 330.2 412.9 309.9 425.4 297.4z" />
                  </svg>
                ),
                title: "Рассчитайте площади",
                desc: "Автоматический расчёт полезной площади с учётом отступов, отходов и особенностей укладки.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                ),
                title: "Рассчитайте материалы",
                desc: "Плитка, клей, затирка, грунтовка — точные объёмы и количества на основе ваших прайс-листов.",
              },
              {
                icon: (
                  <svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
                    <path d="M240 112L128 112C119.2 112 112 119.2 112 128L112 512C112 520.8 119.2 528 128 528L208 528L208 576L128 576C92.7 576 64 547.3 64 512L64 128C64 92.7 92.7 64 128 64L261.5 64C278.5 64 294.8 70.7 306.8 82.7L429.3 205.3C441.3 217.3 448 233.6 448 250.6L448 400.1L400 400.1L400 272.1L312 272.1C272.2 272.1 240 239.9 240 200.1L240 112.1zM380.1 224L288 131.9L288 200C288 213.3 298.7 224 312 224L380.1 224zM272 444L304 444C337.1 444 364 470.9 364 504C364 537.1 337.1 564 304 564L292 564L292 592C292 603 283 612 272 612C261 612 252 603 252 592L252 464C252 453 261 444 272 444zM304 524C315 524 324 515 324 504C324 493 315 484 304 484L292 484L292 524L304 524zM400 444L432 444C460.7 444 484 467.3 484 496L484 560C484 588.7 460.7 612 432 612L400 612C389 612 380 603 380 592L380 464C380 453 389 444 400 444zM432 572C438.6 572 444 566.6 444 560L444 496C444 489.4 438.6 484 432 484L420 484L420 572L432 572zM508 464C508 453 517 444 528 444L576 444C587 444 596 453 596 464C596 475 587 484 576 484L548 484L548 508L576 508C587 508 596 517 596 528C596 539 587 548 576 548L548 548L548 592C548 603 539 612 528 612C517 612 508 603 508 592L508 464z" />
                  </svg>
                ),
                title: "Создайте КП",
                desc: "Сформируйте профессиональное коммерческое предложение в PDF прямо на объекте, за несколько секунд.",
              },
            ].map((step, i) => (
              <div key={i} className="landing-step">
                <div className="landing-step__num">{i + 1}</div>
                <div className="landing-step__icon">{step.icon}</div>
                <h3 className="landing-step__title">{step.title}</h3>
                <p className="landing-step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── О нас ─────────────────────────────────────────────── */}
      <section className="landing-about" id="about">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">О нас</span>
            <h2 className="landing-section-title">
              Цифровая точность для настоящего мастерства
            </h2>
            <p className="landing-section-desc">
              Мы верим, что первоклассная работа заслуживает первоклассных
              инструментов. FUENEX создан, чтобы освободить профессионалов
              от рутинной бумажной работы.
            </p>
          </div>

          <div className="landing-cards">
            {[
              {
                icon: "🎯",
                title: "Фокус на вашей специализации",
                desc: "Никакого универсального «комбайна». Мы разрабатываем решение специально для профессионалов отделочных работ — с учётом реальных коэффициентов отходов, видов укладки и форматов материалов.",
              },
              {
                icon: "📄",
                title: "Соответствие стандартам",
                desc: "Легко выполняйте требования по электронному документообороту. FUENEX автоматически формирует структурированные документы без необходимости в сторонних системах.",
              },
              {
                icon: "🔒",
                title: "Безопасность и надёжность",
                desc: "Ваши данные и расчёты в безопасности. Мы гарантируем строгое соблюдение требований защиты данных. Всё хранится на высокозащищённых европейских серверах.",
              },
            ].map((card, i) => (
              <div key={i} className="landing-card">
                <div className="landing-card__icon">{card.icon}</div>
                <h3 className="landing-card__title">{card.title}</h3>
                <p className="landing-card__desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="landing-container landing-cta__inner">
          <div className="landing-cta__text">
            <h2 className="landing-cta__title">
              Готовы работать эффективнее?
            </h2>
            <p className="landing-cta__desc">
              Присоединяйтесь к профессионалам, которые уже экономят время
              и деньги с FUENEX.
            </p>
          </div>
          <div className="landing-cta__actions">
            <Link
              to="/register"
              id="landing-cta-register"
              className="landing-btn-white landing-btn-lg"
            >
              Начать бесплатно →
            </Link>
            <Link
              to="/login"
              id="landing-cta-login"
              className="landing-btn-outline-white landing-btn-lg"
            >
              Уже есть аккаунт? Войти
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="landing-faq" id="faq">
        <div className="landing-container">
          <div className="landing-section-header">
            <span className="landing-section-tag">Вопросы и ответы</span>
            <h2 className="landing-section-title">
              Часто задаваемые вопросы
            </h2>
            <p className="landing-section-desc">
              Всё, что вам нужно знать о платформе FUENEX.
            </p>
          </div>

          <div className="landing-faq__list">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className={`landing-faq__item${openFaq === i ? " is-open" : ""}`}
              >
                <button
                  id={`faq-btn-${i}`}
                  className="landing-faq__question"
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className="landing-faq__icon" aria-hidden="true">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  className="landing-faq__answer"
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__brand">
            <span className="landing-brand__logo">FUENEX</span>
            <span className="landing-brand__sub">
              Digital Solutions for the Future
            </span>
          </div>
          <nav className="landing-footer__links" aria-label="Ссылки футера">
            <a
              href="#home"
              className="landing-footer__link"
              onClick={(e) => {
                e.preventDefault()
                scrollTo("home")
              }}
            >
              Главная
            </a>
            <Link to="/privacy" className="landing-footer__link">
              Политика конфиденциальности
            </Link>
            <button
              className="landing-footer__link landing-footer__link--btn"
              onClick={() => setContactOpen(true)}
            >
              Контакты
            </button>
          </nav>
          <p className="landing-footer__copy">
            © {new Date().getFullYear()} FUENEX. Все права защищены.
          </p>
        </div>
      </footer>

      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </div>
  )
}
