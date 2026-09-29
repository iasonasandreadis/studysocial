/** PostgreSQL accepts some timezone aliases that Intl does not recognize. */
export function studyDateLabel(value: string, timezone: string) {
  const date = new Date(value);
  try {
    return date.toLocaleString("en-GB", { timeZone: timezone });
  } catch {
    return `${date.toLocaleString("en-GB", { timeZone: "UTC" })} UTC`;
  }
}
