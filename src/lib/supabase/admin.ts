import { createClient } from "@supabase/supabase-js";

/** Client admin (service role). Jamais exposé au navigateur. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante. Ajoute-la une fois dans .env.local et dans Vercel → Environment Variables (Project Settings → API → service_role)."
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
