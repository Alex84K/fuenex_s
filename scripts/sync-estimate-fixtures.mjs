// Copies the server's parity fixtures into the web source tree.
//
//   npm run sync:fixtures
//
// The copy is committed (the server repo only exists on a dev machine —
// it is not present in the Docker build of the web). The fixtures are
// intentionally Go-agnostic JSON so a web test can consume them as-is
// (DESIGN_ESTIMATE.md §14; server_go/.../estimate_totals_test.go:11).
import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(
  webRoot,
  "../server_go/internal/service/testdata/estimate_totals_fixtures.json",
)
const destDir = join(webRoot, "src/features/estimates/utils/__fixtures__")
const dest = join(destDir, "estimate_totals_fixtures.json")

mkdirSync(destDir, { recursive: true })
copyFileSync(source, dest)
console.log(`synced ${source} -> ${dest}`)
