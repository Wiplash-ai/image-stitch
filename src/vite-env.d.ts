/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGESTITCH_ACCOUNT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
