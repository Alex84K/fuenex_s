import type { FC, KeyboardEvent } from "react"
import { useState } from "react"

type Props = {
  id: string
  label: string
  valueBp: number // basis points: 2000 = 20 %
  onChange: (bp: number) => void
}

// Percent field with a string buffer: typed freely, committed on blur,
// garbage reverts to the draft value (same rule as the money fields, D5).
// 0…100 percent → 0…10000 bp.
export const PercentInput: FC<Props> = ({ id, label, valueBp, onChange }) => {
  const [buffer, setBuffer] = useState<string | null>(null)

  const display = buffer ?? String(valueBp / 100)

  const commit = () => {
    if (buffer === null) return
    const cleaned = buffer.trim().replace(",", ".")
    const value = Number(cleaned)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setBuffer(null) // revert
      return
    }
    onChange(Math.round(value * 100))
    setBuffer(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
  }

  return (
    <div>
      <label className="form-label fw-semibold" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="form-control"
        value={display}
        onChange={e => {
          setBuffer(e.target.value)
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
