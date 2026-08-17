import type { FC } from "react"
import { useEffect, useState } from "react"
import type { Theme } from "../utils/theme"
import {
  applyTheme,
  resolveTheme,
  setStoredTheme,
  watchSystemTheme,
} from "../utils/theme"

// Переключатель темы в навбаре. Иконка показывает, куда переключит нажатие
// (луна — «включить тёмную»), а не текущее состояние: так понятнее без подписи,
// хотя подпись всё равно есть в aria-label и title.
export const ThemeToggle: FC = () => {
  const [theme, setTheme] = useState<Theme>(resolveTheme)

  // Атрибут уже проставлен инлайн-скриптом из index.html, но при монтировании
  // подтверждаем: между первым кадром и гидрацией тема могла смениться.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Пока явного выбора нет — следуем за системой.
  useEffect(() => watchSystemTheme(setTheme), [])

  const next: Theme = theme === "dark" ? "light" : "dark"
  const label = next === "dark" ? "Включить тёмную тему" : "Включить светлую тему"

  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm"
      onClick={() => {
        setStoredTheme(next)
        setTheme(next)
      }}
      aria-label={label}
      title={label}
    >
      <i className={next === "dark" ? "bi bi-moon-stars" : "bi bi-sun"} aria-hidden="true" />
    </button>
  )
}
