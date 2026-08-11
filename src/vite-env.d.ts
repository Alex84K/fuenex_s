/// <reference types="vite/client" />

// Interfaces are required here: ImportMetaEnv/ImportMeta must *merge* with
// the declarations from vite/client. A `type` would shadow (not merge) and
// break the rule.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
