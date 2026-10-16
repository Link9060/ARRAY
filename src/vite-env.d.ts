/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_RAVIN_CHAT_URL?: string;
  readonly VITE_RAVIN_ARRAY_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
