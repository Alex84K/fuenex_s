import type { FC, KeyboardEvent } from "react"
import { useState } from "react"

type Props = {
  id: string
  value: number | null // null = «не задано» (например, высота у двора)
  allowEmpty: boolean // true → пустая строка коммитится как null
  min?: number
  max?: number
  placeholder?: string
  readOnly?: boolean
  className?: string
  onChange: (v: number | null) => void
}

// Числовое поле со строковым буфером (D5, тот же приём, что PercentInput и
// денежные поля сметы): ввод свободный, коммит по blur/Enter, мусор и
// выход за [min, max] откатываются к прежнему значению. NaN/Infinity не
// могут попасть в состояние — это одно из правил валидации §12.
export const NumberField: FC<Props> = ({
  id,
  value,
  allowEmpty,
  min,
  max,
  placeholder,
  readOnly = false,
  className,
  onChange,
}) => {
  const [buffer, setBuffer] = useState<string | null>(null)

  const display = buffer ?? (value == null ? "" : String(value))

  const commit = () => {
    if (buffer === null) return
    const cleaned = buffer.trim().replace(",", ".")
    if (cleaned === "") {
      if (allowEmpty) {
        onChange(null)
        setBuffer(null)
        return
      }
      setBuffer(null) // revert
      return
    }
    const n = Number(cleaned)
    if (
      !Number.isFinite(n) ||
      (min != null && n < min) ||
      (max != null && n > max)
    ) {
      setBuffer(null) // revert
      return
    }
    onChange(n)
    setBuffer(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={`form-control${className ? ` ${className}` : ""}`}
      value={display}
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={readOnly}
      onChange={e => {
        setBuffer(e.target.value)
      }}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
