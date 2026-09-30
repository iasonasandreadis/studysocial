import "server-only";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { enabledProviders } from "./providers";
export async function availableProviders() {
  try {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? enabledProviders(await response.json()) : [];
  } catch {
    return [];
  }
}
