import type { SupabaseClient } from "@supabase/supabase-js";

// Use only the caller's session client: Storage RLS still authorizes each path.
// Never cache these private URLs across users or extend their existing expiry.
export async function signedPostImages(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(paths.filter((path): path is string => Boolean(path))),
  ];
  const urls = new Map<string, string>();
  if (!unique.length) return urls;
  const { data, error } = await supabase.storage
    .from("post-images")
    .createSignedUrls(unique, 60);
  if (error) return urls;
  for (const item of data ?? []) {
    if (
      item.path &&
      unique.includes(item.path) &&
      !item.error &&
      item.signedUrl
    )
      urls.set(item.path, item.signedUrl);
  }
  return urls;
}
