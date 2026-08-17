import react from "@vitejs/plugin-react"
import * as path from "node:path"
import { defineConfig } from "vitest/config"
import packageJson from "./package.json" with { type: "json" }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 внутри всё ещё на @import и старых цветовых функциях.
        // Без глушения каждая сборка выдаёт сотни чужих предупреждений и своих
        // в них не видно. Снять, когда Bootstrap переедет на @use (ожидается в 6.x).
        silenceDeprecations: [
          "import",
          "global-builtin",
          "color-functions",
          "if-function",
        ],
        loadPaths: ["node_modules"],
      },
    },
  },

  server: {
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8089",
        changeOrigin: true,
      },
    },
  },

  test: {
    root: import.meta.dirname,
    name: packageJson.name,
    environment: "jsdom",

    typecheck: {
      enabled: true,
      tsconfig: path.join(import.meta.dirname, "tsconfig.json"),
    },

    globals: true,
    watch: false,
    setupFiles: ["./src/setupTests.ts"],
  },
})
