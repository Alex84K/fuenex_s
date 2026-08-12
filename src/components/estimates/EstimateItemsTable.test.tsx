import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import { EstimateItemsTable } from "./EstimateItemsTable"

const makeItem = (overrides: Partial<DraftItem> = {}): DraftItem => ({
  id: "0198f2c1-8000-7abc-9000-000000000040",
  title: "Плитка",
  description: "",
  unit: "м²",
  quantity: 2,
  purchasePriceMinor: 45000,
  sellingPriceMinor: 80000,
  ...overrides,
})

const renderTable = (
  props: Partial<Parameters<typeof EstimateItemsTable>[0]> = {},
) => {
  const defaults: Parameters<typeof EstimateItemsTable>[0] = {
    items: [makeItem()],
    currency: "RUB",
    showPurchase: false,
    resetToken: null,
    onAddEmpty: vi.fn(),
    onOpenCatalog: vi.fn(),
    onCommit: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onEditFields: vi.fn(),
    onToggleShowPurchase: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  const view = render(<EstimateItemsTable {...merged} />)
  return { ...view, props: merged }
}

describe("EstimateItemsTable", () => {
  it("commits quantity on blur and updates the row total", async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    renderTable({ onCommit })

    // 2 × 800 ₽ = 1 600 ₽. Desktop input has aria-label, mobile has a
    // <label> — take the desktop one.
    expect(screen.getAllByLabelText("Количество")[0]).toHaveValue("2")
    expect(screen.getAllByText(/1 600/).length).toBeGreaterThan(0)

    const qty = screen.getAllByLabelText("Количество")[0]
    await user.clear(qty)
    await user.type(qty, "3")
    fireEvent.blur(qty)

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(
      "0198f2c1-8000-7abc-9000-000000000040",
      { quantity: 3 },
    )
  })

  it("reverts garbage on blur and never commits", async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    renderTable({ onCommit })

    const qty = screen.getAllByLabelText("Количество")[0]
    await user.clear(qty)
    await user.type(qty, "abc")
    fireEvent.blur(qty)

    expect(onCommit).not.toHaveBeenCalled()
    expect(qty).toHaveValue("2")
  })

  it("hides the purchase columns until toggled", () => {
    const onToggleShowPurchase = vi.fn()
    const { rerender, props } = renderTable({ onToggleShowPurchase })

    expect(screen.queryAllByLabelText("Закупка")).toHaveLength(0)
    expect(screen.getAllByLabelText("Продажа").length).toBeGreaterThan(0)

    const toggle = screen.getByRole("checkbox", { name: "Показать закупку" })
    fireEvent.click(toggle)
    expect(onToggleShowPurchase).toHaveBeenCalledTimes(1)

    rerender(<EstimateItemsTable {...props} showPurchase={true} />)
    expect(screen.queryAllByLabelText("Закупка").length).toBeGreaterThan(0)
  })

  it("disables the up arrow on the first row", () => {
    renderTable({
      items: [
        makeItem(),
        makeItem({
          id: "0198f2c1-8000-7abc-9000-000000000041",
          title: "Вторая",
        }),
      ],
    })
    const upButtons = screen.getAllByTitle("Выше")
    expect(upButtons[0]).toBeDisabled()
    expect(upButtons[1]).not.toBeDisabled()
  })
})
