import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  validateCredentials,
  siteOrigin,
  confirmationDestination,
} from "../src/lib/auth/validation.ts";
import { validateOnboarding } from "../src/lib/onboarding/validation.ts";
import {
  prepareAvatar,
  MAX_AVATAR_BYTES,
} from "../src/lib/onboarding/avatar.ts";
const form = (values) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values))
    for (const v of Array.isArray(value) ? value : [value]) f.append(key, v);
  return f;
};
test("auth validates bounded emails/passwords without changing passwords", () => {
  assert.equal(
    validateCredentials("signup", "student@example.com", "a long passphrase"),
    null,
  );
  assert.match(
    validateCredentials("signup", "invalid", "a long passphrase"),
    /email/,
  );
  assert.match(
    validateCredentials("signup", "student@example.com", "short"),
    /12/,
  );
  assert.match(
    validateCredentials("login", "student@example.com", "x".repeat(129)),
    /128/,
  );
  assert.equal(
    validateCredentials("login", "student@example.com", "existing"),
    null,
  );
  assert.equal(validateCredentials("forgot", "student@example.com", ""), null);
});
test("email redirects require a trusted origin and never accept an arbitrary next URL", () => {
  assert.equal(siteOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(
    siteOrigin("https://studysocial.example"),
    "https://studysocial.example",
  );
  for (const bad of [
    undefined,
    "javascript:alert(1)",
    "http://evil.example",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com?next=x",
  ])
    assert.throws(() => siteOrigin(bad));
  assert.equal(confirmationDestination("recovery"), "/reset-password");
  for (const input of [null, "https://evil.example", "//evil.example", "/app"])
    assert.equal(confirmationDestination(input), "/onboarding");
});
test("onboarding validates and normalizes identity and bounds private fields", () => {
  assert.deepEqual(
    validateOnboarding(
      1,
      form({ display_name: " Alex ", handle: "Alex_24", bio: " Hello " }),
    ).payload,
    { display_name: "Alex", handle: "alex_24", bio: "Hello" },
  );
  assert.ok(
    validateOnboarding(1, form({ display_name: "Alex", handle: "bad name" }))
      .error,
  );
  assert.ok(
    validateOnboarding(
      1,
      form({ display_name: "Alex", handle: "alex", bio: "x".repeat(301) }),
    ).error,
  );
  assert.ok(validateOnboarding(2, form({ academic_year: "" })).error);
  assert.ok(
    validateOnboarding(
      2,
      form({
        academic_year: "Year 12",
        school_id: "00000000-0000-4000-8000-000000000001",
        school_name: "Other",
      }),
    ).error,
  );
  assert.ok(
    validateOnboarding(
      2,
      form({ academic_year: "Year 12", subjects: ["malformed"] }),
    ).error,
  );
  assert.equal(
    validateOnboarding(3, form({ visibility: "private" })).payload.is_private,
    true,
  );
  assert.ok(validateOnboarding(3, form({ visibility: "unexpected" })).error);
  assert.ok(validateOnboarding(99, form({})).error);
});
test("avatar pipeline verifies actual bytes, bounds size, resizes, and strips metadata", async () => {
  const source = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#88aa66" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await prepareAvatar(source);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 512);
  assert.ok(metadata.height <= 512);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(prepareAvatar(new Uint8Array(MAX_AVATAR_BYTES + 1)));
  await assert.rejects(prepareAvatar(Buffer.from("not an image")));
  await assert.rejects(
    prepareAvatar(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      ),
    ),
  );
});
