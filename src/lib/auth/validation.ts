export type ActionState = { error?: string; message?: string };
export type AuthMode = "login" | "signup" | "forgot" | "reset" | "resend";
export const authModes: AuthMode[] = [
  "login",
  "signup",
  "forgot",
  "reset",
  "resend",
];
export function validateCredentials(
  mode: AuthMode,
  email: string,
  password: string,
) {
  if (
    mode !== "reset" &&
    (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    return "Enter a valid email address.";
  if (["login", "signup", "reset"].includes(mode)) {
    if (!password || password.length > 128)
      return "Enter a password of up to 128 characters.";
    if (mode !== "login" && password.length < 12)
      return "Use at least 12 characters for your password.";
  }
  return null;
}

/** Redirect destinations are fixed app routes; never trust a callback next/origin parameter. */
export function confirmationDestination(flow: string | null) {
  return flow === "recovery" ? "/reset-password" : "/onboarding";
}
export function siteOrigin(value: string | undefined) {
  if (!value)
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL before sending authentication emails.",
    );
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  ) {
    throw new Error(
      "Set a valid HTTPS site origin (HTTP is allowed for localhost).",
    );
  }
  return url.origin;
}
