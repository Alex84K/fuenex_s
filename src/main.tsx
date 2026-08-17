import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { App } from "./App"
import { store } from "./app/store"
// Bootstrap собирается из Sass с брендовыми переменными (src/styles/), а не
// подключается готовым CSS — см. agentic_docs/redesign/DESIGN_REDESIGN.md D1.
// index.css идёт последним: в нём живёт лендинг со своей палитрой (D13).
import "./styles/main.scss"
import "bootstrap-icons/font/bootstrap-icons.css"
import "./index.css"

// One client for the whole app. retry: 1 keeps transient network blips
// from surfacing as errors, refetchOnWindowFocus: false keeps background
// refetches predictable (the list is invalidated explicitly after every
// mutation).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById("root")

if (container) {
  const root = createRoot(container)

  root.render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  )
} else {
  throw new Error(
    "Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML document.",
  )
}
