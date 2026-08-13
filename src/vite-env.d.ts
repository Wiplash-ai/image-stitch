/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GLASSWARE_ACCOUNT_API_URL?: string;
  /** @deprecated Temporary compatibility with pre-rename deployments. */
  readonly VITE_IMAGESTITCH_ACCOUNT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
