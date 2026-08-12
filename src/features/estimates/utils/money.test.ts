import { describe, expect, it } from "vitest"
import { formatMinor, formatPlainMinor, parseMoneyToMinor } from "./money"

describe("parseMoneyToMinor", () => {
  it.each([
    ["1 234,56", 123456],
    ["1 234.56", 123456],
    ["1\u00A0234,56", 123456], // non-breaking space
    ["1234.5", 123450],
    ["1234", 123400],
    ["0,5", 50],
    ["12.", 1200],
  ])("parses %j → %d", (raw, want) => {
    expect(parseMoneyToMinor(raw)).toBe(want)
  })

  it.each([
    ["12,345", null], // third fractional digit is an input error
    ["12.345", null],
    ["", null],
    ["   ", null],
    ["-5", null],
    ["+5", null],
    ["abc", null],
    ["1 234,567", null],
    ["1,234,56", null],
  ])("rejects %j → null", raw => {
    expect(parseMoneyToMinor(raw)).toBeNull()
  })
})

describe("formatMinor", () => {
  it("formats rubles in the ru-RU locale", () => {
    expect(formatMinor(123456, "RUB").replace(/\s/g, " ")).toBe("1 234,56 ₽")
  })

  it("formats zero", () => {
    expect(formatMinor(0, "RUB").replace(/\s/g, " ")).toBe("0,00 ₽")
  })

  it("formats negative amounts with the minus sign", () => {
    expect(formatMinor(-50000, "RUB").replace(/\s/g, " ")).toBe("-500,00 ₽")
  })
})

describe("formatPlainMinor", () => {
  it("formats a currency-less amount", () => {
    expect(formatPlainMinor(123456).replace(/\s/g, " ")).toBe("1 234,56")
  })

  it("drops trailing zero cents", () => {
    expect(formatPlainMinor(123400).replace(/\s/g, " ")).toBe("1 234")
  })
})
