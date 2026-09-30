export const socialProviders = ["apple", "google"] as const;
export type SocialProvider = (typeof socialProviders)[number];
export function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "apple" || value === "google";
}
export function enabledProviders(settings: unknown): SocialProvider[] {
  if (!settings || typeof settings !== "object" || !("external" in settings))
    return [];
  const external = settings.external;
  if (!external || typeof external !== "object") return [];
  return socialProviders.filter(
    (p) => p in external && (external as Record<string, unknown>)[p] === true,
  );
}
