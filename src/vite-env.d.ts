/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOLD_API_KEY: string;
  readonly VITE_DEFAULT_CURRENCY: string;
  readonly VITE_UPDATE_INTERVAL_MS: string;
  readonly VITE_DEMO_MODE: string;
  readonly VITE_MARKET_PROVIDER: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
