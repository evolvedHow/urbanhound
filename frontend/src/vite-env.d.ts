/// <reference types="vite/client" />

/**
 * Environment variables available to the client build.
 */
interface ImportMetaEnv {
  /** Base URL of the optional companion FastAPI service. */
  readonly VITE_API_BASE?: string
}

/**
 * Vite's `import.meta` augmentation.
 */
interface ImportMeta {
  /** Typed environment variables. */
  readonly env: ImportMetaEnv
}
