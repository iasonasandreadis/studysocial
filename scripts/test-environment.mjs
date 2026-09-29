import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  authCookieOptions,
} from "../src/lib/supabase/env.ts";
test("environment validation rejects privileged keys and unsafe origins without breaking the public shell", () => {
  const names = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    assert.equal(isSupabaseConfigured(), true);
    for (const url of [
      "http://remote.example",
      "https://user:pass@example.com",
      "https://example.com/path",
      "https://example.com?secret=x",
      "https://example.com#x",
      "not a url",
    ]) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      assert.throws(() => getSupabaseConfig());
      assert.equal(isSupabaseConfigured(), false);
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    for (const key of ["sb_secret_test", "eyJlegacytoken", ""]) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
      assert.equal(isSupabaseConfigured(), false);
    }
    process.env.NEXT_PUBLIC_SITE_URL = "https://studysocial.example";
    assert.deepEqual(authCookieOptions(), { sameSite: "lax", secure: true });
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.equal(authCookieOptions().secure, false);
  } finally {
    for (const n of names) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  }
});
