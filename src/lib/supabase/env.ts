/** Only publishable configuration belongs here. Never add privileged keys. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Follow HUMAN_SETUP.md before using account features.",
    );
  }
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    (parsed.protocol !== "https:" &&
      !(
        parsed.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      ))
  ) {
    throw new Error(
      "Supabase URL must use HTTPS (HTTP is allowed only for local development).",
    );
  }
  if (!key.startsWith("sb_publishable_")) {
    throw new Error(
      "Use a Supabase publishable key, never a secret or service-role key.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

export function authCookieOptions() {
  return {
    sameSite: "lax" as const,
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
  };
}
