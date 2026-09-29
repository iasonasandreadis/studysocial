export function commentBody(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.trim();
  return body.length >= 1 && body.length <= 1000 ? body : null;
}
export function pageNumber(value: unknown, max = 10000) {
  const n =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 0;
  return Math.min(max, Number.isSafeInteger(n) ? n : 0);
}
