import { screen } from "@testing-library/react"
import { App } from "./App"
import { renderWithProviders } from "./utils/test-utils"

test("App should render navigation bar and home page", () => {
  renderWithProviders(<App />)

  // Verify brand title
  expect(screen.getAllByText(/Fuenex SNG/i).length).toBeGreaterThan(0)

  // Verify Home page welcome header
  expect(screen.getByText(/Fuenex SNG Platform/i)).toBeInTheDocument()

  // Verify Login link exists
  expect(screen.getByRole("link", { name: /Войти/i })).toBeInTheDocument()
})
