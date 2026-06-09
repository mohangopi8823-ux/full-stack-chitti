/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_OAUTH_PORTAL_URL: string;
  readonly VITE_APP_ID: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FRONTEND_FORGE_API_KEY?: string;
  readonly VITE_FRONTEND_FORGE_API_URL?: string;
  readonly VITE_ADMIN_USERNAME?: string;
  readonly VITE_ADMIN_PASSWORD?: string;
}
