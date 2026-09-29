// Read Next's normal environment files without printing their contents.
import nextEnv from "@next/env";
import { getSupabaseConfig } from "../src/lib/supabase/env.ts";
import { siteOrigin } from "../src/lib/auth/validation.ts";
nextEnv.loadEnvConfig(process.cwd(), false);
try {
  const { url } = getSupabaseConfig();
  const origin = siteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (!url.startsWith("https://") || !origin.startsWith("https://"))
    throw new Error("Deployment requires HTTPS Supabase and site origins.");
  if (Number(process.versions.node.split(".")[0]) !== 24)
    throw new Error("Use Node.js 24 for this project.");
  console.log(
    "Deployment environment syntax is valid. Live Auth/Storage and release checks still required; no deployment was performed.",
  );
} catch {
  // Do not print raw URL parsing errors, environment values or tokens.
  console.error(
    "Deployment environment is incomplete or invalid. Follow the Phase 12 section of HUMAN_SETUP.md. No values were printed.",
  );
  process.exitCode = 1;
}
