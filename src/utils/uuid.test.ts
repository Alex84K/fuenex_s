import { describe, expect, it } from "vitest"
import { uuidv7 } from "./uuid"

describe("uuidv7", () => {
  it("produces the canonical 36-char lowercase form", () => {
    const id = uuidv7()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(id).toHaveLength(36)
  })

  it("sets the version nibble to 7", () => {
    expect(uuidv7()[14]).toBe("7")
  })

  it("sets the RFC 4122 variant (10xx)", () => {
    const v = parseInt(uuidv7()[19], 16)
    expect(v & 0b1000).toBe(0b1000)
    expect(v & 0b0100).toBe(0)
  })

  it("generates distinct ids", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()))
    expect(ids.size).toBe(1000)
  })
})
